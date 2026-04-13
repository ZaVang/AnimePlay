<script setup lang="ts">
/**
 * Battle Calculation Display - Clash Analytics Standard
 */
import { computed, ref, watch } from 'vue';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { StrengthCalculator } from '@/core/calculation/StrengthCalculator';
import type { AnimeCard } from '@/types/card';

const gameStore = useGameStore();
const playerStore = usePlayerStore();

// Animation States
const showCalculation = ref(false);
const animationStage = ref<'calculating' | 'result' | 'complete'>('calculating');

const getBaseStrengthFromRarity = (rarity: string): number => {
  const rarityStrength = { 'UR': 10, 'HR': 8, 'SSR': 6, 'SR': 4, 'R': 3, 'N': 2 };
  return rarityStrength[rarity as keyof typeof rarityStrength] || 2;
};

const clashCalculation = computed(() => {
  const clash = gameStore.clashInfo;
  if (!clash?.attackingCard) return null;

  const attackerId = clash.attackerId;
  const defenderId = clash.defenderId || (attackerId === 'playerA' ? 'playerB' : 'playerA');

  const attackerCard = clash.attackingCard;
  const attackerBaseStrength = attackerCard.points || getBaseStrengthFromRarity(attackerCard.rarity);
  const attackerFinalStrength = StrengthCalculator.calculateFinalStrength(attackerCard, attackerId);
  const attackerBonus = attackerFinalStrength - attackerBaseStrength;
  const attackStyleBonus = clash.attackStyle === '辛辣点评' ? 1 : 0;
  const attackerTotalStrength = attackerFinalStrength + attackStyleBonus;

  const result = {
    attacker: {
      card: attackerCard,
      playerId: attackerId,
      playerName: playerStore[attackerId].name,
      baseStrength: attackerBaseStrength,
      skillBonus: attackerBonus,
      styleBonus: attackStyleBonus,
      finalStrength: attackerTotalStrength,
      style: (clash.attackStyle || 'DEFAULT_ATTACK').toUpperCase(),
      styleCost: clash.attackStyle === '辛辣点评' ? (attackerCard.cost || 0) + 1 : (attackerCard.cost || 0)
    },
    defender: null as any,
    winner: null as string | null,
    outcome: null as any
  };

  if (clash.defendingCard) {
    const defenderCard = clash.defendingCard;
    const defenderBaseStrength = defenderCard.points || getBaseStrengthFromRarity(defenderCard.rarity);
    const defenderFinalStrength = StrengthCalculator.calculateFinalStrength(defenderCard, defenderId);
    const defenderBonus = defenderFinalStrength - defenderBaseStrength;
    const defenseStyleBonus = clash.defenseStyle === '反驳' ? 1 : 0;
    const defenderTotalStrength = defenderFinalStrength + defenseStyleBonus;

    result.defender = {
      card: defenderCard,
      playerId: defenderId,
      playerName: playerStore[defenderId].name,
      baseStrength: defenderBaseStrength,
      skillBonus: defenderBonus,
      styleBonus: defenseStyleBonus,
      finalStrength: defenderTotalStrength,
      style: (clash.defenseStyle || 'DEFAULT_GUARD').toUpperCase(),
      styleCost: clash.defenseStyle === '反驳' ? (defenderCard.cost || 0) + 1 : (defenderCard.cost || 0)
    };

    if (attackerTotalStrength > defenderTotalStrength) result.winner = attackerId;
    else if (defenderTotalStrength > attackerTotalStrength) result.winner = defenderId;
    
    result.outcome = {
      strengthDifference: Math.abs(attackerTotalStrength - defenderTotalStrength),
      attackerStrengthAdvantage: attackerTotalStrength - defenderTotalStrength
    };
  }

  return result;
});

watch(() => gameStore.clashInfo, (newClash, oldClash) => {
  if (newClash && newClash !== oldClash) {
    showCalculation.value = true;
    animationStage.value = 'calculating';
    if (newClash.defendingCard) {
      setTimeout(() => animationStage.value = 'result', 1000);
      setTimeout(() => animationStage.value = 'complete', 2500);
    }
  } else if (!newClash) {
    showCalculation.value = false;
    animationStage.value = 'calculating';
  }
}, { immediate: true });
</script>

