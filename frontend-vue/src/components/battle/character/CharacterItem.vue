<script setup lang="ts">
import { computed } from 'vue';
import type { Card, Rarity } from '@/types';

const props = defineProps<{
  character: Card;
  isActive: boolean;
}>();

const rarityColorMap: Record<Rarity, string> = {
  UR: 'border-red-400',
  HR: 'border-purple-500',
  SSR: 'border-amber-500',
  SR: 'border-indigo-500',
  R: 'border-green-400',
  N: 'border-gray-500',
};

const rarityClass = computed(() => rarityColorMap[props.character.rarity] || rarityColorMap.N);
</script>

<template>
  <div
    class="character-item relative w-24 h-36 rounded-lg overflow-hidden transition-all duration-300 transform"
    :class="{ 
      'border-4 shadow-xl scale-110 z-10': isActive, 
      'border-2 border-gray-600 scale-90 opacity-70': !isActive,
      [rarityClass]: true 
    }"
  >
    <img :src="character.image_path" :alt="character.name" class="w-full h-full object-cover object-top">
    <div class="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 p-1 text-center">
      <p class="text-white text-xs font-bold truncate" :title="character.name">{{ character.name }}</p>
    </div>
    <div v-if="isActive" class="absolute -top-3 -right-3 bg-yellow-400 text-black text-xs font-bold rounded-full w-8 h-8 flex items-center justify-center rotate-12 shadow-lg">
      出战
    </div>
  </div>
</template>

<style scoped>
.character-item {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.5);
}
</style>
