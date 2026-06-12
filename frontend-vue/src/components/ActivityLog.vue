<script setup lang="ts">
import { useUserStore, type LogEntry } from '@/stores/userStore';
import { computed } from 'vue';

const userStore = useUserStore();

function timeAgo(timestamp: number): string {
  const now = Date.now();
  const seconds = Math.floor((now - timestamp) / 1000);

  if (seconds < 60) return `${seconds}秒前`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

const logTypeStyles = {
  info: 'bg-surface-2 text-ink-2',
  success: 'bg-success/15 text-success',
  warning: 'bg-warning/15 text-warning',
  gacha: 'bg-purple-500/15 text-purple-500',
};

const logTypeIcon = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  gacha: '🎉',
};

</script>

<template>
  <div class="bg-surface p-6 rounded-lg shadow-lg border border-line h-full flex flex-col">
    <h2 class="text-2xl font-bold text-ink mb-4">系统日志</h2>
    <div class="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[640px]">
      <div v-if="userStore.logs.length === 0" class="text-center text-ink-2 pt-8">
        暂无任何系统日志。
      </div>
      <div v-else v-for="(log, index) in userStore.logs" :key="log.timestamp + '-' + index" 
           class="flex items-start gap-3 p-3 rounded-lg text-sm"
           :class="logTypeStyles[log.type]">
        <span class="mt-1">{{ logTypeIcon[log.type] }}</span>
        <div class="flex-1">
          <p>{{ log.message }}</p>
          <p class="text-xs text-ink-2 opacity-75 mt-1">{{ timeAgo(log.timestamp) }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Custom scrollbar for log area */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: rgb(var(--c-surface-2));
  border-radius: 10px;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgb(var(--c-line));
  border-radius: 10px;
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--c-line-2));
}
</style>
