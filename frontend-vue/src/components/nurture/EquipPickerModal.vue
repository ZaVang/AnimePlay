<script setup lang="ts">
/**
 * 配装弹窗（S13-C2 / 变体 A picker）。点角色装备槽 → 弹窗：
 *  - 左列：该槽位同槽候选（来自背包，含「卸下/不装备」），已装在别角色的标注来源。
 *  - 右侧：选中候选后预览「五维 当前→新值(+Δ)」+「战力 当前→新值」。
 * delta 预览复用同一 resolveEquipBonus 口径：把候选 uid 的 bonus 替换进当前三槽假设值，
 * 再走 generateBattleStats + calculateBattlePower 对比当前——与养成/小队/进战斗同源，不自相矛盾。
 * 确认走门面 equipItem/unequipItem（成功才存档）。Teleport 到 body（避开 transform 祖先劫持 fixed）。
 */
import { computed, ref, watch } from 'vue';
import { useEquipmentStore } from '@/stores/equipment';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import {
  getEquipmentDef,
  formatBonus,
  formatHomeEffect,
  formatModifier,
  sumHomeEffects,
  enhancedBonus,
  setBonusFor,
  setProgressFor,
  getEquipmentSet,
  formatBonus as formatSetBonus,
  MAX_ENHANCE,
  SLOT_META,
  type EquipmentSlot,
  type EquipmentDef,
  type EquipmentHomeEffect,
} from '@/config/equipment';
import { rarityStyle } from '@/config/equipmentColors';
import {
  generateBattleStats,
  calculateBattlePower,
  sumStatBonus,
  type BattleStats,
  type StatBonus,
} from '@/engine';
import { STAT_META } from '@/config/nurture';

const props = defineProps<{
  isOpen: boolean;
  charId: number;
  equipSlot: EquipmentSlot;
  baseStats: BattleStats;
  statPoints: StatBonus;
}>();

const emit = defineEmits<{ close: [] }>();

const equipmentStore = useEquipmentStore();
const userStore = useUserStore();
const gameDataStore = useGameDataStore();

// 选中的候选 uid（null = 「卸下/不装备」）
const selectedUid = ref<string | null>(null);

const slotMeta = computed(() => SLOT_META[props.equipSlot]);

// 当前该槽已装 uid
const equippedUid = computed(() => equipmentStore.getEquipped(props.charId)[props.equipSlot]);

interface Candidate {
  key: string;
  uid: string;        // 代表 uid（自由组取组内任一空闲件）
  def: EquipmentDef;
  count: number;
  isCurrent: boolean;
  onOtherLabel: string;
  homeText: string;
  /** SE-T1：该代表实例的强化等级（候选展示强化后 bonus，与实战同源）。 */
  enhance: number;
  /** SE-T1：强化后五维文案（enhancedBonus(def.bonus, enhance)），Lv.0 = 原 def 文案。 */
  bonusText: string;
  /** SE-T3：战斗 modifier 文案（如「暴击率+7%」）；无 modifier 为空串（不渲染该行）。 */
  modifierText: string;
  /** SE-T2：套装归属短名（如「锋锐组曲」）；无 setId 为空串（不渲染 chip）。 */
  setLabel: string;
}

/** 取某 def 的套装短名（无 setId / 未知套 → 空串）。 */
function setLabelForDef(def: EquipmentDef): string {
  return def.setId ? (getEquipmentSet(def.setId)?.name ?? '') : '';
}

