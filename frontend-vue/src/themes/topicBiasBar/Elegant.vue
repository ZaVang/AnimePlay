<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';

interface Props {
  topicBias: number;  // -10 to +10
}

const props = defineProps<Props>();
const playerStore = usePlayerStore();

const isPlayerA = playerStore.playerId === 'playerA';

// Calculate bias percentage
const biasPercentage = computed(() => {
  const bias = isPlayerA ? props.topicBias : -props.topicBias;
  return (bias + 10) * 5;
});

// Semantic value classes
const valueClass = computed(() => {
  const bias = isPlayerA ? props.topicBias : -props.topicBias;
  if (bias > 0) return 'positive';
  if (bias < 0) return 'negative';
  return 'neutral';
});

const valueLabel = computed(() => {
    const bias = isPlayerA ? props.topicBias : -props.topicBias;
    if (bias > 0) return 'USER_UPLINK';
    if (bias < 0) return 'RIVAL_SIGNAL';
    return 'PARITY_STATE';
});

// Tactical status readout
const statusText = computed(() => {
  const bias = props.topicBias;
  if (bias >= 10) return 'VICTORY_NEAR';
  if (bias >= 7) return 'DOMINANT_SIGNAL';
  if (bias >= 4) return 'ACTIVE_UPLINK';
  if (bias >= 1) return 'MARGINAL_GAINS';
  if (bias === 0) return 'SYNC_EQUILIBRIUM';
  if (bias >= -3) return 'STOCHASTIC_DEBT';
  if (bias >= -6) return 'SIGNAL_DEGRADING';
  if (bias >= -9) return 'CRITICAL_FAILURE';
  return 'SYSTEM_DESTRUCTION';
});

const fillWidth = computed(() => {
  const bias = isPlayerA ? props.topicBias : -props.topicBias;
  return Math.abs(bias) * 5;
});

const statusBarWidth = computed(() => {
  return Math.abs(props.topicBias) * 10;
});

const showWarning = computed(() => Math.abs(props.topicBias) >= 8);

const emit = defineEmits<{
  (e: 'click', value: number): void;
}>();

function handleClick() {
  emit('click', props.topicBias);
}
</script>

<template>
  <div class="bias-bar-elegant-horizontal quantic-reveal group" @click="handleClick">
    <!-- Status Diagnostic Segment -->
    <div class="status-section-horizontal flex flex-col justify-center">
      <div class="text-[7px] font-display font-bold text-gold/50 uppercase tracking-[0.4em] mb-1">Diagnostic_Link</div>
      <div class="status-text uppercase tracking-tighter" :class="valueClass">
        {{ statusText }}
      </div>
      <div class="status-bar-container mt-2">
        <div 
          class="status-bar transition-all duration-700" 
          :style="{ width: `${statusBarWidth}%` }"
          :class="valueClass"
        ></div>
      </div>
    </div>
    
    <!-- Main Engagement Axis -->
    <div class="bias-bar-wrapper-horizontal">
       <!-- Tactical Axis Labels -->
      <div class="scale-labels-horizontal">
        <span class="scale-label" :class="{ 'text-clinical-danger': !isPlayerA }">RIVAL</span>
        <span class="scale-label center font-mono">0.0</span>
        <span class="scale-label" :class="{ 'text-gold': isPlayerA }">USER</span>
      </div>
      
      <div class="bias-bar-horizontal border border-white/5 bg-black/40 relative">
        <!-- Substrate Decoration -->
        <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>
        
        <!-- Axis Zero Point -->
        <div class="center-line-horizontal bg-white/10"></div>
        
        <!-- Energy Surge Fill -->
        <div 
          class="bias-fill-horizontal"
          :class="{ 
            'positive': (isPlayerA && props.topicBias > 0) || (!isPlayerA && props.topicBias < 0), 
            'negative': (isPlayerA && props.topicBias < 0) || (!isPlayerA && props.topicBias > 0)
          }"
          :style="{ 
            width: `${fillWidth}%`,
            opacity: showWarning ? 1 : 0.6
          }"
        ></div>
        
        <!-- Tactical Reticle Indicator -->
        <div 
          class="indicator-dot-horizontal"
          :style="{ left: `${biasPercentage}%` }"
          :class="{ 'warning': showWarning }"
        >
          <!-- Geometric Reticle Decoration -->
          <div class="absolute inset-0 border border-current opacity-40 scale-150 rotate-45 pointer-events-none"></div>
          
          <div class="indicator-tooltip font-mono text-[9px] uppercase tracking-tighter">
            SYNC: {{ props.topicBias > 0 ? '+' : '' }}{{ props.topicBias }}
          </div>
        </div>
      </div>
    </div>
    
    <!-- Precise Readout Segment -->
    <div class="value-display-horizontal" :class="valueClass">
      <div class="text-[7px] font-display font-bold text-industrial-600 uppercase tracking-widest mb-1">Delta_Offset</div>
      <span class="value-number font-mono text-3xl font-black tabular-nums scale-y-110">
        {{ Math.abs(props.topicBias).toFixed(1) }}
      </span>
      <span class="value-label font-display font-bold text-[8px] opacity-40 block mt-1 tracking-widest text-white">
        {{ valueLabel }}
      </span>
    </div>

    <!-- Decorative Corner Pins -->
    <div class="absolute top-2 left-2 w-1 h-1 bg-white/10"></div>
    <div class="absolute bottom-2 right-2 w-1 h-1 bg-white/10"></div>
  </div>
