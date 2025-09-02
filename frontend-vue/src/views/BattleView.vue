<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { TurnManager } from '@/core/battle/TurnManager';
import { InteractionSystem } from '@/core/systems/InteractionSystem';
import { PersistentEffectSystem } from '@/core/systems/PersistentEffectSystem';
import type { Deck } from '@/stores/userStore';

import DeckSelector from '@/components/battle/ui/DeckSelector.vue';
import PlayerField from '@/components/battle/arena/PlayerField.vue';
import ClashZone from '@/components/battle/arena/ClashZone.vue';
import TopicBiasBar from '@/components/battle/arena/TopicBiasBar.vue';
import EndTurnButton from '@/components/battle/ui/EndTurnButton.vue';
import NotificationDisplay from '@/components/battle/ui/NotificationDisplay.vue';
import BattleLog from '@/components/battle/ui/BattleLog.vue';
import InteractionManager from '@/components/battle/interaction/InteractionManager.vue';
import { BattleController } from '@/core/battle/BattleController';

type BattlePhase = 'deckSelection' | 'battle';

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const battlePhase = ref<BattlePhase>('deckSelection');
const interactionManager = ref<InstanceType<typeof InteractionManager> | null>(null);

// Check game state when component is mounted
onMounted(() => {
  // If a game is in progress (i.e., not in setup or game over phase), go directly to the battle screen.
  if (gameStore.phase !== 'setup' && gameStore.phase !== 'game_over') {
    battlePhase.value = 'battle';
  }

  // Set up interaction system (use nextTick to ensure component is mounted)
  nextTick(() => {
    if (interactionManager.value) {
      const interactionSystem = InteractionSystem.getInstance();
      interactionSystem.setInteractionManager(interactionManager.value);
    }
  });
});

onBeforeUnmount(() => {
  // Clean up systems when leaving battle
  PersistentEffectSystem.getInstance().clearAll();
});

function handleDeckSelected(deck: Deck, aiProfileId?: string) {
  TurnManager.initializeGameWithDeck(deck, aiProfileId);
  battlePhase.value = 'battle';
}

function handleRandomDeck(aiProfileId?: string) {
  TurnManager.initializeRandomGame(aiProfileId);
  battlePhase.value = 'battle';
}

function handleSkipTurn() {
  BattleController.skipTurn();
}
</script>

<template>
  <div class="battle-view">
    <NotificationDisplay />
    
    <!-- Interaction Manager for complex skill effects -->
    <InteractionManager ref="interactionManager" />
    
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
      <div class="center-area-reordered">
        <!-- Left: Battle Log -->
        <div class="log-container">
            <BattleLog />
        </div>

        <!-- Center: Main Content (Topic Bar + Clash Zone) -->
        <div class="center-content-wrapper">
            <TopicBiasBar class="topic-bias-bar-horizontal-container" />
            <div class="clash-zone-container">
                <ClashZone />
            </div>
        </div>

        <!-- Right: Action Buttons -->
        <div class="action-buttons">
            <EndTurnButton />
            <button
                v-if="gameStore.phase === 'defense' && gameStore.activePlayer === 'playerB'"
                @click="handleSkipTurn"
                class="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 transition-colors"
            >
                跳过防御
            </button>
        </div>
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
  min-height: 250px; /* 确保玩家区域有最小高度 */
}

/* Reordered Center Area Layout */
.center-area-reordered {
  @apply w-full flex-grow flex items-stretch justify-between p-4 gap-4;
}

.log-container {
    @apply h-full bg-gray-800/50 rounded-lg p-2 overflow-hidden border border-gray-700 relative; /* Add relative positioning */
    flex: 0 1 250px; /* Do not grow, shrink if needed, initial width 250px */
    min-height: 0; /* Important fix for flex-child scrolling */
}

.center-content-wrapper {
    @apply flex-grow flex flex-col gap-4;
}

.topic-bias-bar-horizontal-container {
    @apply w-full;
}

.clash-zone-container {
    @apply h-full min-h-[18rem] bg-gray-800/50 rounded-lg p-2 overflow-hidden border border-gray-700;
    flex: 1 1 auto; /* Grow to fill available space */
}

.action-buttons {
    @apply flex flex-col space-y-2 justify-center items-center;
    flex: 0 1 250px; /* Do not grow, shrink if needed, initial width 250px */
}
</style>
