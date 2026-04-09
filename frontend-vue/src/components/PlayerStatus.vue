<script setup lang="ts">
import { useAuthStore } from '@/stores/modules/authStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useDeckStore } from '@/stores/modules/deckStore';
import { computed } from 'vue';

const authStore = useAuthStore();
const economyStore = useEconomyStore();
const deckStore = useDeckStore();

const expPercentage = computed(() => {
  if (authStore.expToNextLevel === 0) return 0;
  return (authStore.exp / authStore.expToNextLevel) * 100;
});
</script>

<template>
  <div class="bg-industrial-800 border border-industrial-700 p-6 shadow-2xl relative overflow-hidden clip-chamfer datapad-reveal">
    <!-- Header with tactical decoration -->
    <div class="tactical-panel-header -mx-6 -mt-6 mb-6">
      <span class="flex items-center gap-2">
        <span class="w-2 h-2 bg-clinical-warning animate-pulse"></span>
        玩家状态资料
      </span>
      <span class="opacity-40">同步等级：{{ authStore.level }}</span>
    </div>

    <div v-if="authStore.isLoggedIn" class="space-y-6 relative z-10">

      <!-- Level & EXP Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
        <div class="space-y-2">
          <div class="flex justify-between items-baseline font-mono">
            <span class="text-3xl font-black text-industrial-100 italic tracking-tighter">
              LV.<span class="text-clinical-warning">{{ String(authStore.level).padStart(2, '0') }}</span>
            </span>
            <span class="text-[10px] text-industrial-500 uppercase">Core_Synchronization</span>
          </div>
          
          <!-- Segmented EXP Bar -->
          <div class="segmented-bar-container bg-industrial-900 border border-industrial-700 p-1 h-6">
            <div 
              v-for="i in 20" 
              :key="i"
              class="segmented-bar-block"
              :class="{ 'active': (i / 20) * 100 <= expPercentage }"
            ></div>
          </div>
          <div class="flex justify-between font-mono text-[10px] text-industrial-500">
            <span>EXP_FLOW: {{ authStore.exp }}</span>
            <span>THRESHOLD: {{ authStore.expToNextLevel }}</span>
          </div>
        </div>

        <!-- Economy Stats Grid -->
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-industrial-900/50 border-l-2 border-clinical-blue p-3 font-mono">
            <p class="text-industrial-500 text-[9px] uppercase tracking-widest">Knowledge.pts</p>
            <p class="text-xl font-bold text-industrial-100">{{ economyStore.knowledgePoints }}</p>
          </div>
          <div class="bg-industrial-900/50 border-l-2 border-industrial-600 p-3 font-mono">
            <p class="text-industrial-500 text-[9px] uppercase tracking-widest">Deck.slots</p>
            <p class="text-xl font-bold text-industrial-100">{{ Object.keys(deckStore.savedDecks).length }}</p>
          </div>
        </div>
      </div>

      <!-- Tickets/Currencies -->
      <div class="flex gap-4 pt-4 border-t border-industrial-700/50">
        <div class="flex-1 flex flex-col bg-industrial-900/30 p-2 border border-industrial-700/30">
          <span class="text-[10px] text-industrial-600 font-mono italic">ANIME_SPEC_TICKET</span>
          <span class="text-lg font-mono text-clinical-warning font-black">{{ String(economyStore.animeGachaTickets).padStart(3, '0') }}</span>
        </div>
        <div class="flex-1 flex flex-col bg-industrial-900/30 p-2 border border-industrial-700/30">
          <span class="text-[10px] text-industrial-600 font-mono italic">CHARA_SPEC_TICKET</span>
          <span class="text-lg font-mono text-clinical-blue font-black">{{ String(economyStore.characterGachaTickets).padStart(3, '0') }}</span>
        </div>
      </div>

    </div>

    <div v-else class="text-center py-12 border-2 border-dashed border-industrial-700">
      <p class="text-industrial-500 font-mono animate-pulse">>> PLEASE_AUTHENTICATE_TO_ACCESS_ENCRYPTED_DATA</p>
    </div>

    <!-- Background Watermark -->
    <div class="absolute bottom-[-20%] right-[-5%] text-[8rem] font-mono font-black text-white/5 pointer-events-none select-none tracking-tighter italic">
      STATUS
    </div>
  </div>
</template>


