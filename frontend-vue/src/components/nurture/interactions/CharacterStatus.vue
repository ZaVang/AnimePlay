<script setup lang="ts">
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();
</script>

<template>
  <!-- 当前角色状态提示 -->
  <div class="mt-6 p-4 bg-gray-700/30 rounded-lg">
    <div class="flex items-center text-sm text-gray-400">
      <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span>{{ character.name }} 目前心情 
        <span :class="{
          'text-pink-400': character.nurtureData.attributes.mood >= 80,
          'text-green-400': character.nurtureData.attributes.mood >= 60,
          'text-yellow-400': character.nurtureData.attributes.mood >= 40,
          'text-orange-400': character.nurtureData.attributes.mood >= 20,
          'text-red-400': character.nurtureData.attributes.mood < 20
        }">
          {{ character.nurtureData.attributes.mood >= 80 ? '很好' : 
             character.nurtureData.attributes.mood >= 60 ? '不错' :
             character.nurtureData.attributes.mood >= 40 ? '一般' :
             character.nurtureData.attributes.mood >= 20 ? '较差' : '很差' }}
        </span>
      </span>
    </div>
  </div>
</template>