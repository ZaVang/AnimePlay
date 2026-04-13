<script setup lang="ts">
import { useHistoryStore } from '@/stores/battle';
import { computed, ref, watch, nextTick } from 'vue';

const historyStore = useHistoryStore();
const logContainer = ref<HTMLElement | null>(null);

const logs = computed(() => historyStore.log);

// Auto-scroll to the bottom when new logs are added
watch(logs, () => {
  if (logContainer.value) {
    nextTick(() => {
      logContainer.value!.scrollTop = logContainer.value!.scrollHeight;
    });
  }
}, { deep: true });

const logTypeClasses = {
  event: 'text-gold drop-shadow-[0_0_5px_rgba(212,165,116,0.3)] font-black',
  clash: 'text-white font-bold opacity-90',
  damage: 'text-clinical-danger uppercase tracking-tighter font-black',
  info: 'text-industrial-500 italic opacity-60',
} as const;
</script>

<template>
  <div class="battle-log-wrapper quantic-reveal overflow-hidden relative">
    <!-- Background scanlines -->
    <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>

    <div ref="logContainer" class="log-container scrollbar-tactical">
      <div v-for="log in logs" :key="log.id" class="log-message group relative" :class="logTypeClasses[log.type]">
        <!-- Prefix for tactical feel -->
        <span class="text-[8px] font-mono mr-2 opacity-30 select-none">»</span>
        <span class="text-[10px] uppercase font-mono tracking-tight leading-relaxed">
           {{ log.message }}
        </span>
        
        <!-- Selection hover indicator -->
        <div class="absolute inset-y-0 left-0 w-0.5 bg-current opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </div>
    </div>
    
    <!-- Header overlay tag -->
    <div class="absolute top-0 right-2 px-2 bg-black/60 border-x border-b border-white/10 text-[7px] font-display font-bold text-industrial-600 uppercase tracking-widest z-10">
      Mission_Log_Active
    </div>
  </div>
</template>

<style scoped>
.battle-log-wrapper {
  @apply absolute inset-0 bg-black/40 border border-white/5 p-4;
}

.log-container {
  @apply h-full overflow-y-auto pr-2;
}

.log-message {
  @apply mb-1.5 flex transition-all duration-300;
}

/* Tactical scrollbar */
.scrollbar-tactical::-webkit-scrollbar {
  width: 1px;
}
.scrollbar-tactical::-webkit-scrollbar-track {
  @apply bg-transparent;
}
.scrollbar-tactical::-webkit-scrollbar-thumb {
  @apply bg-gold/20;
}
</style>
