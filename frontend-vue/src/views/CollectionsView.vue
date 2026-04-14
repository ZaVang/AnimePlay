<script setup lang="ts">
/**
 * Collections View - Personnel Manifest & Deck Management Terminal
 */
import { ref, computed, onMounted } from 'vue';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useAuthStore } from '@/stores/modules/authStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import type { AnimeCard, CharacterCard } from '@/types/card';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';
import AnimeCardComponent from '@/components/AnimeCard.vue';
import CharacterCardComponent from '@/components/CharacterCard.vue';
import VirtualGrid from '@/components/VirtualGrid.vue';

// Sub-components
import DeckManager from '@/components/decks/DeckManager.vue';
import CardDetailModal from '@/components/CardDetailModal.vue';

const collectionStore = useCollectionStore();
const economyStore = useEconomyStore();
const gameDataStore = useGameDataStore();
const authStore = useAuthStore();
const nurtureStore = useNurtureStore();

// Navigation Controller
const navTabs = ['anime', 'character', 'decks'] as const;
type NavTab = (typeof navTabs)[number];
const activeTab = ref<NavTab>('anime');

// Filter Controllers
const animeFilters = ref({ name: '', rarity: '' });
const characterFilters = ref({ name: '', rarity: '' });
const rarityOrder = ['SSR', 'SR', 'R', 'N'];

const isEditing = computed(() => collectionStore.isEditing);
const currentDeckName = computed(() => collectionStore.currentDeckName || '未命名配置');

// Logic: Virtualization threshold
const VIRTUAL_GRID_CONFIG = {
  itemHeight: 320,
  containerHeight: 600,
  minItemWidth: 200,
  gap: 40
};

// Data: Filtering
const filteredAnimeCards = computed(() => {
  return (collectionStore.ownedAnimeCards || []).filter(card => {
    const matchName = card.name.toLowerCase().includes(animeFilters.value.name.toLowerCase());
    const matchRarity = !animeFilters.value.rarity || card.rarity === animeFilters.value.rarity;
    return matchName && matchRarity;
  });
});

const filteredCharacterCards = computed(() => {
  return (collectionStore.ownedCharacterCards || []).filter(card => {
    const matchName = card.name.toLowerCase().includes(characterFilters.value.name.toLowerCase());
    const matchRarity = !characterFilters.value.rarity || card.rarity === characterFilters.value.rarity;
    return matchName && matchRarity;
  });
});

const shouldVirtualizeAnime = computed(() => filteredAnimeCards.value.length > 50);
const shouldVirtualizeCharacter = computed(() => filteredCharacterCards.value.length > 50);

const hasDuplicateAnime = computed(() => filteredAnimeCards.value.some(c => c.count > 1));
const hasDuplicateCharacters = computed(() => filteredCharacterCards.value.some(c => c.count > 1));

// Selection Management
const selectedCard = ref<AnimeCard | CharacterCard | null>(null);
const selectedCardType = ref<'anime' | 'character' | 'none'>('none');

function handleCardClick(card: AnimeCard | CharacterCard, type: 'anime' | 'character') {
  selectedCard.value = card;
  selectedCardType.value = type;
}

function closeDetail() {
  selectedCard.value = null;
  selectedCardType.value = 'none';
}

function finalizeEditor() {
  collectionStore.setEditingMode(false);
  activeTab.value = 'decks';
}

function handleBulkPurge() {
  console.log('Initiating Bulk Purge Protocol...');
  // Logic handled by store in production
}

onMounted(async () => {
  await collectionStore.fetchUserCollection();
});
</script>