// 同槽候选：当前已装件 + 装在别角色的件逐件列；空闲的同 defId 合并为一条 + ×N（装时取组内任一空闲 uid）
const candidates = computed<Candidate[]>(() => {
  const sameSlot = equipmentStore
    .list()
    .map(item => ({ item, def: getEquipmentDef(item.defId) }))
    .filter((c): c is { item: typeof c.item; def: NonNullable<typeof c.def> } => !!c.def && c.def.slot === props.equipSlot);

  const rows: Candidate[] = [];
  // 自由组按 (defId + enhance) 分桶：不同强化等级的同款不合并（否则展示的强化后 bonus 会与实例不符）
  const freeByKey = new Map<string, { def: EquipmentDef; enhance: number; uids: string[] }>();
  for (const c of sameSlot) {
    const where = equipmentStore.findEquippedBy(c.item.uid);
    const lv = c.item.enhance ?? 0;
    const bonusText = formatBonus(enhancedBonus(c.def.bonus, lv));
    const modifierText = formatModifier(c.def.modifier);
    const setLabel = setLabelForDef(c.def);
    if (c.item.uid === equippedUid.value) {
      rows.push({
        key: c.item.uid,
        uid: c.item.uid,
        def: c.def,
        count: 1,
        isCurrent: true,
        onOtherLabel: '',
        homeText: formatHomeEffect(c.def.homeEffect ?? {}),
        enhance: lv,
        bonusText,
        modifierText,
        setLabel,
      });
    } else if (where && where.charId !== props.charId) {
      const ownerName = gameDataStore.getCharacterCardById(where.charId)?.name;
      rows.push({
        key: c.item.uid,
        uid: c.item.uid,
        def: c.def,
        count: 1,
        isCurrent: false,
        onOtherLabel: `装备中·${ownerName || '其他角色'}`,
        homeText: formatHomeEffect(c.def.homeEffect ?? {}),
        enhance: lv,
        bonusText,
        modifierText,
        setLabel,
      });
    } else if (!where) {
      const bucketKey = `${c.def.id}#${lv}`;
      const g = freeByKey.get(bucketKey);
      if (g) g.uids.push(c.item.uid);
      else freeByKey.set(bucketKey, { def: c.def, enhance: lv, uids: [c.item.uid] });
    }
  }
  for (const [bucketKey, g] of freeByKey.entries()) {
    rows.push({
      key: `free-${bucketKey}`,
      uid: g.uids[0],
      def: g.def,
      count: g.uids.length,
      isCurrent: false,
      onOtherLabel: '',
      homeText: formatHomeEffect(g.def.homeEffect ?? {}),
      enhance: g.enhance,
      bonusText: formatBonus(enhancedBonus(g.def.bonus, g.enhance)),
      modifierText: formatModifier(g.def.modifier),
      setLabel: setLabelForDef(g.def),
    });
  }
  const order: Record<string, number> = { UR: 6, HR: 5, SSR: 4, SR: 3, R: 2, N: 1 };
  return rows.sort((a, b) => (order[b.def.rarity] || 0) - (order[a.def.rarity] || 0));
});

// 当前最终五维/战力（用 store 真实解析）
const currentStats = computed<BattleStats>(() =>
  generateBattleStats(props.baseStats, props.statPoints, equipmentStore.resolveEquipBonus(props.charId)),
);
const currentPower = computed(() => calculateBattlePower(currentStats.value));

// 假设把 selectedUid 装到当前槽后的 equipBonus（其余槽不变，仅替换当前槽）。
// ★ SE-T1（Scout C-2）：逐件套 enhancedBonus(def.bonus, item.enhance)，与 resolveEquipBonus/候选展示同源——
//   否则换装 delta 预览不含强化增益，出现「预览≠实战」（pitfalls S13-C2 复发点）。
// 「替换当前槽后」的假设已装 defId 列表（其余槽不变）——SE-T2 预览套装计数与 SE-T1 强化预览共用此推导。
const previewDefIds = computed<string[]>(() => {
  const slots = equipmentStore.getEquipped(props.charId);
  const defIds: string[] = [];
  for (const s of ['weapon', 'armor', 'supporter'] as EquipmentSlot[]) {
    const uid = s === props.equipSlot ? selectedUid.value : slots[s];
    if (!uid) continue;
    const item = equipmentStore.getItem(uid);
    if (item) defIds.push(item.defId);
  }
  return defIds;
});

const previewEquipBonus = computed<StatBonus>(() => {
  const slots = equipmentStore.getEquipped(props.charId);
  const bonuses: EquipmentDef['bonus'][] = [];
  for (const s of ['weapon', 'armor', 'supporter'] as EquipmentSlot[]) {
    const uid = s === props.equipSlot ? selectedUid.value : slots[s];
    if (!uid) continue;
    const item = equipmentStore.getItem(uid);
    const def = item && getEquipmentDef(item.defId);
    if (def && item) bonuses.push(enhancedBonus(def.bonus, item.enhance));
  }
  // ★ SE-T2 头号护栏（Scout C-1）：预览必须与实战同源——用「替换当前槽后假设 defId 列表」调同一 setBonusFor，
  //   与 store resolveEquipBonus 口径一致，否则「装上第 3 件套装件预览没涨、进战斗却涨了」的预览≠实战复发。
  return sumStatBonus([...bonuses, setBonusFor(previewDefIds.value)]);
});

