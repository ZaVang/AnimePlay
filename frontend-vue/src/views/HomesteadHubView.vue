<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { SWEEP_WEEKLY_CAP } from '@/stores/pve';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useEquipmentStore } from '@/stores/equipment';
import { SLOT_META, SLOT_PITY_THRESHOLD } from '@/config/equipment';
import HomesteadView from './HomesteadView.vue';
import NurtureView from './NurtureView.vue';
import SquadBattleView from './SquadBattleView.vue';
import {
  SQUAD_MEMBER_COUNT,
  TOWER_SQUAD_ALLOWED_RARITIES,
  assessSquadReadiness,
  calculateBattlePower,
  calculateSweepReward,
  calculateTowerBattleRewards,
  createSeededRng,
  generateTowerFloorEnemies,
  isTowerSquadRarity,
  towerFloorEnemySeed,
  validateTowerSquadMembers,
  type BattleStats,
  type SquadPosition,
  type SquadReadinessAssessment,
} from '@/engine';
import { CHARACTER_IMAGE_POOL } from '@/utils/imageUtils';
import CharacterSelectModal from '@/components/battle/CharacterSelectModal.vue';
import CharacterAvatar from '@/components/CharacterAvatar.vue';
import { getSquadSkillKitForCharacter, isSquadSkillKitReady, getSquadRoleInfo, type SquadRoleInfo } from '@/data/squadSkillKits';
import { POSITION_META } from '@/data/squad/archetypeTemplates';
import { resolveMemberBattleStats } from '@/utils/battleStats';
import type { CharacterCard } from '@/types/card';

type HubTab = 'home' | 'characters' | 'squad' | 'explore' | 'battle';

interface HubTabItem {
  key: HubTab;
  label: string;
  desc: string;
}

const tabs: HubTabItem[] = [
  { key: 'home', label: '家园', desc: '入住与离线收益' },
  { key: 'characters', label: '角色', desc: '五维/装备/技能' },
  { key: 'squad', label: '编队', desc: '5 人站位与战力' },
  { key: 'explore', label: '探索', desc: '塔层/敌人/奖励' },
  { key: 'battle', label: '战斗', desc: '横板半自动' },
];

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const equipmentStore = useEquipmentStore();

const selectedSquadId = ref<number | null>(null);

// SA-T6（Plan A）：explore 「开始挑战」直达进战——记录本次进战的小队 id，供 battle tab 的
// SquadBattleView 以 entrySquadId 直接跳到 battle 阶段（跳过其 towerMode 编成器）。
// 深链/刷新直接点 battle tab（无此值）时 SquadBattleView 落最小占位、不复活编成器。
const battleEntrySquadId = ref<number | null>(null);

// SA-T1：hub squad 面板编队编辑（复用 CharacterSelectModal，与 SquadBattleView 同一套 picker/校验）。
const showCharacterSelectModal = ref(false);
const editingSquadId = ref<number | null>(null);
const editingPosition = ref(0);
const towerSquadAllowedRarities = TOWER_SQUAD_ALLOWED_RARITIES;

function normalizeTab(value: unknown): HubTab {
  return tabs.some(tab => tab.key === value) ? value as HubTab : 'home';
}

const activeTab = computed(() => normalizeTab(route.query.tab));

function switchTab(tab: HubTab) {
  router.replace({
    path: '/homestead',
    query: tab === 'home' ? {} : { tab },
  });
}

const ownedCharacters = computed(() =>
  Array.from(userStore.characterCollection.entries())
    .map(([id]) => gameDataStore.getCharacterCardById(id))
    .filter((card): card is CharacterCard => card != null)
    .sort((a, b) => rarityWeight(b.rarity) - rarityWeight(a.rarity)),
);

// SC-T6：角色面板改交无壳 NurtureView（自持角色选择/五维/装备/技能/突破/好感/每日互动），
// 原 hub 内嵌 summary（角色选择 + 五维/装备/技能镜像）随之删除，消除双标题/双内容/长滚。

watch(() => userStore.presetSquads, squads => {
  if (selectedSquadId.value == null && squads.length > 0) selectedSquadId.value = squads[0].id;
}, { immediate: true, deep: true });

const selectedSquad = computed(() => {
  return userStore.presetSquads.find(squad => squad.id === selectedSquadId.value) ?? userStore.presetSquads[0] ?? null;
});

function squadValidation(squadId: number) {
  return validateTowerSquadMembers({
    members: userStore.getSquadMembers(squadId),
    getCharacter: id => gameDataStore.getCharacterCardById(id),
    isOwned: id => userStore.getCharacterCardCount(id) > 0,
    hasCompleteSkillKit: isSquadSkillKitReady,
  });
}

function memberPower(character: CharacterCard): number {
  const stats = resolveMemberBattleStats(
    baseStatsOf(character),
    userStore.getNurtureData(character.id),
    equipmentStore.resolveEquipBonus(character.id),
  );
  return calculateBattlePower(stats);
}

function squadPower(squadId: number): number {
  const validation = squadValidation(squadId);
  return validation.characters.reduce((sum, character) => sum + memberPower(character), 0);
}

const selectedSquadSlots = computed(() => {
  const squad = selectedSquad.value;
  if (!squad) return [];
  const validation = squadValidation(squad.id);
  const members = userStore.getSquadMembers(squad.id);
  return Array.from({ length: SQUAD_MEMBER_COUNT }, (_, index) => {
    const character = members[index] ? gameDataStore.getCharacterCardById(members[index]!) : null;
    const kit = getSquadSkillKitForCharacter(character);
    return {
      position: index + 1,
      roleInfo: getSquadRoleInfo(character),
      character,
      ok: validation.slots[index]?.ok ?? false,
      issue: validation.slots[index]?.message ?? '空位',
      power: character ? memberPower(character) : 0,
      skills: kit ? [kit.skill1.name, kit.passive.name, kit.ultimate.name] : [],
    };
  });
});

// PCR 式阵型预览：把当前队伍的 5 人按固有站位归入 前排/中排/后排 三列，让玩家一眼看到
// 「战斗时会怎么自动排列」+ 是否缺前排肉盾。站位由角色 role 推导，与战斗完全同源。
const FORMATION_ORDER: SquadPosition[] = ['front', 'middle', 'back'];
interface FormationMember { character: CharacterCard; roleInfo: SquadRoleInfo }
const formationPreview = computed(() => {
  const squad = selectedSquad.value;
  const groups = FORMATION_ORDER.map(position => ({
    position,
    label: POSITION_META[position].label,
    members: [] as FormationMember[],
  }));
  if (squad) {
    for (const id of userStore.getSquadMembers(squad.id)) {
      if (id == null) continue;
      const character = gameDataStore.getCharacterCardById(id);
      const roleInfo = getSquadRoleInfo(character);
      if (character && roleInfo) {
        groups.find(g => g.position === roleInfo.position)?.members.push({ character, roleInfo });
      }
    }
  }
  return groups;
});
/** 缺前排提醒：队伍非空却没有前排坦克 → DPS 会站最前吃满伤害（PCR 式编队直觉）。 */
const formationHasFrontline = computed(() => (formationPreview.value.find(g => g.position === 'front')?.members.length ?? 0) > 0);
const formationMemberCount = computed(() => formationPreview.value.reduce((sum, g) => sum + g.members.length, 0));

