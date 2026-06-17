<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { BattleSetup } from '@/stores/battleSetup';
import { BattleFlow } from '@/stores/battleFlow';
import { InteractionSystem } from '@/skills/interaction';
import { clearBattleSkillState } from '@/skills/systems';
import { VICTORY_REASON_TEXT } from '@/engine';
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


type BattlePhase = 'deckSelection' | 'battle';

const router = useRouter();
const gameStore = useGameStore();
const playerStore = usePlayerStore();
const battlePhase = ref<BattlePhase>('deckSelection');
const interactionManager = ref<InstanceType<typeof InteractionManager> | null>(null);

// --- S6: 整场结算面板 ---
const resultTitle = computed(() => {
  if (gameStore.winner === 'draw') return '平局';
  return gameStore.winner === 'playerA' ? '🎉 胜利！' : '💀 败北';
});
const resultReason = computed(() =>
  gameStore.victoryReason ? VICTORY_REASON_TEXT[gameStore.victoryReason] : '',
);

function cleanupBattleState() {
  gameStore.resetGame();
  playerStore.clearPlayers();
  clearBattleSkillState();
}

function handlePlayAgain() {
  cleanupBattleState();
  battlePhase.value = 'deckSelection';
}

function handleGoHome() {
  cleanupBattleState();
  router.push('/');
}

// 战斗规则弹窗
const showRulesModal = ref(false);

// Check game state when component is mounted
onMounted(() => {
  // If a game is in progress (i.e., not in setup or game over phase), go directly to the battle screen.
  if (gameStore.phase !== 'setup' && gameStore.phase !== 'game_over') {
    battlePhase.value = 'battle';
  }

  // 首次进入宅理论战自动弹一次规则详解（设备级标志，不进存档）——提升唯一教学入口的触达率
  try {
    if (!localStorage.getItem('battle-rules-seen')) {
      showRulesModal.value = true;
      localStorage.setItem('battle-rules-seen', '1');
    }
  } catch { /* localStorage 不可用时静默跳过 */ }

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
  clearBattleSkillState();
});

function handleDeckSelected(deck: Deck, aiProfileId?: string) {
  try {
    BattleSetup.initializeGameWithDeck(deck, aiProfileId);
    battlePhase.value = 'battle';
  } catch (error) {
    console.error('❌ 战斗初始化失败:', error);
  }
}

function handleRandomDeck(aiProfileId?: string) {
  try {
    BattleSetup.initializeRandomGame(aiProfileId);
    battlePhase.value = 'battle';
  } catch (error) {
    console.error('❌ 随机战斗初始化失败:', error);
  }
}

function handleSkipTurn() {
  BattleFlow.skipTurn();
}

function handleExitBattle() {
  try {
    // 确认退出对话框
    if (confirm('确定要退出当前战斗吗？进度将不会保存。')) {
      
      // 清理战斗状态
      gameStore.resetGame();
      playerStore.clearPlayers();
      
      // 清理持久化效果系统
      clearBattleSkillState();
      
      // 返回卡组选择界面
      battlePhase.value = 'deckSelection';
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
                class="battle-action-btn bg-warning text-white hover:opacity-90"
                title="跳过当前防御阶段"
            >
                跳过防御
            </button>
            <button
                @click="showRulesModal = true"
                class="battle-action-btn bg-info text-white hover:opacity-90"
                title="查看战斗规则详解"
            >
                📋 规则
            </button>
            <button
                @click="handleExitBattle"
                class="battle-action-btn bg-danger text-white hover:opacity-90"
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

      <!-- S6: 整场结算面板 -->
      <div v-if="gameStore.isGameOver" class="battle-result-overlay">
        <div class="battle-result-card">
          <h2 class="result-title">{{ resultTitle }}</h2>
          <p class="result-reason">{{ resultReason }}</p>
          <div v-if="gameStore.lastMatchRewards" class="result-rewards">
            <span class="reward-chip">+{{ gameStore.lastMatchRewards.exp }} 经验</span>
            <span class="reward-chip">+{{ gameStore.lastMatchRewards.knowledge }} 知识点</span>
          </div>
          <div class="result-actions">
            <button class="battle-action-btn bg-accent text-on-accent hover:opacity-90" @click="handlePlayAgain">再来一局</button>
            <button class="battle-action-btn bg-surface-2 text-ink hover:opacity-90" @click="handleGoHome">返回主页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-view {
  @apply text-ink min-h-screen w-full h-full overflow-hidden;
}
.deck-selector-wrapper {
  @apply w-full h-full flex items-center justify-center;
}
.battle-arena {
  @apply h-full flex flex-col relative;
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
    @apply h-full bg-surface/50 rounded-lg p-2 overflow-hidden border border-line relative; /* Add relative positioning */
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
    @apply h-full min-h-[18rem] bg-surface/50 rounded-lg p-2 overflow-hidden border border-line;
    flex: 1 1 auto; /* Grow to fill available space */
}

.action-buttons {
    @apply flex flex-col space-y-3 justify-center items-center;
    flex: 0 1 250px; /* Do not grow, shrink if needed, initial width 250px */
}

/* 统一战斗操作按钮样式 */
.battle-action-btn {
    @apply px-6 py-3 rounded-lg font-semibold transition-all duration-200 min-w-[120px] text-center;
}

/* S6: 整场结算面板 */
.battle-result-overlay {
  @apply absolute inset-0 z-50 flex items-center justify-center;
  background: rgba(0, 0, 0, 0.55);
}
.battle-result-card {
  @apply rounded-2xl px-10 py-8 text-center shadow-2xl;
  background: rgb(var(--c-elevated));
  color: rgb(var(--c-ink));
  min-width: 320px;
}
.result-title {
  @apply text-3xl font-bold mb-2;
}
.result-reason {
  @apply text-sm mb-4 opacity-80;
}
.result-rewards {
  @apply flex justify-center gap-3 mb-6;
}
.reward-chip {
  @apply px-3 py-1 rounded-full text-sm font-semibold;
  background: rgb(var(--c-highlight));
  color: #fff;
}
.result-actions {
  @apply flex justify-center gap-4;
}

.battle-action-btn:hover {
    @apply shadow-lg transform scale-105;
}

.battle-action-btn:active {
    @apply transform scale-95;
}
</style>
