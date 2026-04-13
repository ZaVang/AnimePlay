<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';

interface Props {
  topicBias: number;  // -10 to +10
}

const props = defineProps<Props>();
const playerStore = usePlayerStore();

// -10 (Opponent/B) to +10 (Player/A)
const isPlayerA = playerStore.playerId === 'playerA';

const playerLabel = computed(() => (isPlayerA ? 'USER_UPLINK' : 'RIVAL_SIGNAL'));
const opponentLabel = computed(() => (isPlayerA ? 'RIVAL_SIGNAL' : 'USER_UPLINK'));

const playerColor = computed(() => (isPlayerA ? 'text-gold' : 'text-clinical-danger'));
const opponentColor = computed(() => (isPlayerA ? 'text-clinical-danger' : 'text-gold'));

const biasPercentage = computed(() => {
  const bias = isPlayerA ? props.topicBias : -props.topicBias;
  return (bias + 10) * 5;
});

const statusText = computed(() => {
  const bias = props.topicBias;
  if (bias >= 10) return 'TERMINATION_PROXIMITY';
  if (bias >= 7) return 'ABSOLUTE_DOMINANCE';
  if (bias >= 4) return 'STRATEGIC_INITIATIVE';
  if (bias >= 1) return 'MARGINAL_ADVANTAGE';
  if (bias === 0) return 'EQUILIBRIUM_STATE';
  if (bias >= -3) return 'STOCHASTIC_DEBT';
  if (bias >= -6) return 'SIGNAL_DEGRADATION';
  if (bias >= -9) return 'CRITICAL_VULNERABILITY';
  return 'DESTRUCTION_IMMINENT';
});

const playerIndicatorColor = computed(() => {
  const bias = isPlayerA ? props.topicBias : -props.topicBias;
  if (bias >= 7) return '#d4a574';    // Gold
  if (bias > 0) return '#60a5fa';     // Tactical Blue
  if (bias === 0) return '#ffffff';    // White
  if (bias < 0 && bias > -7) return '#fb923c'; 
  return '#ef4444';                   // Danger Red
});

const emit = defineEmits<{
  (e: 'click', value: number): void;
}>();
</script>

<template>
  <div class="topic-bias-container-horizontal quantic-reveal">
    <!-- Background Static decoration -->
    <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>

    <!-- Label: RIVAL -->
    <div class="bias-label left">
      <div class="text-[7px] font-display font-bold text-industrial-600 uppercase tracking-widest mb-1">Source_B</div>
      <span :class="opponentColor" class="text-[10px] font-display font-black uppercase tracking-tighter">{{ opponentLabel }}</span>
    </div>
    
    <!-- Main Bias Track: Tactical Readout -->
    <div class="bias-track-horizontal bg-white/[0.02] border border-white/5 relative group">
      <!-- Minimalist Gradient Backdrop -->
      <div class="bias-gradient-horizontal opacity-10"></div>
      
      <!-- Scale Marks: Tactical Ticks -->
      <div class="scale-marks-horizontal">
        <div v-for="i in 21" :key="i" 
             class="mark-horizontal" 
             :class="{ 
               'mark-major-horizontal': i === 11,
               'opacity-40': (i-1) % 5 === 0 && i !== 11,
               'opacity-10': (i-1) % 5 !== 0 
             }">
        </div>
      </div>
      
      <!-- Critical Threshold Alerts -->
      <div v-if="Math.abs(props.topicBias) >= 8" class="absolute inset-0 animate-pulse bg-clinical-danger/[0.05] pointer-events-none"></div>
      
      <!-- Bias Indicator: Floating Tactical Node -->
      <div 
        class="bias-indicator-horizontal group-hover:scale-105 transition-all duration-700 ease-out cursor-pointer"
        :style="{ 
          left: `calc(${biasPercentage}% - 30px)`,
          borderColor: playerIndicatorColor,
          boxShadow: `0 0 15px ${playerIndicatorColor}44`
        }"
        @click="emit('click', props.topicBias)"
      >
        <div class="absolute top-0 left-0 w-1 h-1 bg-current opacity-60"></div>
        <div class="flex flex-col items-center">
           <span class="indicator-value font-mono text-xs tabular-nums text-white">
             {{ props.topicBias > 0 ? '+' : '' }}{{ props.topicBias }}
           </span>
           <span class="text-[6px] font-display font-bold uppercase tracking-tighter opacity-50">{{ statusText }}</span>
        </div>
      </div>
    </div>
    
    <!-- Label: USER -->
    <div class="bias-label right">
      <div class="text-[7px] font-display font-bold text-industrial-600 uppercase tracking-widest mb-1">Source_A</div>
      <span :class="playerColor" class="text-[10px] font-display font-black uppercase tracking-tighter">{{ playerLabel }}</span>
    </div>

    <!-- Corner decorations -->
    <div class="absolute top-0 right-0 w-4 h-px bg-white/5"></div>
    <div class="absolute bottom-0 left-0 w-px h-4 bg-white/5"></div>
  </div>
</template>

<style scoped>
.topic-bias-container-horizontal {
  @apply w-full h-24 flex items-center justify-between;
  @apply bg-black/60 backdrop-blur-md border border-white/5;
  @apply p-6 relative overflow-hidden;
}

.bias-label {
  @apply flex flex-col items-center;
  flex-basis: 90px;
}

.bias-track-horizontal {
  @apply relative flex-1 h-10 mx-6 overflow-visible;
}

.bias-gradient-horizontal {
  @apply absolute inset-0;
  background: linear-gradient(to right,
    #ef4444 0%,
    transparent 50%,
    #d4a574 100%
  );
}

.scale-marks-horizontal {
  @apply absolute inset-0 flex justify-between px-0;
}

.mark-horizontal {
  @apply h-full w-px bg-white;
}

.mark-major-horizontal {
  @apply bg-gold/50 w-px;
}

.bias-indicator-horizontal {
  @apply absolute top-1/2 transform -translate-y-1/2;
  @apply w-[60px] h-10 border bg-black/80;
  @apply flex items-center justify-center;
  z-index: 10;
}

.indicator-value {
  @apply drop-shadow-[0_0_5px_rgba(255,255,255,0.2)];
}

/* Float animation for the indicator */
.bias-indicator-horizontal {
  animation: float-tactical 4s ease-in-out infinite;
}

@keyframes float-tactical {
  0%, 100% { transform: translateY(-50%) translateX(0); }
  50% { transform: translateY(-50%) translateX(-1px); }
}
</style>