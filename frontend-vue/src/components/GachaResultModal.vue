<script setup lang="ts">
import type { DrawnCard } from '@/stores/gachaStore';
import AnimeCard from './AnimeCard.vue';
import CharacterCard from './CharacterCard.vue';

// 定义 props
const props = defineProps<{
  isOpen: boolean;
  cards: DrawnCard[];
  gachaType: 'anime' | 'character';
}>();

// 定义 emits
const emit = defineEmits(['close']);

function closeModal() {
  emit('close');
}
</script>

<template>
  <!-- 遮罩层 -->
  <div 
    v-if="isOpen" 
    @click="closeModal"
    class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4 transition-opacity duration-300"
  >
    <!-- 弹窗内容 -->
    <div 
      @click.stop 
      class="bg-elevated p-6 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col"
    >
      <h2 class="text-2xl font-bold mb-4 text-center text-ink">抽卡结果</h2>
      <div class="overflow-y-auto">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <template v-for="card in cards" :key="card.id">
            <AnimeCard 
              v-if="gachaType === 'anime'"
              :anime="(card as any)"
              :is-new="card.isNew"
              :is-duplicate="card.isDuplicate"
            />
            <CharacterCard 
              v-else-if="gachaType === 'character'"
              :character="card"
              :is-new="card.isNew"
              :is-duplicate="card.isDuplicate"
            />
          </template>
        </div>
      </div>
      <div class="text-center mt-6">
        <button 
          @click="closeModal" 
          class="bg-accent text-on-accent font-bold py-2 px-6 rounded-lg hover:bg-accent-strong"
        >
          确认
        </button>
      </div>
    </div>
  </div>
</template>
