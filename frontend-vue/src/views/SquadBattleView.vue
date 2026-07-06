<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useEquipmentStore } from '@/stores/equipment';
import {
  DEFAULT_MAX_TIME_MS,
  SQUAD_MEMBER_COUNT,
  TOWER_SQUAD_ALLOWED_RARITIES,
  assessSquadReadiness,
  BASE_CRIT_RATE,
  calculateBattlePower,
  calculateTowerBattleRewards,
  canOverrideTarget,
  createSeededRng,
  generateBattleStats,
  generateTowerFloorEnemies,
  towerFloorEnemySeed,
  isTowerSquadRarity,
  simulateTimedBattle,
  resumeTimedBattle,
  validateTowerSquadMembers,
  type BattleStats,
  type ManualUltimateOrder,
  type SquadUnitSetup,
  type StatusKind,
  type TimedBattleEvent,
  type TimedBattleResult,
  type TimedBattleWinner,
  type TowerFloorSquad,
} from '@/engine';
import { CHARACTER_IMAGE_POOL } from '@/utils/imageUtils';
import { assetUrl } from '@/utils/assetUrl';
import { resolveMemberBattleStats } from '@/utils/battleStats';
import CharacterSelectModal from '@/components/battle/CharacterSelectModal.vue';
import SquadBattlefield from '@/components/battle/squad/SquadBattlefield.vue';
import SquadBattleLog from '@/components/battle/squad/SquadBattleLog.vue';
import SquadBattleResult from '@/components/battle/squad/SquadBattleResult.vue';
import { getSquadSkillKitForCharacter, isSquadSkillKitReady, getSquadRoleInfo } from '@/data/squadSkillKits';
import type { CharacterCard } from '@/types/card';
import type { SquadBattleRewardView, SquadBattleUnitView, SquadFloatingDamageView } from '@/components/battle/squad/types';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const equipmentStore = useEquipmentStore();

// SA-T6（Plan A）：hub 以「直达 battle 阶段」的方式驱动本组件。
// - entrySquadId 合法：挂载即 startTowerBattle(squadId) 跳到 currentPhase='battle'，不渲染 towerMode 编成器。
// - embedded 且无合法 entrySquadId（刷新/深链 ?tab=battle）：渲染最小占位，引导回探索选队开战，
//   绝不复活整套 towerMode 编成 UI（那正是 SA-T6 要消除的三重冗余）。
const props = withDefaults(defineProps<{
  entrySquadId?: number | null;
  embedded?: boolean;
}>(), {
  entrySquadId: null,
  embedded: false,
});

// 通知 hub 切回探索（占位页「去探索选队」/ embedded 下战斗结束「继续」）。
const emit = defineEmits<{
  (event: 'exit-to-explore'): void;
}>();

type BattlePhase = 'towerMode' | 'battle' | 'result';

interface SquadMember {
  character: CharacterCard;
  battleStats: BattleStats;
  position: number;
  unitId: string;
}

interface RuntimeStatusView {
  kind: StatusKind;
  expiresAt: number;
  amount?: number;
}

interface RuntimeUnitView extends SquadBattleUnitView {
  statuses: RuntimeStatusView[];
}

