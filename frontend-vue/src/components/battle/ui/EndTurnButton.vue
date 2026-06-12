<script setup lang="ts">
import { useGameStore } from '@/stores/battle';
import { BattleFlow } from '@/stores/battleFlow';

const gameStore = useGameStore();

function handleEndTurn() {
  if (gameStore.phase === 'action' && gameStore.activePlayer === 'playerA') {
    BattleFlow.endTurn();
  }
}
</script>

<template>
  <button
    @click="handleEndTurn"
    :disabled="gameStore.phase !== 'action' || gameStore.activePlayer !== 'playerA'"
    class="battle-action-btn bg-accent text-on-accent hover:bg-accent-strong disabled:bg-surface-2 disabled:text-ink-3 disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none"
    :class="{ 'shadow-accent/50': gameStore.phase === 'action' && gameStore.activePlayer === 'playerA' }"
  >
    结束回合
  </button>
</template>

<style scoped>
/* 继承父组件的 battle-action-btn 样式 */
</style>
