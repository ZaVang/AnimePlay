<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useEquipmentStore } from '@/stores/equipment';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/nurture';
import { generateBattleStats, calculateBattlePower, MAX_CHARACTER_LEVEL, type BattleStats } from '@/engine';
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
  TUTORING_KP_COST,
  TUTORING_EXP_GAIN,
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
// 依赖 equipmentStore.equipped 使配装后实时重算。
const equipBonus = computed<BattleStats>(() => {
  const c = selectedCharacter.value;
  if (!c) return { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
  void equipmentStore.equipped; // 触发依赖收集
  return equipmentStore.resolveEquipBonus(c.id);
});

const finalStats = computed<BattleStats>(() => {
  if (!selectedCharacter.value) return { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
  return generateBattleStats(baseStats.value, selectedCharacter.value.nurtureData.statPoints, equipBonus.value);
});

const battlePower = computed(() => calculateBattlePower(finalStats.value));

// 五维显示行：base / 加点 / 装备 / 合计 + 软上限条填充
const statRows = computed(() => {
  const c = selectedCharacter.value;
  if (!c) return [];
  const eb = equipBonus.value;
  return STAT_META.map(meta => {
    const base = baseStats.value[meta.key];
    const point = c.nurtureData.statPoints[meta.key];
    const equip = eb[meta.key];
    const total = base + point + equip;
    const ref = STAT_DISPLAY_REF[meta.key];
    const fillPct = Math.min(100, (total / ref) * 100);
    return { ...meta, base, point, equip, total, ref, fillPct, isMax: total >= ref };
  });
});

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

// 里程碑列表（达成 / 可领 / 已领）
const milestones = computed(() => {
  const c = selectedCharacter.value;
  const aff = c?.nurtureData.affection || 0;
  const claimed = c?.nurtureData.claimedBondMilestones || [];
  return BOND_MILESTONES.map(m => ({
    ...m,
    reached: aff >= m.threshold,
    claimed: claimed.includes(m.id),
    claimable: c ? isMilestoneClaimable(aff, claimed, m) : false,
  }));
});

// 可领里程碑计数（标题徽章 + 左侧列表红点用）
const claimableCount = computed(() => milestones.value.filter(m => m.claimable).length);

function charClaimableCount(nd: CharacterNurtureData): number {
  const aff = nd.affection || 0;
  const claimed = nd.claimedBondMilestones || [];
  return BOND_MILESTONES.filter(m => isMilestoneClaimable(aff, claimed, m)).length;
}

const canTutor = computed(() => {
  const c = selectedCharacter.value;
  if (!c) return false;
  return c.nurtureData.level < 100 && userStore.playerState.knowledgePoints >= TUTORING_KP_COST;
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
  // 升级才会随机加点：算每维净增量，对应维做一次「+N」飘字（数值由 store 改，这里只读差值）
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
  <div class="min-h-screen py-8">
    <div class="container mx-auto px-4">
      <!-- 页面标题 -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-ink mb-2">角色养成</h1>
        <p class="text-ink-2">提升等级解锁随机加点，培养好感解锁里程碑</p>
      </div>

      <!-- 未登录状态 -->
      <div v-if="!userStore.isLoggedIn" class="text-center py-20">
        <svg class="w-24 h-24 mx-auto mb-6 text-ink-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        <h2 class="text-2xl font-bold text-ink-2 mb-4">请先登录</h2>
        <p class="text-ink-2">登录后即可开始与角色们的养成之旅</p>
      </div>

      <!-- 无角色 -->
      <div v-else-if="ownedCharacters.length === 0" class="text-center py-20">
        <div class="text-5xl mb-4">🎴</div>
        <h2 class="text-2xl font-bold text-ink-2 mb-2">暂无可养成角色</h2>
        <p class="text-ink-2">去抽卡获得角色后即可在此培养。</p>
      </div>

      <!-- 主体：变体 A 双栏（左角色列表 + 右详情面板） -->
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
                  <div class="flex items-center gap-2 mt-1">
                    <span :class="bond.color" class="text-sm font-semibold">{{ bond.icon }} {{ bond.title }}</span>
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

                <!-- 补习 -->
                <div class="flex items-center gap-3 pt-1">
                  <button
                    type="button"
                    class="btn-primary text-sm px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    :disabled="!canTutor"
                    @click="tutor"
                  >
                    📚 补习 (-{{ TUTORING_KP_COST }} KP → +{{ TUTORING_EXP_GAIN }} 经验)
                  </button>
                  <span v-if="isLevelMax" class="text-xs text-accent">已满级</span>
                  <span v-else-if="!canTutor" class="text-xs text-warning">知识点不足</span>
                </div>
              </div>
            </div>
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
              升级随机加点累加至五维；条按「值 / 参考值」填充，跨角色可比，达参考值标记 MAX。
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
                    <div class="text-xs text-ink-2">好感 {{ m.threshold }} · 奖励 {{ m.reward }} KP</div>
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
    </div>

    <!-- 配装弹窗（变体 A picker） -->
    <EquipPickerModal
      v-if="selectedCharacter"
      :is-open="pickerOpen"
      :char-id="selectedCharacter.id"
      :equip-slot="pickerSlot"
      :base-stats="baseStats"
      :stat-points="selectedCharacter.nurtureData.statPoints"
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
