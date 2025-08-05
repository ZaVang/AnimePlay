<script setup lang="ts">
import type { Card } from '@/stores/gameDataStore';

// `Card | null` anlows us to pass `null` to reset/hide the modal
const props = defineProps<{
  card: Card | null;
}>();

const emit = defineEmits(['close']);

function closeModal() {
  emit('close');
}
</script>

<template>
  <div 
    v-if="card" 
    @click="closeModal"
    class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300"
  >
    <div 
      @click.stop 
      class="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col text-gray-800"
    >
      <div class="flex-shrink-0 flex justify-between items-start mb-4">
        <h2 class="text-2xl font-bold">{{ card.name }}</h2>
        <button @click="closeModal" class="text-2xl text-gray-500 hover:text-gray-800">&times;</button>
      </div>

      <div class="flex-grow overflow-y-auto">
        <div class="flex flex-col md:flex-row gap-6">
          <!-- Left side: Image -->
          <div class="md:w-1/3 flex-shrink-0">
            <img :src="card.image_path" class="w-full rounded-md shadow-lg" :alt="card.name">
            <div class="mt-4 text-center">
                <span class="font-bold px-3 py-1 rounded-full text-white" :class="`bg-blue-500`">{{ card.rarity }}</span>
            </div>
          </div>

          <!-- Right side: Details -->
          <div class="md:w-2/3">
            <div v-if="card.description" class="prose max-w-none">
              <h3 class="font-bold text-lg mb-2">简介</h3>
              <p class="text-sm whitespace-pre-wrap">{{ card.description }}</p>
            </div>

            <div v-if="card.anime_names && card.anime_names.length" class="mt-4">
              <h3 class="font-bold text-lg mb-2">登场作品</h3>
              <ul class="list-disc list-inside text-sm">
                <li v-for="anime in card.anime_names" :key="anime">{{ anime }}</li>
              </ul>
            </div>
            
             <div v-if="card.stats" class="mt-4">
                <h3 class="font-bold text-lg mb-2">Bangumi 数据</h3>
                <div class="flex gap-4 text-sm">
                    <span>评论: {{ card.stats.comments }}</span>
                    <span>收藏: {{ card.stats.collects }}</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
