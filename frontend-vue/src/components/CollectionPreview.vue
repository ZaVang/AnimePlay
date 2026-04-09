<script setup lang="ts">
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/modules/authStore';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import { RouterLink } from 'vue-router';

const authStore = useAuthStore();
const collectionStore = useCollectionStore();
const gameDataStore = useGameDataStore();

const activeTab = ref<'anime' | 'character'>('anime');

const favoriteAnimeCards = computed(() => {
  return Array.from(collectionStore.favoriteAnime)
    .map(id => gameDataStore.getAnimeCardById(id))
    .filter(Boolean); // 过滤掉可能未找到的卡片
});

const favoriteCharacterCards = computed(() => {
  return Array.from(collectionStore.favoriteCharacters)
    .map(id => gameDataStore.getCharacterCardById(id))
    .filter(Boolean); // 过滤掉可能未找到的卡片
});

</script>

<template>
  <div class="bg-industrial-800 border border-industrial-700 h-full flex flex-col clip-chamfer datapad-reveal">
    <div class="tactical-panel-header">
      <span class="flex items-center gap-2">
        <span class="w-2 h-2 bg-clinical-warning animate-pulse"></span>
        本地数据收藏库
      </span>
      <span class="opacity-30">已开启加密访问</span>
    </div>
    
    <div class="p-4 border-b border-industrial-700 bg-industrial-900/30">
      <nav class="flex gap-2 font-sans">
        <button @click="activeTab = 'anime'" 
                :class="[activeTab === 'anime' ? 'bg-clinical-warning text-industrial-900 font-bold' : 'text-industrial-400 hover:text-industrial-100 bg-industrial-800 border border-industrial-700']"
                class="flex-1 py-2 px-3 text-[11px] font-black tracking-widest transition-all clip-chamfer-sm">
          动画核心 ({{ favoriteAnimeCards.length }})
        </button>
        <button @click="activeTab = 'character'" 
                :class="[activeTab === 'character' ? 'bg-clinical-blue text-industrial-900 font-bold' : 'text-industrial-400 hover:text-industrial-100 bg-industrial-800 border border-industrial-700']"
                class="flex-1 py-2 px-3 text-[11px] font-black tracking-widest transition-all clip-chamfer-sm">
          人员档案 ({{ favoriteCharacterCards.length }})
        </button>
      </nav>
    </div>

    <div class="flex-grow overflow-y-auto p-4 bg-industrial-900/10">
        <div v-if="authStore.isLoggedIn">
            <div v-if="activeTab === 'anime'">
                <div v-if="favoriteAnimeCards.length > 0" class="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  <AnimeCard v-for="card in favoriteAnimeCards" :key="`fav-${card!.id}`" :anime="card!" />
                </div>
                <div v-else class="flex flex-col items-center justify-center py-12 opacity-20 font-mono">
                    <p class="text-2xl mb-2">⊘</p>
                    <p class="text-[10px]">NO_MARKED_CORE_DATA</p>
                </div>
            </div>

            <div v-if="activeTab === 'character'">
                <div v-if="favoriteCharacterCards.length > 0" class="grid grid-cols-4 sm:grid-cols-5 gap-3">
                  <CharacterCard v-for="card in favoriteCharacterCards" :key="`fav-${card!.id}`" :character="card!" />
                </div>
                <div v-else class="flex flex-col items-center justify-center py-12 opacity-20 font-mono">
                    <p class="text-2xl mb-2">⊘</p>
                    <p class="text-[10px]">NO_MARKED_STAFF_RECORD</p>
                </div>
            </div>
        </div>
        <div v-else class="flex-1 flex items-center justify-center py-12 opacity-30 font-mono">
          <p class="text-[10px] uppercase tracking-widest">Access_Denied: Login_Required</p>
        </div>
    </div>
  </div>
</template>

