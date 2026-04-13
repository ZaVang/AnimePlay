<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, provide, watch, computed } from 'vue';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { TurnManager } from '@/core/battle/TurnManager';
import { BATTLE_INTERACTION_SYSTEM, BATTLE_PERSISTENT_SYSTEM, BATTLE_DIALOGUE_SYSTEM } from '@/core/di/injection-keys';
import { systemRegistry } from '@/core/di/registry';
import type { Deck } from '@/types/store';

import DeckSelector from '@/components/battle/ui/DeckSelector.vue';
import PlayerField from '@/components/battle/arena/PlayerField.vue';
import ClashZone from '@/components/battle/arena/ClashZone.vue';
import TopicBiasBar from '@/components/battle/arena/TopicBiasBar.vue';
import EndTurnButton from '@/components/battle/ui/EndTurnButton.vue';
import NotificationDisplay from '@/components/battle/ui/NotificationDisplay.vue';
import BattleLog from '@/components/battle/ui/BattleLog.vue';
import InteractionManager from '@/components/battle/InteractionManager.vue';
import BattleDialogueManager from '@/components/battle/BattleDialogueManager.vue';
import BattleRulesModal from '@/components/battle/ui/BattleRulesModal.vue';
import PassiveSkillPanel from '@/components/battle/ui/PassiveSkillPanel.vue';
import { createBattleController } from '@/core/battle/BattleController';
import PerformanceMonitor from '@/components/debug/PerformanceMonitor.vue';
import BattleDebugPanel from '@/components/debug/BattleDebugPanel.vue';
import { battleDebugLogger } from '@/core/debug/BattleDebugLogger';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

// Systems
import { InteractionSystem } from '@/core/systems/InteractionSystem';
import { PersistentEffectSystem } from '@/core/systems/PersistentEffectSystem';
import { DialogueSystem } from '@/core/systems/DialogueSystem';

// 开发环境下导入测试工具
if (import.meta.env.DEV) {
  import('@/utils/testRandomAI');
}

type BattlePhase = 'deckSelection' | 'battle';

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const battlePhase = ref<BattlePhase>('deckSelection');
const interactionManager = ref<InstanceType<typeof InteractionManager> | null>(null);

const isDev = import.meta.env.DEV;
const showRulesModal = ref(false);
const showGameOverModal = ref(false);

const gameResult = ref<{
  winner: 'playerA' | 'playerB' | 'draw';
  reason: string;
  details?: string;
}>({
  winner: 'draw',
  reason: '',
  details: ''
});

// 计算胜利信息
const victoryInfo = computed(() => {
  if (!gameStore.isGameOver) return null;
  const playerA = playerStore.playerA;
  const playerB = playerStore.playerB;
  
  if (playerA.reputation <= 0) return { winner: 'playerB', reason: 'REPUTATION DEPLETED', details: `${playerA.name}'s influence dropped to zero.` };
  if (playerB.reputation <= 0) return { winner: 'playerA', reason: 'REPUTATION DEPLETED', details: `${playerB.name}'s influence dropped to zero.` };
  if (gameStore.topicBias >= 10) return { winner: 'playerA', reason: 'CONCEPTUAL MASTERY', details: `${playerA.name} completely dominated the narrative.` };
  if (gameStore.topicBias <= -10) return { winner: 'playerB', reason: 'CONCEPTUAL MASTERY', details: `${playerB.name} completely dominated the narrative.` };
  if (gameStore.turn >= 12) {
    if (playerA.reputation > playerB.reputation) return { winner: 'playerA', reason: 'TACTICAL VICTORY', details: `Superior tactical score achieved.` };
    if (playerB.reputation > playerA.reputation) return { winner: 'playerB', reason: 'TACTICAL VICTORY', details: `Superior tactical score achieved.` };
    return { winner: 'draw', reason: 'STALEMATE', details: 'No strategic breakthrough achieved.' };
  }
  return null;
});

const interactionSystem = new InteractionSystem();
const persistentSystem = new PersistentEffectSystem();
const dialogueSystem = new DialogueSystem();

provide(BATTLE_INTERACTION_SYSTEM, interactionSystem);
provide(BATTLE_PERSISTENT_SYSTEM, persistentSystem);
provide(BATTLE_DIALOGUE_SYSTEM, dialogueSystem);

const battleController = createBattleController(dialogueSystem);

