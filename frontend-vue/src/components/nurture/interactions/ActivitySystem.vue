<script setup lang="ts">
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';
import { useInteractionData } from '@/composables/useInteractionData';
import { useInteractionEffects } from '@/composables/useInteractionEffects';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { availableActivities, isActivityAvailable } = useInteractionData(props.character);
const { doActivity } = useInteractionEffects(props.character);

function handleDoActivity(activity: any) {
  if (isActivityAvailable(activity)) {
    doActivity(activity);
    emit('close');
  }
}
</script>

<template>
  <!-- 活动选择模态框 -->
  <div v-if="isOpen" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full border border-gray-700 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-white flex items-center">
          <span class="text-2xl mr-2">🎯</span>
          选择活动
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
      </div>
      
      <div class="space-y-3">
        <div 
          v-for="activity in availableActivities" 
          :key="activity.id"
          class="group cursor-pointer bg-gray-700/50 rounded-lg p-4 border transition-all duration-300"
          :class="isActivityAvailable(activity)
            ? 'hover:bg-gray-700 border-gray-600 hover:border-gray-500'
            : 'border-gray-700 opacity-50 cursor-not-allowed'"
          @click="handleDoActivity(activity)"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <div class="text-2xl mr-3">{{ activity.icon }}</div>
              <div>
                <h4 class="font-medium text-white">{{ activity.name }}</h4>
                <p class="text-sm text-gray-400">{{ activity.description }}</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium text-green-400">+{{ activity.affectionGain }}</div>
              <div class="text-xs text-gray-400">💎 {{ activity.cost }}</div>
              <div class="text-xs text-gray-400">{{ activity.duration }}分钟</div>
            </div>
          </div>
          
          <!-- 需求条件 -->
          <div class="text-xs text-gray-400 mb-2">
            需要羁绊值: {{ activity.requirements.affection }}+
          </div>
          
          <!-- 效果预览 -->
          <div class="text-xs text-gray-300 space-y-1">
            <div v-if="activity.moodGain">心情 +{{ activity.moodGain }}</div>
            <div v-if="activity.charmGain">魅力 +{{ activity.charmGain }}</div>
            <div v-if="activity.intelligenceGain">智力 +{{ activity.intelligenceGain }}</div>
            <div v-if="activity.strengthGain">体力 +{{ activity.strengthGain }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>