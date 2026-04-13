<script setup lang="ts">
import type { AnimeCard as AnimeCardType } from '@/types/card';
import AnimeCard from '@/components/AnimeCard.vue'; 
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { StrengthCalculator } from '@/core/calculation/StrengthCalculator';
import { CostCalculator } from '@/core/calculation/CostCalculator';
import { computed } from 'vue';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  card: AnimeCardType;
  isVisible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'play', style: '友好安利' | '辛辣点评' | '赞同' | '反驳'): void;
}>();

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const isDefensePhase = computed(() => gameStore.phase === 'defense');

// Calculate current player ID
const currentPlayerId = computed(() => {
  return gameStore.phase === 'defense'
    ? (gameStore.activePlayer === 'playerA' ? 'playerB' : 'playerA')
    : gameStore.activePlayer;
});

// Calculate cost info with modifications
const costInfo = computed(() => {
  try {
    return CostCalculator.getCostModification(props.card, currentPlayerId.value);
  } catch {
    const baseCost = props.card.cost || 0;
    return { baseCost, finalCost: baseCost, reduction: 0, hasModification: false };
  }
});

// Helper for base strength by rarity
const getBaseStrength = (rarity: string): number => {
  const rarityStrength = { 'UR': 10, 'HR': 8, 'SSR': 6, 'SR': 4, 'R': 3, 'N': 2 };
  return rarityStrength[rarity as keyof typeof rarityStrength] || 2;
};

const baseStrength = computed(() => {
  return props.card.points || getBaseStrength(props.card.rarity);
});

const finalStrength = computed(() => {
  const currentPlayer = gameStore.phase === 'defense'
    ? (gameStore.activePlayer === 'playerA' ? 'playerB' : 'playerA')
    : gameStore.activePlayer;
  return StrengthCalculator.calculateFinalStrength(props.card, currentPlayer);
});

const hasStrengthBonus = computed(() => finalStrength.value > baseStrength.value);

// Active character synergy logic
const activeCharacterTags = computed(() => {
  const currentPlayer = gameStore.phase === 'defense'
    ? (gameStore.activePlayer === 'playerA' ? 'playerB' : 'playerA')
    : gameStore.activePlayer;
  const activeCharacter = playerStore.getActiveCharacter(currentPlayer);
  return activeCharacter?.synergy_tags || [];
});

const synergyMatches = computed(() => {
  if (!props.card.synergy_tags || !activeCharacterTags.value.length) return [];
  return props.card.synergy_tags.filter(tag => activeCharacterTags.value.includes(tag));
});

const synergyText = computed(() => {
  if (synergyMatches.value.length > 0) {
    return `ACTIVE_LINK: ${synergyMatches.value.join(' // ')}`;
  }
  return 'NO_LINKAGE_DETECTED';
});
</script>

