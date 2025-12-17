<script setup lang="ts">
import { ref } from 'vue';
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

const { availableGifts } = useInteractionData(props.character);
const { giveGift } = useInteractionEffects(props.character);

function handleGiveGift(gift: any) {
  giveGift(gift);
  emit('close');
}
</script>

<template>
  <!-- 礼物选择模态框 -->
  <div v-if="isOpen" class="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-2xl w-full border border-gray-700 max-h-[80vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-xl font-bold text-white flex items-center">
          <span class="text-2xl mr-2">🎁</span>
          选择礼物
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
      </div>
      
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div 
          v-for="gift in availableGifts" 
          :key="gift.id"
          class="group cursor-pointer bg-gray-700/50 hover:bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-gray-500 transition-all duration-300"
          :class="{
            'border-yellow-500/50': gift.rarity === 'rare',
            'border-purple-500/50': gift.rarity === 'uncommon',
            'border-gray-600': gift.rarity === 'common'
          }"
          @click="handleGiveGift(gift)"
        >
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center">
              <div class="text-2xl mr-3">{{ gift.icon }}</div>
              <div>
                <h4 class="font-medium text-white">{{ gift.name }}</h4>
                <p class="text-sm text-gray-400">{{ gift.description }}</p>
              </div>
            </div>
            <div class="text-right">
              <div class="text-sm font-medium text-pink-400">+{{ gift.affectionGain }}</div>
              <div class="text-xs text-gray-400">💎 {{ gift.cost }}</div>
            </div>
          </div>
          
          <!-- 效果预览 -->
          <div class="text-xs text-gray-300 space-y-1">
            <div v-if="gift.moodGain">心情 +{{ gift.moodGain }}</div>
            <div v-if="gift.charmGain">魅力 +{{ gift.charmGain }}</div>
            <div v-if="gift.intelligenceGain">智力 +{{ gift.intelligenceGain }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>