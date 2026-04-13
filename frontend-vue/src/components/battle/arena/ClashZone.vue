<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/battle';
import AnimeCard from '@/components/AnimeCard.vue';
import BattleCalculationDisplay from './BattleCalculationDisplay.vue';

const gameStore = useGameStore();
const clashInfo = computed(() => gameStore.clashInfo);
</script>

<template>
  <div class="clash-zone quantic-reveal">
    <div v-if="clashInfo && clashInfo.attackingCard" class="clash-container">
      <!-- Cards Engagement Area -->
      <div class="cards-display p-6 bg-white/[0.02] border border-white/5 relative overflow-hidden group">
        <!-- Background Scanline Decoration -->
        <div class="absolute inset-0 bg-scanline opacity-[0.05] pointer-events-none"></div>
        
        <!-- Attacker Section -->
        <div class="card-slot attacker">
           <div class="absolute -top-6 left-0 text-[8px] font-display font-bold text-clinical-danger uppercase tracking-[0.3em]">Offensive_Unit</div>
           <div class="relative group">
              <AnimeCard :anime="clashInfo.attackingCard" :show-cost="true" />
              <div class="absolute inset-0 border-2 border-clinical-danger/30 opacity-60 pointer-events-none"></div>
           </div>
           <div class="style-tag attack-tag">
             {{ clashInfo.attackStyle }} // STRIKE
           </div>
        </div>

        <!-- Central Divider -->
        <div class="engagement-divider flex flex-col items-center gap-2">
           <div class="w-px h-12 bg-gradient-to-t from-transparent via-gold to-transparent opacity-20"></div>
           <div class="relative">
              <div class="text-[10px] font-display font-black text-gold/40 tracking-widest italic animate-pulse">VS</div>
              <div class="absolute inset-0 blur-sm bg-gold/10 opacity-50 scale-150 font-black">VS</div>
           </div>
           <div class="w-px h-12 bg-gradient-to-t from-gold via-gold to-transparent opacity-20"></div>
        </div>

        <!-- Defender Section -->
        <div class="card-slot defender">
           <div class="absolute -top-6 right-0 text-[8px] font-display font-bold text-blue-400 uppercase tracking-[0.3em] text-right">Defensive_Unit</div>
           <template v-if="clashInfo.defendingCard">
              <div class="relative group">
                <AnimeCard :anime="clashInfo.defendingCard" :show-cost="true" />
                <div class="absolute inset-0 border-2 border-blue-400/30 opacity-60 pointer-events-none"></div>
              </div>
              <div class="style-tag defense-tag">
                {{ clashInfo.defenseStyle }} // GUARD
              </div>
           </template>
           <div v-else class="empty-slot border border-white/5 bg-black/40 flex items-center justify-center relative overflow-hidden">
             <!-- Signal searching pattern -->
             <div class="absolute inset-0 flex flex-col items-center justify-center opacity-20">
                <div class="w-full h-px bg-white/40 animate-scanning"></div>
             </div>
             <div class="waiting-indicator text-[10px] font-display font-bold text-industrial-500 uppercase tracking-[0.4em] italic z-10">
                WAITING_FOR_UPLINK...
             </div>
           </div>
        </div>

        <!-- Corners Decoration -->
        <div class="absolute top-2 left-2 w-2 h-2 border-t border-l border-white/20"></div>
        <div class="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-white/20"></div>
      </div>

      <!-- Calculation Readout Section -->
      <div class="calculation-area mt-4">
        <div class="flex items-center gap-4 mb-3">
           <div class="h-px bg-white/5 flex-1"></div>
           <div class="text-[8px] font-display font-bold text-industrial-600 uppercase tracking-[0.5em]">Battle_Calculus_Protocol</div>
           <div class="h-px bg-white/5 flex-1"></div>
        </div>
        <BattleCalculationDisplay />
      </div>
    </div>
    
    <!-- Null State Placeholder -->
    <div v-else class="placeholder">
      <div class="placeholder-content relative p-12 bg-white/[0.02] border border-white/5">
        <div class="text-4xl opacity-20 mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">◈</div>
        <h3 class="text-xs font-display font-bold text-industrial-400 uppercase tracking-[0.5em] mb-2 font-black">Tactical_Abyss</h3>
        <p class="text-[9px] font-mono text-industrial-600 uppercase tracking-widest italic opacity-60 underline decoration-industrial-600/30 underline-offset-4">
          Select data module from local hand to initiate engagement
        </p>
        
        <!-- Decoration corners -->
        <div class="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-white/5"></div>
        <div class="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-white/5"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clash-zone {
  @apply w-full h-full flex flex-col;
}

.clash-container {
  @apply w-full h-full flex flex-col;
}

.cards-display {
  @apply flex items-center justify-around py-12;
}

.card-slot {
  @apply relative w-32 h-44;
}

.empty-slot {
  @apply w-32 h-44 border border-white/5 bg-black/40 shadow-inner;
}

.style-tag {
  @apply absolute -bottom-8 left-1/2 -translate-x-1/2 text-white text-[9px] font-display font-black px-4 py-1.5 uppercase tracking-wider skew-x-[-12deg];
}

.attack-tag {
  @apply bg-clinical-danger/80 border border-clinical-danger shadow-[0_4px_15px_rgba(159,18,57,0.3)];
}

.defense-tag {
  @apply bg-blue-600/80 border border-blue-400 shadow-[0_4px_15px_rgba(30,64,175,0.3)];
}

.placeholder {
  @apply w-full h-full flex items-center justify-center;
}

.placeholder-content {
  @apply text-center;
}

@keyframes scanning {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

.animate-scanning {
  animation: scanning 2s linear infinite;
}
</style>