<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';
import { computed } from 'vue';

const userStore = useUserStore();

const expPercentage = computed(() => {
  if (userStore.expToNextLevel === 0) return 0;
  return (userStore.playerState.exp / userStore.expToNextLevel) * 100;
});
</script>

<template>
  <div class="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
    <h2 class="text-2xl font-bold text-white mb-4">玩家状态</h2>
    <div v-if="userStore.isLoggedIn" class="space-y-4">
      
      <!-- Level & EXP Bar -->
      <div>
        <div class="flex justify-between items-end mb-1">
          <span class="font-bold text-green-400 text-lg">等级 {{ userStore.playerState.level }}</span>
          <span class="text-sm text-gray-400">
            {{ userStore.playerState.exp }} / {{ userStore.expToNextLevel }} EXP
          </span>
        </div>
        <div class="w-full bg-gray-600 rounded-full h-4 border-2 border-gray-500 overflow-hidden">
          <div 
            class="bg-green-500 h-full rounded-full transition-all duration-500" 
            :style="{ width: expPercentage + '%' }"
          ></div>
        </div>
      </div>

      <!-- Other Stats -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
        <div class="bg-gray-700 p-4 rounded-lg text-center">
          <p class="text-gray-400 text-sm">知识点</p>
          <p class="text-2xl font-bold text-white">{{ userStore.playerState.knowledgePoints }}</p>
        </div>
        <div class="bg-gray-700 p-4 rounded-lg text-center">
          <p class="text-gray-400 text-sm">动画抽卡券</p>
          <p class="text-2xl font-bold text-white">{{ userStore.playerState.animeGachaTickets }}</p>
        </div>
        <div class="bg-gray-700 p-4 rounded-lg text-center">
          <p class="text-gray-400 text-sm">角色抽卡券</p>
          <p class="text-2xl font-bold text-white">{{ userStore.playerState.characterGachaTickets }}</p>
        </div>
        <div class="bg-gray-700 p-4 rounded-lg text-center">
          <p class="text-gray-400 text-sm">已存卡组</p>
          <p class="text-2xl font-bold text-white">{{ Object.keys(userStore.savedDecks).length }}</p>
        </div>
      </div>

    </div>
    <div v-else class="text-center py-8">
      <p class="text-gray-400">请先登录以查看玩家状态。</p>
    </div>
  </div>
</template>
