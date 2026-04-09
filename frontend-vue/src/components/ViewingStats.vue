<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/modules/authStore';
import { useViewingStore } from '@/stores/modules/viewingStore';

const authStore = useAuthStore();
const viewingStore = useViewingStore();

const stats = computed(() => viewingStore.viewingStats);
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
  <div class="bg-industrial-800 border border-industrial-700 h-full flex flex-col clip-chamfer datapad-reveal">
    <div class="tactical-panel-header">
      <span class="flex items-center gap-2">
        <span class="w-2 h-2 bg-clinical-blue animate-pulse"></span>
        观看数据统计分析
      </span>
      <span class="opacity-30">实时监测中</span>
    </div>

    <div v-if="authStore.isLoggedIn" class="p-6 space-y-6 flex-1 overflow-y-auto font-sans text-white">
      <!-- 观看等级 (Tactical Badge) -->
      <div class="p-4 bg-industrial-900 border-l-4 border-clinical-blue flex justify-between items-center relative overflow-hidden">
        <div>
          <h3 class="text-xs text-industrial-500 font-bold mb-1">系统权限等级</h3>
          <div class="text-2xl font-black italic tracking-tighter text-white">
            第 {{ progressLevel.level }} 阶级
          </div>
          <p class="text-[11px] text-industrial-300 mt-1 font-bold">持续活跃稳定性：{{ stats.consecutiveDays }} 天</p>
        </div>
        <div class="text-4xl opacity-20 filter grayscale">{{ progressLevel.icon }}</div>
        
        <!-- Decoration lines -->
        <div class="absolute top-0 right-0 w-8 h-8 opacity-10">
          <div class="absolute top-0 right-0 w-full h-[1px] bg-white"></div>
          <div class="absolute top-0 right-0 h-full w-[1px] bg-white"></div>
        </div>
      </div>

      <!-- 统计数据网格 (Stark) -->
      <div class="grid grid-cols-2 gap-px bg-industrial-700 border border-industrial-700">
        <div class="bg-industrial-800 p-4 text-center">
          <div class="text-xl font-bold text-clinical-blue">{{ totalWatchedHours }}H {{ totalWatchedMinutes }}M</div>
          <div class="text-[9px] text-industrial-500 uppercase mt-1">Accumulated_Time</div>
        </div>
        <div class="bg-industrial-800 p-4 text-center">
          <div class="text-xl font-bold text-industrial-100">{{ viewingStore.watchedAnime.size }}</div>
          <div class="text-[9px] text-industrial-500 uppercase mt-1">Profiles_Accessed</div>
        </div>
      </div>

      <!-- 类型偏好 (Segmented) -->
      <div v-if="topGenres.length > 0">
        <h4 class="text-[10px] text-industrial-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span class="w-1 h-3 bg-industrial-600"></span>
          Genre_Affinity_Matrix
        </h4>
        <div class="space-y-4">
          <div v-for="[genre, count] in topGenres" :key="genre" class="space-y-1.5">
            <div class="flex justify-between text-[10px] text-industrial-300">
              <span class="uppercase tracking-tighter">{{ genre }}</span>
              <span>{{ count }}U</span>
            </div>
            <div class="segmented-bar-container bg-industrial-900 h-2 px-0.5 py-0.5 gap-0.5">
              <div 
                v-for="i in 10" 
                :key="i"
                class="segmented-bar-block"
                :class="{ 'active': (i / 10) * 100 <= (count / Math.max(...topGenres.map(([,c]) => c))) * 100 }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 下一个里程碑 (System Prompt style) -->
      <div class="bg-industrial-900/50 border border-industrial-700/50 p-3 text-[10px] text-industrial-400 group">
        <div class="flex items-start gap-2">
          <span class="text-clinical-warning animate-pulse shrink-0">>></span>
          <span v-if="stats.consecutiveDays < 7">
            MAINTAIN TERMINAL UPTIME FOR <span class="text-clinical-warning">{{ 7 - stats.consecutiveDays }}</span> ADDITIONAL DAYS TO ACHIEVE "FAN" CLASSIFICATION.
          </span>
          <span v-else-if="stats.consecutiveDays < 14">
            MAINTAIN TERMINAL UPTIME FOR <span class="text-clinical-warning">{{ 14 - stats.consecutiveDays }}</span> ADDITIONAL DAYS TO ACHIEVE "EXPERT" CLASSIFICATION.
          </span>
          <span v-else-if="stats.consecutiveDays < 30">
            MAINTAIN TERMINAL UPTIME FOR <span class="text-clinical-warning">{{ 30 - stats.consecutiveDays }}</span> ADDITIONAL DAYS TO ACHIEVE "MASTER" CLASSIFICATION.
          </span>
          <span v-else>
            MAXIMUM AUTHORIZATION LEVEL REACHED. CONTINUOUS OPERATION RECOMMENDED FOR REWARD RETENTION.
          </span>
        </div>
      </div>
    </div>
    
    <div v-else class="flex-1 flex flex-col items-center justify-center py-12 opacity-30 font-mono">
      <div class="text-4xl mb-4">🛡️</div>
      <p class="text-xs uppercase tracking-widest text-center px-8">Encryption_Active: Identity_Confirmation_Required</p>
    </div>
  </div>
</template>