// ★ SE-T2 套装进度显形（右栏子区）：换装「后」的假设三槽套装进度（凑几件 / 当前档奖励）。
const setProgressRows = computed(() => setProgressFor(previewDefIds.value));

const previewStats = computed<BattleStats>(() =>
  generateBattleStats(props.baseStats, props.statPoints, previewEquipBonus.value),
);
const previewPower = computed(() => calculateBattlePower(previewStats.value));

// 五维预览行：当前→新值(+Δ)
const previewRows = computed(() =>
  STAT_META.map(meta => {
    const cur = currentStats.value[meta.key];
    const next = previewStats.value[meta.key];
    return { key: meta.key, label: meta.label, cur, next, delta: next - cur };
  }),
);

const powerDelta = computed(() => previewPower.value - currentPower.value);

// ★ SE-T1d 强化子区：选中一个真实候选（uid 非空）→ 展开该实例的强化面板。
//   进度显形 ●●●○○ + 下一级增益 delta（enhancedBonus 当前→下一级）+ 消耗「同款×1 + N KP」+ 拥有量 + 按钮。
const selectedItem = computed(() => (selectedUid.value ? equipmentStore.getItem(selectedUid.value) : undefined));
const selectedDef = computed(() => {
  const it = selectedItem.value;
  return it ? getEquipmentDef(it.defId) : undefined;
});
const enhanceCost = computed(() =>
  selectedUid.value ? equipmentStore.getEnhanceCost(selectedUid.value) : null,
);
const playerKp = computed(() => userStore.playerState.knowledgePoints);

// 强化进度点串（●=已达，○=未达），共 MAX_ENHANCE 段。
const enhancePips = computed(() => {
  const lv = enhanceCost.value?.currentLevel ?? 0;
  return Array.from({ length: MAX_ENHANCE }, (_, i) => i < lv);
});

// 下一级五维增益 delta（当前实例 bonus → 目标级 bonus），仅显示有变化的维。
const enhanceStatRows = computed(() => {
  const def = selectedDef.value;
  const cost = enhanceCost.value;
  if (!def || !cost || cost.maxed) return [];
  return STAT_META.map(meta => {
    const cur = enhancedBonus(def.bonus, cost.currentLevel)[meta.key] ?? 0;
    const next = enhancedBonus(def.bonus, cost.targetLevel)[meta.key] ?? 0;
    return { key: meta.key, label: meta.label, cur, next, delta: next - cur };
  }).filter(r => r.cur !== 0 || r.next !== 0);
});

const canEnhance = computed(() => {
  const cost = enhanceCost.value;
  if (!cost || cost.maxed) return false;
  return cost.fuelOwned >= cost.fuelNeeded && playerKp.value >= cost.kp;
});

function doEnhance() {
  if (!selectedUid.value || !canEnhance.value) return;
  userStore.enhanceEquipment(selectedUid.value);
}

// ★ SD-T2：家园挂机 before→after delta（该角色三槽合计 homeEffect，仿战斗 delta 范式）。
// 三槽求和当前 vs「替换当前槽后」——数据源同 resolveHomeEffect 口径（getEquipped + def.homeEffect 求和），
// 展示的是「换这件后该角色家园收益的净变化」，不是单件静态文案（决策-13）。
function sumHomeForSlots(pickCurrentSlot: boolean): Required<EquipmentHomeEffect> {
  const slots = equipmentStore.getEquipped(props.charId);
  const effects: EquipmentHomeEffect[] = [];
  for (const s of ['weapon', 'armor', 'supporter'] as EquipmentSlot[]) {
    const uid = s === props.equipSlot ? (pickCurrentSlot ? equippedUid.value : selectedUid.value) : slots[s];
    if (!uid) continue;
    const item = equipmentStore.getItem(uid);
    const def = item && getEquipmentDef(item.defId);
    if (def?.homeEffect) effects.push(def.homeEffect);
  }
  return sumHomeEffects(effects);
}

const currentHome = computed(() => sumHomeForSlots(true));
const previewHome = computed(() => sumHomeForSlots(false));

