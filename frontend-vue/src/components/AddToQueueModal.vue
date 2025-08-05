<script setup lang="ts">
import { computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore, type Card } from '@/stores/gameDataStore';
import AnimeCard from '@/components/AnimeCard.vue';

const props = defineProps<{
  slotIndex: number;
}>();

const emit = defineEmits(['close', 'select']);

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

const availableAnime = computed(() => {
  const cardsInQueue = userStore.playerState.viewingQueue
    .filter(Boolean)
    .map(slot => slot!.animeId);
  
  return Array.from(userStore.animeCollection.entries())
    .filter(([id]) => !cardsInQueue.includes(id))
    .map(([id, data]) => {
      const card = gameDataStore.getAnimeCardById(id);
      return card ? { ...card, count: data.count } : null;
    })
    .filter(Boolean) as (Card & { count: number })[];
});

function handleSelect(animeId: number) {
  emit('select', animeId);
}
</script>

<template>
  <div class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" @click.self="$emit('close')">
    <div class="bg-gray-800 p-6 rounded-lg shadow-xl max-w-4xl w-full border border-gray-700">
      <div class="flex justify-between items-center mb-4">
        <h2 class="text-2xl font-bold text-white">选择要观看的动画</h2>
        <button @click="$emit('close')" class="text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
      </div>
      
      <div class="max-h-[60vh] overflow-y-auto pr-2">
        <div v-if="availableAnime.length === 0" class="text-center text-gray-500 py-10">
          没有可添加的动画了。（所有动画都在观看队列中）
        </div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <AnimeCard v-for="card in availableAnime" :key="card.id" :anime="card" :count="card.count" @click="handleSelect(card.id)" />
        </div>
      </div>
    </div>
  </div>
</template>
