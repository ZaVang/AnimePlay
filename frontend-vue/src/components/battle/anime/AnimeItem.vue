<script setup lang="ts">
import { computed } from 'vue';
import type { Card, Rarity } from '@/types';

const props = defineProps<{
  card: Card;
}>();

const rarityColorMap: Record<Rarity, string> = {
  UR: 'border-yellow-400 bg-yellow-400/20',
  HR: 'border-pink-500 bg-pink-500/20',
  SSR: 'border-red-500 bg-red-500/20',
  SR: 'border-purple-500 bg-purple-500/20',
  R: 'border-blue-400 bg-blue-400/20',
  N: 'border-gray-500 bg-gray-500/20',
};

const rarityClass = computed(() => rarityColorMap[props.card.rarity] || rarityColorMap.N);
</script>

<template>
  <div
    :class="[rarityClass]"
    class="anime-item relative w-full h-full rounded-lg border-2 bg-cover bg-center p-1 shadow-lg transition-all duration-300"
    :style="{ backgroundImage: `url(${card.image_path})` }"
  >
    <div class="absolute top-0 right-1 text-white font-bold text-lg" style="text-shadow: 1px 1px 2px black;">
      {{ card.cost }} TP
    </div>
    
    <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 p-1 rounded-b-md">
      <p class="text-white text-xs font-bold truncate">{{ card.name }}</p>
      <div class="flex justify-between items-center mt-1">
        <p class="text-yellow-400 text-sm font-bold">{{ card.points }} 战力</p>
        <p class="text-white text-xs font-semibold px-1.5 py-0.5 rounded" :class="rarityClass">{{ card.rarity }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.anime-item {
  box-shadow: 0 0 10px rgba(0,0,0,0.5);
}
</style>
