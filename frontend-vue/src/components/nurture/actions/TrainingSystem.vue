<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';
import { useCharacterTraining } from '@/composables/useCharacterTraining';
import { useTrainingTimer } from '@/composables/useTrainingTimer';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const userStore = useUserStore();
const { trainingPrograms, getAttributeProgress } = useCharacterTraining(props.character);
const {
  trainingAnimations,
  isTrainingOnCooldown,
  getTrainingCooldownRemaining,
  formatCooldownTime,
  setTrainingCooldown,
  startTrainingAnimation
} = useTrainingTimer();

// 执行训练
function startTraining(programId: string) {
  const program = trainingPrograms.value.find(p => p.id === programId);
  if (!program || !program.available) return;
  
  if (isTrainingOnCooldown(programId)) {
    userStore.addLog('训练还在冷却中，请稍后再试！', 'warning');
    return;
  }
  
  if (userStore.playerState.knowledgePoints < program.cost) {
    userStore.addLog('知识点不足，无法进行训练！', 'warning');
    return;
  }

  // 扣除知识点
  userStore.playerState.knowledgePoints -= program.cost;
  
  // 提升属性
  userStore.enhanceAttribute(props.character.id, program.attribute, program.gain);
  
  // 降低心情 (训练会让角色疲惫)
  const nurtureData = userStore.getNurtureData(props.character.id);
  nurtureData.attributes.mood = Math.max(10, nurtureData.attributes.mood - 5);
  
  // 设置训练冷却 (基于训练时长)
  setTrainingCooldown(programId, program.duration);
  
  // 启动训练动画
  startTrainingAnimation(programId);
  
  userStore.addLog(`${props.character.name} 开始了${program.name}，将在${program.duration}分钟后完成！`, 'success');
  
  // 训练完成后的通知
  setTimeout(() => {
    userStore.addLog(`${props.character.name} 完成了${program.name}！`, 'success');
  }, program.duration * 60 * 1000);
}
</script>

<template>
  <div class="mb-6">
    <h3 class="text-lg font-medium text-gray-300 mb-4">养成属性训练</h3>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      
      <div 
        v-for="program in trainingPrograms" 
        :key="program.id"
        class="group"
      >
        <div 
          class="p-4 rounded-lg border transition-all duration-300 relative overflow-hidden h-full"
          :class="[
            program.available 
              ? 'bg-gray-700/50 hover:bg-gray-700/70 border-gray-600 hover:border-gray-500' 
              : 'bg-gray-800/50 border-gray-700 opacity-60',
            trainingAnimations[program.id] && 'animate-pulse border-blue-400'
          ]"
        >
          <!-- 训练进行中的光效 -->
          <div 
            v-if="trainingAnimations[program.id]" 
            class="absolute inset-0 bg-gradient-to-r from-blue-400/20 via-transparent to-blue-400/20 animate-shimmer"
          ></div>
          
          <!-- 头部信息 -->
          <div class="text-center mb-3">
            <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">{{ program.icon }}</div>
            <h4 class="font-medium text-white text-sm mb-1">{{ program.name }}</h4>
            <p class="text-xs text-gray-400 mb-2">{{ program.description }}</p>
            
            <div class="flex justify-between items-center text-xs">
              <span class="text-green-400 font-medium">+{{ program.gain }}</span>
              <span class="text-gray-400">💎 {{ program.cost }}</span>
            </div>
          </div>

          <!-- 当前属性进度条 -->
          <div class="mb-3">
            <div class="flex justify-between text-xs text-gray-400 mb-1">
              <span>{{ program.attribute }}</span>
              <span>{{ character.nurtureData.attributes[program.attribute] }}/100</span>
            </div>
            <div class="w-full bg-gray-600 rounded-full h-2">
              <div 
                class="h-2 rounded-full transition-all duration-500"
                :class="{
                  'bg-pink-400': program.attribute === 'charm',
                  'bg-blue-400': program.attribute === 'intelligence',
                  'bg-green-400': program.attribute === 'strength'
                }"
                :style="{ width: `${getAttributeProgress(character.nurtureData.attributes[program.attribute])}%` }"
              ></div>
            </div>
          </div>

          <!-- 冷却时间显示 -->
          <div v-if="isTrainingOnCooldown(program.id)" class="mb-2 text-xs text-orange-400 text-center">
            冷却中: {{ formatCooldownTime(getTrainingCooldownRemaining(program.id)) }}
          </div>

          <!-- 行动按钮 -->
          <button
            @click="startTraining(program.id)"
            :disabled="!program.available || userStore.playerState.knowledgePoints < program.cost || isTrainingOnCooldown(program.id)"
            class="w-full py-2 px-3 rounded-lg font-medium text-sm transition-all duration-300"
            :class="program.available && userStore.playerState.knowledgePoints >= program.cost && !isTrainingOnCooldown(program.id)
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'"
          >
            <span v-if="isTrainingOnCooldown(program.id)">训练中</span>
            <span v-else-if="!program.available">心情不足</span>
            <span v-else-if="userStore.playerState.knowledgePoints < program.cost">知识点不足</span>
            <span v-else>开始训练</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* 训练动画效果 */
@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.animate-shimmer {
  animation: shimmer 2s ease-in-out infinite;
}

/* 训练按钮悬停效果 */
.group:hover .text-2xl {
  transform: scale(1.1);
  transition: transform 0.3s ease;
}

/* 进度条动画 */
.h-2 {
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>