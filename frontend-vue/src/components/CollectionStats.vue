<script setup lang="ts">
/**
 * Collection Stats - Manifest Analytics Substrate
 */
import { computed } from 'vue';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';

const props = defineProps<{
  type: 'anime' | 'character';
}>();

const collectionStore = useCollectionStore();
const gameDataStore = useGameDataStore();

const itemType = computed(() => props.type === 'anime' ? 'ARCHIVE_INDEX' : 'PERSONNEL_INDEX');

const collectionStats = computed(() => {
    const isAnime = props.type === 'anime';
    const collection = isAnime ? collectionStore.animeCollection : collectionStore.characterCollection;
    const allPossibleCards = isAnime ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
    const rarityConfig = isAnime ? GAME_CONFIG.animeSystem.rarityConfig : GAME_CONFIG.characterSystem.rarityConfig;
    
    const uniqueCount = collection.size;
    const totalCount = Array.from(collection.values()).reduce((sum, item) => sum + item.count, 0);
    const totalPossible = allPossibleCards.length;
    const completionRate = totalPossible > 0 ? ((uniqueCount / totalPossible) * 100).toFixed(1) : '0.0';

    const rarityOrder = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'] as const;
    const rarityCounts = rarityOrder.map(rarity => {
        const count = Array.from(collection.keys()).filter(id => {
            const card = isAnime ? gameDataStore.getAnimeCardById(id) : gameDataStore.getCharacterCardById(id);
            return card?.rarity === rarity;
        }).length;
        
        return {
            rarity,
            count,
            colorClass: rarityConfig[rarity]?.c || 'bg-industrial-600'
        };
    });

    return { uniqueCount, totalCount, totalPossible, completionRate, rarityCounts };
});
</script>

<template>
  <GlassPanel class="p-6 border-white/10 relative overflow-hidden group/stats">
    <!-- Grid Ornament -->
    <div class="absolute inset-0 bg-grid opacity-5 pointer-events-none group-hover/stats:opacity-10 transition-opacity"></div>
    
    <div class="relative flex justify-between items-end mb-8 border-b border-white/5 pb-4">
       <div class="space-y-1">
          <h3 class="text-[10px] font-display font-black text-white uppercase tracking-[0.4em] opacity-80">{{ itemType }}</h3>
          <div class="text-[8px] font-mono text-industrial-500 uppercase">Collection Matrix Optimization Result</div>
       </div>
       <div class="text-[10px] font-mono font-bold text-gold tabular-nums tracking-widest">{{ collectionStats.completionRate }}% COMPLETED</div>
    </div>
    
    <!-- Primary Metrics -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-white/5 pb-8">
      <div class="space-y-2">
        <p class="text-[8px] font-display font-bold text-industrial-600 uppercase tracking-widest">Manifest Synchronicity</p>
        <div class="flex items-baseline gap-2">
           <p class="text-3xl font-display font-black text-white tabular-nums">{{ collectionStats.uniqueCount }}</p>
           <p class="text-xs font-mono text-industrial-500">/ {{ collectionStats.totalPossible }} UNIQUE_VARIANTS</p>
        </div>
      </div>
      <div class="space-y-2 md:text-right">
        <p class="text-[8px] font-display font-bold text-industrial-600 uppercase tracking-widest">Total Vector Yield</p>
        <div class="flex items-baseline gap-2 md:justify-end">
           <p class="text-3xl font-display font-black text-gold tabular-nums">{{ collectionStats.totalCount }}</p>
           <p class="text-xs font-mono text-industrial-500">TOTAL_RECORDS</p>
        </div>
      </div>
    </div>

    <!-- Rarity Distribution -->
    <div class="space-y-3">
      <div class="text-[8px] font-display font-bold text-industrial-600 uppercase tracking-widest mb-4">Frequency Distribution Matrix</div>
      <div class="flex flex-wrap gap-4">
        <div v-for="item in collectionStats.rarityCounts" :key="item.rarity" class="flex items-center gap-3 bg-white/[0.02] border border-white/5 px-3 py-2 transition-all hover:bg-white/[0.05]">
          <span 
            class="font-display font-black px-2 py-0.5 text-[9px] text-white"
            :class="[item.colorClass, item.colorClass.includes('from') ? 'bg-gradient-to-r' : '']"
          >{{ item.rarity }}</span>
          <span class="text-xs font-mono font-bold text-white tabular-nums">{{ String(item.count).padStart(2, '0') }}</span>
        </div>
      </div>
    </div>
  </GlassPanel>
</template>

<style scoped>
.bg-grid {
  background-size: 20px 20px;
  background-image: 
    linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
}
</style>