// --- SA-T1：编队编辑（换人 / 改名 / 空槽加人；改动经 store action 即时刷新战力/校验）---

/** 挑战塔可选：已拥有 + SSR/HR/UR + 拥有完整小队战技能。与 SquadBattleView 校验口径一致。 */
function isCharacterSelectableForTower(character: CharacterCard): boolean {
  return isTowerSquadRarity(character.rarity) && isSquadSkillKitReady(character);
}

/** 该队其他位置已占用的角色（不含正在编辑的位置）——传给 picker 置灰，避免同角色重复上阵。 */
function getUsedCharacterIds(squadId: number, excludePosition: number): number[] {
  return userStore.getSquadMembers(squadId)
    .map((id, index) => (index !== excludePosition ? id : null))
    .filter((id): id is number => id != null);
}

/** 当前编辑位置已选中的角色 id（picker 高亮/移除用）。 */
const editingCurrentCharacterId = computed<number | undefined>(() => {
  if (editingSquadId.value == null) return undefined;
  return userStore.getSquadMembers(editingSquadId.value)[editingPosition.value] ?? undefined;
});

const editingUsedCharacterIds = computed<number[]>(() =>
  editingSquadId.value == null ? [] : getUsedCharacterIds(editingSquadId.value, editingPosition.value),
);

function openCharacterSelect(squadId: number, position: number) {
  editingSquadId.value = squadId;
  editingPosition.value = position;
  showCharacterSelectModal.value = true;
}

function handleCharacterSelect(characterId: number, position: number) {
  if (editingSquadId.value == null) return;
  const character = gameDataStore.getCharacterCardById(characterId);
  if (!character || userStore.getCharacterCardCount(characterId) <= 0 || !isCharacterSelectableForTower(character)) {
    userStore.addLog('挑战塔小队只能选择已拥有且拥有完整小队战技能的 SSR/HR/UR 角色。', 'warning');
    return;
  }
  userStore.updateSquadMember(editingSquadId.value, position, characterId);
}

function handleCharacterRemove(position: number) {
  if (editingSquadId.value == null) return;
  userStore.updateSquadMember(editingSquadId.value, position, null);
}

function renameSquad(squadId: number, name: string) {
  const trimmed = name.trim();
  if (trimmed) userStore.updateSquadName(squadId, trimmed);
}

const currentFloor = computed(() => userStore.getCurrentChallengeFloor());
const enemyPreview = computed(() => {
  if (gameDataStore.allCharacterCards.length === 0) return null;
  // SA-T2：与实战同源——用 towerFloorEnemySeed(floor) 派生的确定性种子，预览敌人 === 进战敌人。
  return generateTowerFloorEnemies(
    gameDataStore.allCharacterCards.filter(isSquadSkillKitReady),
    currentFloor.value,
    createSeededRng(towerFloorEnemySeed(currentFloor.value)),
    CHARACTER_IMAGE_POOL,
  );
});

const rewardPreview = computed(() => calculateTowerBattleRewards({
  floor: currentFloor.value,
  progressed: true,
  outcome: { winner: 'player', reason: 'victory' },
  equipmentDrop: null,
}));

// S15-T4：槽位保底显形——距下次「强制命中最接近的槽」还差 N 次通新层掉落判定（满即高亮「下次必出」）。
const slotPity = computed(() => {
  const s = userStore.getSlotPityStatus();
  return { ...s, label: SLOT_META[s.slot].label, icon: SLOT_META[s.slot].icon, threshold: SLOT_PITY_THRESHOLD };
});

// --- SA-T6：explore 「开始挑战」直达进战（与 SquadBattleView canStartTowerBattle 同口径校验）---

/** 当前层是否已通过（已通过则不再重复进战，与 SquadBattleView 一致，改走扫荡）。 */
const currentFloorCleared = computed(() => userStore.hasCompletedFloor(currentFloor.value));

/** 本次进战小队的校验结果（selectedSquad 同口径 validateTowerSquadMembers）。 */
const exploreSquadValidation = computed(() =>
  selectedSquad.value ? squadValidation(selectedSquad.value.id) : null,
);

/** 开战前置：已登录 + 选中合法满编小队 + 当前层未通过。 */
const canStartBattle = computed(() =>
  userStore.isLoggedIn
  && !!selectedSquad.value
  && !currentFloorCleared.value
  && (exploreSquadValidation.value?.ok ?? false),
);

/**
 * SC-T5：软战力门槛——我方 squadPower vs 敌方 floorPower 同口径评估（三档提示，不硬拦）。
 * 无选中小队 / 无敌人预览时为 null（不显示提示）。
 */
const squadReadiness = computed<SquadReadinessAssessment | null>(() => {
  const squad = selectedSquad.value;
  const preview = enemyPreview.value;
  if (!squad || !preview) return null;
  return assessSquadReadiness(squadPower(squad.id), preview.floorPower);
});

/**
 * SC-T5：软提示文案（人话化，含推荐战力 + delta），随三档变化。
 * SF-T4-refine：措辞去「（同口径）」黑话；靠「同一把尺衡量」在提示里点一次可比性，敌我数字并排同尺自然传达。
 */
const readinessHint = computed<string>(() => {
  const r = squadReadiness.value;
  if (!r) return '';
  const gap = Math.abs(r.delta);
  const scale = '（敌我同一把尺衡量）';
  if (r.level === 'ready') return `战力 ${r.playerPower} / 建议 ~${r.recommendedPower}${scale} · 达标，放心开打`;
  if (r.level === 'risky') return `战力 ${r.playerPower} / 建议 ~${r.recommendedPower}${scale} · 略微吃紧（差 ${gap}），谨慎应战`;
  return `战力 ${r.playerPower} / 建议 ~${r.recommendedPower}${scale} · 差距较大（差 ${gap}），建议先养成或扫荡`;
});

/** 开战被拦时给出的原因（留在 explore 显示，不进战）。 */
const startBattleIssue = computed<string>(() => {
  if (!userStore.isLoggedIn) return '请先登录后进入挑战塔。';
  if (!selectedSquad.value) return '请先在「编队」面板配置挑战塔小队。';
  if (currentFloorCleared.value) return '本层已通过，可在下方扫荡已通层，或等待解锁下一层。';
  const validation = exploreSquadValidation.value;
  if (!validation?.ok) return validation?.message ?? '小队未满编，请在「编队」面板补齐 5 名 SSR/HR/UR 角色。';
  return '';
});

