<script setup lang="ts">
import { ref, computed, onUnmounted, watch } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useEquipmentStore } from '@/stores/equipment';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/nurture';
import {
  calculateBattlePower,
  MAX_CHARACTER_LEVEL,
  MAX_BREAKTHROUGH,
  breakthroughCost,
  breakthroughStatBonus,
  type BattleStats,
} from '@/engine';
import { resolveMemberBattleStats, resolveNurturedStatPointsFor } from '@/utils/battleStats';
import { bondTier } from '@/config/nurtureColors';
import { rarityStyle } from '@/config/equipmentColors';
import {
  getEquipmentDef,
  formatBonus,
  SLOT_META,
  SLOT_ORDER,
  type EquipmentSlot,
  type EquipmentDef,
} from '@/config/equipment';
import InventoryPanel from '@/components/nurture/InventoryPanel.vue';
import EquipPickerModal from '@/components/nurture/EquipPickerModal.vue';
import {
  STAT_DISPLAY_REF,
  STAT_META,
  BOND_MILESTONES,
  bondTitleFor,
  isMilestoneClaimable,
  bondOverflowExchange,
  DAILY_BOND_INTERACTION_AFFECTION,
  DAILY_BOND_INTERACTION_EXP,
  TUTORING_KP_COST,
  tutoringExpGain,
} from '@/config/nurture';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const equipmentStore = useEquipmentStore();

const selectedCharacterId = ref<number | null>(null);

const rarityOrder: Record<string, number> = { UR: 6, HR: 5, SSR: 4, SR: 3, R: 2, N: 1 };

// 已拥有角色列表（按稀有度 → 等级排序），附养成数据
const ownedCharacters = computed(() => {
  return Array.from(userStore.characterCollection.entries())
    .map(([id]) => {
      const character = gameDataStore.getCharacterCardById(id);
      if (!character) return null;
      return { ...character, nurtureData: userStore.getNurtureData(id) };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const r = (rarityOrder[b!.rarity] || 0) - (rarityOrder[a!.rarity] || 0);
      if (r !== 0) return r;
      return (b!.nurtureData.level || 1) - (a!.nurtureData.level || 1);
    }) as (CharacterCard & { nurtureData: CharacterNurtureData })[];
});

// 首个角色自动选中（无壳内嵌，进面板即有内容）
watch(ownedCharacters, list => {
  if (selectedCharacterId.value == null && list.length > 0) selectedCharacterId.value = list[0].id;
}, { immediate: true });

const selectedCharacter = computed(() => {
  if (selectedCharacterId.value == null) return null;
  return ownedCharacters.value.find(c => c.id === selectedCharacterId.value) || null;
});

function selectCharacter(id: number) {
  selectedCharacterId.value = id;
}

// --- 派生展示 ---

const levelProgress = computed(() =>
  selectedCharacter.value ? userStore.getLevelProgress(selectedCharacter.value.nurtureData) : null,
);

const isLevelMax = computed(() => (selectedCharacter.value?.nurtureData.level ?? 0) >= MAX_CHARACTER_LEVEL);

const baseStats = computed<BattleStats>(
  () => selectedCharacter.value?.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 },
);

