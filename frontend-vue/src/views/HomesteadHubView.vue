<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUserStore } from '@/stores/userStore';
import { SWEEP_WEEKLY_CAP } from '@/stores/pve';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useEquipmentStore } from '@/stores/equipment';
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
  type SquadReadinessAssessment,
} from '@/engine';
import { CHARACTER_IMAGE_POOL } from '@/utils/imageUtils';
import CharacterSelectModal from '@/components/battle/CharacterSelectModal.vue';
import { getSquadSkillKitForCharacter, isSquadSkillKitReady } from '@/data/squadSkillKits';
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
      role: positionLabel(index),
      character,
      ok: validation.slots[index]?.ok ?? false,
      issue: validation.slots[index]?.message ?? '空位',
      power: character ? memberPower(character) : 0,
      skills: kit ? [kit.skill1.name, kit.skill2.name, kit.ultimate.name] : [],
    };
  });
});

// --- SA-T1：编队编辑（换人 / 改名 / 空槽加人；改动经 store action 即时刷新战力/校验）---

/** 挑战塔可选：已拥有 + HR/UR + 拥有完整小队战技能。与 SquadBattleView 校验口径一致。 */
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
    userStore.addLog('挑战塔小队只能选择已拥有且拥有完整小队战技能的 HR/UR 角色。', 'warning');
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

/** SC-T5：软提示文案（人话化，含推荐战力 + delta），随三档变化。 */
const readinessHint = computed<string>(() => {
  const r = squadReadiness.value;
  if (!r) return '';
  const gap = Math.abs(r.delta);
  if (r.level === 'ready') return `战力 ${r.playerPower} / 建议 ~${r.recommendedPower} · 达标，放心开打`;
  if (r.level === 'risky') return `战力 ${r.playerPower} / 建议 ~${r.recommendedPower} · 略微吃紧（差 ${gap}），谨慎应战`;
  return `战力 ${r.playerPower} / 建议 ~${r.recommendedPower} · 差距较大（差 ${gap}），建议先养成或扫荡`;
});

