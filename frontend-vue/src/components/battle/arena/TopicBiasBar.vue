<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/battle';

const gameStore = useGameStore();

// Calculate the percentage for the slider position.
// 0 bias -> 50%, 10 bias -> 100%, -10 bias -> 0%
const biasPercentage = computed(() => {
  // Convert bias from -10 to 10 scale to 0 to 100 scale
  return (gameStore.topicBias + 10) * 5;
});
</script>

<template>
  <div class="topic-bias-container">
    <div class="bias-label top">有利</div>
    <div class="bias-bar-vertical">
      <div class="bias-indicator" :style="{ bottom: `calc(${biasPercentage}% - 8px)` }"></div>
    </div>
    <div class="bias-label bottom">不利</div>
    <div class="bias-value">{{ gameStore.topicBias }}</div>
  </div>
</template>

<style scoped>
.topic-bias-container {
  @apply w-20 h-full flex flex-col items-center justify-center bg-gray-800/50 rounded-lg border-2 border-purple-500 p-2 relative;
}
.bias-bar-vertical {
  @apply w-4 h-full bg-gray-900 rounded-full relative overflow-hidden my-2;
}
.bias-indicator {
  @apply w-full h-4 bg-purple-500 rounded-full absolute;
  box-shadow: 0 0 8px #a855f7;
}
.bias-label {
  @apply text-sm font-bold text-purple-300;
}
.bias-value {
  @apply absolute bottom-2 text-lg font-bold;
}
</style>
