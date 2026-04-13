<script setup lang="ts">
import type { Deck } from '@/types/store';
import { useDeckStore } from '@/stores/modules/deckStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { ref, computed, onMounted } from 'vue';
import { listAIProfiles, type AIProfile } from '@/core/ai/aiProfiles';
import { useSettingsStore } from '@/stores/settings';
import BattleRulesModal from './BattleRulesModal.vue';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const deckStore = useDeckStore();
const gameDataStore = useGameDataStore();
const settingsStore = useSettingsStore();

// AI Profile Selection synced with settings
const aiProfiles = listAIProfiles();
const selectedAIId = computed<string>({
  get: () => settingsStore.selectedAIProfileId,
  set: (v: string) => { settingsStore.selectedAIProfileId = v; settingsStore.saveSettings(); },
});
const selectedAI = computed<AIProfile | undefined>(() => aiProfiles.find(p => p.id === selectedAIId.value));

onMounted(() => {
  if (!aiProfiles.find(p => p.id === selectedAIId.value)) {
    const fallback = aiProfiles[0]?.id;
    if (fallback) {
      settingsStore.selectedAIProfileId = fallback;
      settingsStore.saveSettings();
    }
  }
});

const getCoverImage = (deck: Deck) => {
  if (!deck.cover) {
    return '/data/images/card_back.jpg';
  }
  const card = deck.cover.type === 'anime'
    ? gameDataStore.getAnimeCardById(deck.cover.id)
    : gameDataStore.getCharacterCardById(deck.cover.id);
  return card ? card.image_path : '/data/images/card_back.jpg';
};

const emit = defineEmits<{
  (e: 'deckSelected', deck: Deck, aiProfileId?: string): void;
  (e: 'randomDeck', aiProfileId?: string): void;
}>();

const showRulesModal = ref(false);

function handleDeckClick(deck: Deck) {
  emit('deckSelected', deck, selectedAIId.value);
}

function handleRandomClick() {
  emit('randomDeck', selectedAIId.value);
}
</script>

