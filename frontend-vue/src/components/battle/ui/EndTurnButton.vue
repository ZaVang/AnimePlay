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
    class="battle-action-btn bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
    :class="{ 'shadow-green-500/50': gameStore.phase === 'action' && gameStore.activePlayer === 'playerA' }"
  >
    结束回合
  </button>
</template>

<style scoped>
/* 继承父组件的 battle-action-btn 样式 */
</style>