// 装备加成：与小队/进战斗同源 resolveEquipBonus（口径全站一致，避免数字打架）。
const equipBonus = computed<BattleStats>(() => {
  const c = selectedCharacter.value;
  if (!c) return { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
  void equipmentStore.equipped; // 触发依赖收集
  return equipmentStore.resolveEquipBonus(c.id);
});

// 养成合成加点（等级加点 + 突破 + 好感永久）——全站单一战力口径。
const nurturedStatPoints = computed<BattleStats>(() => {
  const c = selectedCharacter.value;
  if (!c) return { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
  return resolveNurturedStatPointsFor(c.nurtureData, baseStats.value);
});

const finalStats = computed<BattleStats>(() => {
  if (!selectedCharacter.value) return { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
  return resolveMemberBattleStats(baseStats.value, selectedCharacter.value.nurtureData, equipBonus.value);
});

const battlePower = computed(() => calculateBattlePower(finalStats.value));

// 五维显示行：base / 加点（含突破+好感永久） / 装备 / 合计 + 软上限条填充
const statRows = computed(() => {
  const c = selectedCharacter.value;
  if (!c) return [];
  const eb = equipBonus.value;
  const np = nurturedStatPoints.value;
  return STAT_META.map(meta => {
    const base = baseStats.value[meta.key];
    const point = np[meta.key];
    const equip = eb[meta.key];
    const total = base + point + equip;
    const ref = STAT_DISPLAY_REF[meta.key];
    const fillPct = Math.min(100, (total / ref) * 100);
    return { ...meta, base, point, equip, total, ref, fillPct, isMax: total >= ref };
  });
});

// --- SC-T3 星级/突破 ---
const breakthroughStar = computed(() => selectedCharacter.value?.nurtureData.breakthrough ?? 0);
const isBreakthroughMax = computed(() => breakthroughStar.value >= MAX_BREAKTHROUGH);
// 可消耗重复卡（保留本体 1 张）
const spareCards = computed(() => {
  const c = selectedCharacter.value;
  if (!c) return 0;
  return Math.max(0, userStore.getCharacterCardCount(c.id) - 1);
});
const nextBreakthroughCost = computed(() => (isBreakthroughMax.value ? 0 : breakthroughCost(breakthroughStar.value)));
const canBreakthroughNow = computed(
  () => !isBreakthroughMax.value && spareCards.value >= nextBreakthroughCost.value,
);
// 突破一星的五维增量预览（下一星 vs 当前星）
const breakthroughPreview = computed(() => {
  const c = selectedCharacter.value;
  if (!c || isBreakthroughMax.value) return null;
  const cur = breakthroughStatBonus(breakthroughStar.value, baseStats.value);
  const next = breakthroughStatBonus(breakthroughStar.value + 1, baseStats.value);
  return STAT_META.map(meta => ({ key: meta.key, short: meta.short, delta: next[meta.key] - cur[meta.key] }))
    .filter(r => r.delta > 0);
});
const breakthroughStars = computed(() =>
  Array.from({ length: MAX_BREAKTHROUGH }, (_, i) => i < breakthroughStar.value),
);

function doBreakthrough() {
  const c = selectedCharacter.value;
  if (!c) return;
  userStore.breakthroughCharacter(c.id);
}

// 好感档（语义色 + 称号）
const bond = computed(() => {
  const aff = selectedCharacter.value?.nurtureData.affection || 0;
  return { ...bondTier(aff), title: bondTitleFor(aff), affection: aff };
});

// 好感进度：朝下一个未达成里程碑推进
const bondProgress = computed(() => {
  const aff = selectedCharacter.value?.nurtureData.affection || 0;
  const next = BOND_MILESTONES.find(m => aff < m.threshold);
  if (!next) return { pct: 100, current: aff, target: BOND_MILESTONES[BOND_MILESTONES.length - 1].threshold, targetTitle: '', maxed: true };
  const prevThreshold = BOND_MILESTONES.filter(m => aff >= m.threshold).pop()?.threshold ?? 0;
  const span = next.threshold - prevThreshold;
  const pct = span > 0 ? ((aff - prevThreshold) / span) * 100 : 0;
  return { pct: Math.min(100, Math.max(0, pct)), current: aff, target: next.threshold, targetTitle: next.title, maxed: false };
});

// 里程碑列表（达成 / 可领 / 已领 + 永久加成 %）
const milestones = computed(() => {
  const c = selectedCharacter.value;
  const aff = c?.nurtureData.affection || 0;
  const claimed = c?.nurtureData.claimedBondMilestones || [];
  return BOND_MILESTONES.map(m => ({
    ...m,
    reached: aff >= m.threshold,
    claimed: claimed.includes(m.id),
    claimable: c ? isMilestoneClaimable(aff, claimed, m) : false,
    bonusPctText: `+${Math.round(m.statBonusPct * 100)}% 五维`,
  }));
});

// 可领里程碑计数（标题徽章 + 左侧列表红点用）
const claimableCount = computed(() => milestones.value.filter(m => m.claimable).length);

function charClaimableCount(nd: CharacterNurtureData): number {
  const aff = nd.affection || 0;
  const claimed = nd.claimedBondMilestones || [];
  return BOND_MILESTONES.filter(m => isMilestoneClaimable(aff, claimed, m)).length;
}

// --- SC-T4 每日互动 + 好感溢出转 KP ---
const canDailyInteract = computed(() => {
  const c = selectedCharacter.value;
  return !!c && userStore.canDailyBondInteract(c.id);
});
const bondOverflow = computed(() => {
  const aff = selectedCharacter.value?.nurtureData.affection || 0;
  return bondOverflowExchange(aff);
});

function doDailyInteract() {
  const c = selectedCharacter.value;
  if (c) userStore.dailyBondInteraction(c.id);
}
function doClaimOverflow() {
  const c = selectedCharacter.value;
  if (c) userStore.claimBondOverflow(c.id);
}

const canTutor = computed(() => {
  const c = selectedCharacter.value;
  if (!c) return false;
  return c.nurtureData.level < 100 && userStore.playerState.knowledgePoints >= TUTORING_KP_COST;
});

// ★ SD-T4：补习产出随等级递增，按钮文案动态显示当前等级的实际经验（避免「描述≠行为」）。
const tutorExpGain = computed(() => {
  const c = selectedCharacter.value;
  return c ? tutoringExpGain(c.nurtureData.level) : tutoringExpGain(1);
});

// 本次补习的随机加点增量（飘字提示用，仅展示）
const lastGain = ref<Record<string, number> | null>(null);
let gainClearTimer = 0;

function tutor() {
  const c = selectedCharacter.value;
  if (!c) return;
  const before: Record<string, number> = { ...c.nurtureData.statPoints };
  userStore.tutorCharacter(c.id);
  const after = c.nurtureData.statPoints;
  const gain: Record<string, number> = {};
  let any = false;
  for (const meta of STAT_META) {
    const d = (after[meta.key] ?? 0) - (before[meta.key] ?? 0);
    if (d > 0) { gain[meta.key] = d; any = true; }
  }
  if (any) {
    lastGain.value = gain;
    clearTimeout(gainClearTimer);
    gainClearTimer = window.setTimeout(() => { lastGain.value = null; }, 1800);
  }
}

onUnmounted(() => clearTimeout(gainClearTimer));

function claimMilestone(milestoneId: string) {
  if (selectedCharacter.value) userStore.claimBondMilestone(selectedCharacter.value.id, milestoneId);
}

// 3 个装备槽位（C2 接配装：点击开 picker 弹窗）
const equipSlots = SLOT_ORDER.map(key => ({ key, ...SLOT_META[key] }));

// 当前角色三槽已装定义（展示槽里穿了什么）
const equippedDefs = computed(() => {
  const c = selectedCharacter.value;
  if (!c) return {} as Record<EquipmentSlot, EquipmentDef | undefined>;
  void equipmentStore.equipped; // 触发依赖收集
  const slots = equipmentStore.getEquipped(c.id);
  const out = {} as Record<EquipmentSlot, EquipmentDef | undefined>;
  for (const s of SLOT_ORDER) {
    const uid = slots[s];
    out[s] = uid ? getEquipmentDef(equipmentStore.getItem(uid)?.defId ?? '') : undefined;
  }
  return out;
});

// 配装弹窗状态
const pickerOpen = ref(false);
const pickerSlot = ref<EquipmentSlot>('weapon');

function openPicker(slot: EquipmentSlot) {
  if (!selectedCharacter.value) return;
  pickerSlot.value = slot;
  pickerOpen.value = true;
}

function quickUnequip(slot: EquipmentSlot) {
  if (selectedCharacter.value) userStore.unequipItem(selectedCharacter.value.id, slot);
}
</script>

<template>
  <!-- SC-T6：无壳可内嵌组件（去 min-h-screen / 页级 h1 / 独立未登录空态；仅保留紧凑无角色兜底）。 -->
  <div class="nurture-embed">
    <!-- 无角色紧凑兜底（未登录/无角色由 hub 壳统一处理；此处仅防独立渲染空白） -->
    <div v-if="ownedCharacters.length === 0" class="text-center py-10">
      <div class="text-4xl mb-3">🎴</div>
      <p class="text-ink-2">暂无可养成角色，去抽卡获得角色后即可在此培养。</p>
    </div>

    <!-- 主体：双栏（左角色列表 + 右详情面板） -->
    <div v-else class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <!-- 左：角色列表 -->
      <aside class="bg-surface rounded-xl p-4 border border-line h-fit">
        <h2 class="text-sm font-semibold text-ink-2 mb-3 px-1">
          我的角色 · {{ ownedCharacters.length }}
        </h2>
        <div class="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
          <button
            v-for="character in ownedCharacters"
            :key="character.id"
            type="button"
            class="w-full flex items-center gap-3 p-2 rounded-lg border transition-colors text-left"
            :class="selectedCharacterId === character.id
              ? 'bg-accent/15 border-accent'
              : 'bg-surface-2 border-line hover:border-accent/60'"
            @click="selectCharacter(character.id)"
          >
            <div class="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-surface-2">
              <img
                :src="character.image_path"
                :alt="character.name"
                class="w-full h-full object-cover object-top"
                loading="lazy"
                decoding="async"
              >
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-medium text-ink truncate">{{ character.name }}</div>
              <div class="flex items-center gap-2 text-xs text-ink-2">
                <span class="text-highlight font-bold">Lv.{{ character.nurtureData.level }}</span>
                <span v-if="character.nurtureData.breakthrough > 0" class="text-warning font-bold">★{{ character.nurtureData.breakthrough }}</span>
                <span :class="bondTier(character.nurtureData.affection).color">
                  {{ bondTier(character.nurtureData.affection).icon }}
                </span>
                <span
                  v-if="charClaimableCount(character.nurtureData) > 0"
                  class="ml-auto w-2 h-2 rounded-full bg-accent flex-shrink-0"
                  title="有可领取的好感里程碑"
                ></span>
              </div>
            </div>
          </button>
        </div>
      </aside>

      <!-- 右：选中角色详情 -->
      <section v-if="selectedCharacter" class="space-y-6">
        <!-- 顶部：立绘 + 核心进度 -->
        <div class="bg-surface rounded-xl border border-line overflow-hidden">
          <div class="flex flex-col sm:flex-row">
            <!-- 立绘 -->
            <div class="relative w-full sm:w-56 flex-shrink-0">
              <div class="aspect-[2/3] sm:h-full overflow-hidden">
                <img
                  :src="selectedCharacter.image_path"
                  :alt="selectedCharacter.name"
                  class="w-full h-full object-cover object-top"
                  loading="lazy"
                  decoding="async"
                >
              </div>
              <div class="absolute top-3 left-3">
                <span class="px-2 py-1 rounded-md text-xs font-bold bg-surface/80 text-ink border border-line">
                  {{ selectedCharacter.rarity }}
                </span>
              </div>
            </div>

            <!-- 等级 / 好感 -->
            <div class="flex-1 p-5 space-y-5">
              <div>
                <h3 class="text-2xl font-bold text-ink">{{ selectedCharacter.name }}</h3>
                <div class="flex items-center gap-2 mt-1 flex-wrap">
                  <span :class="bond.color" class="text-sm font-semibold">{{ bond.icon }} {{ bond.title }}</span>
                  <span v-if="breakthroughStar > 0" class="text-sm font-semibold text-warning">★{{ breakthroughStar }} 突破</span>
                  <span class="text-xs text-ink-3">综合战力 <span class="text-highlight font-bold">{{ battlePower }}</span></span>
                </div>
              </div>

              <!-- 等级 / 经验 -->
              <div>
                <div class="flex items-center justify-between mb-1 text-sm">
                  <span class="font-semibold text-ink">⚡ 等级 Lv.{{ selectedCharacter.nurtureData.level }}</span>
                  <span class="text-xs" v-if="levelProgress">
                    <span v-if="isLevelMax" class="text-accent font-bold">MAX</span>
                    <span v-else class="text-ink-2">{{ levelProgress.current }}/{{ levelProgress.required }}</span>
                  </span>
                </div>
                <div class="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="isLevelMax ? 'bg-accent' : 'bg-highlight'"
                    :style="{ width: `${isLevelMax ? 100 : (levelProgress?.percentage || 0)}%` }"
                  ></div>
                </div>
              </div>

              <!-- 好感 -->
              <div>
                <div class="flex items-center justify-between mb-1 text-sm">
                  <span class="font-semibold text-ink">❤️ 好感 {{ bond.affection }}</span>
                  <span class="text-xs">
                    <span v-if="bondProgress.maxed" class="text-accent">已圆满</span>
                    <span v-else class="text-ink-2">下一档 · {{ bondProgress.targetTitle }} ({{ bondProgress.target }})</span>
                  </span>
                </div>
                <div class="w-full bg-surface-2 rounded-full h-2 overflow-hidden">
                  <div
                    class="h-full rounded-full transition-all duration-500"
                    :class="bond.barColor"
                    :style="{ width: `${bondProgress.pct}%` }"
                  ></div>
                </div>
              </div>

              <!-- 补习 + 每日互动 -->
              <div class="flex items-center gap-3 pt-1 flex-wrap">
                <button
                  type="button"
                  class="btn-primary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="!canTutor"
                  @click="tutor"
                >
                  📚 补习 (-{{ TUTORING_KP_COST }} KP → +{{ tutorExpGain }} 经验)
                </button>
                <button
                  type="button"
                  class="btn-secondary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="!canDailyInteract"
                  @click="doDailyInteract"
                >
                  🎁 每日互动 (+{{ DAILY_BOND_INTERACTION_AFFECTION }} 好感 / +{{ DAILY_BOND_INTERACTION_EXP }} 经验)
                </button>
                <span v-if="isLevelMax" class="text-xs text-accent">已满级</span>
                <span v-else-if="!canTutor" class="text-xs text-warning">知识点不足</span>
                <span v-if="!canDailyInteract" class="text-xs text-ink-3">今日已互动</span>
              </div>

              <!-- 好感溢出转 KP（领完最高档后可用） -->
              <div v-if="bondOverflow.kp > 0" class="flex items-center gap-3">
                <button type="button" class="btn-ghost text-xs px-3 py-1.5" @click="doClaimOverflow">
                  ♻️ 好感溢出兑换 (-{{ bondOverflow.spendAffection }} 好感 → +{{ bondOverflow.kp }} KP)
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- SC-T3：星级 / 突破 -->
        <div class="bg-surface rounded-xl border border-line p-5">
          <h4 class="text-sm font-semibold text-ink mb-3 flex items-center gap-2">
            星级突破
            <span class="text-xs text-ink-3">消化重复角色卡换永久五维加成</span>
          </h4>
          <div class="flex items-center gap-1.5 mb-3">
            <span
              v-for="(filled, i) in breakthroughStars"
              :key="i"
              class="text-xl"
              :class="filled ? 'text-warning' : 'text-ink-3 opacity-40'"
            >★</span>
            <span class="ml-2 text-xs text-ink-2">{{ breakthroughStar }} / {{ MAX_BREAKTHROUGH }}</span>
          </div>

          <div class="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              class="btn-primary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="!canBreakthroughNow"
              @click="doBreakthrough"
            >
              <span v-if="isBreakthroughMax">已达最高突破</span>
              <span v-else>✨ 突破 (消耗 {{ nextBreakthroughCost }} 张重复卡)</span>
            </button>
            <span v-if="!isBreakthroughMax" class="text-xs text-ink-2">
              可用重复卡 <span :class="canBreakthroughNow ? 'text-success font-bold' : 'text-warning font-bold'">{{ spareCards }}</span> / 需 {{ nextBreakthroughCost }}
            </span>
            <span
              v-if="breakthroughPreview && breakthroughPreview.length > 0"
              class="text-xs text-ink-3"
            >
              下一星：<span class="text-success">{{ breakthroughPreview.map(r => `${r.short}+${r.delta}`).join(' ') }}</span>
            </span>
          </div>
          <p class="text-xs text-ink-3 mt-3">突破保留本体 1 张卡不被消耗；加成永久生效并计入综合战力。</p>
        </div>

        <!-- 五维数值面板（base + 加点两段 + 软上限参考条） -->
        <div class="bg-surface rounded-xl border border-line p-5">
          <h4 class="text-sm font-semibold text-ink mb-4">战斗五维 · 软上限参考</h4>
          <div class="space-y-4">
            <div v-for="row in statRows" :key="row.key">
              <div class="flex items-center justify-between text-sm mb-1">
                <span class="text-ink-2 w-16">{{ row.label }}</span>
                <span class="flex items-center gap-2">
                  <span class="text-ink font-bold">{{ row.total }}</span>
                  <span class="text-xs text-ink-3">
                    ({{ row.base }}<span class="text-success" v-if="row.point > 0"> +{{ row.point }}</span><span class="text-highlight" v-if="row.equip > 0"> +{{ row.equip }}装</span>)
                  </span>
                  <span v-if="row.isMax" class="text-xs font-bold text-accent">MAX</span>
                  <span v-if="lastGain && lastGain[row.key]" class="stat-gain-pop text-xs font-bold text-success">+{{ lastGain[row.key] }}</span>
                </span>
              </div>
              <div class="w-full bg-surface-2 rounded-full h-2.5 overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="row.isMax ? 'bg-accent' : 'bg-highlight'"
                  :style="{ width: `${row.fillPct}%` }"
                ></div>
              </div>
            </div>
          </div>
          <p class="text-xs text-ink-3 mt-4">
            「加点」段含升级加点 + 突破 + 好感永久加成，与实战战力同源；条按「值 / 参考值」填充。
          </p>
        </div>

        <!-- 装备槽位（C2 接配装：点击开 picker） -->
        <div class="bg-surface rounded-xl border border-line p-5">
          <h4 class="text-sm font-semibold text-ink mb-4">装备槽位</h4>
          <div class="grid grid-cols-3 gap-3">
            <div v-for="slot in equipSlots" :key="slot.key" class="relative">
              <button
                type="button"
                class="w-full flex flex-col items-center justify-center aspect-square rounded-lg border-2 text-center p-2 transition-colors"
                :class="equippedDefs[slot.key]
                  ? 'border-accent/60 bg-surface-2 hover:border-accent'
                  : 'border-dashed border-line bg-surface-2 hover:border-accent/60'"
                @click="openPicker(slot.key)"
              >
                <template v-if="equippedDefs[slot.key]">
                  <span
                    class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-gradient-to-r mb-1"
                    :class="rarityStyle(equippedDefs[slot.key]!.rarity).gradient"
                  >
                    {{ equippedDefs[slot.key]!.rarity }}
                  </span>
                  <div class="text-xs font-medium text-ink leading-tight line-clamp-2">{{ equippedDefs[slot.key]!.name }}</div>
                  <div class="text-[9px] text-ink-3 mt-0.5 leading-tight">{{ formatBonus(equippedDefs[slot.key]!.bonus) }}</div>
                </template>
                <template v-else>
                  <div class="text-2xl opacity-40 mb-1">{{ slot.icon }}</div>
                  <div class="text-xs text-ink-2">{{ slot.label }}</div>
                  <div class="text-[10px] text-ink-3 mt-0.5">点击装备</div>
                </template>
              </button>
              <button
                v-if="equippedDefs[slot.key]"
                type="button"
                class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-surface-2 border border-line text-ink-2 hover:text-danger text-[11px] leading-none flex items-center justify-center shadow-sm"
                title="卸下"
                @click.stop="quickUnequip(slot.key)"
              >✕</button>
            </div>
          </div>
          <p class="text-xs text-ink-3 mt-3">点击槽位选择装备，装上即时反映到五维与战力。</p>
        </div>

        <!-- 背包 -->
        <InventoryPanel />

        <!-- 好感里程碑 -->
        <div class="bg-surface rounded-xl border border-line p-5">
          <h4 class="text-sm font-semibold text-ink mb-4 flex items-center gap-2">
            好感里程碑
            <span v-if="claimableCount > 0" class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-accent text-white">{{ claimableCount }} 可领</span>
          </h4>
          <div class="space-y-2">
            <div
              v-for="m in milestones"
              :key="m.id"
              class="flex items-center justify-between p-3 rounded-lg border"
              :class="m.reached ? 'bg-surface-2 border-line' : 'bg-surface-2/40 border-line/50 opacity-60'"
            >
              <div class="flex items-center gap-3">
                <span class="text-lg">{{ m.reached ? '🏅' : '🔒' }}</span>
                <div>
                  <div class="text-sm font-medium text-ink">{{ m.title }}</div>
                  <div class="text-xs text-ink-2">好感 {{ m.threshold }} · 奖励 {{ m.reward }} KP · <span class="text-success">{{ m.bonusPctText }}</span></div>
                </div>
              </div>
              <button
                v-if="m.claimable"
                type="button"
                class="btn-primary text-xs px-3 py-1.5"
                @click="claimMilestone(m.id)"
              >
                领取
              </button>
              <span v-else-if="m.claimed" class="text-xs text-success font-medium">已领取</span>
              <span v-else-if="!m.reached" class="text-xs text-ink-3">未达成</span>
            </div>
          </div>
          <p class="text-xs text-ink-3 mt-3">领取里程碑除一次性 KP 外，永久提升五维（累计封顶 +15%）。</p>
        </div>
      </section>

      <!-- 未选中提示 -->
      <section v-else class="bg-surface rounded-xl border border-line flex items-center justify-center py-24">
        <div class="text-center">
          <div class="text-4xl mb-3 opacity-50">👈</div>
          <p class="text-ink-2">从左侧选择一个角色开始养成</p>
        </div>
      </section>
    </div>

    <!-- 配装弹窗（picker，传养成合成加点保证预览战力口径一致） -->
    <EquipPickerModal
      v-if="selectedCharacter"
      :is-open="pickerOpen"
      :char-id="selectedCharacter.id"
      :equip-slot="pickerSlot"
      :base-stats="baseStats"
      :stat-points="nurturedStatPoints"
      @close="pickerOpen = false"
    />
  </div>
</template>

<style scoped>
/* 升级随机加点的「+N」飘字：浮现 → 上升淡出，与 lastGain 的 1.8s 清除同步 */
@keyframes statGainPop {
  0% { opacity: 0; transform: translateY(4px); }
  25% { opacity: 1; transform: translateY(0); }
  75% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-6px); }
}
.stat-gain-pop { display: inline-block; animation: statGainPop 1.8s ease-out forwards; }
</style>
