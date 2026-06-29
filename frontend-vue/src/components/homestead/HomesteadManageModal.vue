<script setup lang="ts">
/**
 * 家园入住管理（S13-B 切片3）。从拥有的角色里选 ≤HOMESTEAD_SLOTS 个入住挂机；按稀有度降序展示。
 * 入住/移出走门面 userStore.placeInHomestead/unplaceFromHomestead（内部先结算再改动 + 存档）。
 * 注：拥有角色集是抽卡得来的子集，规模温和；若将来很大可改用 VirtualGrid。
 */
import { computed } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';
import { HOMESTEAD_SLOTS } from '@/config/homestead';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useCollectionStore } from '@/stores/collection';
import { useHomesteadStore } from '@/stores/homestead';
import { thumbImageSrc, onThumbError } from '@/utils/cardImage';
import type { Rarity } from '@/types/card';

defineProps<{ isOpen: boolean }>();
const emit = defineEmits<{ close: [] }>();

const userStore = useUserStore();
const gameData = useGameDataStore();
const collection = useCollectionStore();
const homestead = useHomesteadStore();

const RARITY_RANK: Record<Rarity, number> = { UR: 6, HR: 5, SSR: 4, SR: 3, R: 2, N: 1 };

const ownedCharacters = computed(() =>
  gameData.allCharacterCards
    .filter(c => collection.getCharacterCardCount(c.id) > 0)
    .slice()
    .sort((a, b) => (RARITY_RANK[b.rarity] ?? 0) - (RARITY_RANK[a.rarity] ?? 0)),
);

const placedCount = computed(() => homestead.placedCharacterIds.length);
const canPlaceMore = computed(() => placedCount.value < HOMESTEAD_SLOTS);
function isPlaced(id: number): boolean {
  return homestead.placedCharacterIds.includes(id);
}

function toggle(id: number) {
  if (isPlaced(id)) userStore.unplaceFromHomestead(id);
  else userStore.placeInHomestead(id);
}

function rarityClass(rarity: Rarity): string {
  return GAME_CONFIG.characterSystem.rarityConfig[rarity]?.c || 'bg-gray-500';
}
function cellClass(id: number): string {
  if (isPlaced(id)) return 'border-accent ring-2 ring-accent bg-surface-2';
  if (!canPlaceMore.value) return 'border-line opacity-40 cursor-not-allowed';
  return 'border-line hover:border-accent';
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="emit('close')">
    <div class="bg-surface text-ink rounded-2xl border border-line w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
      <header class="flex items-center justify-between px-5 py-4 border-b border-line">
        <div>
          <h2 class="text-lg font-bold">管理入住</h2>
          <p class="text-sm text-ink-2">选角色入住家园挂机成长（{{ placedCount }}/{{ HOMESTEAD_SLOTS }}）。稀有度越高，知识点产出越多。</p>
        </div>
        <button class="btn-ghost px-3 py-1.5 text-sm" @click="emit('close')">关闭</button>
      </header>

      <div class="p-4 overflow-y-auto">
        <p v-if="ownedCharacters.length === 0" class="text-center text-ink-2 py-12">
          还没有拥有的角色——先去抽卡转出角色吧。
        </p>
        <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          <button
            v-for="c in ownedCharacters"
            :key="c.id"
            class="relative rounded-xl border p-1.5 text-left transition disabled:cursor-not-allowed"
            :class="cellClass(c.id)"
            :disabled="!isPlaced(c.id) && !canPlaceMore"
            :title="isPlaced(c.id) ? '点击移出家园' : (canPlaceMore ? '点击入住家园' : '入住已满')"
            @click="toggle(c.id)"
          >
            <img
              :src="thumbImageSrc('character', c.id)"
              :alt="c.name"
              class="w-full aspect-square object-cover rounded-lg"
              @error="onThumbError"
            />
            <span class="absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded text-white" :class="rarityClass(c.rarity)">{{ c.rarity }}</span>
            <span v-if="isPlaced(c.id)" class="absolute top-1 right-1 text-sm" aria-label="已入住">✅</span>
            <span class="block mt-1 text-xs text-ink truncate">{{ c.name }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
