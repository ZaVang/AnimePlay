<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';

const userStore = useUserStore();

const stats = computed(() => userStore.playerState.viewingStats);
const totalWatchedHours = computed(() => Math.floor(stats.value.totalWatchTime / 60));
const totalWatchedMinutes = computed(() => stats.value.totalWatchTime % 60);

const topGenres = computed(() => {
  return Object.entries(stats.value.genreProgress)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
});

const progressLevel = computed(() => {
  if (stats.value.consecutiveDays >= 30) return { level: '大师', color: 'text-purple-400', icon: '👑' };
  if (stats.value.consecutiveDays >= 14) return { level: '专家', color: 'text-blue-400', icon: '🎖️' };
  if (stats.value.consecutiveDays >= 7) return { level: '爱好者', color: 'text-green-400', icon: '⭐' };
  if (stats.value.consecutiveDays >= 3) return { level: '初级', color: 'text-yellow-400', icon: '🌟' };
  return { level: '新手', color: 'text-gray-400', icon: '🌱' };
});
</script>

<template>
  <div class="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
    <h2 class="text-xl font-bold text-white mb-4 flex items-center">
      <svg class="w-6 h-6 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
      </svg>
      观看统计
    </h2>

    <div v-if="userStore.isLoggedIn" class="space-y-6">
      <!-- 观看等级 -->
      <div class="text-center p-4 bg-gray-700/50 rounded-lg">
        <div class="text-2xl mb-2">{{ progressLevel.icon }}</div>
        <h3 class="text-lg font-bold mb-1" :class="progressLevel.color">{{ progressLevel.level }}观众</h3>
        <p class="text-sm text-gray-400">连续观看 {{ stats.consecutiveDays }} 天</p>
      </div>

      <!-- 统计数据网格 -->
      <div class="grid grid-cols-2 gap-4">
        <!-- 总观看时间 -->
        <div class="bg-gray-700/30 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-blue-400">
            {{ totalWatchedHours }}h {{ totalWatchedMinutes }}m
          </div>
          <div class="text-xs text-gray-400 mt-1">总观看时间</div>
        </div>

        <!-- 已观看动画数 -->
        <div class="bg-gray-700/30 p-4 rounded-lg text-center">
          <div class="text-2xl font-bold text-green-400">{{ userStore.playerState.watchedAnime.size }}</div>
          <div class="text-xs text-gray-400 mt-1">已观看动画</div>
        </div>
      </div>

      <!-- 类型偏好 -->
      <div v-if="topGenres.length > 0">
        <h4 class="text-sm font-medium text-gray-300 mb-3">喜欢的类型</h4>
        <div class="space-y-2">
          <div v-for="[genre, count] in topGenres" :key="genre" class="flex items-center justify-between">
            <span class="text-sm text-gray-300">{{ genre }}</span>
            <div class="flex items-center">
              <div class="w-12 bg-gray-600 rounded-full h-2 mr-2">
                <div 
                  class="bg-blue-400 h-2 rounded-full transition-all duration-300"
                  :style="{ width: `${Math.min(100, (count / Math.max(...topGenres.map(([,c]) => c))) * 100)}%` }"
                ></div>
              </div>
              <span class="text-xs text-gray-400 w-6 text-right">{{ count }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 下一个里程碑 -->
      <div class="mt-4 p-3 bg-gray-700/20 rounded-lg border border-gray-600">
        <div class="flex items-center text-sm text-gray-400">
          <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
          </svg>
          <span v-if="stats.consecutiveDays < 7">
            再连续观看 {{ 7 - stats.consecutiveDays }} 天达到"爱好者"等级并获得奖励
          </span>
          <span v-else-if="stats.consecutiveDays < 14">
            再连续观看 {{ 14 - stats.consecutiveDays }} 天达到"专家"等级
          </span>
          <span v-else-if="stats.consecutiveDays < 30">
            再连续观看 {{ 30 - stats.consecutiveDays }} 天达到"大师"等级
          </span>
          <span v-else>
            您已达到最高等级！继续保持观看习惯获得奖励
          </span>
        </div>
      </div>
    </div>
    
    <div v-else class="text-center text-gray-500 py-8">
      <svg class="w-12 h-12 mx-auto mb-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
      <p>请先登录查看观看统计</p>
    </div>
  </div>
</template>