/** 开战被拦时给出的原因（留在 explore 显示，不进战）。 */
const startBattleIssue = computed<string>(() => {
  if (!userStore.isLoggedIn) return '请先登录后进入挑战塔。';
  if (!selectedSquad.value) return '请先在「编队」面板配置挑战塔小队。';
  if (currentFloorCleared.value) return '本层已通过，可在下方扫荡已通层，或等待解锁下一层。';
  const validation = exploreSquadValidation.value;
  if (!validation?.ok) return validation?.message ?? '小队未满编，请在「编队」面板补齐 5 名 HR/UR 角色。';
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

function positionLabel(index: number): string {
  return ['前排', '前排', '中排', '中排', '后排'][index] ?? '后排';
}

</script>

<template>
  <div class="base-hub">
    <header class="hub-hero">
      <div>
        <span class="hub-eyebrow">BASE HUB</span>
        <h1>基地 hub</h1>
        <p>从家园收益、角色养成、5 人编队，到探索挑战塔与横板战斗结算，都在同一个基地入口完成。</p>
      </div>
      <div class="hub-loop">
        <span>家园</span>
        <span>角色</span>
        <span>编队</span>
        <span>探索</span>
        <span>战斗</span>
      </div>
    </header>

    <nav class="hub-tabs" aria-label="基地面板">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="hub-tab"
        :class="{ active: activeTab === tab.key }"
        @click="switchTab(tab.key)"
      >
        <strong>{{ tab.label }}</strong>
        <span>{{ tab.desc }}</span>
      </button>
    </nav>

    <section v-if="activeTab === 'home'" class="hub-panel flush-panel">
      <HomesteadView />
    </section>

    <section v-else-if="activeTab === 'characters'" class="hub-panel">
      <div class="panel-heading">
        <div>
          <h2>角色面板</h2>
          <p>五维、装备、等级好感、星级突破与每日互动一并查看与操作。</p>
        </div>
      </div>

      <!-- SC-T6：单一空态由 hub 壳统一处理；养成/突破/好感全交无壳 NurtureView（消除双标题/双空态/长滚）。 -->
      <div v-if="!userStore.isLoggedIn" class="hub-empty">请先登录后查看角色养成。</div>
      <div v-else-if="ownedCharacters.length === 0" class="hub-empty">暂无角色，先去抽卡获得可养成角色。</div>
      <div v-else class="embedded-view">
        <NurtureView />
      </div>
    </section>

    <section v-else-if="activeTab === 'squad'" class="hub-panel">
      <div class="panel-heading">
        <div>
          <h2>编队面板</h2>
          <p>挑战塔要求 5 名已拥有且技能完整的 HR/UR 角色；站位、战力与技能摘要在开战前可见。</p>
        </div>
        <button class="btn-primary" type="button" @click="switchTab('explore')">去探索</button>
      </div>

      <div v-if="!userStore.isLoggedIn" class="hub-empty">请先登录后配置挑战塔小队。</div>
      <div v-else class="squad-layout">
        <aside class="squad-picker">
          <div
            v-for="squad in userStore.presetSquads"
            :key="squad.id"
            class="squad-select"
            :class="{ active: selectedSquad?.id === squad.id }"
            role="button"
            tabindex="0"
            @click="selectedSquadId = squad.id"
            @keydown.enter="selectedSquadId = squad.id"
          >
            <!-- SA-T1：队名可改（回车/失焦提交，点输入框不触发选队） -->
            <input
              class="squad-name-input"
              :value="squad.name"
              maxlength="20"
              aria-label="小队名称"
              @click.stop
              @keydown.enter.stop="($event.target as HTMLInputElement).blur()"
              @change="renameSquad(squad.id, ($event.target as HTMLInputElement).value)"
            >
            <strong>{{ squadPower(squad.id) }}</strong>
            <small>{{ squadValidation(squad.id).characters.length }}/{{ SQUAD_MEMBER_COUNT }} · {{ squadValidation(squad.id).ok ? '可挑战' : '需补齐' }}</small>
          </div>
        </aside>

        <div class="formation-board">
          <!-- SA-T1：站位可点换人 / 空槽可点加人（按钮 = 可点视觉暗示 + 键盘可达） -->
          <button
            v-for="slot in selectedSquadSlots"
            :key="slot.position"
            type="button"
            class="formation-slot"
            :class="{ ready: slot.ok }"
            :title="slot.character ? '点击更换角色' : '点击添加角色'"
            @click="selectedSquad && openCharacterSelect(selectedSquad.id, slot.position - 1)"
          >
            <span class="slot-index">{{ slot.position }}</span>
            <span class="slot-role">{{ slot.role }}</span>
            <template v-if="slot.character">
              <img :src="slot.character.image_path" :alt="slot.character.name" loading="lazy" decoding="async">
              <strong>{{ slot.character.name }}</strong>
              <small>{{ slot.character.rarity }} · 战力 {{ slot.power }}</small>
              <em>{{ slot.skills.length ? slot.skills.join(' / ') : slot.issue }}</em>
            </template>
            <template v-else>
              <div class="empty-slot">+</div>
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
      <div class="panel-heading">
        <div>
          <h2>探索面板</h2>
          <p>预览当前挑战塔楼层、敌方阵容和通关奖励；确认小队后「开始挑战」直接进入战斗。</p>
        </div>
        <!-- SA-T6：编队在 squad tab 完成，这里只留跳转编辑入口；开战改为下方直达按钮（不再空切 battle tab 重编队）。 -->
        <button class="btn-secondary" type="button" @click="switchTab('squad')">去编队</button>
      </div>

      <div v-if="!userStore.isLoggedIn" class="hub-empty">请先登录后进入挑战塔。</div>
      <div v-else class="explore-grid">
        <article class="tower-card">
          <span class="summary-kicker">当前塔层</span>
          <strong>第 {{ currentFloor }} 层</strong>
          <small>历史最高 {{ userStore.towerProgress.maxFloor }} 层 · 每层通过后解锁下一层</small>
        </article>

        <article class="tower-card">
          <span class="summary-kicker">奖励预览</span>
          <strong>经验 +{{ rewardPreview.characterExp }} / KP +{{ rewardPreview.knowledgePoints }}</strong>
          <small>胜利并推进楼层时，参战角色获得经验，并有装备掉落机会。</small>
        </article>

        <article v-if="enemyPreview" class="enemy-preview">
          <div class="enemy-heading">
            <div>
              <span class="summary-kicker">敌方阵容</span>
              <h3>{{ enemyPreview.name }}</h3>
            </div>
            <strong>{{ enemyPreview.floorPower }}</strong>
          </div>
          <p>{{ enemyPreview.description }} · {{ enemyPreview.difficulty }}</p>
          <div class="enemy-lineup">
            <div v-for="enemy in enemyPreview.members" :key="enemy.id" class="enemy-card">
              <img :src="enemy.image_path" :alt="enemy.name" loading="lazy" decoding="async">
              <span>{{ enemy.name }}</span>
              <small>{{ enemy.rarity }}</small>
            </div>
          </div>
        </article>

        <!-- SA-T6：开战直达——校验选中小队后带 squadId 直接进 battle 阶段（跳过 SquadBattleView 编成器）。 -->
        <article class="start-card">
          <div class="start-heading">
            <div>
              <span class="summary-kicker">出战小队</span>
              <h3>{{ selectedSquad ? selectedSquad.name : '尚未配置小队' }}</h3>
            </div>
            <div v-if="selectedSquad" class="start-power">
              <strong>{{ squadPower(selectedSquad.id) }}</strong>
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
              class="btn-primary"
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
        <article class="sweep-card">
          <div class="sweep-heading">
            <div>
              <span class="summary-kicker">扫荡已通层</span>
              <h3>卡关也能每周变强一点</h3>
            </div>
            <span class="sweep-quota" :class="{ full: sweepRemaining <= 0 }">
              本周 {{ sweepUsed }}/{{ sweepWeeklyCap }}
            </span>
          </div>

          <div class="sweep-bar" role="progressbar" :aria-valuenow="sweepUsed" :aria-valuemax="sweepWeeklyCap">
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
    </section>

    <section v-else class="hub-panel flush-panel battle-panel">
      <div class="battle-return">
        <button class="btn-secondary" type="button" @click="handleBattleExit">返回探索预览</button>
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
  </div>
</template>

<style scoped>
.base-hub { display: flex; flex-direction: column; gap: 1rem; }
.hub-hero {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem;
  padding: 1.2rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px;
  background: linear-gradient(135deg, rgb(var(--c-surface)), rgb(var(--c-accent-soft) / .65));
}
.hub-eyebrow, .summary-kicker { display: block; font-size: .72rem; font-weight: 800; color: rgb(var(--c-accent)); }
.hub-hero h1 { margin: .1rem 0; font-size: 2rem; font-weight: 800; color: rgb(var(--c-ink)); }
.hub-hero p { max-width: 760px; color: rgb(var(--c-ink-2)); font-size: .95rem; }
.hub-loop { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: .4rem; }
.hub-loop span {
  padding: .35rem .55rem; border: 1px solid rgb(var(--c-line)); border-radius: 6px;
  background: rgb(var(--c-surface) / .72); color: rgb(var(--c-ink-2)); font-size: .78rem; font-weight: 700;
}
.hub-tabs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: .55rem; }
.hub-tab {
  min-height: 76px; padding: .75rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px;
  background: rgb(var(--c-surface)); text-align: left; transition: border-color .15s, box-shadow .15s, transform .15s;
}
.hub-tab:hover { border-color: rgb(var(--c-accent)); transform: translateY(-1px); }
.hub-tab.active { border-color: rgb(var(--c-accent)); box-shadow: inset 0 0 0 1px rgb(var(--c-accent)); background: rgb(var(--c-accent-soft) / .7); }
.hub-tab strong { display: block; color: rgb(var(--c-ink)); font-size: .98rem; }
.hub-tab span { display: block; margin-top: .2rem; color: rgb(var(--c-ink-3)); font-size: .74rem; line-height: 1.3; }
.hub-panel {
  padding: 1rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px;
  background: rgb(var(--c-surface) / .72);
}
.flush-panel { padding: 0; border: 0; background: transparent; }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1rem; }
.panel-heading h2 { font-size: 1.35rem; font-weight: 800; color: rgb(var(--c-ink)); }
.panel-heading p { color: rgb(var(--c-ink-2)); font-size: .9rem; }
.hub-empty { padding: 2.5rem 1rem; text-align: center; color: rgb(var(--c-ink-2)); }
.character-grid { display: grid; grid-template-columns: minmax(220px, 300px) minmax(0, 1fr); gap: 1rem; }
.character-list { display: grid; gap: .5rem; max-height: 520px; overflow: auto; padding-right: .25rem; }
.character-chip {
  display: grid; grid-template-columns: 46px minmax(0, 1fr); column-gap: .65rem; align-items: center;
  min-height: 58px; padding: .45rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px;
  background: rgb(var(--c-surface-2)); text-align: left;
}
.character-chip.active { border-color: rgb(var(--c-accent)); background: rgb(var(--c-accent-soft) / .7); }
.character-chip img { grid-row: span 2; width: 46px; height: 46px; border-radius: 7px; object-fit: cover; object-position: top; }
.character-chip span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: rgb(var(--c-ink)); font-weight: 700; font-size: .86rem; }
.character-chip small { color: rgb(var(--c-ink-3)); font-size: .72rem; }
.character-summary, .enemy-preview, .tower-card {
  border: 1px solid rgb(var(--c-line)); border-radius: 8px; background: rgb(var(--c-surface)); padding: 1rem;
}
.summary-top { display: flex; gap: 1rem; align-items: center; margin-bottom: 1rem; }
.summary-top img { width: 84px; height: 112px; border-radius: 8px; object-fit: cover; object-position: top; }
.summary-top h3 { font-size: 1.35rem; font-weight: 800; color: rgb(var(--c-ink)); }
.summary-top p { color: rgb(var(--c-ink-2)); font-size: .86rem; }
.stat-mini-grid, .equip-mini-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: .6rem; margin-bottom: 1rem; }
.stat-mini, .equip-mini, .skill-row {
  padding: .7rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px; background: rgb(var(--c-surface-2) / .78);
}
.stat-mini span, .equip-mini span { display: block; color: rgb(var(--c-ink-2)); font-size: .72rem; }
.stat-mini strong, .equip-mini strong { display: block; color: rgb(var(--c-ink)); font-size: .95rem; }
.stat-mini small, .equip-mini small { display: block; color: rgb(var(--c-ink-3)); font-size: .68rem; line-height: 1.35; }
.skill-list h4 { margin-bottom: .5rem; color: rgb(var(--c-ink)); font-weight: 800; }
.skill-list { display: grid; gap: .45rem; }
.skill-row strong { display: block; color: rgb(var(--c-ink)); font-size: .82rem; }
.skill-row span, .skill-empty { color: rgb(var(--c-ink-2)); font-size: .76rem; line-height: 1.4; }
.embedded-view { margin-top: 1rem; border-top: 1px solid rgb(var(--c-line)); }
.squad-layout { display: grid; grid-template-columns: minmax(200px, 260px) minmax(0, 1fr); gap: 1rem; }
.squad-picker { display: grid; align-content: start; gap: .55rem; }
.squad-select {
  min-height: 86px; padding: .75rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px;
  background: rgb(var(--c-surface)); text-align: left; cursor: pointer; transition: border-color .15s;
}
.squad-select:hover { border-color: rgb(var(--c-accent)); }
.squad-select.active { border-color: rgb(var(--c-accent)); box-shadow: inset 0 0 0 1px rgb(var(--c-accent)); }
.squad-select strong, .squad-select small { display: block; }
.squad-select strong { color: rgb(var(--c-highlight)); font-size: 1.35rem; }
.squad-select small { color: rgb(var(--c-ink-3)); }
.squad-name-input {
  display: block; width: 100%; padding: .1rem .3rem; margin-bottom: .15rem;
  border: 1px solid transparent; border-radius: 5px; background: transparent;
  color: rgb(var(--c-ink)); font-weight: 800; font-size: .95rem; cursor: text;
}
.squad-name-input:hover { border-color: rgb(var(--c-line)); }
.squad-name-input:focus { outline: none; border-color: rgb(var(--c-accent)); background: rgb(var(--c-surface-2) / .6); }
.formation-board { display: grid; grid-template-columns: repeat(5, minmax(130px, 1fr)); gap: .7rem; }
.formation-slot {
  position: relative; min-height: 270px; padding: .75rem; border: 1px dashed rgb(var(--c-line)); border-radius: 8px;
  background: rgb(var(--c-surface-2) / .72); overflow: hidden;
  width: 100%; text-align: left; cursor: pointer; transition: border-color .15s, box-shadow .15s, transform .15s;
}
.formation-slot:hover { border-color: rgb(var(--c-accent)); transform: translateY(-1px); box-shadow: inset 0 0 0 1px rgb(var(--c-accent)); }
.formation-slot:hover .empty-slot { border-color: rgb(var(--c-accent)); color: rgb(var(--c-accent)); }
.formation-slot.ready { border-style: solid; border-color: rgb(var(--c-success)); }
.slot-index, .slot-role { position: absolute; top: .45rem; z-index: 1; font-size: .7rem; font-weight: 800; }
.slot-index { left: .45rem; color: rgb(var(--c-accent)); }
.slot-role { right: .45rem; color: rgb(var(--c-ink-3)); }
.formation-slot img { width: 100%; height: 128px; margin-top: .8rem; border-radius: 7px; object-fit: cover; object-position: top; }
.formation-slot strong, .formation-slot small, .formation-slot em { display: block; }
.formation-slot strong { margin-top: .5rem; color: rgb(var(--c-ink)); font-size: .9rem; }
.formation-slot small { color: rgb(var(--c-ink-2)); font-size: .75rem; }
.formation-slot em { margin-top: .35rem; color: rgb(var(--c-accent)); font-size: .7rem; line-height: 1.35; font-style: normal; }
.empty-slot { display: grid; place-items: center; height: 128px; margin-top: .8rem; border: 1px dashed rgb(var(--c-line)); border-radius: 7px; color: rgb(var(--c-ink-3)); font-size: 2rem; }
.explore-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.tower-card strong { display: block; margin: .2rem 0; color: rgb(var(--c-ink)); font-size: 1.6rem; }
.tower-card small { color: rgb(var(--c-ink-2)); }
.enemy-preview { grid-column: 1 / -1; }
.enemy-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.enemy-heading h3 { color: rgb(var(--c-ink)); font-size: 1.25rem; font-weight: 800; }
.enemy-heading strong { color: rgb(var(--c-highlight)); font-size: 1.4rem; }
.enemy-preview p { margin: .35rem 0 .85rem; color: rgb(var(--c-ink-2)); font-size: .88rem; }
.enemy-lineup { display: grid; grid-template-columns: repeat(5, minmax(110px, 1fr)); gap: .65rem; }
.enemy-card { padding: .55rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px; background: rgb(var(--c-surface-2)); }
.enemy-card img { width: 100%; height: 92px; border-radius: 6px; object-fit: cover; object-position: top; }
.enemy-card span { display: block; margin-top: .35rem; color: rgb(var(--c-ink)); font-weight: 700; font-size: .78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.enemy-card small { color: rgb(var(--c-ink-3)); }
/* SA-T6 开战卡（语义令牌，无 text-white / 无动态色类） */
.start-card {
  grid-column: 1 / -1; display: flex; flex-direction: column; gap: .6rem;
  padding: 1rem; border: 1px solid rgb(var(--c-accent)); border-radius: 8px; background: rgb(var(--c-accent-soft) / .55);
}
.start-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.start-heading h3 { color: rgb(var(--c-ink)); font-size: 1.1rem; font-weight: 800; }
.start-power { text-align: right; }
.start-power strong { display: block; color: rgb(var(--c-highlight)); font-size: 1.4rem; }
.start-power small { color: rgb(var(--c-ink-2)); font-size: .78rem; }
.start-hint { color: rgb(var(--c-ink-2)); font-size: .85rem; }
.start-hint.ready { color: rgb(var(--c-success)); font-weight: 700; }
.readiness-hint { margin-top: .35rem; font-size: .8rem; font-weight: 600; }
.readiness-ready { color: rgb(var(--c-success)); }
.readiness-risky { color: rgb(var(--c-warning)); }
.readiness-underpowered { color: rgb(var(--c-danger)); }
.start-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .75rem; }
/* SA-T5 扫荡卡（语义令牌，无 text-white / 无动态色类） */
.sweep-card {
  grid-column: 1 / -1; display: flex; flex-direction: column; gap: .6rem;
  padding: 1rem; border: 1px solid rgb(var(--c-line)); border-radius: 8px; background: rgb(var(--c-surface-2));
}
.sweep-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.sweep-heading h3 { color: rgb(var(--c-ink)); font-size: 1.1rem; font-weight: 800; }
.sweep-quota { color: rgb(var(--c-ink-2)); font-weight: 800; font-size: .85rem; white-space: nowrap; }
.sweep-quota.full { color: rgb(var(--c-highlight)); }
.sweep-bar { height: 8px; border-radius: 999px; background: rgb(var(--c-surface)); overflow: hidden; border: 1px solid rgb(var(--c-line)); }
.sweep-bar span { display: block; height: 100%; background: rgb(var(--c-accent)); transition: width .3s ease; }
.sweep-hint { color: rgb(var(--c-ink-2)); font-size: .85rem; }
.sweep-actions { display: flex; align-items: center; gap: .75rem; }
.sweep-float-text { color: rgb(var(--c-success)); font-weight: 800; font-size: .9rem; }
.sweep-float-enter-active, .sweep-float-leave-active { transition: opacity .3s ease, transform .3s ease; }
.sweep-float-enter-from { opacity: 0; transform: translateY(6px); }
.sweep-float-leave-to { opacity: 0; transform: translateY(-6px); }
.battle-return {
  display: flex; align-items: center; gap: .75rem; margin-bottom: .75rem; padding: .75rem;
  border: 1px solid rgb(var(--c-line)); border-radius: 8px; background: rgb(var(--c-surface));
}
.battle-return span { color: rgb(var(--c-ink-2)); font-size: .85rem; }
@media (max-width: 1180px) {
  .formation-board, .enemy-lineup { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
}
@media (max-width: 860px) {
  .hub-hero, .panel-heading, .battle-return { flex-direction: column; align-items: stretch; }
  .hub-tabs { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .character-grid, .squad-layout, .explore-grid { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .hub-tabs { grid-template-columns: 1fr; }
  .hub-panel { padding: .75rem; }
  .summary-top { align-items: flex-start; }
  .summary-top img { width: 72px; height: 96px; }
}
</style>
