<script setup lang="ts">
import { useGameStore } from '@/stores/battle';
import { TurnManager } from '@/core/battle/TurnManager';

// Atomic Components
import TacticalButton from '@/components/ui/TacticalButton.vue';

const gameStore = useGameStore();

function handleEndTurn() {
  if (gameStore.phase === 'action' && gameStore.activePlayer === 'playerA') {
    TurnManager.endTurn();
  }
}
</script>

<template>
  <div class="end-turn-wrapper relative">
    <!-- Action Pulse Decoration (only when active) -->
    <div 
      v-if="gameStore.phase === 'action' && gameStore.activePlayer === 'playerA'"
      class="absolute inset-0 bg-gold/10 blur-xl animate-pulse -z-10"
    ></div>

    <TacticalButton
      block
      variant="primary"
      size="lg"
      @click="handleEndTurn"
      :disabled="gameStore.phase !== 'action' || gameStore.activePlayer !== 'playerA'"
      class="min-w-[160px] relative overflow-hidden"
    >
      <div class="flex flex-col items-center">
         <span class="text-xs font-display font-black tracking-tight">FINALIZE_STRATEGY</span>
         <span class="text-[7px] font-mono opacity-50 uppercase tracking-[0.2em] mt-0.5">结束回合</span>
      </div>

      <!-- Tactical Status Indicator -->
      <div 
        class="absolute top-1 right-1 w-1.5 h-px" 
        :class="gameStore.phase === 'action' ? 'bg-gold animate-pulse' : 'bg-industrial-600'"
      ></div>
    </TacticalButton>
    
    <!-- Phase Label Tag -->
    <div class="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[7px] font-display font-bold text-industrial-600 uppercase tracking-widest whitespace-nowrap opacity-40">
      Current_Phase: {{ gameStore.phase.toUpperCase() }}
    </div>
  </div>
</template>

<style scoped>
.end-turn-wrapper {
  @apply transition-all duration-500;
}
</style>