<template>
  <div class="collections-view space-y-8 p-4 md:p-8 relative font-ui">
    <!-- Static Backdrop Scan -->
    <!-- Removed redundant local scanline as it's now global in App.vue -->

    <!-- Deck Editing Mode: Tactical Intervention Banner -->
    <div v-if="isEditing" class="quantic-reveal">
      <div class="bg-gold/5 border border-gold/40 text-gold px-8 py-4 flex justify-between items-center relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent"></div>
        <div class="flex items-center gap-6 relative z-10">
          <div class="flex items-center gap-4 bg-black/60 px-4 py-2 border border-white/5 order-first md:order-none">
             <span class="text-[8px] font-display font-black text-industrial-300 uppercase tracking-widest opacity-60">当前编辑槽位:</span>
             <span class="font-display text-xs font-black tracking-tight uppercase">目标负载: {{ currentDeckName }}</span>
          </div>
          
          <TacticalButton variant="primary" size="sm" @click="finalizeEditor">
            完成编辑并退出
          </TacticalButton>
        </div>
      </div>
    </div>

    <!-- Header & Navigation -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-8">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
           <div class="w-1 h-4 bg-gold"></div>
           <h2 class="text-[10px] font-display font-bold text-gold tracking-[0.6em] uppercase opacity-70">资产档案库</h2>
        </div>
        <h1 class="text-5xl font-display font-black tracking-tighter uppercase text-white scale-y-110">人员名录</h1>
      </div>
      
      <nav class="flex gap-12" aria-label="Collection Tabs">
         <button 
          v-for="tab in navTabs" 
          :key="tab"
          @click="activeTab = tab" 
          :class="[
            'pb-3 text-xs font-display font-black tracking-[0.3em] uppercase transition-all duration-500 border-b-2',
            activeTab === tab ? 'text-gold border-gold scale-110' : 'text-industrial-100 border-transparent hover:text-white opacity-60 hover:opacity-100'
          ]"
        >
          {{ tab === 'anime' ? '动漫档案' : tab === 'character' ? '角色信号' : '战术预设' }}
        </button>
      </nav>
    </div>

    <!-- Filter Console -->
    <div v-if="activeTab !== 'decks'" class="quantic-reveal bg-black/40 p-6 border border-white/5 backdrop-blur-md flex flex-wrap gap-8 items-end shadow-2xl">
      <div class="flex-grow min-w-[300px] space-y-3">
        <div class="text-xs font-display font-bold text-gold/80 uppercase tracking-widest pl-2">特征码搜索</div>
        <input 
          v-if="activeTab === 'anime'"
          v-model="animeFilters.name" 
          type="text" 
          placeholder="输入动漫档案特征码..." 
          class="flex-1 bg-black/80 border border-white/10 p-3 text-xs font-display text-white outline-none focus:border-gold/50 transition-all uppercase tracking-widest w-full"
        >
        <input 
          v-if="activeTab === 'character'"
          v-model="characterFilters.name" 
          type="text" 
          placeholder="输入角色信号特征码..." 
          class="flex-1 bg-black/80 border border-white/10 p-3 text-xs font-display text-white outline-none focus:border-gold/50 transition-all uppercase tracking-widest w-full"
        >
      </div>
      
      <div class="flex gap-4 items-end">
        <div class="space-y-3">
          <div class="text-xs font-display font-bold text-gold/80 uppercase tracking-widest pl-2">优先级过滤</div>
          <div class="flex gap-4">
            <select v-if="activeTab === 'anime'" v-model="animeFilters.rarity" class="flex-1 bg-black/80 border border-white/10 p-3 text-xs font-display text-gold outline-none uppercase tracking-widest cursor-pointer">
              <option value="">全部分类标准</option>
              <option v-for="r in rarityOrder" :key="r" :value="r">{{ r }}_级别</option>
            </select>

            <select v-if="activeTab === 'character'" v-model="characterFilters.rarity" class="flex-1 bg-black/80 border border-white/10 p-3 text-xs font-display text-gold outline-none uppercase tracking-widest cursor-pointer">
              <option value="">全部分类标准</option>
              <option v-for="r in rarityOrder" :key="r" :value="r">{{ r }}_级别</option>
            </select>

            <TacticalButton 
              variant="danger" 
              size="md" 
              :disabled="activeTab === 'anime' ? !hasDuplicateAnime : !hasDuplicateCharacters"
              @click="handleBulkPurge"
              class="flex-[0.5]"
            >
              初始化回收进程 // 拆解重复资产
            </TacticalButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Main Viewport -->
    <div class="archive-viewport">
      <template v-if="!authStore.isLoggedIn">
        <div class="text-center py-40 border border-white/5 bg-white/[0.02]">
           <p class="text-clinical-danger font-display text-xs tracking-[0.5em] uppercase animate-pulse">身份验证失败 // 访问被拒绝</p>
        </div>
      </template>
      
      <template v-else-if="activeTab === 'decks'">
        <DeckManager />
      </template>

      <template v-else>
        <GlassPanel :reveal="false" class="min-h-[600px] border-white/5 bg-black/20 p-8 overflow-visible">
            <div v-if="(activeTab === 'anime' ? filteredAnimeCards : filteredCharacterCards).length === 0" class="text-center py-40">
              <span class="text-sm font-display font-black text-industrial-300 uppercase tracking-[0.4em] opacity-60">当前层级未检索到匹配资产</span>
            </div>
            
            <template v-else>
               <div v-if="activeTab === 'anime'" class="quantic-reveal">
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-10">
                    <div v-for="card in filteredAnimeCards" :key="card.id" class="transform transition-all hover:scale-110">
                       <AnimeCardComponent :anime="card" :count="card.count" :show-strength="true" @click="handleCardClick(card, 'anime')"/>
                    </div>
                  </div>
               </div>

               <div v-if="activeTab === 'character'" class="quantic-reveal">
                  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-10">
                     <div v-for="card in filteredCharacterCards" :key="card.id" class="transform transition-all hover:scale-110">
                        <CharacterCardComponent :character="card" :count="card.count" @click="handleCardClick(card, 'character')"/>
                     </div>
                  </div>
               </div>
            </template>
        </GlassPanel>
      </template>
    </div>

    <!-- Detail Modal -->
    <CardDetailModal
        v-if="selectedCard"
        :card="selectedCard"
        :card-type="selectedCardType"
        :count="selectedCardType === 'anime' ? collectionStore.getAnimeCardCount(selectedCard.id) : collectionStore.getCharacterCardCount(selectedCard.id)"
        @close="closeDetail"
    />
  </div>
</template>

<style scoped>
.collections-view {
  min-height: calc(100vh - 80px);
}
.z-neg { z-index: -1; }
.archive-viewport {
  animation: quantic-reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}
</style>
