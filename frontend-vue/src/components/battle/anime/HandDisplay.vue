<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { BattleController } from '@/core/battle/BattleController';
import type { Card } from '@/types';
import AnimeItem from './AnimeItem.vue';
import CardActionModal from '@/components/battle/ui/CardActionModal.vue';

const gameStore = useGameStore();
const playerStore = usePlayerStore();

const selectedCard = ref<Card | null>(null);

const activePlayerHand = computed(() => {
  if (gameStore.activePlayer === 'playerA') {
    return playerStore.playerA.hand;
  }
  return playerStore.playerB.hand;
});

function onCardClick(card: Card) {
  if (gameStore.activePlayer !== 'playerA' || gameStore.phase !== 'action') {
    // Only allow Player A to act during their action phase
    console.log("Not your turn or not in action phase.");
    return;
  }
  selectedCard.value = card;
}

function closeActionModal() {
  selectedCard.value = null;
}

function handlePlayCard(style: '友好安利' | '辛辣点评') {
  if (selectedCard.value) {
    BattleController.initiateClash(selectedCard.value.id, style);
    closeActionModal();
  }
}
</script>

<template>
  <div class="hand-display flex justify-center items-center h-full gap-2 p-2">
    <div class="deck-info flex flex-col items-center justify-center text-white mr-4">
      <div class="text-sm">弃牌堆: {{ playerStore.activePlayer === 'playerA' ? playerStore.playerA.discardPile.length : playerStore.playerB.discardPile.length }}</div>
    </div>
    <div
      v-for="card in activePlayerHand"
      :key="card.id"
      class="anime-card-container w-28 h-40 cursor-pointer transform hover:-translate-y-4 transition-transform duration-300"
      @click="onCardClick(card)"
    >
      <AnimeItem :card="card" />
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
/* Styles for HandDisplay */
</style>
