<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';

interface Props {
  topicBias: number;  // -10 to +10
}

const props = defineProps<Props>();
const playerStore = usePlayerStore();

const isPlayerA = playerStore.playerId === 'playerA';

const playerLabel = computed(() => (isPlayerA ? 'USER_FIELD' : 'RIVAL_ZONE'));
const opponentLabel = computed(() => (isPlayerA ? 'RIVAL_ZONE' : 'USER_FIELD'));

const biasPercentage = computed(() => {
  const bias = isPlayerA ? props.topicBias : -props.topicBias;
  return (bias + 10) * 5;
});

const statusText = computed(() => {
  const bias = props.topicBias;
  if (bias >= 10) return 'NODE_CAPTURED';
  if (bias >= 7) return 'SIGNAL_OVERLOAD';
  if (bias >= 4) return 'ACTIVE_UPLINK';
  if (bias >= 1) return 'DATA_GAINS';
  if (bias === 0) return 'PARITY_SYNC';
  if (bias >= -3) return 'STOCHASTIC_DEBT';
  if (bias >= -6) return 'SIGNAL_DROP';
  if (bias >= -9) return 'SYSTEM_FAILURE';
  return 'DESTRUCTION_LOGIC';
});

const showWarning = computed(() => Math.abs(props.topicBias) >= 8);

const emit = defineEmits<{
  click: [value: number];
}>();

function handleClick() {
  emit('click', props.topicBias);
}
</script>

<template>
  <div class="topic-bias-container-cyber-horizontal quantic-reveal" @click="handleClick">
    <!-- Static Backdrop Scan -->
    <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>

    <!-- Left Decoration -->
    <div class="cyber-cap-horizontal left">
      <div class="text-[7px] font-display font-bold text-industrial-600 uppercase tracking-widest mb-1">Sector_B</div>
      <span class="faction-label text-[10px] font-display font-black uppercase text-clinical-danger">{{ opponentLabel }}</span>
      <div class="absolute left-0 bottom-2 w-10 h-px bg-clinical-danger/30"></div>
    </div>
    
    <!-- Core Interaction Axis -->
    <div class="bias-core-horizontal bg-white/[0.02] border-x border-white/5 relative group">
      <!-- Logic Flow Visualization -->
      <div class="energy-flow-horizontal h-full absolute transition-all duration-700 ease-out" 
           :style="{ width: `${biasPercentage}%`, backgroundColor: props.topicBias > 0 ? 'rgba(212,165,116,0.1)' : 'rgba(159,18,57,0.1)' }"></div>
      
      <!-- Precision Grid Overlay -->
      <div class="absolute inset-0 opacity-[0.05] pointer-events-none">
         <svg class="w-full h-full" viewBox="0 0 200 60">
            <defs>
              <pattern id="grid-tactical" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <rect width="10" height="10" fill="none" stroke="white" stroke-width="0.2"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-tactical)" />
         </svg>
      </div>
      
      <!-- Tactical Reticle Indicator -->
      <div class="bias-pointer-horizontal" :style="{ left: `${biasPercentage}%` }">
        <div class="pointer-core border border-white/30 bg-black/80 flex flex-col items-center justify-center transition-all duration-300">
          <span class="text-xs font-mono font-black text-white tabular-nums">{{ Math.abs(props.topicBias).toFixed(1) }}</span>
          <span class="text-[5px] font-display font-bold text-gold/60 uppercase">{{ statusText }}</span>
        </div>
        <!-- Crosshair lines -->
        <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[150%] border-x border-white/10 pointer-events-none"></div>
      </div>
    </div>
    
    <!-- Right Decoration -->
    <div class="cyber-cap-horizontal right">
      <div class="text-[7px] font-display font-bold text-industrial-600 uppercase tracking-widest mb-1">Sector_A</div>
      <span class="faction-label text-[10px] font-display font-black uppercase text-gold">{{ playerLabel }}</span>
      <div class="absolute right-0 bottom-2 w-10 h-px bg-gold/30"></div>
    </div>
    
    <!-- Critical Status Alert -->
    <div v-if="showWarning" class="warning-state-horizontal z-20">
      <div class="px-2 py-0.5 border border-clinical-danger bg-black/80 text-clinical-danger text-[8px] font-display font-black animate-pulse uppercase tracking-[0.2em]">
        CRITICAL_THRESHOLD_ALERT
      </div>
    </div>

    <!-- Decorative Corner Pins -->
    <div class="absolute top-0 left-0 w-1 h-1 bg-white/20"></div>
    <div class="absolute bottom-0 right-0 w-1 h-1 bg-white/20"></div>
  </div>
</template>

<style scoped>
.topic-bias-container-cyber-horizontal {
  @apply w-full h-24 flex items-center relative;
  @apply bg-black/60 backdrop-blur-md border border-white/5;
}

.cyber-cap-horizontal {
  @apply relative z-10 px-6 h-full flex flex-col justify-center;
  flex-basis: 120px;
}

.bias-core-horizontal {
  @apply flex-1 h-12 mx-2 relative overflow-visible;
}

.energy-flow-horizontal {
  @apply top-0 left-0;
}

.bias-pointer-horizontal {
  @apply absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2;
  @apply z-30 transition-all duration-500 ease-out;
}

.pointer-core {
  @apply w-12 h-12 overflow-hidden shadow-2xl;
  box-shadow: 0 0 20px rgba(0,0,0,0.8);
}

.warning-state-horizontal {
  @apply absolute top-2 left-1/2 transform -translate-x-1/2;
}

/* Float animation for tactical feel */
.bias-pointer-horizontal {
  animation: float-reticle 5s ease-in-out infinite;
}

@keyframes float-reticle {
  0%, 100% { transform: translateY(-50%) translateX(0); }
  50% { transform: translateY(-50%) translateX(1px); }
}
</style>