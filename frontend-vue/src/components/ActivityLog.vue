<script setup lang="ts">
import { useAuthStore } from '@/stores/modules/authStore';
import type { LogEntry } from '@/stores/userStore';
import { computed } from 'vue';

const authStore = useAuthStore();

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
  info: 'bg-gray-700 text-gray-300',
  success: 'bg-green-800 text-green-300',
  warning: 'bg-yellow-800 text-yellow-300',
  gacha: 'bg-purple-800 text-purple-300',
};

const logTypeIcon = {
  info: 'ℹ️',
  success: '✅',
  warning: '⚠️',
  gacha: '🎉',
};

</script>

<template>
  <div class="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 h-full flex flex-col">
    <h2 class="text-2xl font-bold text-white mb-4">系统日志</h2>
    <div class="flex-1 overflow-y-auto pr-2 space-y-2 max-h-[640px]">
      <div v-if="authStore.logs.length === 0" class="text-center text-gray-500 pt-8">
        暂无任何系统日志。
      </div>
      <div v-else v-for="(log, index) in authStore.logs" :key="log.timestamp + '-' + index" 
           class="flex items-start gap-3 p-3 rounded-lg text-sm"
           :class="logTypeStyles[log.type]">
        <span class="mt-1">{{ logTypeIcon[log.type] }}</span>
        <div class="flex-1">
          <p>{{ log.message }}</p>
          <p class="text-xs text-gray-400 opacity-75 mt-1">{{ timeAgo(log.timestamp) }}</p>
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
  background: #374151; /* gray-700 */
  border-radius: 10px;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4b5563; /* gray-600 */
  border-radius: 10px;
}
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280; /* gray-500 */
}
</style>
