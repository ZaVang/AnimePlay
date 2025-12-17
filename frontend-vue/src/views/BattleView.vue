<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, provide, watch, computed } from 'vue';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import { TurnManager } from '@/core/battle/TurnManager';
import { InteractionSystem } from '@/core/systems/InteractionSystem';
import { PersistentEffectSystem } from '@/core/systems/PersistentEffectSystem';
import { DialogueSystem } from '@/core/systems/DialogueSystem';
import { BATTLE_INTERACTION_SYSTEM, BATTLE_PERSISTENT_SYSTEM, BATTLE_DIALOGUE_SYSTEM } from '@/core/di/injection-keys';
import { systemRegistry } from '@/core/di/registry';
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
import PassiveSkillPanel from '@/components/battle/ui/PassiveSkillPanel.vue';
import { createBattleController } from '@/core/battle/BattleController';
import PerformanceMonitor from '@/components/debug/PerformanceMonitor.vue';
import BattleDebugPanel from '@/components/debug/BattleDebugPanel.vue';
import { battleDebugLogger } from '@/core/debug/BattleDebugLogger';

// 开发环境下导入测试工具
if (import.meta.env.DEV) {
  import('@/utils/testRandomAI');
}

type BattlePhase = 'deckSelection' | 'battle';

const gameStore = useGameStore();
const playerStore = usePlayerStore();
const battlePhase = ref<BattlePhase>('deckSelection');
const interactionManager = ref<InstanceType<typeof InteractionManager> | null>(null);

// 开发环境标记
const isDev = import.meta.env.DEV;

// 战斗规则弹窗
const showRulesModal = ref(false);

// 游戏结束相关状态
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
  
  // 根据声望和话题偏向判断胜利原因
  if (playerA.reputation <= 0) {
    return { winner: 'playerB', reason: '声望归零', details: `${playerA.name}的声望降至0，败北！` };
  } else if (playerB.reputation <= 0) {
    return { winner: 'playerA', reason: '声望归零', details: `${playerB.name}的声望降至0，败北！` };
  } else if (gameStore.topicBias >= 10) {
    return { winner: 'playerA', reason: '议题掌控', details: `${playerA.name}完全掌控了辩论议题！` };
  } else if (gameStore.topicBias <= -10) {
    return { winner: 'playerB', reason: '议题掌控', details: `${playerB.name}完全掌控了辩论议题！` };
  } else if (gameStore.turn >= 12) {
    // 12回合后的判定
    if (playerA.reputation > playerB.reputation) {
      return { winner: 'playerA', reason: '声望胜利', details: `经过激烈的辩论，${playerA.name}以更高的声望获胜！` };
    } else if (playerB.reputation > playerA.reputation) {
      return { winner: 'playerB', reason: '声望胜利', details: `经过激烈的辩论，${playerB.name}以更高的声望获胜！` };
    } else {
      return { winner: 'draw', reason: '平局', details: '双方势均力敌，以平局结束！' };
    }
  }
  
  return null;
});

// 创建系统实例并通过依赖注入提供
const interactionSystem = new InteractionSystem();
const persistentSystem = new PersistentEffectSystem();
const dialogueSystem = new DialogueSystem();

// 提供系统实例给子组件
provide(BATTLE_INTERACTION_SYSTEM, interactionSystem);
provide(BATTLE_PERSISTENT_SYSTEM, persistentSystem);
provide(BATTLE_DIALOGUE_SYSTEM, dialogueSystem);

// 创建BattleController实例
const battleController = createBattleController(dialogueSystem);

// Check game state when component is mounted
onMounted(() => {
  // 注册系统实例到全局注册表（向后兼容）
  systemRegistry.registerSystems({
    interaction: interactionSystem,
    persistent: persistentSystem,
    dialogue: dialogueSystem
  });

  // If a game is in progress (i.e., not in setup or game over phase), go directly to the battle screen.
  if (gameStore.phase !== 'setup' && gameStore.phase !== 'game_over') {
    battlePhase.value = 'battle';
  }

  // Set up interaction system (use nextTick to ensure component is mounted)
  nextTick(() => {
    if (interactionManager.value) {
      interactionSystem.setInteractionManager(interactionManager.value);
    }
  });
});

