<script setup lang="ts">
import { ref, reactive, computed } from 'vue';
import { useAuthStore } from '@/stores/modules/authStore';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import type { AnimeCard as AnimeCardType, CharacterCard as CharacterCardType, Rarity } from '@/types/card';
import CardDetailModal from '@/components/CardDetailModal.vue';
import DeckManager from '@/components/decks/DeckManager.vue';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import VirtualGrid from '@/components/VirtualGrid.vue';
import { useDeckEditor } from '@/composables/useDeckEditor';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const authStore = useAuthStore();
const collectionStore = useCollectionStore();
const economyStore = useEconomyStore();
const gameDataStore = useGameDataStore();

// --- STATE for UI ---
type TabType = 'anime' | 'character' | 'decks';
const activeTab = ref<TabType>('anime');
const selectedCard = ref<AnimeCardType | CharacterCardType | null>(null);
const selectedCardType = ref<'anime' | 'character'>('anime');
const rarityOrder: Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

// Deck Editor Integration
const { isEditing, addToDeck, currentDeckName } = useDeckEditor();

// Filters: Using reactive for better v-model compiler stability
const animeFilters = reactive({ name: '', rarity: '', tag: '' });
const characterFilters = reactive({ name: '', rarity: '' });

const VIRTUAL_GRID_CONFIG = {
  itemHeight: 180,
  containerHeight: 650,
  minItemWidth: 100,
  gap: 20
};

const VIRTUALIZATION_THRESHOLD = 100;
const enableVirtualization = ref(true);

// --- Event Handlers ---
function openDetail(card: AnimeCardType | CharacterCardType, type: 'anime' | 'character') {
    selectedCard.value = card;
    selectedCardType.value = type;
}

function closeDetail() {
    selectedCard.value = null;
}

function handleCardClick(card: AnimeCardType | CharacterCardType, type: 'anime' | 'character') {
    if (isEditing.value) {
        const success = addToDeck(card.id, type);
        if (!success) {
            console.warn(`Card already in deck or deck full: ${card.name}`);
        }
    } else {
        openDetail(card, type);
    }
}

function handleDismantleAll() {
    if (activeTab.value === 'decks') return;
    const type = activeTab.value;
    const typeText = type === 'anime' ? 'ANIMATION' : 'CHARACTER';
    if (confirm(`INITIATE_PURGE_SEQUENCE: DISMANTLE ALL DUPLICATE ${typeText} ASSETS?`)) {
        economyStore.dismantleAllDuplicates(type);
    }
}

// --- COMPUTED ---
const hasDuplicateAnime = computed(() => Array.from(collectionStore.animeCollection.values()).some(c => c.count > 1));
const hasDuplicateCharacters = computed(() => Array.from(collectionStore.characterCollection.values()).some(c => c.count > 1));

const sortCards = <T extends AnimeCardType | CharacterCardType>(cards: (T & { count: number })[]) => {
    return cards.sort((a, b) => {
        const rarityA = rarityOrder.indexOf(a.rarity);
        const rarityB = rarityOrder.indexOf(b.rarity);
        if (rarityA !== rarityB) return rarityA - rarityB;
        return a.name.localeCompare(b.name, 'zh-Hans-CN');
    });
};

const filteredAnimeCards = computed(() => {
  if (!authStore.isLoggedIn) return [];
  let cards: (AnimeCardType & { count: number })[] = [];
  for (const [id, collectionData] of collectionStore.animeCollection.entries()) {
    const cardDetails = gameDataStore.getAnimeCardById(id);
    if (cardDetails) cards.push({ ...cardDetails, count: collectionData.count });
  }
  if (animeFilters.name) cards = cards.filter(c => c.name.toLowerCase().includes(animeFilters.name.toLowerCase()));
  if (animeFilters.rarity) cards = cards.filter(c => c.rarity === animeFilters.rarity);
  if (animeFilters.tag) cards = cards.filter(c => c.synergy_tags?.includes(animeFilters.tag));
  return sortCards(cards);
});