onMounted(() => {
  systemRegistry.registerSystems({
    interaction: interactionSystem,
    persistent: persistentSystem,
    dialogue: dialogueSystem
  });

  if (gameStore.phase !== 'setup' && gameStore.phase !== 'game_over') {
    battlePhase.value = 'battle';
  }

  nextTick(() => {
    if (interactionManager.value) {
      interactionSystem.setInteractionManager(interactionManager.value);
    }
  });
});

watch(() => gameStore.isGameOver, (isGameOver) => {
  if (isGameOver && victoryInfo.value) {
    setTimeout(() => {
      gameResult.value = {
        winner: victoryInfo.value!.winner as 'playerA' | 'playerB' | 'draw',
        reason: victoryInfo.value!.reason,
        details: victoryInfo.value!.details || ''
      };
      showGameOverModal.value = true;
    }, 1500);
  }
}, { immediate: true });

onBeforeUnmount(() => {
  interactionSystem.cleanup();
  persistentSystem.cleanup();
  dialogueSystem.cleanup();
  battleDebugLogger.cleanup();
  systemRegistry.clear();
});

async function handleDeckSelected(deck: Deck, aiProfileId?: string) {
  try {
    await TurnManager.initializeGameWithDeck(deck, aiProfileId);
    battlePhase.value = 'battle';
    battleDebugLogger.startSession(deck.name, 'AI Deck', aiProfileId);
  } catch (error) {
    console.error('BATTLE_INIT_ERROR:', error);
  }
}

async function handleRandomDeck(aiProfileId?: string) {
  try {
    await TurnManager.initializeRandomGame(aiProfileId);
    battlePhase.value = 'battle';
    battleDebugLogger.startSession('Random Deck', 'AI Random Deck', aiProfileId);
  } catch (error) {
    console.error('BATTLE_INIT_ERROR:', error);
  }
}

function handleSkipTurn() {
  battleController.skipTurn();
}

function handleExitBattle() {
  if (confirm('CONFIRM EXIT? Strategy progress will be purged.')) {
    gameStore.resetGame();
    playerStore.clearPlayers();
    battlePhase.value = 'deckSelection';
  }
}

function handleGameOver() {
  showGameOverModal.value = false;
  gameStore.resetGame();
  playerStore.clearPlayers();
  battlePhase.value = 'deckSelection';
}

function restartBattle() {
  showGameOverModal.value = false;
  gameStore.resetGame();
  playerStore.clearPlayers();
  battlePhase.value = 'deckSelection';
}
</script>

