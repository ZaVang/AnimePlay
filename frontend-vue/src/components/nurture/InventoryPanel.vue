<script setup lang="ts">
/**
 * 背包视图（S13-C2 / 变体 1 卡片网格）。内嵌养成页（不新增路由）。
 *  - 卡片：稀有度徽章 + 槽位图标 + 名梗 + 数值加成 +「装备中·角色」标签。
 *  - 顶部：按槽 / 稀有度筛选。
 *  - 兑换商店（折叠区）：知识点定向兑换指定装备，走门面 purchaseEquipment。
 * 稀有度色用完整字面映射（rarityStyle，禁运行时拼类）；界面色走语义令牌。
 */
import { computed, ref } from 'vue';
import { useEquipmentStore } from '@/stores/equipment';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import {
  getEquipmentDef,
  EQUIPMENT_CATALOG,
  SLOT_META,
  SLOT_ORDER,
  getEquipmentPrice,
  type EquipmentSlot,
} from '@/config/equipment';
import { rarityStyle } from '@/config/equipmentColors';
import type { Rarity } from '@/types/card';

const equipmentStore = useEquipmentStore();
const userStore = useUserStore();
const gameDataStore = useGameDataStore();

const RARITIES: Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R'];
const rarityOrder: Record<string, number> = { UR: 6, HR: 5, SSR: 4, SR: 3, R: 2, N: 1 };

const slotFilter = ref<EquipmentSlot | 'all'>('all');
const rarityFilter = ref<Rarity | 'all'>('all');
const showShop = ref(false);

// 背包装备卡（含定义 + 装备中归属）
const inventoryCards = computed(() => {
  return equipmentStore
    .list()
    .map(item => ({ item, def: getEquipmentDef(item.defId) }))
    .filter((c): c is { item: typeof c.item; def: NonNullable<typeof c.def> } => !!c.def)
    .filter(c => slotFilter.value === 'all' || c.def.slot === slotFilter.value)
    .filter(c => rarityFilter.value === 'all' || c.def.rarity === rarityFilter.value)
    .map(c => {
      const where = equipmentStore.findEquippedBy(c.item.uid);
      const ownerName = where ? gameDataStore.getCharacterCardById(where.charId)?.name : '';
      return {
        uid: c.item.uid,
        def: c.def,
        equippedLabel: where ? `装备中·${ownerName || '角色'}` : '',
      };
    })
    .sort((a, b) => (rarityOrder[b.def.rarity] || 0) - (rarityOrder[a.def.rarity] || 0));
});

// 兑换商店目录（按槽 + 稀有度排序）
const shopItems = computed(() =>
  [...EQUIPMENT_CATALOG]
    .filter(def => slotFilter.value === 'all' || def.slot === slotFilter.value)
    .filter(def => rarityFilter.value === 'all' || def.rarity === rarityFilter.value)
    .sort((a, b) => {
      const r = (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0);
      if (r !== 0) return r;
      return SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
    })
    .map(def => ({ def, price: getEquipmentPrice(def.rarity) })),
);

const kp = computed(() => userStore.playerState.knowledgePoints);

function bonusText(bonus: Record<string, number | undefined>): string {
  return Object.entries(bonus)
    .map(([k, v]) => `${k.toUpperCase()}+${v}`)
    .join(' · ');
}

function buy(defId: string) {
  userStore.purchaseEquipment(defId);
}
</script>