/**
 * SA-T6 红线：不再只切到 battle tab 让用户重编队。校验通过则带 selectedSquad.id 直接进战——
 * SquadBattleView 挂载即以 entrySquadId 跳到 battle 阶段。校验不通过则留在 explore 显示 issue。
 */
function startBattleFromExplore() {
  if (!canStartBattle.value || !selectedSquad.value) return;
  battleEntrySquadId.value = selectedSquad.value.id;
  switchTab('battle');
}

// 离开 battle tab（返回探索/切别的 tab）时清空进战 id，避免深链/刷新残留 stale id 误触进战。
watch(activeTab, tab => {
  if (tab !== 'battle') battleEntrySquadId.value = null;
});

/** battle tab 内嵌 SquadBattleView 请求切回探索（占位「去探索」/ 结算后「继续」）。 */
function handleBattleExit() {
  battleEntrySquadId.value = null;
  switchTab('explore');
}

// --- SA-T5：扫荡已通层（周额度封顶 + 缩水奖励 + 轻量一键结算飘字）---

/** 最高可扫荡层 = 最近通过的一层（currentFloor - 1）；未通过任何层则 0（禁扫荡）。 */
const sweepFloor = computed(() => Math.max(0, currentFloor.value - 1));
const sweepWeeklyCap = SWEEP_WEEKLY_CAP;
const sweepUsed = computed(() => userStore.getSweepUsedThisWeek());
const sweepRemaining = computed(() => userStore.getSweepRemaining());
const canSweep = computed(() => userStore.isLoggedIn && sweepFloor.value >= 1 && userStore.canSweep(sweepFloor.value));
const sweepRewardPreview = computed(() => calculateSweepReward(Math.max(1, sweepFloor.value)));

/** 扫荡用的小队：首个含有效成员的预设小队（与编队面板同源；无则回落小队 A id=1）。 */
const sweepSquadId = computed(() => {
  const withMember = userStore.presetSquads.find(sq => userStore.getSquadMembers(sq.id).some(m => m != null));
  return withMember?.id ?? userStore.presetSquads[0]?.id ?? 1;
});

const sweepFloat = ref<string | null>(null);
const timers: ReturnType<typeof setTimeout>[] = [];
function scheduleClear(fn: () => void, ms: number) {
  const t = setTimeout(() => {
    timers.splice(timers.indexOf(t), 1);
    fn();
  }, ms);
  timers.push(t);
}
onUnmounted(() => {
  timers.forEach(clearTimeout);
  timers.length = 0;
});

function handleSweep() {
  if (!canSweep.value) return;
  const outcome = userStore.sweepFloor(sweepFloor.value, sweepSquadId.value);
  if (outcome.ok && outcome.reward) {
    sweepFloat.value = `知识点 +${outcome.reward.sweepKnowledge} · 经验 +${outcome.reward.sweepCharacterExp}`;
    scheduleClear(() => { sweepFloat.value = null; }, 1800);
  }
}

function baseStatsOf(character: CharacterCard): BattleStats {
  return character.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 };
}

function rarityWeight(rarity: string): number {
  return ({ UR: 6, HR: 5, SSR: 4, SR: 3, R: 2, N: 1 } as Record<string, number>)[rarity] ?? 0;
}


</script>

