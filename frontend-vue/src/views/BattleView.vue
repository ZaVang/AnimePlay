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
import InteractionManager from '@/components/battle/InteractionManager.vue';
import BattleDialogueManager from '@/components/battle/BattleDialogueManager.vue';
import BattleRulesModal from '@/components/battle/ui/BattleRulesModal.vue';
import { BattleController } from '@/core/battle/BattleController';

// 开发环境下导入测试工具
if (import.meta.env.DEV) {
  import('@/utils/testRandomAI');
}

type BattlePhase = 'deckSelection' | 'battle';

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const battlePhase = ref<BattlePhase>('deckSelection');
const interactionManager = ref<InstanceType<typeof InteractionManager> | null>(null);

// 战斗规则弹窗
const showRulesModal = ref(false);

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
  console.log('🎮 尝试开始战斗，使用卡组:', deck.name, 'AI:', aiProfileId);
  try {
    TurnManager.initializeGameWithDeck(deck, aiProfileId);
    battlePhase.value = 'battle';
    console.log('✅ 战斗初始化成功');
  } catch (error) {
    console.error('❌ 战斗初始化失败:', error);
  }
}

function handleRandomDeck(aiProfileId?: string) {
  console.log('🎲 尝试开始随机战斗，AI:', aiProfileId);
  try {
    TurnManager.initializeRandomGame(aiProfileId);
    battlePhase.value = 'battle';
    console.log('✅ 随机战斗初始化成功');
  } catch (error) {
    console.error('❌ 随机战斗初始化失败:', error);
  }
}

function handleSkipTurn() {
  BattleController.skipTurn();
}

function handleExitBattle() {
  console.log('🚪 退出战斗按钮被点击');
  try {
    // 确认退出对话框
    if (confirm('确定要退出当前战斗吗？进度将不会保存。')) {
      console.log('✅ 用户确认退出，开始清理战斗状态');
      
      // 清理战斗状态
      gameStore.resetGame();
      playerStore.clearPlayers();
      
      // 清理持久化效果系统
      PersistentEffectSystem.getInstance().clearAll();
      
      // 返回卡组选择界面
      battlePhase.value = 'deckSelection';
      
      console.log('✅ 战斗退出成功，已返回卡组选择界面');
    } else {
      console.log('❌ 用户取消退出');
    }
  } catch (error) {
    console.error('❌ 退出战斗失败:', error);
  }
}
</script>

<template>
  <div class="battle-view">
    <NotificationDisplay />
    
    <!-- Interaction Manager for complex skill effects -->
    <InteractionManager ref="interactionManager" />
    
    <!-- Battle Dialogue Manager for speech bubbles and action effects -->
    <BattleDialogueManager v-if="battlePhase === 'battle'" />
    
    <!-- Battle Rules Modal -->
    <BattleRulesModal 
      :show="showRulesModal" 
      @close="showRulesModal = false"
    />
    
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
                class="battle-action-btn bg-yellow-600 hover:bg-yellow-700"
                title="跳过当前防御阶段"
            >
                跳过防御
            </button>
            <button
                @click="showRulesModal = true"
                class="battle-action-btn bg-blue-600 hover:bg-blue-700"
                title="查看战斗规则详解"
            >
                📋 规则
            </button>
            <button
                @click="handleExitBattle"
                class="battle-action-btn bg-red-600 hover:bg-red-700"
                title="退出当前战斗，进度将不会保存"
            >
                退出战斗
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
    @apply flex flex-col space-y-3 justify-center items-center;
    flex: 0 1 250px; /* Do not grow, shrink if needed, initial width 250px */
}

/* 统一战斗操作按钮样式 */
.battle-action-btn {
    @apply px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200 min-w-[120px] text-center;
}

.battle-action-btn:hover {
    @apply shadow-lg transform scale-105;
}

.battle-action-btn:active {
    @apply transform scale-95;
}
</style>
