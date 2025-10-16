<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores/userStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';
import { useInteractionData } from '@/composables/useInteractionData';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const emit = defineEmits<{
  startDialogue: [];
  openGift: [];
  openActivity: [];
  openCampus: [];
}>();

const userStore = useUserStore();
const { availableInteractions } = useInteractionData(props.character);

// 执行互动
function executeInteraction(interactionId: string) {
  switch (interactionId) {
    case 'dialogue':
      emit('startDialogue');
      break;
    case 'gift':
      emit('openGift');
      break;
    case 'activity':
      emit('openActivity');
      break;
    case 'campus_activity':
      emit('openCampus');
      break;
  }
}
</script>

<template>
  <!-- 主要互动选项 -->
  <div>
    <h3 class="text-lg font-medium text-gray-300 mb-4">深度互动</h3>
    <div class="grid grid-cols-2 gap-4">
      
      <button
        v-for="interaction in availableInteractions" 
        :key="interaction.id"
        @click="executeInteraction(interaction.id)"
        :disabled="!interaction.available"
        :class="[
          'flex items-center p-4 rounded-lg border transition-all duration-300 group',
          interaction.available 
            ? `bg-${interaction.color}-600/10 hover:bg-${interaction.color}-600/20 border-${interaction.color}-600/30 hover:border-${interaction.color}-600/50`
            : 'bg-gray-700/30 border-gray-600/50 opacity-50 cursor-not-allowed'
        ]"
      >
        <div class="text-2xl mr-3 group-hover:scale-110 transition-transform">
          {{ interaction.icon }}
        </div>
        <div class="flex-1">
          <h4 
            class="font-medium text-sm mb-1"
            :class="interaction.available ? 'text-white' : 'text-gray-500'"
          >
            {{ interaction.name }}
          </h4>
          <p 
            class="text-xs mb-2"
            :class="interaction.available ? 'text-gray-400' : 'text-gray-500'"
          >
            {{ interaction.description }}
          </p>
          
          <!-- 成本和状态显示 -->
          <div class="flex justify-between items-center">
            <div v-if="interaction.cost.type === 'knowledge'" class="text-xs text-gray-400">
              💎 {{ interaction.cost.amount }}
            </div>
            <div v-if="!interaction.available" class="text-xs text-red-400">
              <!-- 显示不可用原因 -->
              <span v-if="interaction.id === 'gift' && userStore.playerState.knowledgePoints < 10">
                知识点不足
              </span>
              <span v-else-if="interaction.id === 'activity' && character.nurtureData.affection < 100">
                羁绊值不足
              </span>
              <span v-else-if="interaction.id === 'campus_activity'">
                条件不满足
              </span>
            </div>
          </div>
        </div>
      </button>

    </div>
  </div>
</template>