// 家园 delta 行（经验/好感/知识 % + 舒适），仅显示有变化或非零的维，避免全 0 刷屏。
const HOME_ROWS: { key: keyof EquipmentHomeEffect; label: string; pct: boolean }[] = [
  { key: 'expPct', label: '经验', pct: true },
  { key: 'affectionPct', label: '好感', pct: true },
  { key: 'knowledgePct', label: '知识', pct: true },
  { key: 'comfort', label: '舒适', pct: false },
];
const homeRows = computed(() =>
  HOME_ROWS.map(r => {
    const cur = currentHome.value[r.key];
    const next = previewHome.value[r.key];
    return { ...r, cur, next, delta: next - cur };
  }).filter(r => r.cur !== 0 || r.next !== 0),
);

function fmtHome(v: number, pct: boolean): string {
  return pct ? `${Math.round(v * 100)}%` : `${v}`;
}
function fmtHomeDelta(v: number, pct: boolean): string {
  const sign = v > 0 ? '+' : '';
  return pct ? `${sign}${Math.round(v * 100)}%` : `${sign}${v}`;
}

// 打开时把选中态对齐到当前已装件
watch(
  () => [props.isOpen, props.charId, props.equipSlot] as const,
  ([open]) => {
    if (open) selectedUid.value = equippedUid.value;
  },
  { immediate: true },
);

function confirm() {
  // 选择未变更：直接关闭，不触发任何写入/存档
  if (selectedUid.value === equippedUid.value) {
    emit('close');
    return;
  }
  if (selectedUid.value == null) {
    if (!userStore.unequipItem(props.charId, props.equipSlot)) {
      userStore.addLog('卸下失败，请确认已登录', 'warning');
      return; // 失败保持弹窗打开，给玩家反馈，别静默关窗
    }
  } else {
    // 抢戴：若该件正戴在别角色身上，先记下来源，equip 成功后播报（否则对方被静默削弱、玩家无感）
    const where = equipmentStore.findEquippedBy(selectedUid.value);
    const fromName = where && where.charId !== props.charId
      ? gameDataStore.getCharacterCardById(where.charId)?.name
      : '';
    const movedItem = equipmentStore.getItem(selectedUid.value);
    const movedDef = movedItem ? getEquipmentDef(movedItem.defId) : undefined;
    if (!userStore.equipItem(props.charId, props.equipSlot, selectedUid.value)) {
      userStore.addLog('装备失败，请确认已登录', 'warning');
      return;
    }
    if (fromName && movedDef) {
      userStore.addLog(`已从「${fromName}」处取下 [${movedDef.rarity}] ${movedDef.name} 装到本角色`, 'info');
    }
  }
  emit('close');
}

function close() {
  emit('close');
}

function onBackdrop(e: MouseEvent) {
  if (e.target === e.currentTarget) close();
}

