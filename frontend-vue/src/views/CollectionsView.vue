<script setup lang="ts">
import { ref, computed } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore, type Card } from '@/stores/gameDataStore';
import CharacterCard from '@/components/CharacterCard.vue';
import AnimeCard from '@/components/AnimeCard.vue';
import CardDetailModal from '@/components/CardDetailModal.vue';
import DeckManager from '@/components/decks/DeckManager.vue';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

// --- STATE for UI ---
const activeTab = ref<'anime' | 'character' | 'decks'>('anime');
const animeFilterName = ref('');
const characterFilterName = ref('');
const selectedCard = ref<Card | null>(null);
const selectedCardType = ref<'anime' | 'character'>('anime');


// --- Event Handlers ---
function openDetail(card: Card, type: 'anime' | 'character') {
    selectedCard.value = card;
    selectedCardType.value = type;
}

function closeDetail() {
    selectedCard.value = null;
}

// --- COMPUTED for Filtered Lists ---
const filteredAnimeCards = computed(() => {
  if (!userStore.isLoggedIn || gameDataStore.allAnimeCards.length === 0) return [];
  
  let cards: (Card & { count: number })[] = [];
  for (const [id, collectionData] of userStore.animeCollection.entries()) {
    const cardDetails = gameDataStore.getAnimeCardById(id);
    if (cardDetails) {
      cards.push({ ...cardDetails, count: collectionData.count });
    }
  }

  if (animeFilterName.value) {
      cards = cards.filter(card => card.name.toLowerCase().includes(animeFilterName.value.toLowerCase()));
  }
  
  return cards;
});

const filteredCharacterCards = computed(() => {
  if (!userStore.isLoggedIn || gameDataStore.allCharacterCards.length === 0) return [];

  let cards: (Card & { count: number })[] = [];
  for (const [id, collectionData] of userStore.characterCollection.entries()) {
    const cardDetails = gameDataStore.getCharacterCardById(id);
    if (cardDetails) {
      cards.push({ ...cardDetails, count: collectionData.count });
    }
  }

  if (characterFilterName.value) {
      cards = cards.filter(card => card.name.toLowerCase().includes(characterFilterName.value.toLowerCase()));
  }

  return cards;
});
</script>

<template>
  <div class="space-y-6">
    <!-- Header, Tabs, and Filters -->
    <div class="bg-white rounded-lg shadow-sm text-gray-800 border-2 border-gray-200">
      <div class="border-b border-gray-200 px-6 pt-4 pb-2">
        <h3 class="text-xl font-bold text-gray-800 mb-3">我的收藏</h3>
        <nav class="-mb-px flex space-x-6" aria-label="Collection Tabs">
          <a href="#" @click.prevent="activeTab = 'anime'" :class="['collection-tab', { 'active': activeTab === 'anime' }]">动画收藏</a>
          <a href="#" @click.prevent="activeTab = 'character'" :class="['collection-tab', { 'active': activeTab === 'character' }]">角色收藏</a>
          <a href="#" @click.prevent="activeTab = 'decks'" :class="['collection-tab', { 'active': activeTab === 'decks' }]">我的卡组</a>
        </nav>
      </div>

      <!-- Filters Section for Collections -->
      <div v-if="activeTab !== 'decks'" class="p-6 border-b border-gray-200">
        <div v-if="activeTab === 'anime'">
            <div class="flex flex-wrap gap-3 items-center">
                <input type="text" v-model="animeFilterName" placeholder="按动画名称搜索..." class="p-2 border rounded-lg flex-grow min-w-0 text-gray-800">
            </div>
        </div>
        <div v-if="activeTab === 'character'">
            <div class="flex flex-wrap gap-3 items-center">
                <input type="text" v-model="characterFilterName" placeholder="按角色名称搜索..." class="p-2 border rounded-lg flex-grow min-w-0 text-gray-800">
            </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="p-6">
        <div v-if="!userStore.isLoggedIn" class="text-center py-12">
          <p class="text-gray-500 text-lg font-medium">请先登录以查看您的收藏。</p>
        </div>
        
        <!-- Anime Cards List -->
        <div v-else-if="activeTab === 'anime'">
          <div v-if="filteredAnimeCards.length === 0" class="text-center py-12">
              <p class="text-gray-500 text-lg font-medium">找不到匹配的动画卡</p>
          </div>
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            <AnimeCard v-for="card in filteredAnimeCards" :key="card.id" :anime="card" :count="card.count" @click="openDetail(card, 'anime')"/>
          </div>
        </div>

        <!-- Character Cards List -->
        <div v-else-if="activeTab === 'character'">
           <div v-if="filteredCharacterCards.length === 0" class="text-center py-12">
              <p class="text-gray-500 text-lg font-medium">找不到匹配的角色卡</p>
           </div>
          <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
            <CharacterCard v-for="card in filteredCharacterCards" :key="card.id" :character="card" :count="card.count" @click="openDetail(card, 'character')"/>
          </div>
        </div>
        
        <!-- Deck Manager -->
        <div v-else-if="activeTab === 'decks'">
            <DeckManager />
        </div>

      </div>
    </div>

    <!-- Card Detail Modal -->
    <CardDetailModal :card="selectedCard" :card-type="selectedCardType" @close="closeDetail" />
  </div>
</template>

<style scoped>
.collection-tab {
  @apply whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300;
}
.collection-tab.active {
  @apply border-indigo-500 text-indigo-600;
}
</style>