// 监听游戏结束状态
watch(() => gameStore.isGameOver, (isGameOver) => {
  if (isGameOver && victoryInfo.value) {
    // 延迟显示结果模态框，让最后的动画完成
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
  // Clean up all systems when leaving battle
  interactionSystem.cleanup();
  persistentSystem.cleanup();
  dialogueSystem.cleanup();

  // 清理调试日志
  battleDebugLogger.cleanup();

  // 清理全局注册表
  systemRegistry.clear();
});

async function handleDeckSelected(deck: Deck, aiProfileId?: string) {
  console.log('🎮 尝试开始战斗，使用卡组:', deck.name, 'AI:', aiProfileId);
  try {
    await TurnManager.initializeGameWithDeck(deck, aiProfileId);
    battlePhase.value = 'battle';

    // 初始化调试日志
    battleDebugLogger.startSession(deck.name, 'AI Deck', aiProfileId);

    console.log('✅ 战斗初始化成功');
  } catch (error) {
    console.error('❌ 战斗初始化失败:', error);
  }
}

async function handleRandomDeck(aiProfileId?: string) {
  console.log('🎲 尝试开始随机战斗，AI:', aiProfileId);
  try {
    await TurnManager.initializeRandomGame(aiProfileId);
    battlePhase.value = 'battle';

    // 初始化调试日志
    battleDebugLogger.startSession('Random Deck', 'AI Random Deck', aiProfileId);

    console.log('✅ 随机战斗初始化成功');
  } catch (error) {
    console.error('❌ 随机战斗初始化失败:', error);
  }
}

function handleSkipTurn() {
  battleController.skipTurn();
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
      try {
        systemRegistry.getPersistentEffectSystem().clearAll();
      } catch (error) {
        console.warn('PersistentEffectSystem not available during exit:', error);
      }
      
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

function handleGameOver() {
  console.log('🏁 游戏结束，结果:', gameResult.value);
  showGameOverModal.value = false;
  
  // 重置游戏状态并返回卡组选择
  gameStore.resetGame();
  playerStore.clearPlayers();
  battlePhase.value = 'deckSelection';
}

function restartBattle() {
  console.log('🔄 重新开始战斗');
  showGameOverModal.value = false;
  
  // 重置游戏状态并返回卡组选择
  gameStore.resetGame();
  playerStore.clearPlayers();
  battlePhase.value = 'deckSelection';
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
    
    <!-- Game Over Modal -->
    <div 
      v-if="showGameOverModal" 
      class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
      @click.self="handleGameOver"
    >
      <div class="bg-gray-800 text-white p-8 rounded-2xl border-2 border-gray-600 max-w-md w-full mx-4 shadow-2xl">
        <div class="text-center">
          <!-- Victory Icon -->
          <div class="text-6xl mb-4">
            <span v-if="gameResult.winner === 'playerA'">🏆</span>
            <span v-else-if="gameResult.winner === 'playerB'">😔</span>
            <span v-else>🤝</span>
          </div>
          
          <!-- Victory Title -->
          <h2 class="text-3xl font-bold mb-2">
            <span v-if="gameResult.winner === 'playerA'" class="text-green-400">胜利！</span>
            <span v-else-if="gameResult.winner === 'playerB'" class="text-red-400">失败</span>
            <span v-else class="text-yellow-400">平局</span>
          </h2>
          
          <!-- Victory Reason -->
          <h3 class="text-xl font-semibold text-gray-300 mb-4">{{ gameResult.reason }}</h3>
          
          <!-- Victory Details -->
          <p class="text-gray-400 mb-6">{{ gameResult.details }}</p>
          
          <!-- Action Buttons -->
          <div class="flex gap-4 justify-center">
            <button 
              @click="restartBattle"
              class="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-all duration-200"
            >
              再次挑战
            </button>
            <button 
              @click="handleGameOver"
              class="px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-semibold transition-all duration-200"
            >
              返回选择
            </button>
          </div>
        </div>
      </div>
    </div>
    
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

        <!-- Right: Action Buttons and Passive Skills -->
        <div class="right-sidebar">
            <!-- 被动技能面板 -->
            <div class="passive-skills-section">
                <PassiveSkillPanel playerId="playerB" isOpponent />
                <PassiveSkillPanel playerId="playerA" />
            </div>

            <!-- 操作按钮 -->
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
      </div>

      <!-- Player's Field -->
      <div class="field-player">
        <PlayerField playerId="playerA" />
      </div>
    </div>

    <!-- 性能监控器 (仅在开发环境中显示) -->
    <PerformanceMonitor v-if="isDev" />

    <!-- 战斗调试面板 (仅在开发环境中显示) -->
    <BattleDebugPanel v-if="isDev" />
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

.right-sidebar {
    @apply flex flex-col gap-4;
    flex: 0 1 300px; /* Do not grow, shrink if needed, initial width 300px */
}

.passive-skills-section {
    @apply flex flex-col gap-2;
}

.action-buttons {
    @apply flex flex-col space-y-3 justify-center items-center;
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
