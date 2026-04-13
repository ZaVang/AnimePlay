<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePersistentEffects } from '@/core/di/composables';
import type { PersistentEffect } from '@/core/systems/PersistentEffectSystem';

const props = defineProps<{
  playerId: 'playerA' | 'playerB';
  title?: string;
  isOpponent?: boolean;
}>();

const persistentSystem = usePersistentEffects();
const hoveredEffect = ref<PersistentEffect | null>(null);

// Get player's active effects
const activeEffects = computed(() => {
  return persistentSystem.getPlayerEffects(props.playerId);
});

// Filter displayed effects
const displayEffects = computed(() => {
  return activeEffects.value.filter(effect => {
    const hiddenTypes = ['first_card_discount', 'next_card_cost_reduction'];
    return !hiddenTypes.includes(effect.type);
  });
});

// Tactical Icon Mapping
function getEffectIcon(effect: PersistentEffect): string {
  const iconMap: Record<string, string> = {
    'gentle_encouragement': '◈', 
    'reincarnation_memory': '↺', 
    'time_stop_priority': '⌬', 
    'bass_rhythm': '☊', 
    'inner_focus': '⦿', 
    'musical_family': '♬', 
    'genre_expert': '⊞', 
    'default': 'diamondsuit;'
  };
  return iconMap[effect.type] || iconMap.default;
}

// Semantic Color Class
function getEffectColor(effect: PersistentEffect): string {
  if (effect.duration === -1) return 'text-gold drop-shadow-[0_0_5px_rgba(212,165,116,0.3)]'; 
  if (effect.duration > 3) return 'text-blue-400'; 
  if (effect.duration > 1) return 'text-blue-300 opacity-80'; 
  return 'text-clinical-danger animate-pulse'; 
}

// Duration Readout
function getDurationText(effect: PersistentEffect): string {
  if (effect.duration === -1) return 'INFINITE';
  if (effect.duration === 0) return 'EXPIRING';
  return `${effect.duration} RND`;
}

function onEffectHover(effect: PersistentEffect) {
  hoveredEffect.value = effect;
}

function onEffectLeave() {
  hoveredEffect.value = null;
}
</script>

