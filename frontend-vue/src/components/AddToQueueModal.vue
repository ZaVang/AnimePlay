<script setup lang="ts">
/**
 * Add To Queue Modal - Tactical Uplink Overlay
 */
import { computed } from 'vue';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useViewingStore } from '@/stores/modules/viewingStore';
import { useGameDataStore} from '@/stores/gameDataStore';
import type {AnimeCard as AnimeCardType } from '@/types/card';
import AnimeCard from '@/components/AnimeCard.vue';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  slotIndex: number;
}>();

const emit = defineEmits(['close', 'select']);

const collectionStore = useCollectionStore();
const viewingStore = useViewingStore();
const gameDataStore = useGameDataStore();

const availableAnime = computed(() => {
  const cardsInQueue = viewingStore.viewingQueue
    .filter(Boolean)
    .map(slot => slot!.animeId);

  const rarityOrder: Record<string, number> = {
    'UR': 6, 'HR': 5, 'SSR': 4, 'SR': 3, 'R': 2, 'N': 1
  };

  return Array.from(collectionStore.animeCollection.entries())
    .filter(([id]) =>
      !cardsInQueue.includes(id) && 
      !viewingStore.watchedAnime.has(id)
    )
    .map(([id, data]) => {
      const card = gameDataStore.getAnimeCardById(id);
      return card ? { ...card, count: data.count } : null;
    })
    .filter(Boolean)
    .sort((a, b) => {
      const rarityDiff = (rarityOrder[b!.rarity] || 0) - (rarityOrder[a!.rarity] || 0);
      if (rarityDiff !== 0) return rarityDiff;
      return a!.name.localeCompare(b!.name);
    }) as (AnimeCardType & { count: number })[];
});

function handleSelect(animeId: number) {
  emit('select', animeId);
}
</script>

<template>
  <div class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 quantic-reveal" @click.self="$emit('close')">
    <GlassPanel class="max-w-4xl w-full border-gold/20 shadow-2xl">
      <template #header>
        <div class="flex justify-between items-center mb-8 border-b border-white/5 pb-4">
          <div class="space-y-1">
            <h2 class="text-[10px] font-display font-bold text-gold tracking-[0.4em] uppercase opacity-70">Catalog Uplink</h2>
            <h2 class="text-2xl font-display font-black text-white uppercase tracking-tighter">Select Media Subject</h2>
          </div>
          <TacticalButton variant="secondary" size="xs" @click="$emit('close')">ABORT</TacticalButton>
        </div>
      </template>
      
      <div class="max-h-[60vh] overflow-y-auto pr-4 scrollbar-none">
        <div v-if="availableAnime.length === 0" class="py-24 text-center space-y-4">
          <div class="text-6xl opacity-10">📽️</div>
          <div class="space-y-1">
            <p class="text-[10px] font-display font-bold text-white uppercase tracking-widest">Archive Exhausted</p>
            <p class="text-[8px] text-industrial-500 uppercase tracking-tighter">All collectible media is currently in queue or categorized as watched.</p>
          </div>
        </div>
        
        <div v-else class="space-y-8">
          <div class="flex items-center justify-between text-[8px] font-display font-bold text-industrial-500 uppercase tracking-[0.2em] mb-4">
            <span>Detected Units: {{ availableAnime.length }}</span>
            <span>History Buffer: {{ viewingStore.watchedAnime.size }} PLOTS</span>
          </div>
          
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            <AnimeCard 
              v-for="card in availableAnime" 
              :key="card.id" 
              :anime="card" 
              :count="card.count" 
              class="hover:scale-105 transition-transform duration-300 active:scale-95"
              @click="handleSelect(card.id)" 
            />
          </div>
        </div>
      </div>
    </GlassPanel>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>