<template>
  <div class="bg-surface rounded-xl border border-line p-5">
    <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
      <h4 class="text-sm font-semibold text-ink">🎒 装备背包 · {{ inventoryCards.length }}</h4>
      <button
        type="button"
        class="text-xs px-3 py-1.5 rounded-lg border transition-colors"
        :class="showShop ? 'bg-accent/15 border-accent text-accent' : 'bg-surface-2 border-line text-ink-2 hover:border-accent/60'"
        @click="showShop = !showShop"
      >
        🛒 兑换商店
      </button>
    </div>

    <!-- 筛选 -->
    <div class="flex flex-wrap items-center gap-2 mb-4">
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="text-xs px-2.5 py-1 rounded-md border transition-colors"
          :class="slotFilter === 'all' ? 'bg-accent/15 border-accent text-accent' : 'bg-surface-2 border-line text-ink-2'"
          @click="slotFilter = 'all'"
        >
          全部槽
        </button>
        <button
          v-for="slot in SLOT_ORDER"
          :key="slot"
          type="button"
          class="text-xs px-2.5 py-1 rounded-md border transition-colors"
          :class="slotFilter === slot ? 'bg-accent/15 border-accent text-accent' : 'bg-surface-2 border-line text-ink-2'"
          @click="slotFilter = slot"
        >
          {{ SLOT_META[slot].icon }} {{ SLOT_META[slot].label }}
        </button>
      </div>
      <span class="text-ink-3">|</span>
      <div class="flex items-center gap-1">
        <button
          type="button"
          class="text-xs px-2.5 py-1 rounded-md border transition-colors"
          :class="rarityFilter === 'all' ? 'bg-accent/15 border-accent text-accent' : 'bg-surface-2 border-line text-ink-2'"
          @click="rarityFilter = 'all'"
        >
          全部稀有度
        </button>
        <button
          v-for="r in RARITIES"
          :key="r"
          type="button"
          class="text-xs px-2.5 py-1 rounded-md border transition-colors font-bold"
          :class="[
            rarityFilter === r ? 'border-accent bg-accent/15' : 'border-line bg-surface-2',
            rarityStyle(r).text,
          ]"
          @click="rarityFilter = r"
        >
          {{ r }}
        </button>
      </div>
    </div>

    <!-- 兑换商店 -->
    <div v-if="showShop" class="mb-5 rounded-lg border border-line bg-surface-2/40 p-4">
      <div class="flex items-center justify-between mb-3">
        <span class="text-xs font-semibold text-ink-2">知识点兑换 · 余额 <span class="text-highlight font-bold">{{ kp }}</span></span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
        <div
          v-for="entry in shopItems"
          :key="entry.def.id"
          class="flex items-center gap-2 p-2.5 rounded-lg bg-surface border border-line"
        >
          <span
            class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-gradient-to-r flex-shrink-0"
            :class="rarityStyle(entry.def.rarity).gradient"
          >
            {{ entry.def.rarity }}
          </span>
          <div class="min-w-0 flex-1">
            <div class="text-xs font-medium text-ink truncate">{{ SLOT_META[entry.def.slot].icon }} {{ entry.def.name }}</div>
            <div class="text-[10px] text-ink-3 truncate">{{ bonusText(entry.def.bonus) }}</div>
          </div>
          <button
            type="button"
            class="btn-primary text-[11px] px-2.5 py-1 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            :disabled="kp < entry.price"
            @click="buy(entry.def.id)"
          >
            {{ entry.price }} KP
          </button>
        </div>
      </div>
    </div>

    <!-- 背包网格 -->
    <div v-if="inventoryCards.length > 0" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <div
        v-for="card in inventoryCards"
        :key="card.uid"
        class="rounded-lg border border-line bg-surface-2 p-3 flex flex-col gap-1.5"
      >
        <div class="flex items-center justify-between">
          <span
            class="px-1.5 py-0.5 rounded text-[10px] font-bold text-white bg-gradient-to-r"
            :class="rarityStyle(card.def.rarity).gradient"
          >
            {{ card.def.rarity }}
          </span>
          <span class="text-lg" :title="SLOT_META[card.def.slot].label">{{ SLOT_META[card.def.slot].icon }}</span>
        </div>
        <div class="text-sm font-semibold text-ink truncate">{{ card.def.name }}</div>
        <div class="text-[11px] text-ink-2 leading-snug">{{ bonusText(card.def.bonus) }}</div>
        <div v-if="card.equippedLabel" class="mt-auto pt-1">
          <span class="inline-block text-[10px] px-1.5 py-0.5 rounded bg-accent/15 text-accent font-medium">
            {{ card.equippedLabel }}
          </span>
        </div>
      </div>
    </div>

    <p v-else class="text-center text-sm text-ink-3 py-8">
      背包暂无装备<br>
      <span class="text-xs">通关挑战塔（50% 掉落）或用知识点兑换获取</span>
    </p>
  </div>
</template>