const BATTLE_STATE_KEY = 'squadBattleState';
const EMPTY_STAT_BONUS: BattleStats = { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
const CONTROL_STATUSES: StatusKind[] = ['stun', 'silence', 'taunt'];
const PLAYBACK_DELAY_MS = 180;
// SB-T3 收尾①：浮动伤害数字的驻留时长（跟随 180ms 逐条回放节奏，略长于一帧让玩家看清）。
const FLOATING_DAMAGE_TTL_MS = 900;

const currentPhase = ref<BattlePhase>('towerMode');
const playerSquad = ref<SquadMember[]>([]);
const enemySquad = ref<SquadMember[]>([]);
const battleUnits = ref<RuntimeUnitView[]>([]);
const battleEvents = ref<TimedBattleEvent[]>([]);
const battleLog = ref<string[]>([]);
// SB-T3 收尾①：瞬态浮动伤害数字（暴击醒目显形）。仅在「新回放的」damage 事件时生成，
// 不随 rebuildVisibleBattle 重放全部历史事件而重复生成；每条自带定时器清除，reset/卸载时清空。
const floatingDamages = ref<SquadFloatingDamageView[]>([]);
let floatingDamageSeq = 0;
const battleResult = ref<'victory' | 'defeat' | null>(null);
const battleElapsedMs = ref(0);
const battleEnded = ref(false);
const autoUltimates = ref(true);
// 问题①：回放倍速（1x/2x/4x），缩放事件回放间隔；不影响战斗内部结算，只影响观看速度。
const playbackSpeed = ref<1 | 2 | 4>(2);
// ④ PCR 舞台：当前回放事件的攻击者/被击者脉冲（nonce 每事件 +1，驱动 sprite 攻击/受击动画）。
const battleFx = ref<{ attackerId: string | null; hitId: string | null; nonce: number }>({ attackerId: null, hitId: null, nonce: 0 });
const manualUltimateOrders = ref<ManualUltimateOrder[]>([]);
// SB-T2：正处于「选目标」态的施法者 unitId（单体敌方大招点击后置位，等待玩家点敌方目标）；null = 无。
const ultimateTargetingUnitId = ref<string | null>(null);
const battleSeed = ref(0);
const battleSimulation = ref<TimedBattleResult | null>(null);
const battleEventCursor = ref(0);
const selectedSquadForBattle = ref<number | null>(null);
const currentTowerFloor = ref(1);
const towerEnemyData = ref<TowerFloorSquad | null>(null);
const showCharacterSelectModal = ref(false);
const selectedPosition = ref(0);
const editingSquadId = ref<number | null>(null);
const battleSettled = ref(false);
const battleRewards = ref<SquadBattleRewardView>({
  characterExp: 0,
  knowledgePoints: 0,
  equipmentDrop: null,
});

const towerSquadAllowedRarities = TOWER_SQUAD_ALLOWED_RARITIES;

// PCR 式：战场按固有站位前→后排列（前排在上，后排在下），一眼看出谁扛线、谁在后排输出。
const byPositionOrder = (a: RuntimeUnitView, b: RuntimeUnitView) => a.positionOrder - b.positionOrder;
const playerBattleUnits = computed(() => battleUnits.value.filter(unit => unit.side === 'player').slice().sort(byPositionOrder));
const enemyBattleUnits = computed(() => battleUnits.value.filter(unit => unit.side === 'enemy').slice().sort(byPositionOrder));

function isCharacterSelectableForTower(character: CharacterCard): boolean {
  return isTowerSquadRarity(character.rarity) && isSquadSkillKitReady(character);
}

function getTowerEnemyCandidates(): CharacterCard[] {
  return gameDataStore.allCharacterCards.filter(isSquadSkillKitReady);
}

function saveState() {
  const state = {
    currentPhase: currentPhase.value === 'towerMode' ? 'towerMode' : 'towerMode',
    currentTowerFloor: currentTowerFloor.value,
  };
  try {
    sessionStorage.setItem(BATTLE_STATE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('[DEBUG] Failed to save state:', error);
  }
}

function loadState() {
  const progressFloor = userStore.getCurrentChallengeFloor();
  currentTowerFloor.value = progressFloor;
  try {
    const savedState = sessionStorage.getItem(BATTLE_STATE_KEY);
    if (savedState) {
      const state = JSON.parse(savedState);
      if (state.currentPhase === 'towerMode') {
        currentPhase.value = 'towerMode';
        currentTowerFloor.value = progressFloor;
        towerEnemyData.value = null;
      }
    }
  } catch (error) {
    console.warn('[DEBUG] Failed to load state:', error);
    currentPhase.value = 'towerMode';
  }
}

function getTowerSquadValidation(squadId: number) {
  return validateTowerSquadMembers({
    members: userStore.getSquadMembers(squadId),
    getCharacter: id => gameDataStore.getCharacterCardById(id),
    isOwned: id => userStore.getCharacterCardCount(id) > 0,
    hasCompleteSkillKit: isSquadSkillKitReady,
  });
}

function getTowerSquadIssue(squadId: number): string {
  return getTowerSquadValidation(squadId).message ?? '';
}

function canStartTowerBattle(squadId: number): boolean {
  return getTowerSquadValidation(squadId).ok
    && !userStore.hasCompletedFloor(currentTowerFloor.value)
    && !!towerEnemyData.value;
}

function getSquadSlotIssue(squadId: number, position: number): string {
  const slot = getTowerSquadValidation(squadId).slots[position];
  return slot && !slot.ok ? (slot.message ?? '') : '';
}

function isSquadSlotValid(squadId: number, position: number): boolean {
  return getTowerSquadValidation(squadId).slots[position]?.ok ?? false;
}

function getSquadPower(squadId: number): number {
  const validation = getTowerSquadValidation(squadId);
  return validation.slots.reduce((total, slot) => {
    const character = slot.character;
    if (!slot.ok || !character) return total;
    const battleStats = buildCharacterStats(character, false);
    return total + calculateBattlePower(battleStats);
  }, 0);
}

function getSquadMemberCount(squadId: number): number {
  return getTowerSquadValidation(squadId).slots.filter(slot => slot.ok).length;
}

/**
 * SC-T5：某小队对当前层的软战力门槛评估（我方 getSquadPower vs 敌方 floorPower 同口径，不硬拦）。
 * 敌人未载入时返回 null（不显示提示）。
 */
function squadReadinessFor(squadId: number) {
  const floorPower = towerEnemyData.value?.floorPower;
  if (floorPower == null) return null;
  return assessSquadReadiness(getSquadPower(squadId), floorPower);
}

/** SC-T5：软提示文案（人话化，含推荐战力 + delta）。 */
function readinessHintFor(squadId: number): string {
  const r = squadReadinessFor(squadId);
  if (!r) return '';
  const gap = Math.abs(r.delta);
  if (r.level === 'ready') return `建议 ~${r.recommendedPower} · 达标`;
  if (r.level === 'risky') return `建议 ~${r.recommendedPower} · 略吃紧（差 ${gap}）`;
  return `建议 ~${r.recommendedPower} · 差距较大（差 ${gap}），先养成或扫荡`;
}

const battleReadiness = computed(() =>
  selectedSquadForBattle.value == null ? null : squadReadinessFor(selectedSquadForBattle.value),
);

function getUsedCharacterIds(squadId: number, excludePosition: number): number[] {
  return userStore.getSquadMembers(squadId)
    .map((id: number | null, index: number) => index !== excludePosition ? id : null)
    .filter((id: number | null): id is number => id !== null);
}

function openCharacterSelect(squadId: number, position: number) {
  editingSquadId.value = squadId;
  selectedPosition.value = position;
  showCharacterSelectModal.value = true;
}

function handleCharacterSelect(characterId: number, position: number) {
  if (editingSquadId.value === null) return;
  const character = gameDataStore.getCharacterCardById(characterId);
  if (!character || userStore.getCharacterCardCount(characterId) <= 0 || !isCharacterSelectableForTower(character)) {
    userStore.addLog('挑战塔小队只能选择已拥有且拥有完整小队战技能的 SSR/HR/UR 角色。', 'warning');
    return;
  }
  userStore.updateSquadMember(editingSquadId.value, position, characterId);
}

function handleCharacterRemove(position: number) {
  if (editingSquadId.value !== null) {
    userStore.updateSquadMember(editingSquadId.value, position, null);
  }
}

function updateSquadName(squadId: number, newName: string) {
  userStore.updateSquadName(squadId, newName);
}

function buildCharacterStats(character: CharacterCard, isEnemy: boolean): BattleStats {
  const base = character.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 };
  return isEnemy
    ? generateBattleStats(base, EMPTY_STAT_BONUS, EMPTY_STAT_BONUS)
    // 玩家侧走单一养成战力口径（等级加点 + 突破 + 好感永久 + 装备），与详情/explore 同源。
    : resolveMemberBattleStats(base, userStore.getNurtureData(character.id), equipmentStore.resolveEquipBonus(character.id));
}

function createSquadMember(character: CharacterCard, position: number, side: 'player' | 'enemy'): SquadMember {
  return {
    character,
    battleStats: buildCharacterStats(character, side === 'enemy'),
    position,
    unitId: `${side}-${position}-${character.id}`,
  };
}

function startTowerBattle(squadId: number) {
  if (!userStore.isLoggedIn) {
    userStore.addLog('请先登录！', 'warning');
    return;
  }

  const validation = getTowerSquadValidation(squadId);
  if (!validation.ok) {
    userStore.addLog(validation.message ?? '挑战塔需要 5 人 SSR/HR/UR 满编小队。', 'warning');
    return;
  }

  if (!towerEnemyData.value) {
    loadTowerEnemies();
  }
  if (!towerEnemyData.value) return;

  playerSquad.value = validation.characters.map((character, index) => createSquadMember(character, index, 'player'));
  enemySquad.value = towerEnemyData.value.members.map((character: CharacterCard, index: number) => createSquadMember(character, index, 'enemy'));
  selectedSquadForBattle.value = squadId;
  battleSeed.value = Date.now() % 2147483647;
  manualUltimateOrders.value = [];
  ultimateTargetingUnitId.value = null;
  battleRewards.value = { characterExp: 0, knowledgePoints: 0, equipmentDrop: null };
  battleResult.value = null;
  battleSettled.value = false;
  battleEnded.value = false;
  currentPhase.value = 'battle';
  regenerateBattleSimulation(0);
  playNextBattleEvent();
}

function unitSetups(): SquadUnitSetup[] {
  const toSetup = (member: SquadMember, side: 'player' | 'enemy'): SquadUnitSetup => {
    const setup: SquadUnitSetup = {
      id: member.unitId,
      name: member.character.name,
      side,
      // PCR 式：站位由角色 role 推导（前排坦克/中排近战/后排法师奶妈），不再看槽位次序。
      position: getSquadRoleInfo(member.character)?.position ?? 'back',
      // PCR 式：蓄能系数按定位注入（问题②），坦克受击充能快、输出攻击充能快。
      energyGain: getSquadRoleInfo(member.character)?.energyGain,
      stats: member.battleStats,
      skills: getSquadSkillKitForCharacter(member.character),
    };
    // ★ SE-T3：只给 player 侧注入装备 modifier（敌方塔单位不给，防塔层缩放联动）。
    // resolveEquipModifiers 返回「装备额外增量」（已 clamp、不含 BASE）；critRate 增量在此显式叠在
    // BASE_CRIT_RATE 之上再交给 setup.modifiers——因 createRuntimeUnit 用 spread 覆盖 critRate，
    // 若只传增量会冲掉基础暴击（engine 语义不改，BASE 叠加收口到这条 View seam）。
    if (side === 'player') {
      const equipMods = equipmentStore.resolveEquipModifiers(member.character.id);
      if (Object.keys(equipMods).length > 0) {
        setup.modifiers = {
          ...equipMods,
          ...(equipMods.critRate != null ? { critRate: BASE_CRIT_RATE + equipMods.critRate } : {}),
        };
      }
    }
    return setup;
  };

  return [
    ...playerSquad.value.map(member => toSetup(member, 'player')),
    ...enemySquad.value.map(member => toSetup(member, 'enemy')),
  ];
}

function applyBattleSimulation(result: TimedBattleResult, cursorTime: number) {
  battleSimulation.value = result;
  battleEvents.value = [...result.events];
  battleEventCursor.value = Math.max(0, battleEvents.value.findIndex(event => event.at > cursorTime));
  if (battleEventCursor.value < 0) battleEventCursor.value = battleEvents.value.length;
  rebuildVisibleBattle(battleEventCursor.value);
}

function regenerateBattleSimulation(cursorTime: number) {
  const result = simulateTimedBattle({
    units: unitSetups(),
    rng: createSeededRng(battleSeed.value),
    autoUltimates: autoUltimates.value,
    manualUltimateOrders: manualUltimateOrders.value,
    // SB-T1：显式传 engine 时限常量，保证 UI 倒计时上限 === 实战裁决上限（同源，禁脱钩）。
    maxTimeMs: DEFAULT_MAX_TIME_MS,
  });
  applyBattleSimulation(result, cursorTime);
}

/**
 * SB-T2（本轮-7，拍板 1/2）：手动开大 / 切换自动大招后的**前缀冻结平滑续跑**。
 * 用 resumeTimedBattle 冻结「已回放到 resumeFromMs 的事件前缀」（一字不改、游标不回退、无时间倒流/HP-能量跳变），
 * 只重算 resumeFromMs 之后的后缀；RNG 承接消费到 resumeFromMs 的状态（非 seed 头部重建），
 * 使选目标带来的后缀错位不回溯污染前缀随机结果。取代旧的整场 regenerateBattleSimulation（碰巧不跳→选目标后必跳）。
 */
function resumeBattleSimulation(resumeFromMs: number) {
  const result = resumeTimedBattle({
    seed: battleSeed.value,
    units: unitSetups(),
    autoUltimates: autoUltimates.value,
    manualUltimateOrders: manualUltimateOrders.value,
    resumeFromMs,
    maxTimeMs: DEFAULT_MAX_TIME_MS,
  });
  applyBattleSimulation(result, resumeFromMs);
}

function baseRuntimeUnits(): RuntimeUnitView[] {
  const fromMember = (member: SquadMember, side: 'player' | 'enemy'): RuntimeUnitView => {
    const ultimate = getSquadSkillKitForCharacter(member.character)?.ultimate;
    const roleInfo = getSquadRoleInfo(member.character);
    return {
      id: member.unitId,
      characterId: member.character.id,
      name: member.character.name,
      imagePath: member.character.image_path || assetUrl('/data/images/character/77.jpg'),
      side,
      position: member.position,
      roleLabel: roleInfo?.roleLabel ?? '',
      roleIcon: roleInfo?.roleIcon ?? '',
      positionLabel: roleInfo?.positionLabel ?? '',
      positionOrder: roleInfo?.positionOrder ?? 2,
      hp: member.battleStats.hp,
      maxHp: member.battleStats.hp,
      energy: 0,
      statuses: [],
      defeated: false,
      ultimateName: ultimate?.name ?? '大招',
      ultimateReady: false,
    };
  };

  return [
    ...playerSquad.value.map(member => fromMember(member, 'player')),
    ...enemySquad.value.map(member => fromMember(member, 'enemy')),
  ];
}

function rebuildVisibleBattle(cursor: number) {
  const units = baseRuntimeUnits();
  const byId = new Map(units.map(unit => [unit.id, unit]));
  const visibleEvents = battleEvents.value.slice(0, cursor);
  let now = 0;

  for (const event of visibleEvents) {
    now = event.at;
    applyEventToUnits(byId, event);
  }

  for (const unit of units) {
    unit.statuses = unit.statuses.filter(status => status.expiresAt > now);
    unit.ultimateReady = unit.side === 'player' && !unit.defeated && unit.energy >= 1000;
  }

  battleElapsedMs.value = now;
  battleUnits.value = units;
  battleLog.value = buildKeyLogs(visibleEvents);
}

function applyEventToUnits(byId: Map<string, RuntimeUnitView>, event: TimedBattleEvent) {
  switch (event.type) {
    case 'action': {
      const actor = byId.get(event.actorId);
      if (actor && event.slot === 'ultimate') {
        actor.energy = 0;
      }
      break;
    }
    case 'damage': {
      const target = byId.get(event.targetId);
      if (target) target.hp = event.hpAfter;
      break;
    }
    case 'heal':
    case 'revive': {
      const target = byId.get(event.targetId);
      if (target) {
        target.hp = event.hpAfter;
        target.defeated = false;
      }
      break;
    }
    case 'statusTick': {
      const target = byId.get(event.targetId);
      if (target) target.hp = event.hpAfter;
      break;
    }
    case 'energy': {
      const target = byId.get(event.targetId);
      if (target) target.energy = event.energyAfter;
      break;
    }
    case 'shield': {
      const target = byId.get(event.targetId);
      if (target) target.statuses.push({ kind: 'shield', amount: event.amount, expiresAt: event.expiresAt });
      break;
    }
    case 'statusApplied': {
      const target = byId.get(event.targetId);
      if (target) {
        target.statuses = target.statuses.filter(status => status.kind !== event.status);
        target.statuses.push({ kind: event.status, amount: event.amount, expiresAt: event.expiresAt });
      }
      break;
    }
    case 'statusExpired': {
      const target = byId.get(event.targetId);
      if (target) target.statuses = target.statuses.filter(status => status.kind !== event.status);
      break;
    }
    case 'defeated': {
      const target = byId.get(event.targetId);
      if (target) {
        target.hp = 0;
        target.defeated = true;
        target.energy = 0;
      }
      break;
    }
  }
}

function buildKeyLogs(events: TimedBattleEvent[]): string[] {
  const logs: string[] = [];
  for (const event of events) {
    switch (event.type) {
      case 'battleStart':
        logs.push('战斗开始，双方小队进场。');
        break;
      case 'action':
        if (event.slot === 'ultimate') {
          logs.push(`${unitName(event.actorId)} 释放大招「${event.skillName}」。`);
        }
        break;
      // SB-T3 收尾①(B)：暴击作为关键事件记入日志（普通伤害不记，契合「只记关键事件」既有设计）。
      case 'damage':
        if (event.isCritical) {
          logs.push(`💥 暴击！${unitName(event.actorId)} 对 ${unitName(event.targetId)} 造成 ${event.amount} 伤害。`);
        }
        break;
      case 'defeated':
        logs.push(`${unitName(event.targetId)} 被击败。`);
        break;
      case 'statusApplied':
        if (CONTROL_STATUSES.includes(event.status)) {
          logs.push(`${unitName(event.targetId)} 受到控制：${statusLabel(event.status)}。`);
        }
        break;
      case 'manualUltimateFailed':
        logs.push(`${unitName(event.actorId)} 大招未能释放：${manualFailLabel(event.reason)}。`);
        break;
      case 'battleEnd':
        logs.push(event.winner === 'player' ? '战斗胜利。' : '战斗失败。');
        break;
    }
  }
  return logs.slice(-40);
}

function unitName(unitId: string): string {
  return [...playerSquad.value, ...enemySquad.value].find(member => member.unitId === unitId)?.character.name ?? unitId;
}

function statusLabel(status: StatusKind): string {
  return ({ stun: '眩晕', silence: '沉默', taunt: '嘲讽' } as Partial<Record<StatusKind, string>>)[status] ?? status;
}

function manualFailLabel(reason: 'notReady' | 'controlled' | 'missingSkill' | 'noTarget'): string {
  if (reason === 'notReady') return '能量不足';
  if (reason === 'controlled') return '被控制';
  if (reason === 'noTarget') return '无可用目标';
  return '技能缺失';
}

// SB-T3 收尾①(A)：为「刚回放到的」damage 事件生成一条浮动伤害数字，暴击带 isCritical 醒目样式。
// 放在 playNextBattleEvent（单条推进）而非 applyEventToUnits（后者会重放全部历史事件），避免每帧重复刷屏。
// ④ PCR 舞台：把当前回放事件映射成攻击者/被击者脉冲，驱动 sprite 冲刺/受击动画。
function applyBattleFx(event: TimedBattleEvent) {
  let attackerId: string | null = null;
  let hitId: string | null = null;
  if (event.type === 'action') attackerId = event.actorId;
  else if (event.type === 'damage') {
    attackerId = event.actorId === 'status' ? null : event.actorId;
    hitId = event.targetId;
  } else if (event.type === 'defeated') hitId = event.targetId;
  if (attackerId || hitId) {
    battleFx.value = { attackerId, hitId, nonce: battleFx.value.nonce + 1 };
  }
}

function spawnFloatingDamage(event: TimedBattleEvent) {
  if (event.type !== 'damage' || event.amount <= 0) return;
  const id = ++floatingDamageSeq;
  floatingDamages.value = [
    ...floatingDamages.value,
    { id, targetId: event.targetId, amount: event.amount, isCritical: event.isCritical },
  ];
  // 定时清除：走登记式 scheduleFloatingClear()，reset/卸载时随 clearBattleTimers 一并清（无裸 setTimeout）。
  scheduleFloatingClear(() => {
    floatingDamages.value = floatingDamages.value.filter(entry => entry.id !== id);
  }, FLOATING_DAMAGE_TTL_MS);
}

function playNextBattleEvent() {
  clearPlaybackTimers();
  if (currentPhase.value !== 'battle' || battleEnded.value) return;
  if (battleEventCursor.value >= battleEvents.value.length) {
    finishTimedBattle();
    return;
  }

  battleEventCursor.value += 1;
  rebuildVisibleBattle(battleEventCursor.value);

  const latest = battleEvents.value[battleEventCursor.value - 1];
  if (latest) {
    spawnFloatingDamage(latest);
    applyBattleFx(latest);
  }
  if (latest?.type === 'battleEnd') {
    finishTimedBattle();
    return;
  }
  schedule(playNextBattleEvent, PLAYBACK_DELAY_MS / playbackSpeed.value);
}

function handleToggleAutoUltimates() {
  if (battleEnded.value) return;
  const cursorTime = battleElapsedMs.value;
  ultimateTargetingUnitId.value = null; // 切换自动大招时清空未完成的选目标态。
  autoUltimates.value = !autoUltimates.value;
  // SB-T2：前缀冻结续跑，切换自动大招不再整场重算致回放跳变。
  resumeBattleSimulation(cursorTime);
  playNextBattleEvent();
}

/**
 * SB-T2（本轮-8，拍板 3）：某单位的大招是否为「可选目标的单体敌方大招」。
 * 复用 engine `canOverrideTarget`（单一口径），使 UI 亮起条件 == engine 覆盖生效条件——
 * 单体大招才允许选目标、AOE/self/己方组点一下即放，杜绝「UI 承诺选目标、代码全体命中」的反向 affordance 欺骗。
 */
function ultimateAllowsTargeting(unitId: string): boolean {
  const member = [...playerSquad.value, ...enemySquad.value].find(m => m.unitId === unitId);
  if (!member) return false;
  const ultimate = getSquadSkillKitForCharacter(member.character)?.ultimate;
  return Boolean(ultimate && canOverrideTarget(ultimate.target));
}

/**
 * SB-T2：手动开大。
 *  - 单体敌方大招（ultimateAllowsTargeting）：进入「选目标」态，待玩家点敌方单位后带 targetId 入队。
 *  - AOE/self/己方组大招：点一下即放（targetId 省略，engine 忽略覆盖）。
 * 入队后走 resumeBattleSimulation 前缀冻结续跑（无跳变）。同帧连点单次重算（每次入队即重算，
 * 命令按 atMs 递增排序、engine 内 orderIndex 单调消费，不会双跳丢单）。
 */
function handleManualUltimate(unitId: string) {
  if (battleEnded.value || autoUltimates.value) return;
  const unit = battleUnits.value.find(candidate => candidate.id === unitId);
  if (!unit?.ultimateReady) return;
  if (ultimateAllowsTargeting(unitId)) {
    // 单体大招：进入选目标态，等待 handleSelectUltimateTarget。
    ultimateTargetingUnitId.value = ultimateTargetingUnitId.value === unitId ? null : unitId;
    return;
  }
  enqueueManualUltimate(unitId);
}

/** SB-T2：玩家在「选目标」态点击敌方单位 → 带 targetId 释放单体大招。 */
function handleSelectUltimateTarget(targetUnitId: string) {
  const casterId = ultimateTargetingUnitId.value;
  if (!casterId) return;
  const target = battleUnits.value.find(u => u.id === targetUnitId);
  if (!target || target.side !== 'enemy' || target.defeated) return;
  enqueueManualUltimate(casterId, targetUnitId);
  ultimateTargetingUnitId.value = null;
}

function enqueueManualUltimate(unitId: string, targetId?: string) {
  const orderAt = battleElapsedMs.value + 1;
  const order: ManualUltimateOrder = targetId ? { unitId, atMs: orderAt, targetId } : { unitId, atMs: orderAt };
  manualUltimateOrders.value = [...manualUltimateOrders.value, order];
  resumeBattleSimulation(battleElapsedMs.value);
  playNextBattleEvent();
}

function finishTimedBattle() {
  if (battleEnded.value || !battleSimulation.value) return;
  clearBattleTimers();
  battleEnded.value = true;
  battleResult.value = battleSimulation.value.winner === 'player' ? 'victory' : 'defeat';
  settleTowerBattle(battleSimulation.value.winner);
  currentPhase.value = 'result';
}

function settleTowerBattle(winner: TimedBattleWinner) {
  if (battleSettled.value) return;
  battleSettled.value = true;

  if (winner !== 'player') {
    userStore.addLog('挑战塔失败：未推进楼层，未发放角色经验、知识点或装备。', 'info');
    return;
  }

  const clearedFloor = currentTowerFloor.value;
  const { completed, drop } = userStore.completeFloor(clearedFloor, createSeededRng(battleSeed.value + 17));
  const rewards = calculateTowerBattleRewards({
    floor: clearedFloor,
    progressed: completed,
    outcome: { winner: 'player', reason: 'victory' },
    equipmentDrop: drop,
  });

  if (rewards.knowledgePoints > 0) {
    userStore.earn('knowledgePoints', rewards.knowledgePoints);
  }
  if (rewards.characterExp > 0) {
    playerSquad.value.forEach(member => userStore.addCharacterExp(member.character.id, rewards.characterExp));
  }

  battleRewards.value = {
    characterExp: rewards.characterExp,
    knowledgePoints: rewards.knowledgePoints,
    equipmentDrop: rewards.equipmentDrop
      ? { name: rewards.equipmentDrop.name, rarity: rewards.equipmentDrop.rarity }
      : null,
  };
  battleLog.value = [
    ...battleLog.value,
    `奖励：角色经验 +${rewards.characterExp}，知识点 +${rewards.knowledgePoints}。`,
    rewards.equipmentDrop ? `奖励：装备掉落 [${rewards.equipmentDrop.rarity}] ${rewards.equipmentDrop.name}。` : '奖励：本层未掉落装备。',
  ];
  userStore.addLog(`挑战塔胜利！参战角色 +${rewards.characterExp} 经验，获得 ${rewards.knowledgePoints} 知识点。`, 'success');

  if (completed) {
    currentTowerFloor.value = clearedFloor + 1;
    towerEnemyData.value = null;
    saveState();
  }
}

function restart() {
  currentPhase.value = 'towerMode';
  playerSquad.value = [];
  enemySquad.value = [];
  battleUnits.value = [];
  battleEvents.value = [];
  battleLog.value = [];
  battleResult.value = null;
  battleEnded.value = false;
  selectedSquadForBattle.value = null;
  battleRewards.value = { characterExp: 0, knowledgePoints: 0, equipmentDrop: null };
  clearBattleTimers();
  ensureTowerEnemies();
  // SA-T6：hub 内嵌时结算后不回落 towerMode 编成器（那是被消除的冗余），改由 hub 切回探索。
  if (props.embedded) emit('exit-to-explore');
}

// SA-T2：按 towerFloorEnemySeed(floor) 派生确定性种子生成当前层敌人——与家园 hub 探索预览同源。
// 同一层敌人恒等（预览 === 实战），不再用 Math.random；「刷新敌人」按钮已随之移除（刷新出来仍是同一批）。
function loadTowerEnemies() {
  towerEnemyData.value = generateTowerFloorEnemies(
    getTowerEnemyCandidates(),
    currentTowerFloor.value,
    createSeededRng(towerFloorEnemySeed(currentTowerFloor.value)),
    CHARACTER_IMAGE_POOL,
  );
  saveState();
}

function ensureTowerEnemies() {
  if (
    currentPhase.value === 'towerMode'
    && !towerEnemyData.value
    && userStore.isLoggedIn
    && gameDataStore.allCharacterCards.length > 0
  ) {
    loadTowerEnemies();
  }
}

// 回放推进定时器（单条，逐条 180ms）+ 浮动伤害清除定时器（多条，各自 TTL）分池管理：
// clearPlaybackTimers 只掐推进链（避免重复排下一帧），clearBattleTimers 全清（含浮动数字清除定时器）+ 清空浮动数字。
const playbackTimers = new Set<number>();
const floatingTimers = new Set<number>();

function schedule(fn: () => void, delay: number) {
  const id = window.setTimeout(() => {
    playbackTimers.delete(id);
    fn();
  }, delay);
  playbackTimers.add(id);
}

function scheduleFloatingClear(fn: () => void, delay: number) {
  const id = window.setTimeout(() => {
    floatingTimers.delete(id);
    fn();
  }, delay);
  floatingTimers.add(id);
}

function clearPlaybackTimers() {
  playbackTimers.forEach(id => clearTimeout(id));
  playbackTimers.clear();
}

function clearBattleTimers() {
  clearPlaybackTimers();
  floatingTimers.forEach(id => clearTimeout(id));
  floatingTimers.clear();
  floatingDamages.value = [];
}

/**
 * SA-T6：尝试用 hub 传入的 entrySquadId 直达 battle 阶段。
 * 合法则 startTowerBattle 会把 currentPhase 推到 'battle'（跳过 towerMode 编成器）。
 * 返回是否成功进战——不成功（非法队/非登录/敌人未就绪）时留给占位页兜底。
 */
function tryEnterFromEntry(): boolean {
  const squadId = props.entrySquadId;
  if (squadId == null) return false;
  if (!userStore.isLoggedIn) return false;
  ensureTowerEnemies();
  if (!getTowerSquadValidation(squadId).ok) return false;
  startTowerBattle(squadId);
  return currentPhase.value === 'battle';
}

onMounted(() => {
  loadState();
  ensureTowerEnemies();
  // 直达进战红线：带合法 entrySquadId 挂载即进 battle 阶段，不落 towerMode。
  tryEnterFromEntry();
});

watch(
  () => userStore.towerProgress.currentFloor,
  newFloor => {
    if (currentPhase.value === 'towerMode' && newFloor > currentTowerFloor.value) {
      currentTowerFloor.value = newFloor;
      towerEnemyData.value = null;
    }
  },
);

// SA-T2：移除手动「刷新敌人」按钮后，主数据/登录异步就绪时自动补载当前层敌人（确定性种子，同源）。
// SA-T6：若带 entrySquadId 但挂载时敌人/登录尚未就绪未能进战，就绪后自动补一次直达进战。
watch(
  () => [userStore.isLoggedIn, gameDataStore.allCharacterCards.length] as const,
  () => {
    ensureTowerEnemies();
    if (props.embedded && props.entrySquadId != null && currentPhase.value === 'towerMode') {
      tryEnterFromEntry();
    }
  },
);

onBeforeUnmount(() => {
  clearBattleTimers();
  saveState();
});
</script>

<template>
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4">
      <div class="mb-8 text-center">
        <h1 class="mb-2 text-4xl font-bold text-ink">挑战塔</h1>
        <p class="text-ink-2">逐层挑战，难度递增，证明你的实力！</p>
      </div>

      <div v-if="!userStore.isLoggedIn" class="py-20 text-center">
        <h2 class="mb-4 text-2xl font-bold text-ink-2">请先登录</h2>
        <p class="text-ink-2">登录后即可参与爬塔挑战</p>
      </div>

      <!--
        SA-T6（Plan A）：hub 内嵌时，towerMode 编成 UI 已由 squad/explore 两 tab 取代，
        不再渲染整套编成器（消除三重冗余）。未带合法 entrySquadId 直接进 battle tab（刷新/深链）时
        落最小占位，引导回探索选队开战。
      -->
      <div v-else-if="currentPhase === 'towerMode' && embedded" class="py-16 text-center">
        <h2 class="mb-3 text-2xl font-bold text-ink">从「探索」选择小队开始挑战</h2>
        <p class="mx-auto mb-6 max-w-md text-ink-2">
          在探索面板预览当前塔层、确认小队后点「开始挑战」即可直接进入战斗。
        </p>
        <button type="button" class="btn-primary" @click="emit('exit-to-explore')">去探索选队</button>
      </div>

      <div v-else-if="currentPhase === 'towerMode'" class="space-y-6">
        <div class="rounded-lg border border-line bg-surface p-6">
          <div class="grid gap-6 md:grid-cols-3">
            <div class="text-center">
              <h3 class="mb-2 text-lg font-bold text-ink">当前进度</h3>
              <div class="mb-2 text-3xl font-bold text-accent">第 {{ currentTowerFloor }} 层</div>
              <div class="text-sm text-ink-2">历史最高：{{ userStore.towerProgress.maxFloor }} 层</div>
            </div>

            <div class="text-center">
              <h3 class="mb-2 text-lg font-bold text-ink">层数状态</h3>
              <div class="mb-2 text-2xl font-bold text-info">
                {{ userStore.hasCompletedFloor(currentTowerFloor) ? '已通过' : '未挑战' }}
              </div>
              <div class="text-sm text-ink-2">每层只能挑战一次，无次数限制</div>
            </div>

            <div class="text-center">
              <h3 class="mb-2 text-lg font-bold text-ink">当前层敌人</h3>
              <!-- SA-T2：敌人由 floor 确定性派生（预览 === 实战），无「刷新」按钮 -->
              <div v-if="!towerEnemyData" class="text-sm text-ink-2">正在载入本层敌人…</div>
              <div v-else class="space-y-2">
                <div class="font-bold text-danger">{{ towerEnemyData.name }}</div>
                <div class="text-sm text-ink-2">{{ towerEnemyData.description }}</div>
                <div class="text-lg font-bold text-highlight">战力: {{ towerEnemyData.floorPower }}</div>
                <div>
                  <span
                    class="rounded px-2 py-1 text-xs font-bold text-on-accent"
                    :class="{
                      'bg-success': towerEnemyData.difficulty === '简单',
                      'bg-warning': towerEnemyData.difficulty === '中等',
                      'bg-danger': towerEnemyData.difficulty === '困难',
                      'bg-highlight': towerEnemyData.difficulty === '极难',
                    }"
                  >
                    {{ towerEnemyData.difficulty }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-line bg-surface p-6">
          <h3 class="mb-4 text-xl font-bold text-ink">选择挑战小队</h3>

          <div class="grid gap-6 md:grid-cols-3">
            <div
              v-for="squad in userStore.presetSquads"
              :key="squad.id"
              class="rounded-lg border border-line bg-surface-2 p-4"
            >
              <div class="mb-3 flex items-center justify-between gap-2">
                <input
                  :value="squad.name"
                  class="min-w-0 rounded border border-transparent bg-transparent px-2 py-1 font-bold text-ink transition-colors hover:border-line"
                  maxlength="20"
                  @change="updateSquadName(squad.id, ($event.target as HTMLInputElement).value)"
                >
                <div class="shrink-0 text-sm text-ink-2">{{ getSquadMemberCount(squad.id) }}/{{ SQUAD_MEMBER_COUNT }}</div>
              </div>

              <div class="mb-3 grid grid-cols-5 gap-2">
                <div
                  v-for="position in SQUAD_MEMBER_COUNT"
                  :key="position"
                  class="relative h-[66px] w-[44px] cursor-pointer overflow-hidden rounded border-2 bg-surface-2 transition-colors hover:border-info"
                  :class="{
                    'border-success': isSquadSlotValid(squad.id, position - 1),
                    'border-danger bg-danger/10': squad.members[position - 1] && !isSquadSlotValid(squad.id, position - 1),
                    'border-line border-dashed': !squad.members[position - 1],
                  }"
                  :title="getSquadSlotIssue(squad.id, position - 1)"
                  @click="openCharacterSelect(squad.id, position - 1)"
                >
                  <div v-if="squad.members[position - 1]" class="absolute inset-0">
                    <img
                      loading="lazy"
                      decoding="async"
                      :src="gameDataStore.getCharacterCardById(squad.members[position - 1]!)?.image_path"
                      :alt="gameDataStore.getCharacterCardById(squad.members[position - 1]!)?.name"
                      class="h-full w-full object-cover object-top"
                      @error="($event.target as HTMLImageElement).src = assetUrl('/data/images/character/77.jpg')"
                    >
                    <div class="absolute left-0 top-0 flex h-4 w-4 items-center justify-center rounded-br bg-elevated/85 text-xs text-ink">
                      {{ position }}
                    </div>
                    <div
                      v-if="!isSquadSlotValid(squad.id, position - 1)"
                      class="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-bl bg-danger text-xs text-on-accent"
                    >
                      !
                    </div>
                  </div>
                  <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-ink-2">
                    <div class="mb-1 text-lg">+</div>
                    <div class="text-xs">{{ position }}</div>
                  </div>
                </div>
              </div>

              <div class="mb-3 text-sm">
                <span class="text-ink-2">战力:</span>
                <span class="ml-1 font-bold text-highlight">{{ getSquadPower(squad.id) }}</span>
                <!-- SC-T5：软战力门槛（满编时对当前层给推荐 + delta + 三档，不硬拦）。 -->
                <span
                  v-if="getSquadMemberCount(squad.id) === SQUAD_MEMBER_COUNT && squadReadinessFor(squad.id)"
                  class="ml-2 font-semibold"
                  :class="{
                    'text-success': squadReadinessFor(squad.id)!.level === 'ready',
                    'text-warning': squadReadinessFor(squad.id)!.level === 'risky',
                    'text-danger': squadReadinessFor(squad.id)!.level === 'underpowered',
                  }"
                >{{ readinessHintFor(squad.id) }}</span>
              </div>

              <button
                type="button"
                class="min-h-11 w-full rounded-lg bg-accent px-3 py-2 text-sm font-bold leading-tight text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-45"
                :disabled="!canStartTowerBattle(squad.id)"
                @click="startTowerBattle(squad.id)"
              >
                <span v-if="getSquadMemberCount(squad.id) < SQUAD_MEMBER_COUNT">
                  {{ getTowerSquadIssue(squad.id) || `需要5人 SSR/HR/UR 满编 (${getSquadMemberCount(squad.id)}/${SQUAD_MEMBER_COUNT})` }}
                </span>
                <span v-else-if="userStore.hasCompletedFloor(currentTowerFloor)">本层已通过</span>
                <span v-else-if="!towerEnemyData">载入敌人中…</span>
                <span v-else>开始挑战</span>
              </button>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-info bg-info/10 p-4">
          <div class="flex items-start gap-3">
            <div class="text-xl text-info">塔</div>
            <div>
              <h3 class="mb-2 font-bold text-info">爬塔规则</h3>
              <ul class="space-y-1 text-sm text-ink-2">
                <li>挑战塔需要 5 名已拥有 SSR/HR/UR 角色</li>
                <li>胜利并通过当前层后获得角色经验、知识点和装备掉落机会</li>
                <li>通过当前层后解锁下一层</li>
                <li>每 5 层难度显著提升</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="currentPhase === 'battle'" class="space-y-6">
        <div v-if="towerEnemyData" class="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-surface p-4 text-sm">
          <span class="font-semibold text-accent">第 {{ currentTowerFloor }} 层</span>
          <span class="text-ink-3">·</span>
          <span class="font-medium text-danger">{{ towerEnemyData.name }}</span>
          <!-- SC-T5：我方战力 + 软战力门槛提示（推荐 + delta + 三档，不硬拦）。 -->
          <span v-if="battleReadiness" class="text-ink-2">
            我方战力 <span class="font-bold text-highlight">{{ battleReadiness.playerPower }}</span>
            <span
              class="ml-1 font-semibold"
              :class="{
                'text-success': battleReadiness.level === 'ready',
                'text-warning': battleReadiness.level === 'risky',
                'text-danger': battleReadiness.level === 'underpowered',
              }"
            >· {{ readinessHintFor(selectedSquadForBattle!) }}</span>
          </span>
          <span class="ml-auto text-ink-2">敌方战力 <span class="font-bold text-highlight">{{ towerEnemyData.floorPower }}</span></span>
        </div>

        <SquadBattlefield
          :player-units="playerBattleUnits"
          :enemy-units="enemyBattleUnits"
          :floating-damages="floatingDamages"
          :auto-ultimates="autoUltimates"
          :playback-speed="playbackSpeed"
          :fx="battleFx"
          :battle-ended="battleEnded"
          :elapsed-ms="battleElapsedMs"
          :max-time-ms="DEFAULT_MAX_TIME_MS"
          :targeting-caster-id="ultimateTargetingUnitId"
          :targeting-caster-name="ultimateTargetingUnitId ? unitName(ultimateTargetingUnitId) : ''"
          @toggle-auto="handleToggleAutoUltimates"
          @set-speed="playbackSpeed = $event"
          @cast-ultimate="handleManualUltimate"
          @select-target="handleSelectUltimateTarget"
          @cancel-targeting="ultimateTargetingUnitId = null"
        />

        <SquadBattleLog :logs="battleLog" />
      </div>

      <div v-else-if="currentPhase === 'result'" class="space-y-6">
        <SquadBattleResult
          :result="battleResult"
          :rewards="battleRewards"
          :can-retry="Boolean(selectedSquadForBattle && battleResult === 'defeat')"
          @continue="restart"
          @retry="selectedSquadForBattle && startTowerBattle(selectedSquadForBattle)"
        />
      </div>
    </div>

    <CharacterSelectModal
      :is-open="showCharacterSelectModal"
      :position="selectedPosition"
      :current-character-id="editingSquadId ? (userStore.getSquadMembers(editingSquadId)[selectedPosition] || undefined) : undefined"
      :used-character-ids="editingSquadId ? getUsedCharacterIds(editingSquadId, selectedPosition) : []"
      :allowed-rarities="towerSquadAllowedRarities"
      :is-character-selectable="isCharacterSelectableForTower"
      @close="showCharacterSelectModal = false"
      @select="handleCharacterSelect"
      @remove="handleCharacterRemove"
    />
  </div>
</template>
