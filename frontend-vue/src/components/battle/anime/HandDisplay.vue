<script setup lang="ts">
import { ref, computed } from 'vue';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { BattleController } from '@/core/battle/BattleController';
import type { Card } from '@/types';
import AnimeItem from './AnimeItem.vue';
import CardActionModal from '@/components/battle/ui/CardActionModal.vue';

const props = defineProps<{
  playerId: 'playerA' | 'playerB';
  isOpponent?: boolean;
}>();

const gameStore = useGameStore();
const playerStore = usePlayerStore();

const selectedCard = ref<Card | null>(null);

const hand = computed(() => playerStore[props.playerId].hand);

function onCardClick(card: Card) {
  if (props.isOpponent) return;

  if (gameStore.activePlayer !== props.playerId || gameStore.phase !== 'action') {
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
  <div class="hand-display-container">
    <div
      v-for="card in hand"
      :key="card.id"
      class="card-container"
      @click="onCardClick(card)"
    >
      <AnimeItem v-if="!isOpponent" :card="card" />
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
  @apply w-32 h-44 cursor-pointer transform hover:-translate-y-4 transition-transform duration-300;
}
.card-back {
  @apply w-full h-full bg-blue-900 border-2 border-blue-400 rounded-lg;
  background-image: repeating-linear-gradient(45deg, #1e3a8a, #1e3a8a 10px, #1d4ed8 10px, #1d4ed8 20px);
}
</style>
