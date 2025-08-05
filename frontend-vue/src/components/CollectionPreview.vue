<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

const activeTab = ref<'anime' | 'character'>('anime');

const previewAnime = computed(() => {
  return Array.from(userStore.animeCollection.keys()).slice(0, 4)
    .map(id => gameDataStore.getAnimeCardById(id))
    .filter(Boolean);
});

const previewCharacters = computed(() => {
  return Array.from(userStore.characterCollection.keys()).slice(0, 4)
    .map(id => gameDataStore.getCharacterCardById(id))
    .filter(Boolean);
});

</script>

<template>
  <div class="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700 h-full">
    <h2 class="text-2xl font-bold text-white mb-4">收藏预览</h2>
    
    <div class="border-b border-gray-700 mb-4">
      <nav class="-mb-px flex space-x-4">
        <button @click="activeTab = 'anime'" 
                :class="[activeTab === 'anime' ? 'border-green-400 text-green-400' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500']"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
          动画
        </button>
        <button @click="activeTab = 'character'" 
                :class="[activeTab === 'character' ? 'border-green-400 text-green-400' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-500']"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
          角色
        </button>
      </nav>
    </div>

    <div v-if="userStore.isLoggedIn">
      <div v-if="activeTab === 'anime'">
        <div v-if="previewAnime.length > 0" class="grid grid-cols-2 gap-4">
          <AnimeCard v-for="card in previewAnime" :key="card.id" :anime="card" />
        </div>
        <p v-else class="text-gray-500 text-center py-4">暂无动画收藏</p>
      </div>

      <div v-if="activeTab === 'character'">
        <div v-if="previewCharacters.length > 0" class="grid grid-cols-2 gap-4">
          <CharacterCard v-for="card in previewCharacters" :key="card.id" :character="card" />
        </div>
        <p v-else class="text-gray-500 text-center py-4">暂无角色收藏</p>
      </div>
    </div>
     <p v-else class="text-gray-500 text-center py-4">请先登录</p>
  </div>
</template>
