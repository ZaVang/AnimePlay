<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Card, Rarity, AnimeCard as AnimeCardType, CharacterCard as CharacterCardType } from '@/types/card';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';
import VirtualGrid from '@/components/VirtualGrid.vue';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useGameDataStore } from '@/stores/gameDataStore';

// Atomic Components
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  animeIdInDeck: Set<number>;
  characterIdInDeck: Set<number>;
}>();

const emit = defineEmits<{
  (e: 'add-to-deck', card: Card, type: 'anime' | 'character'): void;
  (e: 'show-details', card: Card, type: 'anime' | 'character'): void;
}>();

const collectionStore = useCollectionStore();
const gameDataStore = useGameDataStore();

const collectionTab = ref<'anime' | 'character'>('anime');
const rarityOrder: Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];
const animeFilters = ref({ name: '', rarity: '', tag: '' });
const characterFilters = ref({ name: '', rarity: '' });

// Virtualization Config
const DECK_VIRTUAL_CONFIG = {
  itemHeight: 150,
  containerHeight: 520,
  minItemWidth: 90,
  gap: 12
};
const DECK_VIRTUALIZATION_THRESHOLD = 80;
const enableVirtualization = ref(true);

const allAnimeTags = computed(() => {
    const tags = new Set<string>();
    gameDataStore.allAnimeCards.forEach(card => {
        card.synergy_tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
});

const ownedAnimeCards = computed(() => {
  let cards = Array.from(collectionStore.animeCollection.entries()).map(([id, data]) => {
    const card = gameDataStore.getAnimeCardById(id);
    return card ? { ...card, count: data.count } : null;
  }).filter(Boolean) as (AnimeCardType & { count: number })[];
  
  if (animeFilters.value.name) cards = cards.filter(card => card.name.toLowerCase().includes(animeFilters.value.name.toLowerCase()));
  if (animeFilters.value.rarity) cards = cards.filter(card => card.rarity === animeFilters.value.rarity);
  if (animeFilters.value.tag) cards = cards.filter(card => card.synergy_tags?.includes(animeFilters.value.tag));
  
  return cards.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
});

const ownedCharacterCards = computed(() => {
  let cards = Array.from(collectionStore.characterCollection.entries()).map(([id, data]) => {
    const card = gameDataStore.getCharacterCardById(id);
    return card ? { ...card, count: data.count } : null;
  }).filter(Boolean) as (CharacterCardType & { count: number })[];

  if (characterFilters.value.name) cards = cards.filter(card => card.name.toLowerCase().includes(characterFilters.value.name.toLowerCase()));
  if (characterFilters.value.rarity) cards = cards.filter(card => card.rarity === characterFilters.value.rarity);
  
  return cards.sort((a, b) => rarityOrder.indexOf(a.rarity) - rarityOrder.indexOf(b.rarity));
});

const shouldVirtualizeAnimeCollection = computed(() => enableVirtualization.value && ownedAnimeCards.value.length > DECK_VIRTUALIZATION_THRESHOLD);
const shouldVirtualizeCharacterCollection = computed(() => enableVirtualization.value && ownedCharacterCards.value.length > DECK_VIRTUALIZATION_THRESHOLD);
</script>

<template>
  <div class="collection-pane-tactical flex flex-col h-full bg-black/40 backdrop-blur-md border border-white/5 relative overflow-hidden">
    <!-- Static Backdrop Decoration -->
    <div class="absolute inset-x-0 top-0 h-px bg-white/10"></div>

    <div class="p-4 space-y-4">
      <!-- Tab Controller: Industrial Segment -->
      <div class="flex gap-2 border-b border-white/5 pb-2">
        <button 
          v-for="tab in (['anime', 'character'] as const)" 
          :key="tab"
          @click="collectionTab = tab" 
          class="flex-1 py-1.5 flex flex-col items-center transition-all group"
          :class="collectionTab === tab ? 'text-gold opacity-100' : 'text-industrial-500 opacity-40 hover:opacity-100'"
        >
          <span class="text-[7px] font-display font-bold uppercase tracking-[0.2em] mb-0.5">Manifest_Source</span>
          <span class="text-[10px] font-display font-black uppercase tracking-widest">{{ tab === 'anime' ? 'ANIME_ASSETS' : 'CHAR_SIGNALS' }}</span>
          <div class="w-full h-px mt-1 transition-all" :class="collectionTab === tab ? 'bg-gold' : 'bg-transparent'"></div>
        </button>
      </div>
      
      <!-- Filter Matrix -->
      <div class="space-y-3">
        <div class="relative group">
           <!-- Refactored v-model to avoid ternary crash -->
           <input 
              v-if="collectionTab === 'anime'"
              type="text" 
              v-model="animeFilters.name" 
              placeholder="SEARCH_MANIFEST..." 
              class="w-full bg-black/60 border border-white/10 p-2 text-[10px] font-display text-white outline-none focus:border-gold/50 transition-all uppercase tracking-widest"
           >
           <input 
              v-else
              type="text" 
              v-model="characterFilters.name" 
              placeholder="SEARCH_SIGNAL..." 
              class="w-full bg-black/60 border border-white/10 p-2 text-[10px] font-display text-white outline-none focus:border-gold/50 transition-all uppercase tracking-widest"
           >
           <div class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] opacity-20 group-hover:opacity-60 transition-opacity">🔍</div>
        </div>

        <div class="flex gap-2">
            <!-- Refactored rarity selects -->
            <select v-if="collectionTab === 'anime'" v-model="animeFilters.rarity" 
                    class="flex-1 bg-black/60 border border-white/10 p-2 text-[10px] font-display text-gold outline-none uppercase tracking-widest cursor-pointer">
                <option value="" class="bg-industrial-900">ALL_RARITIES</option>
                <option v-for="r in rarityOrder" :key="r" :value="r" class="bg-industrial-900">{{ r }}_SPEC</option>
            </select>
            <select v-else v-model="characterFilters.rarity" 
                    class="flex-1 bg-black/60 border border-white/10 p-2 text-[10px] font-display text-gold outline-none uppercase tracking-widest cursor-pointer">
                <option value="" class="bg-industrial-900">ALL_RARITIES</option>
                <option v-for="r in rarityOrder" :key="r" :value="r" class="bg-industrial-900">{{ r }}_SPEC</option>
            </select>

            <select v-if="collectionTab === 'anime'" v-model="animeFilters.tag" 
                    class="flex-1 bg-black/60 border border-white/10 p-2 text-[10px] font-display text-gold outline-none uppercase tracking-widest cursor-pointer">
                <option value="" class="bg-industrial-900">ALL_TAGS</option>
                <option v-for="tag in allAnimeTags" :key="tag" :value="tag" class="bg-industrial-900">{{ tag }}</option>
            </select>
        </div>

        <label class="flex items-center gap-2 cursor-pointer group">
            <div class="relative w-3 h-3 border border-white/20 flex items-center justify-center transition-all group-hover:border-gold/50">
               <input type="checkbox" v-model="enableVirtualization" class="opacity-0 absolute inset-0 cursor-pointer">
               <div v-if="enableVirtualization" class="w-1.5 h-1.5 bg-gold"></div>
            </div>
            <span class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-widest group-hover:text-industrial-300">ENABLE_VIRTUALIZATION // THRESHOLD_{{ DECK_VIRTUALIZATION_THRESHOLD }}</span>
        </label>
      </div>
    </div>

    <!-- Assets Viewport -->
    <div class="flex-1 overflow-y-auto px-4 pb-4 scrollbar-tactical">
      <div v-if="collectionTab === 'anime'" class="quantic-reveal">
        <VirtualGrid
          v-if="shouldVirtualizeAnimeCollection"
          :items="ownedAnimeCards"
          :item-height="DECK_VIRTUAL_CONFIG.itemHeight"
          :container-height="DECK_VIRTUAL_CONFIG.containerHeight"
          :min-item-width="DECK_VIRTUAL_CONFIG.minItemWidth"
          :gap="DECK_VIRTUAL_CONFIG.gap"
          @item-click="emit('add-to-deck', $event, 'anime')"
        >
          <template #default="{ item }">
            <AnimeCard 
              :anime="item" 
              :count="item.count"
              :is-in-deck="animeIdInDeck.has(item.id)"
              :show-cost="true"
              @contextmenu.prevent="emit('show-details', item, 'anime')"
            />
          </template>
        </VirtualGrid>
        <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          <div v-for="card in ownedAnimeCards" :key="card.id" class="transform transition-all hover:scale-105">
             <AnimeCard 
                :anime="card" 
                :count="card.count"
                :is-in-deck="animeIdInDeck.has(card.id)"
                :show-cost="true"
                @click="emit('add-to-deck', card, 'anime')"
                @contextmenu.prevent="emit('show-details', card, 'anime')"
            />
          </div>
        </div>
      </div>

      <div v-if="collectionTab === 'character'" class="quantic-reveal">
        <VirtualGrid
          v-if="shouldVirtualizeCharacterCollection"
          :items="ownedCharacterCards"
          :item-height="DECK_VIRTUAL_CONFIG.itemHeight"
          :container-height="DECK_VIRTUAL_CONFIG.containerHeight"
          :min-item-width="DECK_VIRTUAL_CONFIG.minItemWidth"
          :gap="DECK_VIRTUAL_CONFIG.gap"
          @item-click="emit('add-to-deck', $event, 'character')"
        >
          <template #default="{ item }">
            <CharacterCard 
              :character="item" 
              :count="item.count"
              :is-in-deck="characterIdInDeck.has(item.id)"
              @contextmenu.prevent="emit('show-details', item, 'character')"
            />
          </template>
        </VirtualGrid>
        <div v-else class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
          <div v-for="card in ownedCharacterCards" :key="card.id" class="transform transition-all hover:scale-105">
             <CharacterCard 
                :character="card" 
                :count="card.count"
                :is-in-deck="characterIdInDeck.has(card.id)"
                @click="emit('add-to-deck', card, 'character')"
                @contextmenu.prevent="emit('show-details', card, 'character')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Secondary info tag -->
    <div class="absolute bottom-1 right-2 text-[6px] font-mono text-white/10 uppercase tracking-widest pointer-events-none">
       Asset_Synchronization_Uplink_v2
    </div>
  </div>
</template>

<style scoped>
.collection-pane-tactical {
  box-shadow: inset 0 0 40px rgba(0,0,0,0.5);
}

.scrollbar-tactical::-webkit-scrollbar {
  width: 1px;
}
.scrollbar-tactical::-webkit-scrollbar-track {
  @apply bg-transparent;
}
.scrollbar-tactical::-webkit-scrollbar-thumb {
  @apply bg-gold/10 hover:bg-gold/30;
}
</style>