const filteredCharacterCards = computed(() => {
  if (!authStore.isLoggedIn) return [];
  let cards: (CharacterCardType & { count: number })[] = [];
  for (const [id, collectionData] of collectionStore.characterCollection.entries()) {
    const cardDetails = gameDataStore.getCharacterCardById(id);
    if (cardDetails) cards.push({ ...cardDetails, count: collectionData.count });
  }
  if (characterFilters.name) cards = cards.filter(c => c.name.toLowerCase().includes(characterFilters.name.toLowerCase()));
  if (characterFilters.rarity) cards = cards.filter(c => c.rarity === characterFilters.rarity);
  return sortCards(cards);
});

const shouldVirtualizeAnime = computed(() => enableVirtualization.value && filteredAnimeCards.value.length > VIRTUALIZATION_THRESHOLD);
const shouldVirtualizeCharacter = computed(() => enableVirtualization.value && filteredCharacterCards.value.length > VIRTUALIZATION_THRESHOLD);

const navTabs: TabType[] = ['anime', 'character', 'decks'];
</script>

<template>
  <div class="collections-view space-y-8 p-4 md:p-8 relative">
    <!-- Static Backdrop Scan -->
    <div class="fixed inset-0 bg-scanline opacity-[0.02] pointer-events-none z-neg"></div>

    <!-- Deck Editing Mode: Tactical Intervention Banner -->
    <div v-if="isEditing" class="quantic-reveal">
      <div class="bg-gold/5 border border-gold/40 text-gold px-8 py-4 flex justify-between items-center relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-r from-gold/10 to-transparent"></div>
        <div class="flex items-center gap-6 relative z-10">
          <div class="w-2 h-2 bg-gold animate-pulse"></div>
          <div class="flex flex-col">
             <span class="text-[7px] font-display font-bold uppercase tracking-[0.5em]">Active_Selection_Protocol</span>
             <span class="font-display text-xs font-black tracking-tight uppercase">TARGET_LOADOUT: {{ currentDeckName }}</span>
          </div>
        </div>
        <TacticalButton variant="primary" size="sm" @click="activeTab = 'decks'" class="relative z-10">
          FINALIZE_EDITOR
        </TacticalButton>
      </div>
    </div>

    <!-- Header & Navigation -->
    <div class="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-8">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
           <div class="w-1 h-4 bg-gold"></div>
           <h2 class="text-[10px] font-display font-bold text-gold tracking-[0.6em] uppercase opacity-70">Asset_Archives</h2>
        </div>
        <h1 class="text-5xl font-display font-black tracking-tighter uppercase text-white scale-y-110">Personnel_Manifest</h1>
      </div>
      
      <nav class="flex gap-12" aria-label="Collection Tabs">
        <button 
          v-for="tab in navTabs" 
          :key="tab"
          @click="activeTab = tab" 
          :class="[
            'pb-2 text-[10px] font-display font-black tracking-[0.3em] uppercase transition-all duration-500 border-b-2',
            activeTab === tab ? 'text-gold border-gold scale-105' : 'text-industrial-500 border-transparent hover:text-white'
          ]"
        >
          {{ tab.toUpperCase() }}
        </button>
      </nav>
    </div>

    <!-- Filter Console -->
    <div v-if="activeTab !== 'decks'" class="quantic-reveal bg-black/40 p-6 border border-white/5 backdrop-blur-md flex flex-wrap gap-8 items-end">
      <div class="flex-grow min-w-[300px] space-y-2">
        <div class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-widest pl-2">Search_Pattern</div>
        <input 
          v-if="activeTab === 'anime'"
          type="text" 
          v-model="animeFilters.name" 
          placeholder="ENTER_MANIFEST_PATTERN..." 
          class="bg-black/60 border border-white/10 p-3 text-[10px] font-mono text-white w-full focus:border-gold/40 outline-none transition-all uppercase tracking-widest"
        >
        <input 
          v-if="activeTab === 'character'"
          type="text" 
          v-model="characterFilters.name" 
          placeholder="ENTER_SIGNAL_PATTERN..." 
          class="bg-black/60 border border-white/10 p-3 text-[10px] font-mono text-white w-full focus:border-gold/40 outline-none transition-all uppercase tracking-widest"
        >
      </div>
      
      <div class="flex gap-4 items-end">
        <div class="space-y-2">
          <div class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-widest pl-2">Priority_Filter</div>
          <select 
            v-if="activeTab === 'anime'"
            v-model="animeFilters.rarity" 
            class="bg-black/60 border border-white/10 p-3 text-[10px] font-display text-gold outline-none uppercase tracking-widest"
          >
            <option value="">ALL_CLASSIFICATIONS</option>
            <option v-for="r in rarityOrder" :key="r" :value="r">{{ r }}_SPEC</option>
          </select>
          <select 
            v-if="activeTab === 'character'"
            v-model="characterFilters.rarity" 
            class="bg-black/60 border border-white/10 p-3 text-[10px] font-display text-gold outline-none uppercase tracking-widest"
          >
            <option value="">ALL_CLASSIFICATIONS</option>
            <option v-for="r in rarityOrder" :key="r" :value="r">{{ r }}_SPEC</option>
          </select>
        </div>
        
        <TacticalButton 
          variant="secondary" 
          size="md" 
          :disabled="activeTab === 'anime' ? !hasDuplicateAnime : !hasDuplicateCharacters"
          @click="handleDismantleAll"
        >
          INIT_PURGE // DISMANTLE
        </TacticalButton>
      </div>
    </div>

    <!-- Main Viewport -->
    <div class="archive-viewport">
      <template v-if="!authStore.isLoggedIn">
        <div class="text-center py-40 border border-white/5 bg-white/[0.02]">
           <p class="text-clinical-danger font-display text-xs tracking-[0.5em] uppercase animate-pulse">AUTH_REQUIRED // ACCESS_DENIED</p>
        </div>
      </template>
      
      <template v-else-if="activeTab === 'decks'">
        <DeckManager />
      </template>

      <template v-else>
        <GlassPanel :reveal="false" class="min-h-[600px] border-white/5 bg-black/20 p-8 overflow-visible">
           <div v-if="(activeTab === 'anime' ? filteredAnimeCards : filteredCharacterCards).length === 0" class="text-center py-40">
             <span class="text-[8px] font-display font-black text-industrial-600 uppercase tracking-[0.4em]">NO_ASSETS_IDENTIFIED_IN_CURRENT_STRATUM</span>
           </div>
           
           <template v-else>
              <div v-if="activeTab === 'anime'" class="quantic-reveal">
                 <VirtualGrid
                   v-if="shouldVirtualizeAnime"
                   :items="filteredAnimeCards"
                   :item-height="VIRTUAL_GRID_CONFIG.itemHeight"
                   :container-height="VIRTUAL_GRID_CONFIG.containerHeight"
                   :min-item-width="VIRTUAL_GRID_CONFIG.minItemWidth"
                   :gap="VIRTUAL_GRID_CONFIG.gap"
                   @item-click="handleCardClick($event, 'anime')"
                 >
                   <template #default="{ item }">
                     <AnimeCard :anime="item" :count="item.count" :show-strength="true" />
                   </template>
                 </VirtualGrid>
                 <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-10">
                   <div v-for="card in filteredAnimeCards" :key="card.id" class="transform transition-all hover:scale-110">
                      <AnimeCard :anime="card" :count="card.count" :show-strength="true" @click="handleCardClick(card, 'anime')"/>
                   </div>
                 </div>
              </div>

              <div v-if="activeTab === 'character'" class="quantic-reveal">
                 <VirtualGrid
                   v-if="shouldVirtualizeCharacter"
                   :items="filteredCharacterCards"
                   :item-height="VIRTUAL_GRID_CONFIG.itemHeight"
                   :container-height="VIRTUAL_GRID_CONFIG.containerHeight"
                   :min-item-width="VIRTUAL_GRID_CONFIG.minItemWidth"
                   :gap="VIRTUAL_GRID_CONFIG.gap"
                   @item-click="handleCardClick($event, 'character')"
                 >
                   <template #default="{ item }">
                     <CharacterCard :character="item" :count="item.count" />
                   </template>
                 </VirtualGrid>
                 <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-10">
                    <div v-for="card in filteredCharacterCards" :key="card.id" class="transform transition-all hover:scale-110">
                       <CharacterCard :character="card" :count="card.count" @click="handleCardClick(card, 'character')"/>
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

/* Custom transitions and scrollbars */
.archive-viewport {
  animation: quantic-reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
}
</style>