<template>
  <div class="passive-skill-panel quantic-reveal">
    <!-- Panel Header: Tactical Tag -->
    <div class="panel-header">
       <div class="flex flex-col">
          <span class="text-[7px] font-display font-bold text-gold/50 uppercase tracking-[0.3em]">Status Registry</span>
          <h3 class="panel-title">
            {{ title || (isOpponent ? 'OPPONENT_PASSIVES' : 'USER_PASSIVES') }}
          </h3>
       </div>
       <div class="effect-count tabular-nums">{{ displayEffects.length }}</div>
    </div>

    <!-- Effects Stack -->
    <div class="effects-container scrollbar-none">
      <div
        v-for="effect in displayEffects"
        :key="effect.id"
        class="effect-item group"
        :class="getEffectColor(effect)"
        @mouseenter="onEffectHover(effect)"
        @mouseleave="onEffectLeave"
      >
        <!-- Tactical Slot Indicator -->
        <div class="effect-icon-container">
           <span class="effect-icon">{{ getEffectIcon(effect) }}</span>
        </div>

        <div class="effect-info">
          <div class="effect-name uppercase tracking-tighter">{{ effect.description }}</div>
          <div class="effect-duration font-mono">{{ getDurationText(effect) }}</div>
        </div>
        
        <!-- Selection highlight decoration -->
        <div class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <div class="absolute left-0 inset-y-0 w-0.5 bg-current opacity-0 group-hover:opacity-100 transition-all"></div>
      </div>

      <!-- Null State -->
      <div v-if="displayEffects.length === 0" class="no-effects">
        <span class="opacity-30">NO_ACTIVE_PROTOCOLS</span>
      </div>
    </div>

    <!-- Tactical Tooltip: Holographic Overlay -->
    <div
      v-if="hoveredEffect"
      class="effect-tooltip"
    >
      <div class="tooltip-header">
        <span class="tooltip-icon text-gold">{{ getEffectIcon(hoveredEffect) }}</span>
        <div class="flex flex-col">
           <span class="text-[7px] font-display font-bold text-gold uppercase tracking-widest">Protocol_Detail</span>
           <span class="tooltip-title uppercase tracking-tighter">{{ hoveredEffect.description }}</span>
        </div>
      </div>
      <div class="tooltip-content">
        <div class="flex justify-between items-center mb-2">
           <span class="text-industrial-500">TYPE:</span>
           <span class="text-white font-mono uppercase">{{ hoveredEffect.type }}</span>
        </div>
        <div class="flex justify-between items-center mb-3">
           <span class="text-industrial-500">LIFE_CYCLE:</span>
           <span class="font-mono" :class="getEffectColor(hoveredEffect)">{{ getDurationText(hoveredEffect) }}</span>
        </div>
        
        <div v-if="hoveredEffect.data && Object.entries(hoveredEffect.data).length > 0" class="tooltip-data border-t border-white/5 pt-2 mt-2">
          <div class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-widest mb-1">Payload_Data:</div>
          <div v-for="[key, value] in Object.entries(hoveredEffect.data)" :key="key" class="flex justify-between items-center py-0.5">
             <span class="text-industrial-400 capitalize">{{ key.replace(/_/g, ' ') }}:</span>
             <span class="text-gold/80 font-mono">{{ value }}</span>
          </div>
        </div>
      </div>
      
      <!-- Scanline background for tooltip -->
      <div class="absolute inset-0 bg-scanline opacity-[0.02] pointer-events-none"></div>
    </div>
  </div>
</template>

<style scoped>
.passive-skill-panel {
  @apply bg-black/40 backdrop-blur-md border border-white/5 p-3 relative;
  min-width: 220px;
  max-width: 280px;
}

.panel-header {
  @apply flex items-end justify-between mb-4 pb-2 border-b border-white/5;
}

.panel-title {
  @apply text-[10px] font-display font-black text-white uppercase tracking-tight;
}

.effect-count {
  @apply text-[9px] font-mono font-bold text-gold px-2 py-0.5 bg-white/5 border border-white/5;
}

.effects-container {
  @apply space-y-1.5 max-h-48 overflow-y-auto;
}

.effect-item {
  @apply flex items-center gap-3 p-2 bg-white/[0.02] border border-white/5 relative transition-all duration-300;
}

.effect-icon-container {
  @apply w-6 h-6 flex items-center justify-center bg-white/[0.03] border border-white/5 flex-shrink-0;
}

.effect-icon {
  @apply text-sm font-bold;
}

.effect-info {
  @apply flex-1 flex flex-col min-w-0;
}

.effect-name {
  @apply text-[10px] text-industrial-100 font-display font-black truncate leading-tight;
}

.effect-duration {
  @apply text-[8px] opacity-60 tracking-widest mt-0.5;
}

.no-effects {
  @apply text-[8px] font-display font-bold text-industrial-600 text-center py-6 tracking-[0.3em] font-mono;
}

/* Tactical Tooltip */
.effect-tooltip {
  @apply absolute left-full ml-4 top-0 z-50 bg-black/90 border border-white/10 p-4 shadow-2xl backdrop-blur-xl;
  width: 260px;
  pointer-events: none;
  box-shadow: 0 0 30px rgba(0,0,0,0.8), 0 0 10px rgba(212,165,116,0.1);
}

.tooltip-header {
  @apply flex items-center gap-3 mb-4 pb-3 border-b border-white/10;
}

.tooltip-icon {
  @apply text-xl font-black;
}

.tooltip-title {
  @apply font-display font-black text-white text-[12px];
}

.tooltip-content {
  @apply text-[10px] text-industrial-300;
}

.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>