<template>
  <div v-if="showCalculation && clashCalculation" class="clash-analytics-overlay quantic-reveal">
    <!-- Main Display Substrate -->
    <div class="relative bg-black/80 backdrop-blur-xl border-y border-white/10 p-12 overflow-hidden">
      <!-- Grid Ornament -->
      <div class="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>
      
      <div class="relative grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        <!-- Friendly Vector (Attacker) -->
        <div class="md:col-span-5 space-y-8 animate-slide-in-left">
           <div class="space-y-1">
             <div class="text-[10px] font-display font-bold text-cyan-400 tracking-[0.4em] uppercase">Friendly Vector // Attacker</div>
             <h2 class="text-2xl font-display font-black text-white uppercase tracking-tighter">{{ clashCalculation.attacker.playerName }}</h2>
           </div>

           <div class="analytic-panel space-y-4 border-l-2 border-cyan-400 pl-6">
              <div class="flex items-end gap-4">
                 <div class="text-6xl font-display font-black text-white leading-none tabular-nums" :class="{ 'animate-pulse': animationStage === 'calculating' }">
                    {{ clashCalculation.attacker.finalStrength }}
                 </div>
                 <div class="space-y-1 pb-1">
                    <div class="text-[8px] font-display font-bold text-cyan-400 uppercase">{{ clashCalculation.attacker.style }}</div>
                    <div class="text-[10px] font-mono text-industrial-500 uppercase tracking-tighter">
                      BASE:{{ clashCalculation.attacker.baseStrength }} | SKILL:{{ clashCalculation.attacker.skillBonus > 0 ? '+' : '' }}{{ clashCalculation.attacker.skillBonus }}
                    </div>
                 </div>
              </div>
              <div class="h-1 bg-white/5 w-full relative">
                 <div class="h-full bg-cyan-400 shadow-[0_0_8px_#22D3EE] transition-all duration-1000" :style="{ width: `${Math.min(100, (clashCalculation.attacker.finalStrength / 20) * 100)}%` }"></div>
              </div>
              <div class="text-[8px] font-mono text-industrial-600 uppercase tracking-widest text-right">Resource consumption: {{ clashCalculation.attacker.styleCost }} TP</div>
           </div>
        </div>

        <!-- Logic Resolution Core (VS) -->
        <div class="md:col-span-2 flex flex-col items-center justify-center gap-6 py-8">
           <div class="relative group">
              <div class="absolute inset-0 bg-gold/20 blur-xl group-hover:bg-gold/40 transition-all rounded-full"></div>
              <div class="relative w-16 h-16 border-2 border-gold rotate-45 flex items-center justify-center bg-black/60 shadow-[0_0_20px_rgba(212,165,116,0.3)]">
                 <span class="text-2xl -rotate-45">⚔️</span>
              </div>
           </div>

           <!-- Outcome Indicator -->
           <div v-if="animationStage === 'result' && clashCalculation.defender" class="outcome-tag quantic-reveal text-center space-y-2">
              <div v-if="clashCalculation.winner" class="space-y-1">
                 <div class="text-[10px] font-display font-black text-gold tracking-[0.3em] uppercase">Resolved_Winner</div>
                 <div class="text-xs font-display font-bold text-white uppercase">{{ clashCalculation.winner === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name }}</div>
                 <div class="text-[8px] font-mono text-gold opacity-60">DELTA: {{ clashCalculation.outcome.strengthDifference }}</div>
              </div>
              <div v-else class="text-[10px] font-display font-black text-industrial-500 tracking-[0.3em] uppercase">Phase_Equilibrium</div>
           </div>
        </div>

        <!-- Hostile Vector (Defender) -->
        <div class="md:col-span-5 space-y-8 text-right animate-slide-in-right">
           <template v-if="clashCalculation.defender">
             <div class="space-y-1">
               <div class="text-[10px] font-display font-bold text-clinical-danger tracking-[0.4em] uppercase">Hostile Vector // Defender</div>
               <h2 class="text-2xl font-display font-black text-white uppercase tracking-tighter">{{ clashCalculation.defender.playerName }}</h2>
             </div>

             <div class="analytic-panel space-y-4 border-r-2 border-clinical-danger pr-6">
                <div class="flex flex-row-reverse items-end gap-4">
                   <div class="text-6xl font-display font-black text-white leading-none tabular-nums" :class="{ 'animate-pulse': animationStage === 'calculating' }">
                      {{ clashCalculation.defender.finalStrength }}
                   </div>
                   <div class="space-y-1 pb-1">
                      <div class="text-[8px] font-display font-bold text-clinical-danger uppercase">{{ clashCalculation.defender.style }}</div>
                      <div class="text-[10px] font-mono text-industrial-500 uppercase tracking-tighter">
                        BASE:{{ clashCalculation.defender.baseStrength }} | SKILL:{{ clashCalculation.defender.skillBonus > 0 ? '+' : '' }}{{ clashCalculation.defender.skillBonus }}
                      </div>
                   </div>
                </div>
                <div class="h-1 bg-white/5 w-full relative">
                   <div class="h-full bg-clinical-danger shadow-[0_0_8px_#FF4D4D] transition-all duration-1000 float-right" :style="{ width: `${Math.min(100, (clashCalculation.defender.finalStrength / 20) * 100)}%` }"></div>
                </div>
                <div class="text-[8px] font-mono text-industrial-600 uppercase tracking-widest text-left">Resource consumption: {{ clashCalculation.defender.styleCost }} TP</div>
             </div>
           </template>
           
           <template v-else>
             <div class="h-40 flex flex-col items-end justify-center gap-4 opacity-40 italic">
                <div class="text-[10px] font-display font-bold text-industrial-500 uppercase tracking-widest animate-pulse">Awaiting Hostile Response...</div>
                <div class="w-32 h-1 bg-white/5 overflow-hidden">
                   <div class="h-full bg-industrial-600 w-1/2 animate-shimmer"></div>
                </div>
             </div>
           </template>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clash-analytics-overlay {
  @apply fixed inset-x-0 bottom-0 z-[60] py-12;
}
.bg-grid {
  background-size: 40px 40px;
  background-image: 
    linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
}
.text-clinical-danger { color: #FF4D4D; }
.bg-clinical-danger { background-color: #FF4D4D; }

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}
.animate-shimmer { animation: shimmer 2s infinite linear; }

.animate-slide-in-left { animation: slideInLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.animate-slide-in-right { animation: slideInRight 0.5s cubic-bezier(0.16, 1, 0.3, 1); }

@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-40px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}
</style>