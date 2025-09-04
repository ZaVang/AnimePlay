<template>
  <div
    v-if="isVisible"
    @click="close"
    class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300"
  >
    <div
      @click.stop
      class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col text-gray-800 mx-4"
    >
      <!-- Header -->
      <div class="flex justify-between items-start p-6 border-b border-gray-200">
        <div>
          <h2 class="text-2xl font-bold">{{ title }}</h2>
          <p v-if="subtitle" class="text-gray-600 mt-1">{{ subtitle }}</p>
        </div>
        <button 
          @click="close" 
          class="text-2xl text-gray-500 hover:text-gray-800"
        >
          &times;
        </button>
      </div>

      <!-- Cards Display -->
      <div class="flex-grow overflow-y-auto p-6">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <div
            v-for="(card, index) in cards"
            :key="`${card.id}-${index}`"
            class="relative rounded-lg overflow-hidden border-2 border-gray-200 transition-all duration-200 hover:border-gray-300 hover:shadow-md"
          >
            <img 
              :src="card.image_path"
              class="w-full aspect-[3/4] object-cover"
              :alt="card.name"
              @error="onImageError"
            />
            
            <!-- Card Info Overlay -->
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p class="text-white text-xs font-bold truncate">{{ card.name }}</p>
              <div class="flex justify-between items-center text-gray-300 text-xs mt-1">
                <span>费用: {{ card.cost }}</span>
                <span v-if="card.synergy_tags && card.synergy_tags.length > 0" class="truncate ml-2">
                  {{ card.synergy_tags[0] }}
                </span>
              </div>
            </div>
            
            <!-- Card Effect Summary (if available) -->
            <div 
              v-if="card.effectDescription"
              class="absolute top-2 left-2 bg-blue-500/80 text-white text-xs px-2 py-1 rounded"
            >
              效果
            </div>
          </div>
        </div>
        
        <div v-if="cards.length === 0" class="text-center py-12">
          <p class="text-gray-500 text-lg">{{ emptyMessage || '没有卡牌可显示' }}</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-gray-200 p-6 flex justify-between items-center">
        <div class="text-sm text-gray-600">
          共 {{ cards.length }} 张卡牌
          <span v-if="showTypes && cardTypes.length > 0" class="ml-4">
            类型: {{ cardTypes.join(', ') }}
          </span>
        </div>
        <button
          @click="close"
          class="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AnimeCard } from '@/types/card';

interface Props {
  isVisible: boolean;
  cards: AnimeCard[];
  title: string;
  subtitle?: string;
  emptyMessage?: string;
  showTypes?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

const cardTypes = computed(() => {
  if (!props.showTypes) return [];
  
  const types = new Set<string>();
  props.cards.forEach(card => {
    if (card.synergy_tags) {
      card.synergy_tags.forEach(tag => types.add(tag));
    }
  });
  return Array.from(types);
});

function close() {
  emit('close');
}

function onImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  const placeholderText = encodeURIComponent('动画卡牌');
  target.src = `https://placehold.co/240x360/e2e8f0/334155?text=${placeholderText}`;
}
</script>

<style scoped>
/* Additional styles can be added here if needed */
</style>