function deltaClass(d: number): string {
  if (d > 0) return 'text-success';
  if (d < 0) return 'text-danger';
  return 'text-ink-3';
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      @click="onBackdrop"
    >
      <div class="bg-elevated rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-line flex flex-col">
        <!-- 头部 -->
        <div class="p-5 border-b border-line flex items-center justify-between">
          <h2 class="text-lg font-bold text-ink">
            {{ slotMeta.icon }} 配装 · {{ slotMeta.label }}
          </h2>
          <button
            type="button"
            class="w-8 h-8 bg-surface-2 rounded-full flex items-center justify-center text-ink-2 hover:text-ink transition-colors"
            @click="close"
          >
            ✕
          </button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-0 flex-1 overflow-hidden">
          <!-- 左：候选列表 -->
          <div class="p-4 overflow-y-auto max-h-[60vh] space-y-2 border-b sm:border-b-0 sm:border-r border-line">
            <!-- 卸下/不装备 -->
            <button
              type="button"
              class="w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left"
              :class="selectedUid === null ? 'bg-accent/15 border-accent' : 'bg-surface-2 border-line hover:border-accent/60'"
              @click="selectedUid = null"
            >
              <span class="text-xl opacity-60">🚫</span>
              <span class="text-sm text-ink-2">不装备 / 卸下</span>
            </button>

            <button
              v-for="c in candidates"
              :key="c.key"
              type="button"
              class="w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left"
              :class="selectedUid === c.uid ? 'bg-accent/15 border-accent' : 'bg-surface-2 border-line hover:border-accent/60'"
              @click="selectedUid = c.uid"
            >
              <span
                class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-gradient-to-r flex-shrink-0"
                :class="rarityStyle(c.def.rarity).gradient"
              >
                {{ c.def.rarity }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="text-sm font-medium text-ink truncate">
                  {{ c.def.name }}<span v-if="c.count > 1" class="text-ink-3 font-normal"> ×{{ c.count }}</span>
                  <span v-if="c.enhance > 0" class="ml-1 text-[10px] font-bold text-highlight">+{{ c.enhance }}</span>
                </div>
                <div class="text-[11px] text-ink-3 truncate">{{ c.bonusText }}</div>
                <div v-if="c.modifierText" class="text-[11px] text-highlight truncate">⚡ {{ c.modifierText }}</div>
                <div v-if="c.setLabel" class="text-[11px] text-accent truncate">🎯 {{ c.setLabel }}</div>
                <div v-if="c.homeText" class="text-[11px] text-accent truncate">{{ c.homeText }}</div>
              </div>
              <span v-if="c.isCurrent" class="text-[10px] font-bold text-accent flex-shrink-0">装备中</span>
              <span v-else-if="c.onOtherLabel" class="text-[10px] text-ink-3 flex-shrink-0">{{ c.onOtherLabel }}</span>
            </button>

            <p v-if="candidates.length === 0" class="text-center text-sm text-ink-3 py-8">
              背包里没有「{{ slotMeta.label }}」装备<br>
              <span class="text-xs">通关挑战塔或用知识点兑换获取</span>
            </p>
          </div>

          <!-- 右：delta 预览 -->
          <div class="p-4 bg-surface-2/40 space-y-3">
            <h3 class="text-xs font-semibold text-ink-2">属性预览</h3>
            <div v-for="row in previewRows" :key="row.key" class="text-xs">
              <div class="flex items-center justify-between">
                <span class="text-ink-2">{{ row.label }}</span>
                <span class="flex items-center gap-1">
                  <span class="text-ink-3">{{ row.cur }}</span>
                  <span class="text-ink-3">→</span>
                  <span class="text-ink font-bold">{{ row.next }}</span>
                  <span v-if="row.delta !== 0" :class="deltaClass(row.delta)" class="font-semibold">
                    ({{ row.delta > 0 ? '+' : '' }}{{ row.delta }})
                  </span>
                </span>
              </div>
            </div>

            <div class="pt-2 mt-2 border-t border-line">
              <div class="flex items-center justify-between text-sm">
                <span class="font-semibold text-ink">战力</span>
                <span class="flex items-center gap-1">
                  <span class="text-ink-3">{{ currentPower }}</span>
                  <span class="text-ink-3">→</span>
                  <span class="text-highlight font-bold">{{ previewPower }}</span>
                  <span v-if="powerDelta !== 0" :class="deltaClass(powerDelta)" class="text-xs font-semibold">
                    ({{ powerDelta > 0 ? '+' : '' }}{{ powerDelta }})
                  </span>
                </span>
              </div>
            </div>

            <!-- ★ SD-T2 家园挂机 delta：该角色三槽合计 homeEffect 当前→新值 -->
            <div v-if="homeRows.length > 0" class="pt-2 mt-2 border-t border-line space-y-1.5">
              <h3 class="text-xs font-semibold text-ink-2">家园挂机</h3>
              <div v-for="row in homeRows" :key="row.key" class="flex items-center justify-between text-xs">
                <span class="text-ink-2">{{ row.label }}</span>
                <span class="flex items-center gap-1">
                  <span class="text-ink-3">{{ fmtHome(row.cur, row.pct) }}</span>
                  <span class="text-ink-3">→</span>
                  <span class="text-ink font-bold">{{ fmtHome(row.next, row.pct) }}</span>
                  <span v-if="row.delta !== 0" :class="deltaClass(row.delta)" class="font-semibold">
                    ({{ fmtHomeDelta(row.delta, row.pct) }})
                  </span>
                </span>
              </div>
            </div>

            <!-- ★ SE-T2 套装进度子区：换装「后」该角色三槽套装归属 + 进度 + 齐套奖 -->
            <div v-if="setProgressRows.length > 0" class="pt-2 mt-2 border-t border-line space-y-1.5">
              <h3 class="text-xs font-semibold text-ink-2">套装搭配</h3>
              <div v-for="p in setProgressRows" :key="p.set.id" class="text-[11px]">
                <div class="flex items-center justify-between">
                  <span class="text-ink-2">🎯 {{ p.set.name }}</span>
                  <span :class="p.tier > 0 ? 'text-highlight font-bold' : 'text-ink-3'">
                    {{ p.count }}/3<span v-if="p.tier > 0"> · 齐{{ p.tier }}</span>
                  </span>
                </div>
                <div v-if="p.tier > 0" class="text-accent truncate">
                  {{ formatSetBonus(p.currentBonus) }}
                </div>
                <div v-else class="text-ink-3 truncate">凑齐 2 件解锁 {{ p.set.hint }}</div>
              </div>
            </div>

            <!-- ★ SE-T1d 强化子区：选中真实候选（非「卸下」）→ 该实例的强化面板（进度/下一级增益/花费/按钮） -->
            <div v-if="enhanceCost && selectedDef" class="pt-2 mt-2 border-t border-line space-y-2">
              <div class="flex items-center justify-between">
                <h3 class="text-xs font-semibold text-ink-2">装备强化</h3>
                <span class="flex items-center gap-0.5">
                  <span
                    v-for="(on, i) in enhancePips"
                    :key="i"
                    class="text-[11px]"
                    :class="on ? 'text-highlight' : 'text-ink-3/50'"
                  >{{ on ? '●' : '○' }}</span>
                  <span class="ml-1 text-[11px] font-bold text-ink-2">Lv.{{ enhanceCost.currentLevel }}/{{ MAX_ENHANCE }}</span>
                </span>
              </div>

              <template v-if="enhanceCost.maxed">
                <p class="text-[11px] text-center text-ink-3 py-1">已强化到满级</p>
              </template>
              <template v-else>
                <!-- 下一级五维增益 delta -->
                <div v-for="row in enhanceStatRows" :key="row.key" class="flex items-center justify-between text-[11px]">
                  <span class="text-ink-2">{{ row.label }}</span>
                  <span class="flex items-center gap-1">
                    <span class="text-ink-3">{{ row.cur }}</span>
                    <span class="text-ink-3">→</span>
                    <span class="text-ink font-bold">{{ row.next }}</span>
                    <span v-if="row.delta !== 0" :class="deltaClass(row.delta)" class="font-semibold">
                      (+{{ row.delta }})
                    </span>
                  </span>
                </div>

                <!-- 消耗：同款燃料 ×N（拥有量）+ KP -->
                <div class="text-[11px] space-y-0.5 pt-1">
                  <div class="flex items-center justify-between">
                    <span class="text-ink-2">同款燃料</span>
                    <span :class="enhanceCost.fuelOwned >= enhanceCost.fuelNeeded ? 'text-ink' : 'text-danger'" class="font-semibold">
                      {{ enhanceCost.fuelNeeded }} 件（拥有 {{ enhanceCost.fuelOwned }}）
                    </span>
                  </div>
                  <div class="flex items-center justify-between">
                    <span class="text-ink-2">知识点</span>
                    <span :class="playerKp >= enhanceCost.kp ? 'text-ink' : 'text-danger'" class="font-semibold">
                      {{ enhanceCost.kp }} KP（余 {{ playerKp }}）
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  class="btn-secondary text-[11px] w-full py-1.5 mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                  :disabled="!canEnhance"
                  @click="doEnhance"
                >
                  {{ canEnhance ? `强化到 Lv.${enhanceCost.targetLevel}` : (enhanceCost.fuelOwned < enhanceCost.fuelNeeded ? '燃料不足' : '知识点不足') }}
                </button>
              </template>
            </div>
          </div>
        </div>

        <!-- 底部操作 -->
        <div class="p-4 border-t border-line flex items-center justify-end gap-3">
          <button type="button" class="btn-ghost text-sm px-4 py-2" @click="close">取消</button>
          <button
            type="button"
            class="btn-primary text-sm px-5 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="selectedUid === equippedUid"
            @click="confirm"
          >
            {{ selectedUid === equippedUid ? '已是当前' : (selectedUid === null ? '卸下' : '装备') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