<template>
  <div class="deck-selector-container quantic-reveal">
    <!-- Header Section -->
    <div class="flex flex-col md:flex-row items-center justify-between mb-12 gap-6">
      <div class="space-y-1 text-center md:text-left">
         <div class="text-[8px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70">Engagement Protocol</div>
         <h2 class="text-4xl font-display font-black text-white uppercase tracking-tighter">SELECT_YOUR_DECK // 选择出战卡组</h2>
      </div>
      <TacticalButton variant="ghost" size="md" @click="showRulesModal = true">PROTOCOL_DETAILS // 规则详解</TacticalButton>
    </div>

    <!-- AI Rival Tactical Panel -->
    <div class="ai-selection-section mb-12 bg-white/[0.02] border border-white/5 p-8 relative overflow-hidden group">
      <!-- Background scanlines -->
      <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>
      
      <div class="relative z-10 flex flex-col items-center">
         <div class="flex items-center gap-6 mb-6">
            <label class="text-[10px] font-display font-bold text-gold uppercase tracking-widest">Target_AI_Profile:</label>
            <div class="relative min-w-64">
               <select v-model="selectedAIId" class="w-full p-3 bg-black/60 border border-white/10 text-xs font-display text-white uppercase outline-none focus:border-gold/50 transition-all appearance-none cursor-pointer">
                  <option v-for="p in aiProfiles" :key="p.id" :value="p.id">{{ p.name }}</option>
               </select>
               <div class="absolute right-4 top-4 text-gold/40 text-[8px] pointer-events-none">▼</div>
            </div>
         </div>

         <div v-if="selectedAI" class="max-w-xl w-full">
            <div class="p-4 bg-white/[0.03] border-l-2 border-gold space-y-3">
               <p class="text-xs text-industrial-300 font-ui italic text-center leading-relaxed">"{{ selectedAI.description }}"</p>
               <div class="flex justify-center gap-12 pt-2 border-t border-white/5">
                  <div class="text-center">
                     <div class="text-[8px] font-display text-industrial-500 uppercase mb-1">Entity_Pool</div>
                     <div class="text-xs font-display font-black text-blue-400 uppercase">{{ selectedAI.anime.length > 0 ? 'FIXED' : 'PROCEDURAL' }}</div>
                  </div>
                  <div class="text-center">
                     <div class="text-[8px] font-display text-industrial-500 uppercase mb-1">Personnel_Logic</div>
                     <div class="text-xs font-display font-black text-purple-400 uppercase">{{ selectedAI.character.length > 0 ? 'FIXED' : 'PROCEDURAL' }}</div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>

    <!-- Deck Grid -->
    <div v-if="Object.keys(deckStore.savedDecks).length === 0" class="text-center py-20 bg-white/[0.02] border border-dashed border-white/10">
      <div class="text-[10px] font-display font-bold text-industrial-600 uppercase tracking-[0.5em] mb-8">NO_ENTITY_CLUSTERS_DETECTED</div>
      <TacticalButton variant="primary" size="lg" @click="handleRandomClick">INITIALIZE_PROCEDURAL_DECK</TacticalButton>
    </div>
    
    <div v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8">
        <div
          v-for="deck in deckStore.savedDecks"
          :key="deck.name"
          class="group relative border border-white/5 bg-black/40 hover:border-gold transition-all duration-500 overflow-hidden cursor-pointer"
          @click="handleDeckClick(deck)"
        >
          <!-- Flip effect indicator -->
          <div class="relative aspect-[16/10] overflow-hidden">
            <img :src="getCoverImage(deck)" class="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 transition-all duration-1000 group-hover:scale-110" :alt="`${deck.name} cover`" />
            <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
            
            <!-- Selection Overlay -->
            <div class="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gold/5 transition-opacity duration-500 flex items-center justify-center">
               <div class="text-[8px] font-display font-bold text-gold uppercase tracking-[0.4em] translate-y-4 group-hover:translate-y-0 transition-transform">ENGAGE_CLUSTER</div>
            </div>
          </div>

          <div class="p-5 space-y-3 relative">
            <div class="space-y-1">
               <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-widest">Deck_Signature</div>
               <h4 class="text-lg font-display font-black text-white uppercase truncate group-hover:text-gold transition-colors">{{ deck.name }}</h4>
            </div>
            
            <div class="flex items-center gap-4 text-[9px] font-mono text-industrial-400 uppercase">
               <span class="flex items-center gap-1"><span class="w-1 h-1 bg-blue-500/40"></span> {{ deck.anime.length }} ANM</span>
               <span class="flex items-center gap-1"><span class="w-1 h-1 bg-purple-500/40"></span> {{ deck.character.length }} CHR</span>
            </div>

            <!-- Absolute decoration -->
            <div class="absolute bottom-2 right-2 opacity-5 text-4xl font-black italic select-none">DATA</div>
          </div>
          
          <!-- Tactical border pulse -->
          <div class="absolute inset-0 border border-gold opacity-0 group-hover:opacity-20 pointer-events-none transition-opacity"></div>
        </div>
      </div>

      <div class="flex items-center justify-center mt-16 pt-8 border-t border-white/5 gap-8">
        <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-widest italic opacity-60">ALTERNATIVE_METHOD:</div>
        <TacticalButton variant="ghost" size="md" @click="handleRandomClick">RANDOM_CONSTRUCT_START</TacticalButton>
      </div>
    </div>
    
    <!-- Battle Rules Modal -->
    <BattleRulesModal 
      :show="showRulesModal" 
      @close="showRulesModal = false"
    />
  </div>
</template>

<style scoped>
.deck-selector-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 4rem 2rem;
}

select {
  background-image: none; /* Hide default arrow */
}

/* Custom shadow for tactical depth */
.group:hover {
  box-shadow: 0 0 30px rgba(212, 165, 116, 0.1);
}
</style>