<template>
  <div class="base-hub">
    <!-- ===== 顶部资源 HUD（替代原 hub-hero） ===== -->
    <header class="hub-hud">
      <div class="hud-avatar">
        <i>{{ (userStore.currentUser || '宅').slice(0, 1) }}</i>
        <span class="hud-lv">Lv.{{ userStore.playerState.level }}</span>
      </div>
      <div class="hud-who">
        <b>{{ userStore.currentUser || '未登录访客' }}</b>
        <span>{{ activeTab === 'home' ? '基地' : (tabs.find(t => t.key === activeTab)?.label ?? '基地') }}</span>
      </div>
      <div class="hud-wallet">
        <div class="hud-coin kp">
          <span class="hud-ic">K</span>
          <span class="hud-amt"><b class="num">{{ userStore.playerState.knowledgePoints }}</b><small>知识点</small></span>
        </div>
        <div class="hud-coin anime">
          <span class="hud-ic">动</span>
          <span class="hud-amt"><b class="num">{{ userStore.playerState.animeGachaTickets }}</b><small>动画券</small></span>
        </div>
        <div class="hud-coin char">
          <span class="hud-ic">角</span>
          <span class="hud-amt"><b class="num">{{ userStore.playerState.characterGachaTickets }}</b><small>角色券</small></span>
        </div>
      </div>
    </header>

    <section v-if="activeTab === 'home'" class="hub-panel flush-panel">
      <HomesteadView />
    </section>

    <section v-else-if="activeTab === 'characters'" class="hub-panel">
      <div class="g-phead">
        <span class="g-eyebrow">Characters</span>
        <h2>角色养成</h2>
        <p>五维、装备、等级好感、星级突破与每日互动一并查看与操作。</p>
      </div>

      <!-- SC-T6：单一空态由 hub 壳统一处理；养成/突破/好感全交无壳 NurtureView（消除双标题/双空态/长滚）。 -->
      <div v-if="!userStore.isLoggedIn" class="hub-empty">请先登录后查看角色养成。</div>
      <div v-else-if="ownedCharacters.length === 0" class="hub-empty">暂无角色，先去抽卡获得可养成角色。</div>
      <div v-else class="embedded-view">
        <NurtureView />
      </div>
    </section>

    <section v-else-if="activeTab === 'squad'" class="hub-panel">
      <div class="g-phead g-phead-row">
        <div>
          <span class="g-eyebrow">Formation</span>
          <h2>编队</h2>
          <p>选 5 名角色，战斗时按<strong>职业自动站位</strong>：坦克在前扛伤害、法师/奶妈在后排输出治疗（类似公主连结）。</p>
        </div>
        <button class="btn-primary" type="button" @click="switchTab('explore')">去探索</button>
      </div>

      <div v-if="!userStore.isLoggedIn" class="hub-empty">请先登录后配置挑战塔小队。</div>
      <div v-else class="squad-layout">
        <!-- SF-T4：编队页补敌方基准 + 复用 explore 同源三档提示（我方 squadPower 与敌方 floorPower 同调 calculateBattlePower）。 -->
        <div v-if="enemyPreview" class="g-card g-vs">
          <div class="g-vs-nums">
            <span class="g-vs-side">
              <small>我方战力</small>
              <strong class="num">{{ selectedSquad ? squadPower(selectedSquad.id) : 0 }}</strong>
            </span>
            <span class="g-vs-mid" aria-hidden="true">VS</span>
            <span class="g-vs-side foe">
              <small>第 {{ currentFloor }} 层敌方战力</small>
              <strong class="num">{{ enemyPreview.floorPower }}</strong>
            </span>
          </div>
          <p
            v-if="squadReadiness"
            class="readiness-hint"
            :class="`readiness-${squadReadiness.level}`"
          >
            {{ readinessHint }}
          </p>
        </div>

        <!-- SA-T1：队伍页签（队名可改 + 战力 + 校验数） -->
        <div class="g-sqtabs">
          <div
            v-for="squad in userStore.presetSquads"
            :key="squad.id"
            class="g-sqtab"
            :class="{ active: selectedSquad?.id === squad.id }"
            role="button"
            tabindex="0"
            @click="selectedSquadId = squad.id"
            @keydown.enter="selectedSquadId = squad.id"
          >
            <!-- SA-T1：队名可改（回车/失焦提交，点输入框不触发选队） -->
            <input
              class="g-sqtab-name"
              :value="squad.name"
              maxlength="20"
              aria-label="小队名称"
              @click.stop
              @keydown.enter.stop="($event.target as HTMLInputElement).blur()"
              @change="renameSquad(squad.id, ($event.target as HTMLInputElement).value)"
            >
            <strong class="num">{{ squadPower(squad.id) }}</strong>
            <small>{{ squadValidation(squad.id).characters.length }}/{{ SQUAD_MEMBER_COUNT }} · {{ squadValidation(squad.id).ok ? '可挑战' : '需补齐' }}</small>
          </div>
        </div>

        <!-- PCR 式阵型预览：3 列 前排/中排/后排，显示战斗时的自动站位。缺前排时告警。 -->
        <div class="g-card g-lanes-card">
          <div class="g-lanes-head">
            <span>阵型预览 · 战斗自动排列</span>
            <em
              v-if="formationMemberCount > 0 && !formationHasFrontline"
              class="formation-warn"
            >⚠ 无前排坦克，输出会站最前吃满伤害</em>
          </div>
          <div class="g-lanes">
            <div
              v-for="lane in formationPreview"
              :key="lane.position"
              class="g-lane"
              :class="`lane-${lane.position}`"
            >
              <span class="g-lane-title">{{ lane.label }}</span>
              <div v-if="lane.members.length" class="g-lane-members">
                <div v-for="m in lane.members" :key="m.character.id" class="g-lane-member" :title="`${m.roleInfo.roleLabel} · ${m.roleInfo.roleBlurb}`">
                  <CharacterAvatar class="g-lane-avatar" :character-id="m.character.id" :name="m.character.name" :size="48" rounded="8px" />
                  <span class="g-lane-role">{{ m.roleInfo.roleIcon }}{{ m.roleInfo.roleLabel }}</span>
                </div>
              </div>
              <div v-else class="g-lane-empty">—</div>
            </div>
          </div>
        </div>

        <!-- SA-T1：5 槽站位板——站位可点换人 / 空槽可点加人（按钮 = 可点视觉暗示 + 键盘可达） -->
        <div class="g-formation-board">
          <button
            v-for="slot in selectedSquadSlots"
            :key="slot.position"
            type="button"
            class="g-slot"
            :class="{ ready: slot.ok }"
            :title="slot.character ? '点击更换角色' : '点击添加角色'"
            @click="selectedSquad && openCharacterSelect(selectedSquad.id, slot.position - 1)"
          >
            <span class="g-slot-index">{{ slot.position }}</span>
            <span
              v-if="slot.roleInfo"
              class="g-slot-role"
              :class="`role-${slot.roleInfo.position}`"
              :title="slot.roleInfo.roleBlurb"
            >{{ slot.roleInfo.roleIcon }}{{ slot.roleInfo.roleLabel }}·{{ slot.roleInfo.positionLabel }}</span>
            <template v-if="slot.character">
              <CharacterAvatar class="g-slot-avatar" :character-id="slot.character.id" :name="slot.character.name" :size="56" rounded="10px" />
              <strong>{{ slot.character.name }}</strong>
              <small>{{ slot.character.rarity }} · 战力 {{ slot.power }}</small>
              <em>{{ slot.skills.length ? slot.skills.join(' / ') : slot.issue }}</em>
            </template>
            <template v-else>
              <div class="g-slot-empty">+</div>
              <strong>空位</strong>
              <small>{{ slot.issue }}</small>
            </template>
          </button>
        </div>
      </div>

      <CharacterSelectModal
        :is-open="showCharacterSelectModal"
        :position="editingPosition"
        :current-character-id="editingCurrentCharacterId"
        :used-character-ids="editingUsedCharacterIds"
        :allowed-rarities="towerSquadAllowedRarities"
        :is-character-selectable="isCharacterSelectableForTower"
        @close="showCharacterSelectModal = false"
        @select="handleCharacterSelect"
        @remove="handleCharacterRemove"
      />
    </section>

    <section v-else-if="activeTab === 'explore'" class="hub-panel">
      <div class="g-phead g-phead-row">
        <div>
          <span class="g-eyebrow">Explore</span>
          <h2>探索 · 挑战塔</h2>
          <p>预览当前挑战塔楼层、敌方阵容和通关奖励；确认小队后「开始挑战」直接进入战斗。</p>
        </div>
        <!-- SA-T6：编队在 squad tab 完成，这里只留跳转编辑入口；开战改为下方直达按钮（不再空切 battle tab 重编队）。 -->
        <button class="btn-secondary" type="button" @click="switchTab('squad')">去编队</button>
      </div>

      <div v-if="!userStore.isLoggedIn" class="hub-empty">请先登录后进入挑战塔。</div>
      <div v-else class="g-brief">
        <div class="g-brief-col">
          <article class="g-card g-floor">
            <span class="g-eyebrow">当前塔层</span>
            <strong class="g-floor-big num">第 {{ currentFloor }} 层</strong>
            <small>历史最高 {{ userStore.towerProgress.maxFloor }} 层 · 每层通过后解锁下一层</small>
            <!-- S15-T4：槽位定向掉落保底显形（拍板-F，非选做而是验收项）。 -->
            <p class="pity-line" :class="{ ready: slotPity.ready }">
              <template v-if="slotPity.ready">
                🎯 下次通新层必出 {{ slotPity.icon }}{{ slotPity.label }}（槽位保底已满）
              </template>
              <template v-else>
                距 {{ slotPity.icon }}{{ slotPity.label }} 保底还差 <strong>{{ slotPity.remaining }}</strong> 次通层掉落判定 · 经验 +{{ rewardPreview.characterExp }} / KP +{{ rewardPreview.knowledgePoints }}
              </template>
            </p>
          </article>

          <article v-if="enemyPreview" class="g-card g-enemy">
            <div class="g-enemy-head">
              <div>
                <span class="g-eyebrow">敌方阵容</span>
                <h3>{{ enemyPreview.name }}</h3>
              </div>
              <!-- SF-T4：敌方战力（与我方 squadPower 同调 calculateBattlePower，同一把尺）。 -->
              <div class="g-enemy-power">
                <strong class="num">{{ enemyPreview.floorPower }}</strong>
                <small>敌方战力</small>
              </div>
            </div>
            <p class="g-enemy-desc">{{ enemyPreview.description }} · {{ enemyPreview.difficulty }}</p>
            <div class="g-lineup">
              <div v-for="enemy in enemyPreview.members" :key="enemy.id" class="g-lineup-card">
                <CharacterAvatar class="g-lineup-avatar" :character-id="enemy.id" :name="enemy.name" :size="52" rounded="8px" />
                <span>{{ enemy.name }}</span>
                <small>{{ enemy.rarity }}</small>
              </div>
            </div>
          </article>
        </div>

        <div class="g-brief-col">
          <!-- SA-T6：开战直达——校验选中小队后带 squadId 直接进 battle 阶段（跳过 SquadBattleView 编成器）。 -->
          <article class="g-card g-go">
            <div class="g-go-head">
              <div>
                <span class="g-eyebrow">出战小队</span>
                <h3>{{ selectedSquad ? selectedSquad.name : '尚未配置小队' }}</h3>
              </div>
              <div v-if="selectedSquad" class="g-go-power">
                <strong class="num">{{ squadPower(selectedSquad.id) }}</strong>
                <small>{{ exploreSquadValidation?.characters.length ?? 0 }}/{{ SQUAD_MEMBER_COUNT }} 满编</small>
              </div>
            </div>
            <p v-if="!canStartBattle" class="start-hint">{{ startBattleIssue }}</p>
            <p v-else class="start-hint ready">小队已就绪，点击开始挑战第 {{ currentFloor }} 层。</p>
            <!-- SC-T5：软战力门槛提示（推荐战力 + delta + 三档，不硬拦）。 -->
            <p
              v-if="squadReadiness"
              class="readiness-hint"
              :class="`readiness-${squadReadiness.level}`"
            >
              {{ readinessHint }}
            </p>
            <div class="start-actions">
              <button
                class="g-cta-gold"
                type="button"
                :disabled="!canStartBattle"
                @click="startBattleFromExplore"
              >
                {{ canStartBattle ? '开始挑战' : '暂不可开战' }}
              </button>
              <button class="btn-ghost" type="button" @click="switchTab('squad')">调整编队</button>
            </div>
          </article>

          <!-- SA-T5：扫荡已通层（周额度封顶 + 缩水奖励 + 一键结算飘字，不复用完整战斗演出） -->
          <article class="g-card g-sweep">
            <div class="g-sweep-head">
              <div>
                <span class="g-eyebrow">扫荡已通层</span>
                <h3>卡关也能每周变强一点</h3>
              </div>
              <span class="g-chip gold" :class="{ full: sweepRemaining <= 0 }">
                本周 {{ sweepUsed }}/{{ sweepWeeklyCap }}
              </span>
            </div>

            <div class="g-bar" role="progressbar" :aria-valuenow="sweepUsed" :aria-valuemax="sweepWeeklyCap">
              <span :style="{ width: `${Math.min(100, (sweepUsed / sweepWeeklyCap) * 100)}%` }"></span>
            </div>

            <p v-if="sweepFloor < 1" class="sweep-hint">先通过第 1 层，之后即可扫荡已通层领取缩水奖励。</p>
            <p v-else class="sweep-hint">
              扫荡第 {{ sweepFloor }} 层（已通层）：知识点 +{{ sweepRewardPreview.sweepKnowledge }} · 经验 +{{ sweepRewardPreview.sweepCharacterExp }}（缩水补给，不掉装备）。
            </p>

            <div class="sweep-actions">
              <button
                class="btn-secondary"
                type="button"
                :disabled="!canSweep"
                @click="handleSweep"
              >
                {{ sweepRemaining <= 0 ? '本周已达上限' : sweepFloor < 1 ? '暂无可扫荡层' : `一键扫荡（剩 ${sweepRemaining} 次）` }}
              </button>
              <transition name="sweep-float">
                <span v-if="sweepFloat" class="sweep-float-text">{{ sweepFloat }}</span>
              </transition>
            </div>
          </article>
        </div>
      </div>
    </section>

    <section v-else class="hub-panel flush-panel battle-panel">
      <div class="g-battle-return">
        <button class="btn-secondary" type="button" @click="handleBattleExit">‹ 返回探索预览</button>
        <span>战斗结算后，经验、装备和知识点会回流到角色/装备/基地循环。</span>
      </div>
      <!-- SA-T6：battle tab 仅承载战斗演出——带合法 entrySquadId 时 SquadBattleView 直达 battle 阶段，
           无 entrySquadId（深链/刷新）时落最小占位（不复活 towerMode 编成器）。 -->
      <SquadBattleView
        :entry-squad-id="battleEntrySquadId"
        :embedded="true"
        @exit-to-explore="handleBattleExit"
      />
    </section>

    <!-- ===== 底部指令栏（替代原 hub-tabs）：5 个胖图标按钮，sticky 吸底 ===== -->
    <nav class="hub-dock" aria-label="基地面板">
      <button
        type="button"
        class="hub-dock-btn"
        :class="{ active: activeTab === 'home' }"
        @click="switchTab('home')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/></svg>
        <span>家园</span>
      </button>
      <button
        type="button"
        class="hub-dock-btn"
        :class="{ active: activeTab === 'characters' }"
        @click="switchTab('characters')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7"/></svg>
        <span>角色</span>
      </button>
      <button
        type="button"
        class="hub-dock-btn"
        :class="{ active: activeTab === 'squad' }"
        @click="switchTab('squad')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="8" cy="9" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M2.5 20c0-3 2.4-5.4 5.5-5.4S13.5 17 13.5 20"/><path d="M15 20c0-2.3 1.4-4.2 3.6-4.2"/></svg>
        <span>编队</span>
      </button>
      <button
        type="button"
        class="hub-dock-btn"
        :class="{ active: activeTab === 'explore' }"
        @click="switchTab('explore')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 6v6c0 5 3.5 8 8 10 4.5-2 8-5 8-10V6z"/><path d="m9 12 2 2 4-4"/></svg>
        <span>探索</span>
        <span class="hub-dock-dot" aria-hidden="true"></span>
      </button>
      <button
        type="button"
        class="hub-dock-btn"
        :class="{ active: activeTab === 'battle' }"
        @click="switchTab('battle')"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m14.5 4 5.5 5.5-9 9L5.5 13z"/><path d="m4 20 3-3"/><path d="M18 4 20 6"/></svg>
        <span>战斗</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
