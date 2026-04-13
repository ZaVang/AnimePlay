<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';
import CharacterLineup from '@/components/battle/character/CharacterLineup.vue';
import HandDisplay from '@/components/battle/HandDisplay.vue';

const props = defineProps<{
  playerId: 'playerA' | 'playerB';
  isOpponent?: boolean;
}>();

const playerStore = usePlayerStore();
const player = computed(() => playerStore[props.playerId]);
</script>

<template>
  <div class="player-field-layout-horizontal quantic-reveal" :class="{ 'opponent-layout': isOpponent }">
    <!-- Left Side: Character Lineup and Player Info -->
    <div class="character-and-status-container group">
      <!-- Glow decoration -->
      <div class="absolute inset-0 bg-gold/[0.01] opacity-0 group-hover:opacity-100 transition-opacity"></div>
      
      <div class="player-info-wrapper relative z-10">
        <div class="flex flex-col">
           <span class="text-[7px] font-display font-bold text-gold/40 uppercase tracking-[0.3em]">Operator_ID</span>
           <h3 class="text-xs font-display font-black text-white uppercase tracking-tight truncate max-w-[120px]">{{ player.name }}</h3>
        </div>
        
        <div class="info-stats">
          <div class="stat-unit">
             <span class="stat-label">REP_STABILITY</span>
             <span class="stat-value font-mono text-gold">{{ player.reputation }}</span>
          </div>
          <div class="stat-unit">
             <span class="stat-label">ENERGY_CAP</span>
             <span class="stat-value font-mono text-blue-400">{{ player.tp }}<span class="opacity-30">/{{ player.maxTp }}</span></span>
          </div>
          <div class="stat-unit hidden lg:flex">
             <span class="stat-label">DATA_NODES</span>
             <span class="stat-value font-mono text-industrial-400">{{ player.deck.length }}</span>
          </div>
        </div>
      </div>

      <div class="character-lineup-wrapper relative z-10">
        <CharacterLineup :playerId="playerId" />
      </div>

      <!-- Tactical Corner markers -->
      <div class="absolute top-0 left-0 w-1.5 h-px bg-gold/40"></div>
      <div class="absolute top-0 left-0 w-px h-1.5 bg-gold/40"></div>
    </div>

    <!-- Right Side: Hand Display -->
    <div class="hand-display-wrapper">
      <div class="absolute top-0 left-4 text-[7px] font-display font-bold text-industrial-600 uppercase tracking-widest -translate-y-1/2 bg-black px-2 z-20 italic">Data_Stream_Access</div>
      <HandDisplay :playerId="playerId" :isOpponent="isOpponent" />
    </div>
  </div>
</template>

<style scoped>
.player-field-layout-horizontal {
  @apply h-full w-full flex p-4 gap-6;
}

.character-and-status-container {
  @apply flex flex-col border border-white/5 bg-black/40 p-4 relative overflow-hidden;
  flex: 1 1 35%; 
}

.hand-display-wrapper {
  @apply relative border border-white/5 bg-black/20;
  flex: 1 1 65%;
}

.player-info-wrapper {
  @apply flex items-end justify-between px-1 mb-4 pb-4 border-b border-white/5;
}

.info-stats {
  @apply flex gap-6;
}

.stat-unit {
  @apply flex flex-col items-end;
}

.stat-label {
  @apply text-[7px] font-display font-bold text-industrial-500 uppercase tracking-tighter;
}

.stat-value {
  @apply text-base font-black tabular-nums leading-tight;
}

.character-lineup-wrapper {
  @apply flex-grow;
}

.opponent-layout {
  @apply flex-row-reverse;
}

.opponent-layout .player-info-wrapper {
  @apply flex-row-reverse;
}

.opponent-layout .stat-unit {
  @apply items-start;
}

.opponent-layout .character-and-status-container {
  @apply border-l-0 border-r border-white/5;
}
</style>