<template>
  <div class="battle-view font-ui">
    <NotificationDisplay />
    <InteractionManager ref="interactionManager" />
    <BattleDialogueManager v-if="battlePhase === 'battle'" />
    <BattleRulesModal :show="showRulesModal" @close="showRulesModal = false" />
    
    <!-- Game Over Overlay -->
    <div v-if="showGameOverModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-black/80 backdrop-blur-xl"></div>
      <GlassPanel class="max-w-md w-full text-center border-gold/40">
        <template #header>
          <div class="text-6xl mb-4 grayscale hover:grayscale-0 transition-all duration-500">
            <span v-if="gameResult.winner === 'playerA'">🏆</span>
            <span v-else-if="gameResult.winner === 'playerB'">💀</span>
            <span v-else>⚖️</span>
          </div>
          <h2 class="text-4xl font-display font-bold mb-2 tracking-tighter uppercase" :class="gameResult.winner === 'playerA' ? 'text-gold' : 'text-industrial-200'">
            {{ gameResult.winner === 'playerA' ? 'SYSTEM VICTOR' : (gameResult.winner === 'playerB' ? 'DEFEAT' : 'STALEMATE') }}
          </h2>
        </template>
        <div class="mt-4">
          <h3 class="text-xs font-display text-gold/60 mb-4 tracking-[0.3em] uppercase">{{ gameResult.reason }}</h3>
          <p class="text-sm text-industrial-400 mb-8 border-l-2 border-white/5 pl-4 py-1 italic">{{ gameResult.details }}</p>
        </div>
        <template #footer>
          <div class="flex gap-4 justify-center">
            <TacticalButton variant="primary" @click="restartBattle">RE-INITIALIZE</TacticalButton>
            <TacticalButton variant="secondary" @click="handleGameOver">TERMINATE</TacticalButton>
          </div>
        </template>
      </GlassPanel>
    </div>
    
    <!-- Phase 1: Deck Selection -->
    <div v-if="battlePhase === 'deckSelection'" class="h-screen flex items-center justify-center">
      <GlassPanel class="max-w-4xl w-full mx-4">
        <template #header>
          <h2 class="text-sm font-display font-bold tracking-[0.4em] uppercase text-gold/80 mb-6">Strategy Module Selection</h2>
        </template>
        <DeckSelector @deckSelected="handleDeckSelected" @randomDeck="handleRandomDeck" />
      </GlassPanel>
    </div>

    <!-- Phase 2: Battle -->
    <div v-else class="battle-arena h-screen flex flex-col p-4 overflow-hidden relative">
      <!-- Opponent Overlay Header -->
      <div class="field-opponent relative z-10 flex-shrink-0">
        <PlayerField playerId="playerB" isOpponent />
      </div>

      <!-- Center Strategic Area -->
      <div class="flex-grow flex items-stretch justify-between gap-6 py-4 overflow-hidden">
        <!-- Strategic Log -->
        <GlassPanel :reveal="false" class="w-64 flex-shrink-0 flex flex-col p-0 border-white/5">
           <template #header>
             <div class="px-4 py-2 border-b border-white/5 bg-white/5">
               <span class="text-[9px] font-display font-bold text-gold/60 tracking-widest uppercase">Signal Log</span>
             </div>
           </template>
           <BattleLog class="flex-grow scrollbar-none" />
        </GlassPanel>

        <!-- Main Narrative Dashboard -->
        <div class="flex-grow flex flex-col gap-6">
           <GlassPanel :reveal="false" class="p-4 bg-gold/[0.02]">
             <TopicBiasBar class="topic-bias-bar-horizontal-container" />
           </GlassPanel>
           
           <div class="clash-zone-wrapper flex-grow relative">
             <ClashZone />
           </div>
        </div>

        <!-- Tactical Command Sidebar -->
        <div class="w-[320px] flex-shrink-0 flex flex-col gap-6">
           <GlassPanel :reveal="false" class="flex-shrink-0">
             <template #header>
               <span class="text-[9px] font-display font-bold text-gold/60 tracking-widest uppercase mb-4 block">Passive Mods</span>
             </template>
             <div class="flex flex-col gap-4">
                <PassiveSkillPanel playerId="playerB" isOpponent />
                <div class="h-px bg-white/5"></div>
                <PassiveSkillPanel playerId="playerA" />
             </div>
           </GlassPanel>

           <GlassPanel :reveal="false" class="flex-grow flex flex-col justify-center items-center gap-4 bg-white/5">
              <template #header>
                <span class="text-[9px] font-display font-bold text-gold/60 tracking-widest uppercase mb-4 block">Command Console</span>
              </template>
              <div class="flex flex-col gap-4 w-full px-6">
                 <EndTurnButton />
                 <TacticalButton 
                   v-if="gameStore.phase === 'defense' && gameStore.activePlayer === 'playerB'"
                   variant="secondary"
                   @click="handleSkipTurn"
                   class="w-full"
                 >
                   Skip Protocol
                 </TacticalButton>
                 
                 <div class="grid grid-cols-2 gap-3 w-full">
                    <TacticalButton variant="secondary" size="sm" @click="showRulesModal = true">GUIDE</TacticalButton>
                    <TacticalButton variant="danger" size="sm" @click="handleExitBattle">ABORT</TacticalButton>
                 </div>
              </div>
           </GlassPanel>
        </div>
      </div>

      <!-- User Command Deck -->
      <div class="field-player relative z-10 flex-shrink-0">
        <PlayerField playerId="playerA" />
      </div>
    </div>

    <!-- Dev Utilities -->
    <PerformanceMonitor v-if="isDev" />
    <BattleDebugPanel v-if="isDev" />
  </div>
</template>

<style scoped>
.battle-view {
  @apply text-industrial-100 min-h-screen w-full h-full overflow-hidden;
}

.battle-arena {
  /* Environment is handled globally, but we add a vignette here */
  background: radial-gradient(circle at center, transparent 0%, rgba(0,0,0,0.4) 100%);
}

.clash-zone-wrapper {
  perspective: 1000px;
}

/* Custom scrollbar for tactical log */
.scrollbar-none::-webkit-scrollbar {
  display: none;
}
.scrollbar-none {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
