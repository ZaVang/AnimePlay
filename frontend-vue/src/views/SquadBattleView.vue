<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useEquipmentStore } from '@/stores/equipment';
import {
  SQUAD_MEMBER_COUNT,
  TOWER_SQUAD_ALLOWED_RARITIES,
  calculateBattlePower,
  calculateTowerBattleRewards,
  createSeededRng,
  generateBattleStats,
  generateTowerFloorEnemies,
  towerFloorEnemySeed,
  isTowerSquadRarity,
  simulateTimedBattle,
  validateTowerSquadMembers,
  type BattleStats,
  type ManualUltimateOrder,
  type SquadPosition,
  type SquadUnitSetup,
  type StatusKind,
  type TimedBattleEvent,
  type TimedBattleResult,
  type TimedBattleWinner,
  type TowerFloorSquad,
} from '@/engine';
import { CHARACTER_IMAGE_POOL } from '@/utils/imageUtils';
import { assetUrl } from '@/utils/assetUrl';
import CharacterSelectModal from '@/components/battle/CharacterSelectModal.vue';
import SquadBattlefield from '@/components/battle/squad/SquadBattlefield.vue';
import SquadBattleLog from '@/components/battle/squad/SquadBattleLog.vue';
import SquadBattleResult from '@/components/battle/squad/SquadBattleResult.vue';
import { getSquadSkillKitForCharacter, isSquadSkillKitReady } from '@/data/squadSkillKits';
import type { CharacterCard } from '@/types/card';
import type { SquadBattleRewardView, SquadBattleUnitView } from '@/components/battle/squad/types';

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
const SQUAD_POSITIONS: SquadPosition[] = ['front', 'front', 'middle', 'middle', 'back'];
const CONTROL_STATUSES: StatusKind[] = ['stun', 'silence', 'taunt'];
const PLAYBACK_DELAY_MS = 180;

const currentPhase = ref<BattlePhase>('towerMode');
const playerSquad = ref<SquadMember[]>([]);
const enemySquad = ref<SquadMember[]>([]);
const battleUnits = ref<RuntimeUnitView[]>([]);
const battleEvents = ref<TimedBattleEvent[]>([]);
const battleLog = ref<string[]>([]);
const battleResult = ref<'victory' | 'defeat' | null>(null);
const battleElapsedMs = ref(0);
const battleEnded = ref(false);
const autoUltimates = ref(true);
const manualUltimateOrders = ref<ManualUltimateOrder[]>([]);
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

const playerBattleUnits = computed(() => battleUnits.value.filter(unit => unit.side === 'player'));
const enemyBattleUnits = computed(() => battleUnits.value.filter(unit => unit.side === 'enemy'));

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
    userStore.addLog('挑战塔小队只能选择已拥有且拥有完整小队战技能的 HR/UR 角色。', 'warning');
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
    : generateBattleStats(base, userStore.getNurtureData(character.id).statPoints, equipmentStore.resolveEquipBonus(character.id));
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
    userStore.addLog(validation.message ?? '挑战塔需要 5 人 HR/UR 满编小队。', 'warning');
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
  battleRewards.value = { characterExp: 0, knowledgePoints: 0, equipmentDrop: null };
  battleResult.value = null;
  battleSettled.value = false;
  battleEnded.value = false;
  currentPhase.value = 'battle';
  regenerateBattleSimulation(0);
  playNextBattleEvent();
}

function unitSetups(): SquadUnitSetup[] {
  const toSetup = (member: SquadMember, side: 'player' | 'enemy'): SquadUnitSetup => ({
    id: member.unitId,
    name: member.character.name,
    side,
    position: SQUAD_POSITIONS[member.position] ?? 'back',
    stats: member.battleStats,
    skills: getSquadSkillKitForCharacter(member.character),
  });

  return [
    ...playerSquad.value.map(member => toSetup(member, 'player')),
    ...enemySquad.value.map(member => toSetup(member, 'enemy')),
  ];
}

