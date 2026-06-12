<template>
  <div
    v-if="isVisible"
    @click="onBackgroundClick"
    class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 transition-opacity duration-300"
  >
    <div
      @click.stop
      class="bg-elevated rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col text-ink mx-4"
    >
      <!-- Header -->
      <div class="flex justify-between items-start p-6 border-b border-line">
        <div>
          <h2 class="text-2xl font-bold">{{ options.title }}</h2>
          <p v-if="options.description" class="text-ink-2 mt-1">{{ options.description }}</p>
          <p class="text-sm text-ink-2 mt-2">
            请选择 {{ options.required ? options.count : `最多${options.count}` }} 张卡牌
            <span v-if="!options.required">(可取消)</span>
          </p>
        </div>
        <button
          v-if="!options.required"
          @click="cancel"
          class="text-2xl text-ink-2 hover:text-ink"
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
                ? 'border-accent shadow-lg transform scale-105'
                : 'border-line hover:border-line-2 hover:shadow-md'
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
              class="absolute top-2 right-2 w-8 h-8 bg-accent text-on-accent rounded-full flex items-center justify-center text-sm font-bold"
            >
              {{ selectedCards.indexOf(card) + 1 }}
            </div>

            <!-- Card Info Overlay -->
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p class="text-white text-xs font-bold truncate">{{ card.name }}</p>
              <p class="text-white/80 text-xs">费用: {{ card.cost }}</p>
            </div>
          </div>
        </div>
        
        <div v-if="availableCards.length === 0" class="text-center py-12">
          <p class="text-ink-2 text-lg">没有可选择的卡牌</p>
        </div>
      </div>

      <!-- Footer -->
      <div class="border-t border-line p-6 flex justify-between items-center">
        <div class="text-sm text-ink-2">
          已选择 {{ selectedCards.length }} / {{ options.count }} 张卡牌
        </div>
        <div class="space-x-3">
          <button
            v-if="!options.required"
            @click="cancel"
            class="px-4 py-2 border border-line rounded-lg text-ink-2 hover:bg-surface-2"
          >
            取消
          </button>
          <button
            @click="confirm"
            :disabled="options.required && selectedCards.length < options.count"
            :class="[
              'px-6 py-2 rounded-lg font-medium',
              (options.required && selectedCards.length < options.count)
                ? 'bg-surface-2 text-ink-3 cursor-not-allowed'
                : 'bg-accent text-on-accent hover:bg-accent-strong'
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
import type { CardSelectionOptions } from '@/skills/interaction';

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