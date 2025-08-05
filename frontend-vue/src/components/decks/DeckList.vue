<script setup lang="ts">
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

const getCoverImage = (deck) => {
  if (!deck.cover) {
    return `https://placehold.co/300x180/e2e8f0/334155?text=无封面`;
  }
  const card = gameDataStore.getCardById(deck.cover.id, deck.cover.type);
  return card ? card.image_path : `https://placehold.co/300x180/e2e8f0/334155?text=封面加载失败`;
};

const emit = defineEmits(['editDeck', 'newDeck']);

const handleDeleteDeck = (deckName: string) => {
  if (confirm(`确定要删除卡组 "${deckName}" 吗？此操作不可撤销。`)) {
    userStore.deleteDeck(deckName);
  }
};
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h3 class="text-xl font-bold">已保存的卡组 ({{ Object.keys(userStore.savedDecks).length }})</h3>
      <button @click="$emit('newDeck')" class="bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">
        创建新卡组
      </button>
    </div>

    <div v-if="Object.keys(userStore.savedDecks).length === 0" class="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
      <p class="text-gray-500">你还没有创建任何卡组。</p>
      <button @click="$emit('newDeck')" class="mt-4 bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-indigo-700">
        立即创建
      </button>
    </div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      <div v-for="deck in userStore.savedDecks" :key="deck.name" class="bg-white rounded-lg shadow-md overflow-hidden group cursor-pointer" @click="$emit('editDeck', deck.name)">
        <div class="relative">
          <img :src="getCoverImage(deck)" class="w-full h-40 object-cover" :alt="`${deck.name} cover`">
          <div class="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button @click.stop="handleDeleteDeck(deck.name)" class="bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600">
              🗑️
            </button>
          </div>
        </div>
        <div class="p-4">
          <h4 class="font-bold text-lg truncate">{{ deck.name }}</h4>
          <p class="text-sm text-gray-500">{{ deck.anime.length }} 动画 / {{ deck.character.length }} 角色</p>
        </div>
      </div>
    </div>
  </div>
</template>
