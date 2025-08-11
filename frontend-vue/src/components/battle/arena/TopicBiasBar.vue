<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/battle';

const gameStore = useGameStore();

// Calculate the percentage for the slider position.
// 0 bias -> 50%, 10 bias -> 100%, -10 bias -> 0%
const biasPercentage = computed(() => {
  return ((gameStore.topicBias + 10) / 20) * 100;
});
</script>

<template>
  <div class="topic-bias-container w-full h-full flex flex-col items-center justify-center">
    <div class="w-full flex justify-between text-xs px-1 text-gray-400">
      <span>反方 (-10)</span>
      <span>中立 (0)</span>
      <span>正方 (+10)</span>
    </div>
    <div class="w-full h-4 bg-gray-700 rounded-full overflow-hidden relative border border-gray-600">
      <div
        class="absolute top-0 left-0 h-full bg-gradient-to-r from-red-500 via-purple-500 to-green-500"
        style="width: 100%;"
      ></div>
      <div
        class="marker absolute top-0 h-full w-1 bg-yellow-300 transform -translate-x-1/2"
        :style="{ left: `${biasPercentage}%` }"
      ></div>
    </div>
     <div class="mt-1 text-sm font-bold">
      当前偏向: {{ gameStore.topicBias }}
    </div>
  </div>
</template>

<style scoped>
.marker {
  box-shadow: 0 0 5px 2px rgba(253, 224, 71, 0.7);
}
</style>