/* dock 高度 + 与内容间距，避免 sticky dock 遮住末尾内容（改造清单 D） */
.base-hub { display: flex; flex-direction: column; gap: 1rem; padding-bottom: 5.5rem; }

/* ===== 外壳共同语言 ===== */
/* 胖卡 .g-card：面 + 1px 线 + 面板圆角 + 柔和投影 + 顶部 40% 高光 */
.g-card {
  position: relative;
  border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  background: rgb(var(--c-surface)); box-shadow: var(--sk-shadow-card);
}
.g-card::before {
  content: ""; position: absolute; inset: 0 0 auto 0; height: 40%;
  border-radius: var(--sk-radius-panel) var(--sk-radius-panel) 0 0;
  background: linear-gradient(180deg, rgb(var(--c-elevated) / .5), transparent);
  pointer-events: none;
}
.g-eyebrow {
  display: inline-block; font-size: .64rem; font-weight: 800; letter-spacing: .12em;
  text-transform: uppercase; color: rgb(var(--c-accent-2));
}
/* 胶囊 .g-chip：语义令牌淡底 + 同色字 */
.g-chip {
  display: inline-flex; align-items: center; gap: .3rem; font-size: .68rem; font-weight: 800;
  padding: .18rem .55rem; border-radius: 999px;
  background: rgb(var(--c-accent-soft)); color: rgb(var(--c-accent-2));
}
.g-chip.warn { background: rgb(var(--c-warning) / .16); color: rgb(var(--c-warning)); }
.g-chip.good { background: rgb(var(--c-success) / .16); color: rgb(var(--c-success)); }
.g-chip.gold { background: rgb(var(--c-highlight) / .16); color: rgb(var(--c-highlight)); }
.g-chip.gold.full { color: rgb(var(--c-highlight)); filter: saturate(1.2); }
/* 金色主 CTA（立体下缘投影 + on-accent 字） */
.g-cta-gold {
  display: inline-flex; align-items: center; justify-content: center; gap: .4rem;
  font-weight: 800; font-size: .9rem; padding: .6rem 1.2rem; border: 0;
  border-radius: var(--sk-radius-control); cursor: pointer; color: rgb(var(--c-on-accent));
  background: linear-gradient(180deg, rgb(var(--c-highlight)), rgb(var(--c-highlight) / .82));
  box-shadow: 0 3px 0 rgb(var(--c-highlight) / .55), var(--sk-shadow-card);
  transition: filter .12s, transform .12s, box-shadow .12s;
}
.g-cta-gold:hover:not(:disabled) { filter: brightness(1.05); }
.g-cta-gold:active:not(:disabled) { transform: translateY(1px); box-shadow: 0 1px 0 rgb(var(--c-highlight) / .55); }
.g-cta-gold:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
.num { font-variant-numeric: tabular-nums; letter-spacing: -.01em; }

