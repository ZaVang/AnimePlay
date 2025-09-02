<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore, type Card } from '@/stores/gameDataStore';
import AnimeCard from '@/components/AnimeCard.vue';

const props = defineProps<{
  slotIndex: number;
}>();

const emit = defineEmits(['close', 'select']);

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

const availableAnime = computed(() => {
  const cardsInQueue = userStore.playerState.viewingQueue
    .filter(Boolean)
    .map(slot => slot!.animeId);
  
  // 定义稀有度排序权重
  const rarityOrder: Record<string, number> = {
    'UR': 6,
    'HR': 5,
    'SSR': 4,
    'SR': 3,
    'R': 2,
    'N': 1
  };
  
  return Array.from(userStore.animeCollection.entries())
    .filter(([id]) => 
      !cardsInQueue.includes(id) && // 不在当前队列中
      !userStore.playerState.watchedAnime.has(id) // 没有观看过
    )
    .map(([id, data]) => {
      const card = gameDataStore.getAnimeCardById(id);
      return card ? { ...card, count: data.count } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      // 按稀有度排序（高稀有度在前）
      const rarityDiff = (rarityOrder[b!.rarity] || 0) - (rarityOrder[a!.rarity] || 0);
      if (rarityDiff !== 0) return rarityDiff;
      
      // 稀有度相同时按名字排序
      return a!.name.localeCompare(b!.name);
    }) as (Card & { count: number })[];
});

function handleSelect(animeId: number) {
  emit('select', animeId);
}
</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl w-full border border-gray-700">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-white">选择要观看的动画</h2>
        <button @click="$emit('close')" class="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
      </div>
      
      <div class="max-h-[60vh] overflow-y-auto pr-2">
        <div v-if="availableAnime.length === 0" class="text-center text-gray-500 py-10">
          <svg class="w-16 h-16 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
          </svg>
          <p class="text-lg font-medium mb-2">没有可观看的动画</p>
          <p class="text-sm">所有未观看的动画都在队列中，或者您已经看完了所有收藏的动画</p>
        </div>
        <div v-else>
          <div class="mb-4 text-sm text-gray-400 flex items-center justify-between">
            <span>{{ availableAnime.length }} 部可观看动画 (按稀有度排序)</span>
            <span class="text-xs">已观看: {{ userStore.playerState.watchedAnime.size }} 部</span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <AnimeCard v-for="card in availableAnime" :key="card.id" :anime="card" :count="card.count" @click="handleSelect(card.id)" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
