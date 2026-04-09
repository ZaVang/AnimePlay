<script setup lang="ts">
import { useAuthStore } from '@/stores/modules/authStore';

const authStore = useAuthStore();

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + String(date.getMilliseconds()).padStart(3, '0');
}

const logTypeConfig = {
  info: { label: 'INFO', color: 'text-clinical-blue' },
  success: { label: 'OK', color: 'text-green-500' },
  warning: { label: 'WARN', color: 'text-clinical-warning' },
  gacha: { label: 'EXEC', color: 'text-purple-400' },
};
</script>

<template>
  <div class="bg-industrial-800 border border-industrial-700 h-full flex flex-col clip-chamfer-sm datapad-reveal">
    <div class="tactical-panel-header">
      <span class="flex items-center gap-2">
        <span class="w-1 h-3 bg-industrial-400"></span>
        系统活动日志
      </span>
      <span class="opacity-30">版本 0.9.1A</span>
    </div>

    <div class="flex-1 overflow-y-auto font-mono text-[11px] p-4 space-y-1 bg-industrial-900/50">
      <div v-if="authStore.logs.length === 0" class="flex flex-col items-center justify-center py-12 opacity-20">
        <span class="text-3xl mb-2">⊘</span>
        <span>NO_SIGNAL_DETECTED</span>
      </div>
      
      <div v-else v-for="(log, index) in authStore.logs" :key="log.timestamp + '-' + index" 
           class="flex gap-3 py-1 px-2 border-l border-transparent hover:border-industrial-600 hover:bg-industrial-800 transition-colors group">
        <span class="text-industrial-600 shrink-0">[{{ formatTime(log.timestamp) }}]</span>
        <span :class="logTypeConfig[log.type].color" class="font-bold shrink-0">[{{ logTypeConfig[log.type].label }}]</span>
        <span class="text-industrial-300 group-hover:text-industrial-100">{{ log.message }}</span>
      </div>
    </div>
    
    <div class="bg-industrial-900 px-4 py-1 text-[9px] font-mono text-industrial-600 border-t border-industrial-800 flex justify-between">
      <span>BUFFER_READY</span>
      <span>ENTRIES: {{ authStore.logs.length }}</span>
    </div>
  </div>
</template>

<style scoped>
.overflow-y-auto::-webkit-scrollbar {
  width: 2px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #3A3D43;
}
</style>
