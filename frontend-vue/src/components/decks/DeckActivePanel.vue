<script setup lang="ts">
import { computed } from 'vue';
import type { Card } from '@/types/card';
import { GAME_CONFIG } from '@/config/gameConfig';

// Atomic Components
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  deckName: string;
  animeInDeck: Card[];
  characterInDeck: Card[];
}>();

const emit = defineEmits<{
  (e: 'update:deckName', name: string): void;
  (e: 'remove-from-deck', id: number, type: 'anime' | 'character'): void;
  (e: 'save'): void;
  (e: 'back'): void;
}>();

const deckNameModel = computed({
  get: () => props.deckName,
  set: (val) => emit('update:deckName', val)
});

function handleImageError(event: Event) {
    (event.target as HTMLImageElement).src = '/data/images/card_back.jpg';
}
</script>

<template>
  <div class="deck-active-pane-tactical flex flex-col h-full bg-black/60 backdrop-blur-md border-l border-white/5 relative overflow-hidden">
    <!-- Static Backdrop Decoration -->
    <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>

    <!-- Header: Identity Configuration -->
    <div class="p-6 border-b border-white/5 space-y-4 bg-black/20">
      <div class="space-y-1">
        <div class="text-[7px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70">Configuration</div>
        <input 
          type="text" 
          v-model="deckNameModel" 
          class="w-full bg-transparent text-xl font-display font-black text-white uppercase tracking-tighter outline-none focus:text-gold transition-colors placeholder:text-industrial-700" 
          placeholder="ENTER_STRATUM_NAME..."
        >
      </div>
      
      <div class="flex gap-2">
        <TacticalButton variant="ghost" size="sm" @click="emit('back')" class="flex-1">
          ABORT
        </TacticalButton>
        <TacticalButton variant="primary" size="sm" @click="emit('save')" class="flex-1">
          SAVE_UPLINK
        </TacticalButton>
      </div>
    </div>
    
    <!-- Stats Matrix -->
    <div class="grid grid-cols-2 bg-white/[0.02] border-b border-white/5">
       <div class="p-4 border-r border-white/5 flex flex-col items-center">
         <span class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-widest mb-1">Anime_Payload</span>
         <span class="text-xs font-mono font-black tabular-nums" :class="animeInDeck.length > GAME_CONFIG.deckBuilding.AnimeMaxNum ? 'text-clinical-danger' : 'text-gold'">
           {{ animeInDeck.length }} / {{ GAME_CONFIG.deckBuilding.AnimeMaxNum }}
         </span>
       </div>
       <div class="p-4 flex flex-col items-center">
         <span class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-widest mb-1">Operative_Roster</span>
         <span class="text-xs font-mono font-black tabular-nums" :class="characterInDeck.length > GAME_CONFIG.deckBuilding.CharacterMaxNum ? 'text-clinical-danger' : 'text-white'">
           {{ characterInDeck.length }} / {{ GAME_CONFIG.deckBuilding.CharacterMaxNum }}
         </span>
       </div>
    </div>

    <!-- Active List Viewport -->
    <div class="flex-1 overflow-y-auto p-4 space-y-8 scrollbar-tactical custom-scrollbar">
      <!-- Deployment Queue: Anime -->
      <section class="quantic-reveal">
        <div class="flex justify-between items-center mb-3">
           <h4 class="text-[8px] font-display font-bold text-industrial-400 uppercase tracking-[0.2em]">Deployment_Queue // Anime</h4>
           <div class="w-10 h-px bg-white/5"></div>
        </div>
        
        <div class="space-y-1.5">
          <div v-for="card in animeInDeck" :key="card.id" 
               @click="emit('remove-from-deck', card.id, 'anime')"
               class="deck-active-item group relative flex items-center p-2 bg-black/40 border border-white/5 cursor-pointer hover:border-clinical-danger/30 transition-all">
            <img :src="card.image_path" class="w-12 h-8 object-cover opacity-60 group-hover:opacity-100 grayscale group-hover:grayscale-0 transition-all" @error="handleImageError">
            <div class="ml-3 flex-1 min-w-0">
               <div class="text-[8px] font-mono font-black uppercase" :class="'rarity-' + card.rarity">{{ card.rarity }}_SPEC</div>
               <div class="text-[10px] font-display font-bold text-white uppercase truncate tracking-tight">{{ card.name }}</div>
            </div>
            <div class="text-[7px] font-display font-black text-clinical-danger opacity-0 group-hover:opacity-100 transition-opacity tracking-widest px-2">PURGE</div>
          </div>
          
          <div v-if="animeInDeck.length === 0" class="py-8 text-center bg-white/[0.02] border border-dashed border-white/5">
             <span class="text-[8px] font-display font-black text-industrial-600 uppercase tracking-[0.2em] italic">Queue_Empty_Standby</span>
          </div>
        </div>
      </section>

      <!-- Operative Roster: Character -->
      <section class="quantic-reveal">
        <div class="flex justify-between items-center mb-3">
           <h4 class="text-[8px] font-display font-bold text-industrial-400 uppercase tracking-[0.2em]">Operative_Roster // Char</h4>
           <div class="w-10 h-px bg-white/5"></div>
        </div>
        
        <div class="space-y-1.5">
           <div v-for="card in characterInDeck" :key="card.id" 
                @click="emit('remove-from-deck', card.id, 'character')"
                class="deck-active-item group relative flex items-center p-2 bg-black/40 border border-white/5 cursor-pointer hover:border-clinical-danger/30 transition-all">
            <img :src="card.image_path" class="w-10 h-10 object-cover opacity-60 group-hover:opacity-100 grayscale group-hover:grayscale-0 transition-all" @error="handleImageError">
            <div class="ml-3 flex-1 min-w-0">
               <div class="text-[8px] font-mono font-black uppercase" :class="'rarity-' + card.rarity">{{ card.rarity }}_SPEC</div>
               <div class="text-[10px] font-display font-bold text-white uppercase truncate tracking-tight">{{ card.name }}</div>
            </div>
            <div class="text-[7px] font-display font-black text-clinical-danger opacity-0 group-hover:opacity-100 transition-opacity tracking-widest px-2">PURGE</div>
          </div>
          
          <div v-if="characterInDeck.length === 0" class="py-8 text-center bg-white/[0.02] border border-dashed border-white/5">
             <span class="text-[8px] font-display font-black text-industrial-600 uppercase tracking-[0.2em] italic">Roster_Incomplete_Standby</span>
          </div>
        </div>
      </section>
    </div>

    <!-- Secondary info tag -->
    <div class="absolute bottom-1 left-2 text-[5px] font-mono text-white/5 uppercase tracking-widest pointer-events-none">
       Loadout_Integrity_Monitor_404
    </div>
  </div>
</template>

<style scoped>
.deck-active-item:hover {
  @apply bg-clinical-danger/[0.02];
}

.rarity-UR { @apply text-clinical-danger shadow-[0_0_8px_rgba(159,18,57,0.3)]; }
.rarity-HR { @apply text-gold; }
.rarity-SSR { @apply text-amber-500 opacity-80; }
.rarity-SR { @apply text-blue-400 opacity-60; }
.rarity-R { @apply text-industrial-400 opacity-40; }
.rarity-N { @apply text-industrial-600 opacity-30; }

.custom-scrollbar::-webkit-scrollbar {
  width: 1px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  @apply bg-transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  @apply bg-gold/10 hover:bg-gold/30;
}
</style>
