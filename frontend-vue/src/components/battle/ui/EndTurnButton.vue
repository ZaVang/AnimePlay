<script setup lang="ts">
import { useGameStore } from '@/stores/battle';
import { TurnManager } from '@/core/battle/TurnManager';

const gameStore = useGameStore();

function handleEndTurn() {
  if (gameStore.phase === 'action' && gameStore.activePlayer === 'playerA') {
    TurnManager.endTurn();
  }
}
</script>

<template>
  <button
    @click="handleEndTurn"
    :disabled="gameStore.phase !== 'action' || gameStore.activePlayer !== 'playerA'"
    class="end-turn-button"
  >
    结束回合
  </button>
</template>

<style scoped>
.end-turn-button {
  @apply text-white font-bold py-3 px-6 rounded-lg text-xl transition-all duration-300;
  @apply bg-green-600 hover:bg-green-500 shadow-lg hover:shadow-green-500/50;
  @apply disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed;
  writing-mode: vertical-rl;
  text-orientation: mixed;
}
</style>
