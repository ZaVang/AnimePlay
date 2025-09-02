<template>
  <div
    v-if="isVisible"
    @click="onBackgroundClick"
    class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300"
  >
    <div
      @click.stop
      class="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col text-gray-800 mx-4"
    >
      <!-- Header -->
      <div class="flex justify-between items-start p-6 border-b border-gray-200">
        <div>
          <h2 class="text-2xl font-bold">{{ options.title }}</h2>
          <p v-if="options.description" class="text-gray-600 mt-1">{{ options.description }}</p>
          <p class="text-sm text-gray-500 mt-2">
            请选择 {{ options.required ? options.count : `最多${options.count}` }} 张卡牌
            <span v-if="!options.required">(可取消)</span>
          </p>
        </div>
        <button 
          v-if="!options.required"
          @click="cancel" 
          class="text-2xl text-gray-500 hover:text-gray-800"
        >
          &times;
        </button>
      </div>

      <!-- Cards Grid -->
      <div class="flex-grow overflow-y-auto p-6">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          <div
            v-for="card in availableCards"
            :key="card.id"
            @click="toggleCardSelection(card)"
            :class="[
              'relative cursor-pointer transition-all duration-200 rounded-lg overflow-hidden border-2',
              selectedCards.includes(card) 
                ? 'border-blue-500 shadow-lg transform scale-105' 
                : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
            ]"
          >
            <img 
              :src="card.image_path"
              class="w-full aspect-[3/4] object-cover"
              :alt="card.name"
            />
            
            <!-- Selection Indicator -->
            <div
              v-if="selectedCards.includes(card)"
              class="absolute top-2 right-2 w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold"
            >
              {{ selectedCards.indexOf(card) + 1 }}
            </div>
            
            <!-- Card Info Overlay -->
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p class="text-white text-xs font-bold truncate">{{ card.name }}</p>
              <p class="text-gray-300 text-xs">费用: {{ card.cost }}</p>
            </div>
          </div>
        </div>
        
        <div v-if="availableCards.length === 0" class="text-center py-12">
          <p class="text-gray-500 text-lg">没有可选择的卡牌</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-gray-200 p-6 flex justify-between items-center">
        <div class="text-sm text-gray-600">
          已选择 {{ selectedCards.length }} / {{ options.count }} 张卡牌
        </div>
        <div class="space-x-3">
          <button
            v-if="!options.required"
            @click="cancel"
            class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            @click="confirm"
            :disabled="options.required && selectedCards.length < options.count"
            :class="[
              'px-6 py-2 rounded-lg font-medium',
              (options.required && selectedCards.length < options.count)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            ]"
          >
            确认选择
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { AnimeCard } from '@/types/card';
import type { CardSelectionOptions } from '@/core/systems/InteractionSystem';

interface Props {
  isVisible: boolean;
  cards: AnimeCard[];
  options: CardSelectionOptions;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  select: [cards: AnimeCard[]];
  cancel: [];
  close: [];
}>();

const selectedCards = ref<AnimeCard[]>([]);

const availableCards = computed(() => {
  let cards = props.cards;
  if (props.options.filter) {
    cards = cards.filter(props.options.filter);
  }
  return cards;
});

function toggleCardSelection(card: AnimeCard) {
  const index = selectedCards.value.indexOf(card);
  
  if (index !== -1) {
    // 取消选择
    selectedCards.value.splice(index, 1);
  } else if (selectedCards.value.length < props.options.count) {
    // 添加选择
    selectedCards.value.push(card);
  }
}

function confirm() {
  emit('select', [...selectedCards.value]);
  selectedCards.value = [];
  emit('close');
}

function cancel() {
  selectedCards.value = [];
  emit('cancel');
  emit('close');
}

function onBackgroundClick() {
  if (!props.options.required) {
    cancel();
  }
}

// 监听可见性变化，重置选择
watch(() => props.isVisible, (visible) => {
  if (!visible) {
    selectedCards.value = [];
  }
});
</script>

<style scoped>
/* Additional animations can be added here if needed */
</style>