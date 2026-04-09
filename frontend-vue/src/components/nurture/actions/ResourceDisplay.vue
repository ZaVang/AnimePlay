<script setup lang="ts">
import { useEconomyStore } from '@/stores/modules/economyStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const economyStore = useEconomyStore();
</script>

<template>
  <!-- 当前资源显示 -->
  <div class="bg-gray-700/30 rounded-lg p-4 mb-6">
    <div class="flex items-center justify-between text-sm">
      <div class="flex items-center">
        <span class="text-gray-400">可用知识点:</span>
        <span class="ml-2 font-bold text-blue-400">{{ economyStore.knowledgePoints }}</span>
      </div>
      <div class="flex items-center">
        <span class="text-gray-400">心情值:</span>
        <span 
          class="ml-2 font-bold"
          :class="{
            'text-green-400': character.nurtureData.attributes.mood >= 70,
            'text-yellow-400': character.nurtureData.attributes.mood >= 40,
            'text-red-400': character.nurtureData.attributes.mood < 40
          }"
        >
          {{ character.nurtureData.attributes.mood }}
        </span>
      </div>
    </div>
  </div>
</template>
