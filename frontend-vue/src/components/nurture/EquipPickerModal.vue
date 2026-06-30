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
  SLOT_META,
  type EquipmentSlot,
  type EquipmentDef,
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
}

// 同槽候选：当前已装件 + 装在别角色的件逐件列；空闲的同 defId 合并为一条 + ×N（装时取组内任一空闲 uid）
const candidates = computed<Candidate[]>(() => {
  const sameSlot = equipmentStore
    .list()
    .map(item => ({ item, def: getEquipmentDef(item.defId) }))
    .filter((c): c is { item: typeof c.item; def: NonNullable<typeof c.def> } => !!c.def && c.def.slot === props.equipSlot);

  const rows: Candidate[] = [];
  const freeByDef = new Map<string, { def: EquipmentDef; uids: string[] }>();
  for (const c of sameSlot) {
    const where = equipmentStore.findEquippedBy(c.item.uid);
    if (c.item.uid === equippedUid.value) {
      rows.push({
        key: c.item.uid,
        uid: c.item.uid,
        def: c.def,
        count: 1,
        isCurrent: true,
        onOtherLabel: '',
        homeText: formatHomeEffect(c.def.homeEffect ?? {}),
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
      });
    } else if (!where) {
      const g = freeByDef.get(c.def.id);
      if (g) g.uids.push(c.item.uid);
      else freeByDef.set(c.def.id, { def: c.def, uids: [c.item.uid] });
    }
  }
  for (const g of freeByDef.values()) {
    rows.push({
      key: `free-${g.def.id}`,
      uid: g.uids[0],
      def: g.def,
      count: g.uids.length,
      isCurrent: false,
      onOtherLabel: '',
      homeText: formatHomeEffect(g.def.homeEffect ?? {}),
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

// 假设把 selectedUid 装到当前槽后的 equipBonus（其余槽不变，仅替换当前槽）
const previewEquipBonus = computed<StatBonus>(() => {
  const slots = equipmentStore.getEquipped(props.charId);
  const bonuses: EquipmentDef['bonus'][] = [];
  for (const s of ['weapon', 'armor', 'supporter'] as EquipmentSlot[]) {
    const uid = s === props.equipSlot ? selectedUid.value : slots[s];
    if (!uid) continue;
    const item = equipmentStore.getItem(uid);
    const def = item && getEquipmentDef(item.defId);
    if (def) bonuses.push(def.bonus);
  }
  return sumStatBonus(bonuses);
});

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
                <div class="text-sm font-medium text-ink truncate">{{ c.def.name }}<span v-if="c.count > 1" class="text-ink-3 font-normal"> ×{{ c.count }}</span></div>
                <div class="text-[11px] text-ink-3 truncate">{{ formatBonus(c.def.bonus) }}</div>
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