/* ===== 顶部资源 HUD ===== */
.hub-hud {
  display: flex; align-items: center; gap: .75rem; flex-wrap: wrap;
  padding: .65rem .9rem; border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  background: linear-gradient(180deg, rgb(var(--c-elevated)), rgb(var(--c-surface)));
  box-shadow: var(--sk-shadow-card);
}
.hud-avatar {
  position: relative; width: 46px; height: 46px; flex: 0 0 auto; border-radius: 50%;
  background: conic-gradient(rgb(var(--c-highlight)), rgb(var(--c-accent)), rgb(var(--c-highlight)));
  padding: 2.5px; box-shadow: var(--sk-shadow-card);
}
.hud-avatar i {
  display: grid; place-items: center; width: 100%; height: 100%; border-radius: 50%;
  background: rgb(var(--c-surface)); font-style: normal; font-weight: 900; font-size: 1.05rem;
  color: rgb(var(--c-accent-2));
}
.hud-lv {
  position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%);
  background: rgb(var(--c-highlight)); color: rgb(var(--c-on-accent));
  font-weight: 900; font-size: .58rem; padding: .05rem .35rem; border-radius: 999px; white-space: nowrap;
}
.hud-who { display: flex; flex-direction: column; line-height: 1.2; margin-right: auto; min-width: 0; }
.hud-who b { font-size: .92rem; font-weight: 800; color: rgb(var(--c-ink)); }
.hud-who span { font-size: .68rem; color: rgb(var(--c-ink-3)); }
.hud-wallet { display: flex; gap: .4rem; flex-wrap: wrap; }
.hud-coin {
  display: flex; align-items: center; gap: .35rem;
  background: rgb(var(--c-surface-2)); border: 1px solid rgb(var(--c-line));
  border-radius: 999px; padding: .26rem .6rem .26rem .3rem;
}
.hud-ic {
  width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; flex: 0 0 auto;
  font-size: .7rem; font-weight: 900; color: rgb(var(--c-on-accent));
}
.hud-coin.kp .hud-ic { background: rgb(var(--c-accent)); }
.hud-coin.anime .hud-ic { background: rgb(var(--c-highlight)); }
.hud-coin.char .hud-ic { background: rgb(var(--c-info)); }
.hud-amt { display: flex; flex-direction: column; line-height: 1.05; }
.hud-amt b { font-size: .82rem; font-weight: 800; color: rgb(var(--c-ink)); }
.hud-amt small { font-size: .58rem; color: rgb(var(--c-ink-3)); }

/* ===== 面板容器 / 紧凑标题 ===== */
.hub-panel {
  padding: 1rem; border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  background: rgb(var(--c-surface) / .72);
}
.flush-panel { padding: 0; border: 0; background: transparent; }
.g-phead { margin-bottom: 1rem; }
.g-phead h2 { font-size: 1.3rem; font-weight: 900; color: rgb(var(--c-ink)); margin: .1rem 0; }
.g-phead p { color: rgb(var(--c-ink-2)); font-size: .84rem; max-width: 52ch; }
.g-phead p strong { color: rgb(var(--c-accent-2)); }
.g-phead-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; }
.hub-empty { padding: 2.5rem 1rem; text-align: center; color: rgb(var(--c-ink-2)); }
.embedded-view { margin-top: 1rem; border-top: 1px solid rgb(var(--c-line)); }