</template>

<style scoped>
.bias-bar-elegant-horizontal {
  @apply w-full h-24 flex items-center justify-between;
  @apply bg-black/40 backdrop-blur-md border border-white/5;
  @apply p-6 cursor-pointer relative overflow-hidden;
  @apply transition-all duration-500;
}

.bias-bar-elegant-horizontal:hover {
  @apply bg-black/60 border-white/10;
  box-shadow: 0 0 30px rgba(0,0,0,0.5);
}

.value-display-horizontal {
  @apply text-right transition-all duration-500;
  flex-basis: 120px;
}

.bias-bar-wrapper-horizontal {
  @apply flex-1 flex flex-col items-center gap-3 mx-8;
  min-width: 250px;
}

.bias-bar-horizontal {
  @apply relative h-6 w-full overflow-hidden;
}

.center-line-horizontal {
  @apply absolute left-1/2 top-0 bottom-0 w-px;
  transform: translateX(-50%);
}

.bias-fill-horizontal {
  @apply absolute top-0 bottom-0 transition-all duration-700 ease-out;
  
  &.positive { 
    @apply left-1/2 bg-gradient-to-r from-gold/5 via-gold/40 to-gold/60;
  }
  
  &.negative { 
    @apply right-1/2 bg-gradient-to-l from-clinical-danger/5 via-clinical-danger/40 to-clinical-danger/60;
  }
}

.indicator-dot-horizontal {
  @apply absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2;
  @apply w-px h-full bg-white transition-all duration-300;
  @apply z-10;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.4);
}

.group:hover .indicator-dot-horizontal {
  @apply h-[120%];
}

.indicator-tooltip {
  @apply absolute bottom-full left-1/2 transform -translate-x-1/2 mb-4;
  @apply bg-black/90 border border-white/10 text-white px-3 py-1 scale-100;
  @apply whitespace-nowrap pointer-events-none;
  box-shadow: 0 4px 15px rgba(0,0,0,0.8);
}

.scale-labels-horizontal {
  @apply flex justify-between w-full text-[8px] font-display font-bold uppercase tracking-[0.2em] opacity-30;
}

.status-section-horizontal {
  @apply space-y-1;
  flex-basis: 140px;
}

.status-text {
  @apply text-[10px] font-display font-black tracking-tight;
}

.status-bar-container {
  @apply w-full h-0.5 bg-white/5 overflow-hidden;
}

.status-bar {
  @apply h-full;
}

/* State Colors */
.positive {
  @apply text-gold;
  .status-bar { @apply bg-gold shadow-[0_0_8px_rgba(212,165,116,0.5)]; }
}
.negative {
  @apply text-clinical-danger;
   .status-bar { @apply bg-clinical-danger shadow-[0_0_8px_rgba(159,18,57,0.5)]; }
}
.neutral {
  @apply text-white/40;
  .status-bar { @apply bg-white/20; }
}

@keyframes pulse-warning {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.warning {
  @apply bg-gold;
  animation: pulse-warning 1s ease-in-out infinite;
}
</style>