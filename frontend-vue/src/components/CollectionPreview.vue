<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import { RouterLink } from 'vue-router';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

const activeTab = ref<'anime' | 'character'>('anime');

const favoriteAnimeCards = computed(() => {
  return Array.from(userStore.favoriteAnime)
    .map(id => gameDataStore.getAnimeCardById(id))
    .filter(Boolean); // 过滤掉可能未找到的卡片
});

const favoriteCharacterCards = computed(() => {
  return Array.from(userStore.favoriteCharacters)
    .map(id => gameDataStore.getCharacterCardById(id))
    .filter(Boolean); // 过滤掉可能未找到的卡片
});

</script>

<template>
  <div class="bg-surface p-6 rounded-lg shadow-lg border border-line h-full flex flex-col">
    <h2 class="text-2xl font-bold text-ink mb-4">我的喜爱</h2>

    <div class="border-b border-line mb-4">
      <nav class="-mb-px flex space-x-4">
        <button @click="activeTab = 'anime'" 
                :class="[activeTab === 'anime' ? 'border-accent text-accent' : 'border-transparent text-ink-2 hover:text-ink hover:border-line']"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
          动画 ({{ favoriteAnimeCards.length }}/10)
        </button>
        <button @click="activeTab = 'character'" 
                :class="[activeTab === 'character' ? 'border-accent text-accent' : 'border-transparent text-ink-2 hover:text-ink hover:border-line']"
                class="whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm">
          角色 ({{ favoriteCharacterCards.length }}/10)
        </button>
      </nav>
    </div>

    <div class="flex-grow overflow-y-auto max-h-[600px]">
        <div v-if="userStore.isLoggedIn">
            <div v-if="activeTab === 'anime'">
                <div v-if="favoriteAnimeCards.length > 0" class="grid grid-cols-5 gap-4">
                <AnimeCard v-for="card in favoriteAnimeCards" :key="`fav-${card!.id}`" :anime="card!" />
                </div>
                <div v-else class="text-center py-8 text-ink-2">
                    <p>还没有喜爱的动画卡牌。</p>
                    <p class="text-sm mt-2">去 <RouterLink to="/collections" class="text-accent hover:underline">收藏</RouterLink> 页面点亮星星吧！</p>
                </div>
            </div>

            <div v-if="activeTab === 'character'">
                <div v-if="favoriteCharacterCards.length > 0" class="grid grid-cols-5 gap-4">
                <CharacterCard v-for="card in favoriteCharacterCards" :key="`fav-${card!.id}`" :character="card!" />
                </div>
                <div v-else class="text-center py-8 text-ink-2">
                    <p>还没有喜爱的角色卡牌。</p>
                    <p class="text-sm mt-2">去 <RouterLink to="/collections" class="text-accent hover:underline">收藏</RouterLink> 页面点亮星星吧！</p>
                </div>
            </div>
        </div>
        <p v-else class="text-ink-2 text-center py-4">请先登录查看喜爱收藏</p>
    </div>
  </div>
</template>