function regenerateBattleSimulation(cursorTime: number) {
  const result = simulateTimedBattle({
    units: unitSetups(),
    rng: createSeededRng(battleSeed.value),
    autoUltimates: autoUltimates.value,
    manualUltimateOrders: manualUltimateOrders.value,
  });
  battleSimulation.value = result;
  battleEvents.value = [...result.events];
  battleEventCursor.value = Math.max(0, battleEvents.value.findIndex(event => event.at > cursorTime));
  if (battleEventCursor.value < 0) battleEventCursor.value = battleEvents.value.length;
  rebuildVisibleBattle(battleEventCursor.value);
}

function baseRuntimeUnits(): RuntimeUnitView[] {
  const fromMember = (member: SquadMember, side: 'player' | 'enemy'): RuntimeUnitView => {
    const ultimate = getSquadSkillKitForCharacter(member.character)?.ultimate;
    return {
      id: member.unitId,
      name: member.character.name,
      imagePath: member.character.image_path || assetUrl('/data/images/character/77.jpg'),
      side,
      position: member.position,
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

function manualFailLabel(reason: 'notReady' | 'controlled' | 'missingSkill'): string {
  if (reason === 'notReady') return '能量不足';
  if (reason === 'controlled') return '被控制';
  return '技能缺失';
}

function playNextBattleEvent() {
  clearBattleTimers();
  if (currentPhase.value !== 'battle' || battleEnded.value) return;
  if (battleEventCursor.value >= battleEvents.value.length) {
    finishTimedBattle();
    return;
  }

  battleEventCursor.value += 1;
  rebuildVisibleBattle(battleEventCursor.value);

  const latest = battleEvents.value[battleEventCursor.value - 1];
  if (latest?.type === 'battleEnd') {
    finishTimedBattle();
    return;
  }
  schedule(playNextBattleEvent, PLAYBACK_DELAY_MS);
}

function handleToggleAutoUltimates() {
  if (battleEnded.value) return;
  const cursorTime = battleElapsedMs.value;
  autoUltimates.value = !autoUltimates.value;
  regenerateBattleSimulation(cursorTime);
  playNextBattleEvent();
}

function handleManualUltimate(unitId: string) {
  if (battleEnded.value || autoUltimates.value) return;
  const unit = battleUnits.value.find(candidate => candidate.id === unitId);
  if (!unit?.ultimateReady) return;
  const orderAt = battleElapsedMs.value + 1;
  manualUltimateOrders.value = [...manualUltimateOrders.value, { unitId, atMs: orderAt }];
  regenerateBattleSimulation(battleElapsedMs.value);
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

const pendingTimers = new Set<number>();

function schedule(fn: () => void, delay: number) {
  const id = window.setTimeout(() => {
    pendingTimers.delete(id);
    fn();
  }, delay);
  pendingTimers.add(id);
}

function clearBattleTimers() {
  pendingTimers.forEach(id => clearTimeout(id));
  pendingTimers.clear();
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
              </div>

              <button
                type="button"
                class="min-h-11 w-full rounded-lg bg-accent px-3 py-2 text-sm font-bold leading-tight text-on-accent transition-colors hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-45"
                :disabled="!canStartTowerBattle(squad.id)"
                @click="startTowerBattle(squad.id)"
              >
                <span v-if="getSquadMemberCount(squad.id) < SQUAD_MEMBER_COUNT">
                  {{ getTowerSquadIssue(squad.id) || `需要5人 HR/UR 满编 (${getSquadMemberCount(squad.id)}/${SQUAD_MEMBER_COUNT})` }}
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
                <li>挑战塔需要 5 名已拥有 HR/UR 角色</li>
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
          <span class="ml-auto text-ink-2">敌方战力 <span class="font-bold text-highlight">{{ towerEnemyData.floorPower }}</span></span>
        </div>

        <SquadBattlefield
          :player-units="playerBattleUnits"
          :enemy-units="enemyBattleUnits"
          :auto-ultimates="autoUltimates"
          :battle-ended="battleEnded"
          :elapsed-ms="battleElapsedMs"
          @toggle-auto="handleToggleAutoUltimates"
          @cast-ultimate="handleManualUltimate"
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
