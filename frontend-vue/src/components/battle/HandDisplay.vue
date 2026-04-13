<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { createBattleController } from '@/core/battle/BattleController';
import { useDialogue } from '@/core/di/composables';
import type { AnimeCard as AnimeCardType } from '@/types/card'; 
import AnimeCard from '@/components/AnimeCard.vue'; 
import CardActionModal from '@/components/battle/ui/CardActionModal.vue';
import CardDetailModal from '@/components/CardDetailModal.vue';
import CardStrengthPreview from '@/components/battle/ui/CardStrengthPreview.vue';
import { useCollectionStore } from '@/stores/modules/collectionStore';

const props = defineProps<{
  playerId: 'playerA' | 'playerB';
  isOpponent?: boolean;
}>();

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const collectionStore = useCollectionStore();
const dialogueSystem = useDialogue();

// Create BattleController instance
const battleController = createBattleController(dialogueSystem);

const selectedCard = ref<AnimeCardType | null>(null);
const detailCard = ref<AnimeCardType | null>(null);

const hand = computed(() => playerStore[props.playerId].hand as AnimeCardType[]);

const canPlayCard = computed(() => {
  if (props.isOpponent) return false;
  
  const isMyTurnAndActionPhase = gameStore.activePlayer === props.playerId && gameStore.phase === 'action';
  const isMyDefensePhase = gameStore.activePlayer !== props.playerId && gameStore.phase === 'defense';

  return isMyTurnAndActionPhase || isMyDefensePhase;
});

function onCardClick(card: AnimeCardType) {
  if (!canPlayCard.value) return;
  selectedCard.value = card;
}

function onCardRightClick(card: AnimeCardType) {
  if (props.isOpponent) return;
  detailCard.value = card;
}

function closeActionModal() {
  selectedCard.value = null;
}

function closeDetailModal() {
  detailCard.value = null;
}

function handlePlayCard(style: '友好安利' | '辛辣点评' | '赞同' | '反驳') {
  if (selectedCard.value) {
    if (gameStore.phase === 'action' && (style === '友好安利' || style === '辛辣点评')) {
      battleController.initiateClash(selectedCard.value.id, style);
    } else if (gameStore.phase === 'defense' && (style === '赞同' || style === '反驳')) {
      battleController.respondToClash(selectedCard.value.id, style);
    }
    closeActionModal();
  }
}
</script>

<template>
  <div class="hand-display-container scrollbar-none">
    <!-- Opponent Hand Info: Tactical Readout -->
    <div v-if="isOpponent" class="opponent-data-stratum">
      <div class="text-[7px] font-display font-bold text-gold/60 uppercase tracking-[0.3em] mb-1">Stratum_Analysis</div>
      <div class="text-[10px] font-mono font-black text-white uppercase italic">
        RIVAL_HAND_CLUSTERS: [{{ hand.length }}]
      </div>
    </div>

    <!-- Hand Cards List -->
    <div
      v-for="card in hand"
      :key="card.id"
      class="card-container group"
      :class="{ 'actionable': canPlayCard, 'non-actionable': !canPlayCard && !isOpponent }"
      @click="onCardClick(card)"
      @contextmenu.prevent="onCardRightClick(card)"
    >
      <div v-if="!isOpponent" class="card-wrapper quantic-reveal">
        <AnimeCard :anime="card" :show-cost="true" :show-strength="true" :player-id="playerId" />
        <!-- Strength Preview: Tactical Ghost Overlay -->
        <CardStrengthPreview :card="card" :player-id="playerId" />
      </div>

      <!-- Tactical Card Back for Opponent -->
      <div v-else class="card-back group-hover:scale-105 transition-all duration-700">
        <div class="absolute inset-0 bg-scanline opacity-[0.05]"></div>
        <div class="absolute inset-0 flex items-center justify-center">
           <div class="text-[12px] font-display font-black text-gold/20 tracking-[0.5em] rotate-90 select-none">AnimePlay</div>
        </div>
        <!-- Secure seal markers -->
        <div class="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-gold/40"></div>
        <div class="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-gold/40"></div>
      </div>
    </div>

    <!-- Modal Protocols -->
    <CardActionModal
      v-if="selectedCard"
      :is-visible="!!selectedCard"
      :card="selectedCard"
      @close="closeActionModal"
      @play="handlePlayCard"
    />

    <CardDetailModal
      v-if="detailCard"
      :card="detailCard"
      card-type="anime"
      :count="collectionStore.getAnimeCardCount(detailCard.id)"
      @close="closeDetailModal"
    />
  </div>
</template>

<style scoped>
.hand-display-container {
  @apply h-full w-full flex justify-center items-center gap-6 pb-6 relative overflow-x-auto;
}

.card-container {
  @apply relative w-32 h-44 cursor-pointer transition-all duration-500 ease-out;
}

.card-container.actionable {
  @apply hover:-translate-y-6;
}

.card-container.non-actionable {
  @apply opacity-40 filter grayscale-[0.8] cursor-not-allowed transform scale-95;
}

.card-wrapper {
  @apply relative w-full h-full;
}

.card-back {
  @apply w-full h-full bg-black border border-white/10 relative overflow-hidden;
  background-image: radial-gradient(circle at center, rgba(212,165,116,0.05) 0%, transparent 70%);
}

.opponent-data-stratum {
  @apply absolute top-[-30px] left-1/2 -translate-x-1/2 flex flex-col items-center bg-black/60 px-4 py-1 border border-white/5;
}

.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>