/* ===== 编队面板 ===== */
.squad-layout { display: flex; flex-direction: column; gap: 1rem; }
/* VS 战力对比条 */
.g-vs { padding: .85rem 1rem; display: flex; flex-direction: column; gap: .4rem; }
.g-vs-nums { display: flex; align-items: center; justify-content: center; gap: 1.4rem; }
.g-vs-side { display: flex; flex-direction: column; align-items: center; text-align: center; }
.g-vs-side small { font-size: .66rem; color: rgb(var(--c-ink-3)); }
.g-vs-side strong { font-size: 1.7rem; font-weight: 900; color: rgb(var(--c-highlight)); }
.g-vs-side.foe strong { color: rgb(var(--c-danger)); }
.g-vs-mid { font-size: .9rem; font-weight: 900; color: rgb(var(--c-ink-3)); }
/* 队伍页签 */
.g-sqtabs { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: .55rem; }
.g-sqtab {
  padding: .6rem .55rem; border-radius: var(--sk-radius-control); border: 1px solid rgb(var(--c-line));
  background: rgb(var(--c-surface)); text-align: center; cursor: pointer; transition: transform .1s, border-color .15s, box-shadow .15s;
}
.g-sqtab:hover { transform: translateY(-1px); border-color: rgb(var(--c-accent)); }
.g-sqtab.active { border-color: rgb(var(--c-accent)); box-shadow: inset 0 0 0 1.5px rgb(var(--c-accent)); background: rgb(var(--c-accent-soft) / .5); }
.g-sqtab strong { display: block; font-size: 1.1rem; font-weight: 900; color: rgb(var(--c-highlight)); }
.g-sqtab small { display: block; font-size: .62rem; color: rgb(var(--c-ink-3)); }
.g-sqtab-name {
  display: block; width: 100%; padding: .1rem .3rem; margin-bottom: .15rem; text-align: center;
  border: 1px solid transparent; border-radius: 5px; background: transparent;
  color: rgb(var(--c-ink)); font-weight: 800; font-size: .9rem; cursor: text;
}
.g-sqtab-name:hover { border-color: rgb(var(--c-line)); }
.g-sqtab-name:focus { outline: none; border-color: rgb(var(--c-accent)); background: rgb(var(--c-surface-2) / .6); }
/* 前中后 lane 阵型预览 */
.g-lanes-card { padding: .85rem 1rem; display: flex; flex-direction: column; gap: .6rem; }
.g-lanes-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem; font-size: .8rem; font-weight: 800; color: rgb(var(--c-ink-2)); }
.formation-warn { color: rgb(var(--c-danger)); font-style: normal; font-size: .74rem; font-weight: 700; }
.g-lanes { display: grid; grid-template-columns: repeat(3, 1fr); gap: .6rem;
  background: linear-gradient(180deg, rgb(var(--c-accent-soft) / .35), rgb(var(--c-surface-2) / .4));
  border-radius: var(--sk-radius-control); padding: .7rem; }
.g-lane { display: flex; flex-direction: column; gap: .4rem; padding: .5rem; border-radius: var(--sk-radius-control); background: rgb(var(--c-surface) / .6); min-height: 84px; }
.g-lane.lane-front { border-top: 3px solid rgb(var(--c-danger)); }
.g-lane.lane-middle { border-top: 3px solid rgb(var(--c-highlight)); }
.g-lane.lane-back { border-top: 3px solid rgb(var(--c-info)); }
.g-lane-title { font-size: .66rem; font-weight: 900; text-align: center; color: rgb(var(--c-ink-2)); }
.g-lane-members { display: flex; flex-wrap: wrap; gap: .45rem; justify-content: center; }
.g-lane-member { display: flex; flex-direction: column; align-items: center; gap: .15rem; width: 48px; }
.g-lane-member img { width: 48px; height: 48px; border-radius: 8px; object-fit: cover; object-position: top; border: 1px solid rgb(var(--c-line)); }
.g-lane-avatar { box-shadow: var(--sk-shadow-card); }
.g-lane-role { font-size: .58rem; font-weight: 700; color: rgb(var(--c-ink-2)); white-space: nowrap; }
.g-lane-empty { color: rgb(var(--c-ink-3)); font-size: .9rem; text-align: center; }
/* 5 槽站位板 */
.g-formation-board { display: grid; grid-template-columns: repeat(5, minmax(130px, 1fr)); gap: .7rem; }
.g-slot {
  position: relative; min-height: 270px; padding: .75rem; border: 1px dashed rgb(var(--c-line));
  border-radius: var(--sk-radius-panel); background: rgb(var(--c-surface-2) / .72); overflow: hidden;
  width: 100%; text-align: left; cursor: pointer; box-shadow: var(--sk-shadow-card);
  transition: border-color .15s, box-shadow .15s, transform .15s;
}
.g-slot:hover { border-color: rgb(var(--c-accent)); transform: translateY(-1px); box-shadow: inset 0 0 0 1px rgb(var(--c-accent)); }
.g-slot:hover .g-slot-empty { border-color: rgb(var(--c-accent)); color: rgb(var(--c-accent)); }
.g-slot.ready { border-style: solid; border-color: rgb(var(--c-success)); }
.g-slot-index { position: absolute; top: .45rem; left: .45rem; z-index: 1; font-size: .7rem; font-weight: 800; color: rgb(var(--c-ink-3)); }
.g-slot-role {
  position: absolute; top: .4rem; right: .4rem; z-index: 1; font-size: .64rem; font-weight: 800;
  padding: .1rem .35rem; border-radius: 999px; color: rgb(var(--c-on-accent)); white-space: nowrap;
}
.g-slot-role.role-front { background: rgb(var(--c-danger)); }
.g-slot-role.role-middle { background: rgb(var(--c-highlight)); }
.g-slot-role.role-back { background: rgb(var(--c-info)); }
.g-slot-img { width: 100%; height: 128px; margin-top: .8rem; border-radius: 8px; object-fit: cover; object-position: top; }
.g-slot-avatar { margin-top: 1.5rem; box-shadow: var(--sk-shadow-card); }
.g-slot strong, .g-slot small, .g-slot em { display: block; }
.g-slot strong { margin-top: .5rem; color: rgb(var(--c-ink)); font-size: .9rem; }
.g-slot small { color: rgb(var(--c-ink-2)); font-size: .75rem; }
.g-slot em { margin-top: .35rem; color: rgb(var(--c-accent-2)); font-size: .7rem; line-height: 1.35; font-style: normal; }
.g-slot-empty { display: grid; place-items: center; height: 128px; margin-top: .8rem; border: 1px dashed rgb(var(--c-line)); border-radius: 8px; color: rgb(var(--c-ink-3)); font-size: 2rem; }

