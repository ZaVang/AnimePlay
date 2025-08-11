<script setup lang="ts">
import { useGameStore } from '@/stores/battle';
import { TurnManager } from '@/core/battle/TurnManager';

const gameStore = useGameStore();

function endTurn() {
  if (gameStore.isGameOver) return;
  console.log("End Turn button clicked.");
  TurnManager.endTurn();
}
</script>

<template>
  <div class="action-panel-container w-full h-full flex items-center justify-center gap-4">
    <button
      @click="endTurn"
      :disabled="gameStore.isGameOver"
      class="px-6 py-2 font-bold text-white bg-red-600 rounded-lg shadow-md hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
    >
      结束回合
    </button>
  </div>
</template>

<style scoped>
/* Scoped styles for ActionPanel */
</style>
