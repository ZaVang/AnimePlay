<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';
import { useCharacterTraining } from '@/composables/useCharacterTraining';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const userStore = useUserStore();
const { specialActivities } = useCharacterTraining(props.character);

// 执行特殊活动
function performSpecialActivity(activityId: string) {
  const activity = specialActivities.value.find(a => a.id === activityId);
  if (!activity || !activity.available) return;
  
  if (userStore.playerState.knowledgePoints < activity.cost) {
    userStore.addLog('知识点不足！', 'warning');
    return;
  }

  userStore.playerState.knowledgePoints -= activity.cost;
  const nurtureData = userStore.getNurtureData(props.character.id);

  switch (activityId) {
    case 'rest':
      nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + 15);
      // 随机提升一个属性
      const attrs = ['charm', 'intelligence', 'strength'] as const;
      const randomAttr = attrs[Math.floor(Math.random() * attrs.length)];
      userStore.enhanceAttribute(props.character.id, randomAttr, 1);
      break;
      
    case 'meditation':
      userStore.enhanceAttribute(props.character.id, 'charm', 2);
      userStore.enhanceAttribute(props.character.id, 'intelligence', 2);
      userStore.enhanceAttribute(props.character.id, 'strength', 2);
      nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + 10);
      break;
      
    case 'special_event':
      userStore.increaseAffection(props.character.id, 100);
      nurtureData.specialEvents.push(`special_event_${Date.now()}`);
      break;
  }
  
  userStore.addLog(`${props.character.name} 进行了${activity.name}！`, 'success');
}
</script>

<template>
  <div>
    <h3 class="text-lg font-medium text-gray-300 mb-4">特殊活动</h3>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      
      <div 
        v-for="activity in specialActivities" 
        :key="activity.id"
        class="group"
      >
        <div 
          class="p-4 rounded-lg border transition-all duration-300 h-full"
          :class="activity.available 
            ? `bg-${activity.color}-600/10 hover:bg-${activity.color}-600/20 border-${activity.color}-600/30`
            : 'bg-gray-800/50 border-gray-700 opacity-60'"
        >
          <!-- 头部信息 -->
          <div class="text-center mb-3">
            <div class="text-3xl mb-2 group-hover:scale-110 transition-transform">{{ activity.icon }}</div>
            <h4 class="font-medium text-white text-sm mb-1">{{ activity.name }}</h4>
            <p class="text-xs text-gray-400 mb-2">{{ activity.description }}</p>
            <div class="text-xs text-gray-400">💎 {{ activity.cost }}</div>
          </div>

          <div class="text-xs text-gray-300 mb-3 text-center">{{ activity.effect }}</div>

          <!-- 需求条件显示 -->
          <div v-if="!activity.available || userStore.playerState.knowledgePoints < activity.cost" class="mb-3 text-xs text-gray-400 text-center">
            <span>需要: </span>
            <span v-if="activity.id === 'meditation' && character.nurtureData.affection < 200">羁绊值200+ </span>
            <span v-if="activity.id === 'special_event' && character.nurtureData.affection < 500">羁绊值500+ </span>
            <span v-if="userStore.playerState.knowledgePoints < activity.cost">知识点{{ activity.cost }}+ </span>
          </div>

          <button
            @click="performSpecialActivity(activity.id)"
            :disabled="!activity.available || userStore.playerState.knowledgePoints < activity.cost"
            class="w-full py-2 px-3 rounded-lg font-medium text-sm transition-all duration-300"
            :class="activity.available && userStore.playerState.knowledgePoints >= activity.cost
              ? `bg-${activity.color}-600 hover:bg-${activity.color}-700 text-white`
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'"
          >
            <span v-if="!activity.available">条件不满足</span>
            <span v-else-if="userStore.playerState.knowledgePoints < activity.cost">知识点不足</span>
            <span v-else>进行活动</span>
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* 训练按钮悬停效果 */
.group:hover .text-2xl {
  transform: scale(1.1);
  transition: transform 0.3s ease;
}
</style>