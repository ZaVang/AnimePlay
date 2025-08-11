<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { TurnManager } from '@/core/battle/TurnManager';
import type { Deck } from '@/stores/userStore';

import DeckSelector from '@/components/battle/ui/DeckSelector.vue';
import PlayerField from '@/components/battle/arena/PlayerField.vue';
import ClashZone from '@/components/battle/arena/ClashZone.vue';
import TopicBiasBar from '@/components/battle/arena/TopicBiasBar.vue';
import EndTurnButton from '@/components/battle/ui/EndTurnButton.vue';
import NotificationDisplay from '@/components/battle/ui/NotificationDisplay.vue';

type BattlePhase = 'deckSelection' | 'battle';

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const battlePhase = ref<BattlePhase>('deckSelection');

function handleDeckSelected(deck: Deck) {
  TurnManager.initializeGameWithDeck(deck);
  battlePhase.value = 'battle';
}

function handleRandomDeck() {
  TurnManager.initializeRandomGame();
  battlePhase.value = 'battle';
}
</script>

<template>
  <div class="battle-view">
    <NotificationDisplay />
    <!-- Phase 1: Deck Selection -->
    <div v-if="battlePhase === 'deckSelection'" class="deck-selector-wrapper">
      <DeckSelector @deckSelected="handleDeckSelected" @randomDeck="handleRandomDeck" />
    </div>

    <!-- Phase 2: Battle -->
    <div v-else class="battle-arena">
      <!-- Opponent's Field -->
      <div class="field-opponent">
        <PlayerField playerId="playerB" isOpponent />
      </div>

      <!-- Center Area -->
      <div class="center-area">
        <TopicBiasBar />
        <ClashZone class="flex-grow" />
        <EndTurnButton />
      </div>

      <!-- Player's Field -->
      <div class="field-player">
        <PlayerField playerId="playerA" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-view {
  @apply bg-gray-900 text-white min-h-screen w-full h-full overflow-hidden;
}
.deck-selector-wrapper {
  @apply w-full h-full flex items-center justify-center;
}
.battle-arena {
  @apply h-full flex flex-col;
}
.field-opponent, .field-player {
  @apply flex-1;
}
.center-area {
  @apply h-80 flex items-center justify-center p-4 gap-4;
  flex-grow: 0;
  flex-shrink: 0;
}
</style>