/* ===== 探索面板：出击简报 ===== */
.g-brief { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: 1rem; align-items: start; }
.g-brief-col { display: flex; flex-direction: column; gap: 1rem; }
.g-floor {
  padding: 1.1rem 1rem; text-align: center; overflow: hidden;
  background: radial-gradient(120% 90% at 50% 0, rgb(var(--c-accent-soft) / .75), rgb(var(--c-surface)));
}
.g-floor .g-eyebrow { color: rgb(var(--c-accent-2)); }
.g-floor-big { display: block; margin: .3rem 0; font-size: 2rem; font-weight: 900; line-height: 1; color: rgb(var(--c-ink)); }
.g-floor small { color: rgb(var(--c-ink-2)); font-size: .74rem; }
/* S15-T4：槽位保底进度显形（accent 语义令牌；满即高亮 accent-soft 背景）。 */
.pity-line {
  margin-top: .55rem; padding: .4rem .6rem; border-radius: var(--sk-radius-control); font-size: .74rem; line-height: 1.4;
  color: rgb(var(--c-ink-2)); background: rgb(var(--c-surface-2) / .6); border: 1px solid rgb(var(--c-line));
}
.pity-line strong { display: inline; margin: 0; font-size: 1em; color: rgb(var(--c-accent-2)); }
.pity-line.ready {
  color: rgb(var(--c-accent-2)); font-weight: 700;
  background: rgb(var(--c-accent-soft) / .7); border-color: rgb(var(--c-accent));
}
.g-enemy { padding: 1rem; }
.g-enemy-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.g-enemy-head h3 { color: rgb(var(--c-ink)); font-size: 1.1rem; font-weight: 900; margin-top: .1rem; }
.g-enemy-power { text-align: right; }
.g-enemy-power strong { display: block; color: rgb(var(--c-danger)); font-size: 1.4rem; font-weight: 900; }
.g-enemy-power small { color: rgb(var(--c-ink-3)); font-size: .62rem; }
.g-enemy-desc { margin: .5rem 0 .85rem; color: rgb(var(--c-ink-2)); font-size: .82rem; }
.g-lineup { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .5rem; }
.g-lineup-card { text-align: center; }
.g-lineup-card img { width: 100%; aspect-ratio: 3 / 4; border-radius: var(--sk-radius-control); object-fit: cover; object-position: top; border: 1px solid rgb(var(--c-line)); }
.g-lineup-avatar { margin: 0 auto; box-shadow: var(--sk-shadow-card); }
.g-lineup-card span { display: block; margin-top: .3rem; color: rgb(var(--c-ink-2)); font-weight: 700; font-size: .62rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.g-lineup-card small { color: rgb(var(--c-ink-3)); font-size: .58rem; }
/* 开战卡 */
.g-go {
  padding: 1rem; display: flex; flex-direction: column; gap: .7rem;
  background: linear-gradient(135deg, rgb(var(--c-accent-soft) / .7), rgb(var(--c-surface)));
  border-color: rgb(var(--c-accent));
}
.g-go-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.g-go-head h3 { color: rgb(var(--c-ink)); font-size: 1.1rem; font-weight: 900; margin-top: .1rem; }
.g-go-power { text-align: right; }
.g-go-power strong { display: block; color: rgb(var(--c-highlight)); font-size: 1.4rem; font-weight: 900; }
.g-go-power small { color: rgb(var(--c-ink-2)); font-size: .7rem; }
.start-hint { color: rgb(var(--c-ink-2)); font-size: .82rem; }
.start-hint.ready { color: rgb(var(--c-success)); font-weight: 700; }
.readiness-hint { margin-top: .1rem; font-size: .78rem; font-weight: 600; }
.readiness-ready { color: rgb(var(--c-success)); }
.readiness-risky { color: rgb(var(--c-warning)); }
.readiness-underpowered { color: rgb(var(--c-danger)); }
.start-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; }
.start-actions .g-cta-gold { flex: 1; min-width: 140px; }
/* 扫荡卡 */
.g-sweep { padding: 1rem; display: flex; flex-direction: column; gap: .6rem; }
.g-sweep-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.g-sweep-head h3 { color: rgb(var(--c-ink)); font-size: 1rem; font-weight: 800; margin-top: .1rem; }
.g-bar { height: 8px; border-radius: 999px; background: rgb(var(--c-surface-2)); overflow: hidden; border: 1px solid rgb(var(--c-line)); }
.g-bar span { display: block; height: 100%; background: linear-gradient(90deg, rgb(var(--c-accent)), rgb(var(--c-accent-2))); transition: width .3s ease; }
.sweep-hint { color: rgb(var(--c-ink-2)); font-size: .8rem; }
.sweep-actions { display: flex; align-items: center; gap: .75rem; }
.sweep-float-text { color: rgb(var(--c-success)); font-weight: 800; font-size: .9rem; }
.sweep-float-enter-active, .sweep-float-leave-active { transition: opacity .3s ease, transform .3s ease; }
.sweep-float-enter-from { opacity: 0; transform: translateY(6px); }
.sweep-float-leave-to { opacity: 0; transform: translateY(-6px); }

/* ===== 战斗面板返回条（胶囊条） ===== */
.g-battle-return {
  display: flex; align-items: center; gap: .75rem; margin-bottom: .75rem; padding: .6rem .85rem;
  border: 1px solid rgb(var(--c-line)); border-radius: 999px; background: rgb(var(--c-surface));
  box-shadow: var(--sk-shadow-card);
}
.g-battle-return span { color: rgb(var(--c-ink-2)); font-size: .82rem; }

/* ===== 底部指令栏 ===== */
.hub-dock {
  position: sticky; bottom: .5rem; z-index: 20;
  display: flex; gap: .4rem; padding: .5rem .6rem;
  border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  background: linear-gradient(180deg, rgb(var(--c-surface)), rgb(var(--c-elevated)));
  box-shadow: var(--sk-shadow-pop);
}
.hub-dock-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center; gap: .2rem;
  padding: .45rem .3rem .35rem; border: 0; background: transparent; cursor: pointer;
  border-radius: var(--sk-radius-control); color: rgb(var(--c-ink-3)); font-size: .68rem; font-weight: 800;
  position: relative; transition: color .16s, background .16s;
}
.hub-dock-btn svg { width: 23px; height: 23px; }
.hub-dock-btn:hover { color: rgb(var(--c-ink-2)); background: rgb(var(--c-surface-2) / .6); }
.hub-dock-btn.active { color: rgb(var(--c-accent-2)); background: rgb(var(--c-accent-soft)); box-shadow: inset 0 0 0 1.5px rgb(var(--c-accent) / .5); }
.hub-dock-btn.active::before {
  content: ""; position: absolute; top: -6px; left: 50%; transform: translateX(-50%);
  width: 26px; height: 4px; border-radius: 999px; background: rgb(var(--c-accent));
  box-shadow: 0 0 10px rgb(var(--c-accent) / .6);
}
.hub-dock-dot {
  position: absolute; top: .3rem; right: calc(50% - 20px); width: 8px; height: 8px; border-radius: 50%;
  background: rgb(var(--c-danger)); box-shadow: 0 0 0 2px rgb(var(--c-surface));
}

/* ===== 响应式（桌面优先，窄屏不破版） ===== */
@media (max-width: 1180px) {
  .g-formation-board { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
}
@media (max-width: 860px) {
  .g-phead-row, .g-battle-return { flex-direction: column; align-items: stretch; }
  .g-brief { grid-template-columns: 1fr; }
  .g-lineup { grid-template-columns: repeat(5, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .hub-panel { padding: .75rem; }
  .hud-wallet { width: 100%; }
  .hub-dock-btn span { font-size: .6rem; }
}
</style>
