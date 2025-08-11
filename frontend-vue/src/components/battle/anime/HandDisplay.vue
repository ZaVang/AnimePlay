<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { BattleController } from '@/core/battle/BattleController';
import type { AnimeCard as AnimeCardType } from '@/types/card'; // Renamed to avoid conflict
import AnimeCard from '@/components/AnimeCard.vue'; // Using the main component
import CardActionModal from '@/components/battle/ui/CardActionModal.vue';

const props = defineProps<{
  playerId: 'playerA' | 'playerB';
  isOpponent?: boolean;
}>();

const gameStore = useGameStore();
const playerStore = usePlayerStore();

const selectedCard = ref<AnimeCardType | null>(null);

const hand = computed(() => playerStore[props.playerId].hand as AnimeCardType[]);

const canPlayCard = computed(() => {
  if (props.isOpponent) return false;
  
  const isMyTurnAndActionPhase = gameStore.activePlayer === props.playerId && gameStore.phase === 'action';
  const isMyDefensePhase = gameStore.activePlayer !== props.playerId && gameStore.phase === 'defense';

  return isMyTurnAndActionPhase || isMyDefensePhase;
});

function onCardClick(card: AnimeCardType) {
  if (!canPlayCard.value) {
    console.log("Cannot play card right now.");
    return;
  }
  selectedCard.value = card;
}

function closeActionModal() {
  selectedCard.value = null;
}

function handlePlayCard(style: '友好安利' | '辛辣点评' | '赞同' | '反驳') {
  if (selectedCard.value) {
    if (gameStore.phase === 'action' && (style === '友好安利' || style === '辛辣点评')) {
      BattleController.initiateClash(selectedCard.value.id, style);
    } else if (gameStore.phase === 'defense' && (style === '赞同' || style === '反驳')) {
      BattleController.respondToClash(selectedCard.value.id, style);
    }
    closeActionModal();
  }
}
</script>

<template>
  <div class="hand-display-container">
    <div
      v-for="card in hand"
      :key="card.id"
      class="card-container"
      :class="{ 'opacity-50 cursor-not-allowed': !canPlayCard }"
      @click="onCardClick(card)"
    >
      <!-- Using the main AnimeCard component and showing cost -->
      <AnimeCard v-if="!isOpponent" :anime="card" :show-cost="true" />
      <div v-else class="card-back"></div>
    </div>

    <CardActionModal
      v-if="selectedCard"
      :is-visible="!!selectedCard"
      :card="selectedCard"
      @close="closeActionModal"
      @play="handlePlayCard"
    />
  </div>
</template>

<style scoped>
.hand-display-container {
  @apply h-full w-full flex justify-center items-center gap-4;
}
.card-container {
  @apply w-36 h-auto cursor-pointer transform hover:-translate-y-4 transition-transform duration-300;
}
.card-back {
  @apply w-full h-52 bg-blue-900 border-2 border-blue-400 rounded-lg;
  background-image: repeating-linear-gradient(45deg, #1e3a8a, #1e3a8a 10px, #1d4ed8 10px, #1d4ed8 20px);
}
</style>