<template>
  <div v-if="isVisible" class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[1000] p-4 transition-all duration-500">
    <GlassPanel class="max-w-md w-full border-white/10 shadow-3xl quantic-reveal overflow-hidden">
      <!-- Tactical Header -->
      <template #header>
        <div class="flex justify-between items-center mb-6">
           <div class="space-y-1">
              <div class="text-[8px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70">Action Deployment Protocol</div>
              <h2 class="text-2xl font-display font-black text-white uppercase tracking-tighter">
                {{ isDefensePhase ? 'RESPONSE_LOGIC // 响应策略' : 'ENGAGEMENT_STYLE // 攻势风格' }}
              </h2>
           </div>
           <TacticalButton variant="ghost" size="sm" @click="emit('close')">ABORT</TacticalButton>
        </div>
      </template>

      <!-- Combat Data Card -->
      <div class="flex flex-col items-center gap-6">
        <div class="card-display scale-90 group relative">
           <div class="absolute inset-0 border border-gold opacity-0 group-hover:opacity-20 animate-pulse pointer-events-none"></div>
           <AnimeCard :anime="card" :show-cost="true" :player-id="currentPlayerId" />
        </div>

        <!-- Combat Analytics Readout -->
        <div class="w-full bg-white/[0.02] border border-white/5 p-5 space-y-4">
          <!-- Strength Readout -->
          <div class="flex justify-between items-end border-b border-white/5 pb-3">
             <div class="space-y-1">
                <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-widest">Strength_Index</div>
                <div class="text-xs font-display font-black text-white uppercase">{{ card.name }}</div>
             </div>
             <div class="text-right">
                <div class="text-2xl font-mono font-black tabular-nums transition-all"
                     :class="hasStrengthBonus ? 'text-gold drop-shadow-[0_0_8px_rgba(212,165,116,0.3)]' : 'text-white'">
                  {{ finalStrength }}
                  <span v-if="hasStrengthBonus" class="text-[10px] text-gold/40 line-through ml-1">{{ baseStrength }}</span>
                </div>
                <div v-if="hasStrengthBonus" class="text-[8px] font-display font-bold text-gold uppercase tracking-tighter">SURGE_ACTIVE</div>
             </div>
          </div>

          <!-- Synergy Matrix -->
          <div class="space-y-2">
            <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-widest italic">Semantic_Bonding:</div>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="tag in card.synergy_tags || []"
                :key="tag"
                class="px-2 py-0.5 text-[9px] font-display font-bold uppercase tracking-tight transition-colors"
                :class="synergyMatches.includes(tag)
                  ? 'bg-gold/10 text-gold border border-gold/30'
                  : 'bg-white/5 text-industrial-400 border border-white/5'"
              >
                {{ tag }}
              </span>
              <span v-if="!card.synergy_tags?.length" class="text-industrial-600 text-[9px] italic">NULL_SET</span>
            </div>
            <p class="text-[9px] font-mono mt-2 transition-colors uppercase"
               :class="synergyMatches.length > 0 ? 'text-gold' : 'text-industrial-600'">
               » {{ synergyText }}
            </p>
          </div>

          <!-- Description Overlay -->
          <div v-if="card.description" class="pt-3 border-t border-white/5">
            <p class="text-[9px] text-industrial-400 italic font-ui leading-relaxed opacity-60">"{{ card.description }}"</p>
          </div>
        </div>
      </div>

      <!-- Footer Actions: Tactical Command -->
      <template #footer>
        <div class="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/5">
          <!-- Defense Phase Buttons -->
          <template v-if="isDefensePhase">
            <TacticalButton block variant="primary" size="lg" @click="emit('play', '赞同')">
               <div class="flex flex-col items-center">
                  <span class="text-xs">AGREE // 赞同</span>
                  <span class="text-[9px] opacity-60 font-mono tracking-tighter tabular-nums" :class="{ 'text-gold': costInfo.hasModification }">
                    COST: {{ costInfo.finalCost }} TP
                  </span>
               </div>
            </TacticalButton>
            <TacticalButton block variant="danger" size="lg" @click="emit('play', '反驳')">
               <div class="flex flex-col items-center">
                  <span class="text-xs">REFUTE // 反驳</span>
                  <span class="text-[9px] opacity-60 font-mono tracking-tighter tabular-nums" :class="{ 'text-gold': costInfo.hasModification }">
                    COST: {{ costInfo.finalCost + 1 }} TP
                  </span>
               </div>
            </TacticalButton>
          </template>
          <!-- Action Phase Buttons -->
          <template v-else>
            <TacticalButton block variant="primary" size="lg" @click="emit('play', '友好安利')">
               <div class="flex flex-col items-center">
                  <span class="text-xs">ADVOCATE // 安利</span>
                  <span class="text-[9px] opacity-60 font-mono tracking-tighter tabular-nums" :class="{ 'text-gold': costInfo.hasModification }">
                    COST: {{ costInfo.finalCost }} TP
                  </span>
               </div>
            </TacticalButton>
            <TacticalButton block variant="danger" size="lg" @click="emit('play', '辛辣点评')">
               <div class="flex flex-col items-center">
                  <span class="text-xs">CRITIQUE // 点评</span>
                  <span class="text-[9px] opacity-60 font-mono tracking-tighter tabular-nums" :class="{ 'text-gold': costInfo.hasModification }">
                    COST: {{ costInfo.finalCost + 1 }} TP
                  </span>
               </div>
            </TacticalButton>
          </template>
        </div>
      </template>
    </GlassPanel>
  </div>
</template>

<style scoped>
.shadow-3xl {
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.9);
}
.card-display {
  perspective: 1000px;
}
</style>