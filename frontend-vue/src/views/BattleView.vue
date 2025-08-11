<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { TurnManager } from '@/core/battle/TurnManager';
import type { Deck } from '@/stores/userStore';

import DeckSelector from '@/components/battle/ui/DeckSelector.vue';
import PlayerField from '@/components/battle/arena/PlayerField.vue';
import HandDisplay from '@/components/battle/anime/HandDisplay.vue';
import TopicBiasBar from '@/components/battle/arena/TopicBiasBar.vue';
import ActionPanel from '@/components/battle/ui/ActionPanel.vue';

type BattlePhase = 'deckSelection' | 'battle';

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const battlePhase = ref<BattlePhase>('deckSelection');

function handleDeckSelected(deck: Deck) {
  console.log(`Deck "${deck.name}" selected. Initializing game...`);
  TurnManager.initializeGameWithDeck(deck);
  battlePhase.value = 'battle';
}

function handleRandomDeck() {
  console.log("No deck selected. Initializing with random decks...");
  TurnManager.initializeRandomGame();
  battlePhase.value = 'battle';
}
</script>

<template>
  <div class="battle-view bg-gray-900 text-white min-h-screen p-4 flex flex-col">
    <!-- Phase 1: Deck Selection -->
    <div v-if="battlePhase === 'deckSelection'" class="flex-grow flex items-center justify-center">
      <DeckSelector @deckSelected="handleDeckSelected" @randomDeck="handleRandomDeck" />
    </div>

    <!-- Phase 2: Battle -->
    <template v-else>
      <!-- Header Info -->
      <div class="absolute top-4 left-4 text-sm text-gray-400">
        <h1 class="text-3xl font-bold">宅理论战</h1>
        <p v-if="!gameStore.isGameOver" class="text-xl">
          第 {{ gameStore.turn }} 回合 - {{ gameStore.activePlayer === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name }} 的行动阶段
        </p>
        <p v-else class="text-2xl text-green-400">
          游戏结束！
        </p>
        <p v-if="gameStore.winner">Winner: {{ gameStore.winner }}</p>
      </div>

      <!-- Opponent's Field -->
      <div class="opponent-field flex-1 p-4">
        <PlayerField playerId="playerB" isOpponent />
      </div>

      <!-- Center Area -->
      <div class="center-area flex flex-col items-center justify-center my-4">
        <div class="topic-bias-bar h-16 border-2 border-purple-500 rounded-lg p-2 bg-gray-800/50">
           <TopicBiasBar />
        </div>
        <div class="clash-zone flex-grow border-2 border-yellow-500 rounded-lg p-4 bg-gray-800/50">
           <h3 class="text-center font-bold">交锋区</h3>
           <!-- <ClashZone /> -->
        </div>
        <div class="action-panel h-20 border-2 border-blue-500 rounded-lg p-2 bg-gray-800/50">
           <ActionPanel />
        </div>
      </div>

      <!-- Player's Field -->
      <div class="player-field flex-1 p-4">
        <PlayerField playerId="playerA" />
      </div>

      <!-- Player's Hand -->
      <div class="player-hand-area w-full mt-4 h-48 border-2 border-cyan-500 rounded-lg p-2 bg-gray-800/50">
        <h3 class="text-center font-bold mb-2">我的手牌</h3>
         <HandDisplay />
      </div>
    </template>
  </div>
</template>

<style scoped>
.battle-view {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}
</style>
