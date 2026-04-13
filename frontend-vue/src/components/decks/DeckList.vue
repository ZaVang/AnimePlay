<script setup lang="ts">
import { useDeckStore } from '@/stores/modules/deckStore';
import { useGameDataStore } from '@/stores/gameDataStore';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const deckStore = useDeckStore();
const gameDataStore = useGameDataStore();

const getCoverImage = (deck: any) => {
  if (!deck.cover) {
    return `/data/images/card_back.jpg`;
  }
  const card = deck.cover.type === 'anime'
    ? gameDataStore.getAnimeCardById(deck.cover.id)
    : gameDataStore.getCharacterCardById(deck.cover.id);
  return card ? card.image_path : `/data/images/card_back.jpg`;
};

const emit = defineEmits(['editDeck', 'newDeck']);

const handleDeleteDeck = (deckName: string) => {
  if (confirm(`INITIATE_PURGE_SEQUENCE: Are you sure you want to delete deck "${deckName}"?`)) {
    deckStore.deleteDeck(deckName);
  }
};
</script>

<template>
  <div class="deck-list-stratum quantic-reveal px-2">
    <!-- Header Protocol -->
    <div class="flex justify-between items-end mb-8 border-b border-white/5 pb-4">
      <div class="space-y-1">
        <div class="text-[7px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70">Manifest</div>
        <h3 class="text-xl font-display font-black text-white uppercase tracking-tighter italic">
          DECK_STRATUM_INDEX [{{ Object.keys(deckStore.savedDecks).length }}]
        </h3>
      </div>
      
      <TacticalButton variant="primary" size="md" @click="$emit('newDeck')">
        INITIALIZE_NEW_SEQUENCE
      </TacticalButton>
    </div>

    <!-- Empty State: Operational Void -->
    <div v-if="Object.keys(deckStore.savedDecks).length === 0" 
         class="text-center py-20 bg-black/40 border border-white/5 relative overflow-hidden group">
      <div class="absolute inset-0 bg-scanline opacity-[0.03]"></div>
      <p class="text-[10px] font-display font-bold text-industrial-500 uppercase tracking-widest mb-6">
        NO_ACTIVE_CONFIGURATIONS_DETECTED
      </p>
      <TacticalButton variant="secondary" size="lg" @click="$emit('newDeck')">
        ACTIVATE_FORGE_PROTOCOL
      </TacticalButton>
    </div>

    <!-- Deck Grid: Tactical Matrix -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-6">
      <div v-for="deck in deckStore.savedDecks" :key="deck.name" 
           class="deck-card group relative bg-black/60 border border-white/5 cursor-pointer transition-all duration-500 hover:border-gold/30" 
           @click="$emit('editDeck', deck.name)">
        
        <!-- Cover Module -->
        <div class="relative aspect-[3/4] overflow-hidden">
          <img :src="getCoverImage(deck)" class="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-all duration-700 grayscale group-hover:grayscale-0 scale-105 group-hover:scale-110" :alt="`${deck.name} cover`">
          
          <!-- Tactical Overlay -->
          <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          
          <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
            <button @click.stop="handleDeleteDeck(deck.name)" 
                    class="w-8 h-8 bg-clinical-danger/80 hover:bg-clinical-danger text-white flex items-center justify-center transition-colors">
              <span class="text-[8px] font-display font-black">PURGE</span>
            </button>
          </div>
        </div>

        <!-- Info Module -->
        <div class="p-4 relative">
          <div class="absolute top-0 left-0 w-2 h-px bg-gold/40"></div>
          <h4 class="font-display font-black text-xs text-white uppercase truncate tracking-tight mb-2">{{ deck.name }}</h4>
          <div class="flex flex-col gap-1">
             <div class="flex justify-between items-center">
                <span class="text-[6px] font-display font-bold text-industrial-500 uppercase">Loadout_A</span>
                <span class="text-[8px] font-mono text-gold tabular-nums">{{ deck.anime.length }}U</span>
             </div>
             <div class="flex justify-between items-center">
                <span class="text-[6px] font-display font-bold text-industrial-500 uppercase">Loadout_C</span>
                <span class="text-[8px] font-mono text-industrial-500 tabular-nums">{{ deck.character.length }}U</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deck-card {
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}
.deck-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 20px 50px rgba(0,0,0,0.8);
}
</style>
