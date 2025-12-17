<script setup lang="ts">
import { useEconomyStore } from '@/stores/modules/economyStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/stores/userStore';
import { useInteractionEffects } from '@/composables/useInteractionEffects';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const economyStore = useEconomyStore();
const { quickChat, quickGift } = useInteractionEffects(props.character);
</script>

<template>
  <!-- 快速互动按钮 -->
  <div class="mb-6">
    <h3 class="text-lg font-medium text-gray-300 mb-4">快速互动</h3>
    <div class="grid grid-cols-2 gap-4">
      
      <!-- 快速聊天 -->
      <button 
        @click="quickChat"
        class="flex items-center p-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 rounded-lg transition-all duration-300 group"
      >
        <div class="text-2xl mr-3 group-hover:scale-110 transition-transform">💬</div>
        <div class="flex-1">
          <div class="text-sm font-medium text-blue-400 mb-1">随便聊聊</div>
          <div class="text-xs text-gray-400">+5-15 羁绊值</div>
        </div>
      </button>

      <!-- 快速送礼 -->
      <button 
        @click="quickGift"
        :disabled="economyStore.knowledgePoints < 25"
        :class="[
          'flex items-center p-4 border rounded-lg transition-all duration-300 group',
          economyStore.knowledgePoints >= 25
            ? 'bg-pink-600/20 hover:bg-pink-600/30 border-pink-600/30'
            : 'bg-gray-700/50 border-gray-600/50 opacity-50 cursor-not-allowed'
        ]"
      >
        <div class="text-2xl mr-3 group-hover:scale-110 transition-transform">🎁</div>
        <div class="flex-1">
          <div 
            class="text-sm font-medium mb-1"
            :class="economyStore.knowledgePoints >= 25 ? 'text-pink-400' : 'text-gray-500'"
          >
            小礼物
          </div>
          <div class="text-xs text-gray-400">25 知识点</div>
        </div>
      </button>

    </div>
  </div>
</template>
