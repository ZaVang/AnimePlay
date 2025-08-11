<script setup lang="ts">
import type { Card } from '@/types';
import AnimeItem from '@/components/battle/anime/AnimeItem.vue';

const props = defineProps<{
  card: Card;
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'play', style: '友好安利' | '辛辣点评'): void;
}>();
</script>

<template>
  <div v-if="isVisible" class="modal-overlay" @click.self="emit('close')">
    <div class="modal-content">
      <h3 class="text-xl font-bold mb-4 text-center">要如何出牌？</h3>
      <div class="card-display mb-6">
        <AnimeItem :card="card" />
      </div>
      <div class="action-buttons">
        <button @click="emit('play', '友好安利')" class="btn-primary">
          <p class="font-bold">友好安利</p>
          <p class="text-xs">花费 {{ card.cost || 1 }} TP</p>
        </button>
        <button @click="emit('play', '辛辣点评')" class="btn-secondary">
          <p class="font-bold">辛辣点评</p>
          <p class="text-xs">花费 {{ (card.cost || 1) + 1 }} TP</p>
        </button>
      </div>
      <button @click="emit('close')" class="absolute top-2 right-2 text-gray-400 hover:text-white">✕</button>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-content {
  background-color: #1f2937; /* bg-gray-800 */
  padding: 2rem;
  border-radius: 0.5rem;
  border: 1px solid #4b5563; /* border-gray-600 */
  position: relative;
  width: 320px;
}
.card-display {
  width: 200px;
  height: 280px;
  margin: 0 auto;
}
.action-buttons {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
}
.btn-primary, .btn-secondary {
  @apply text-white font-bold py-2 px-4 rounded-lg w-full transition-colors;
}
.btn-primary {
  @apply bg-green-600 hover:bg-green-700;
}
.btn-secondary {
  @apply bg-red-600 hover:bg-red-700;
}
</style>
