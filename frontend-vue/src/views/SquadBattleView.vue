<script setup lang="ts">
/**
 * Squad Battle View
 * MIGRATED: Now uses modular stores (authStore, nurtureStore)
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useAuthStore } from '@/stores/modules/authStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useBattleState } from '@/composables/useBattleState';
import { useSquadManager } from '@/composables/useSquadManager';
import { useBattlePersistence } from '@/composables/useBattlePersistence';
import { useTowerBattle } from '@/composables/useTowerBattle';
import CharacterSelectModal from '@/components/battle/CharacterSelectModal.vue';
import SquadCard from '@/components/battle/SquadCard.vue';
import BattleArena from '@/components/battle/BattleArena.vue';
import BattleResult from '@/components/battle/BattleResult.vue';
import type { CharacterCard } from '@/types/card';

const authStore = useAuthStore();
const nurtureStore = useNurtureStore();
const gameDataStore = useGameDataStore();

// Composables
const battleState = useBattleState();
const squadManager = useSquadManager();
const towerBattle = useTowerBattle(
  battleState.playerSquad,
  battleState.enemySquad,
  battleState.currentPhase,
  battleState.battleLog,
  battleState.currentTurn,
  battleState.isPlayerTurn,
  battleState.battleResult,
  battleState.selectedSquadForBattle,
  battleState.currentBattleMode,
  battleState.towerEnemyData,
  squadManager.createSquadMember
);
const persistence = useBattlePersistence(
  battleState.currentPhase,
  battleState.towerEnemyData
);

// 角色选择弹窗状态
const showCharacterSelectModal = ref(false);
const selectedPosition = ref(0);
const editingSquadId = ref<number | null>(null);

// Handlers
function openCharacterSelect(squadId: number, position: number) {
  editingSquadId.value = squadId;
  selectedPosition.value = position;
  showCharacterSelectModal.value = true;
}

function handleCharacterSelect(characterId: number, position: number) {
  if (editingSquadId.value !== null) {
    nurtureStore.updateSquadMember(editingSquadId.value, position, characterId);
  }
}

function handleCharacterRemove(position: number) {
  if (editingSquadId.value !== null) {
    nurtureStore.updateSquadMember(editingSquadId.value, position, null);
  }
}

function updateSquadName(squadId: number, newName: string) {
  nurtureStore.updateSquadName(squadId, newName);
}

function handleStartBattle(squadId: number) {
  towerBattle.startTowerBattle(squadId);
  persistence.saveState();
}

function handleRestart() {
  battleState.returnToTowerMode();
  persistence.saveState();
}

function handleRetryBattle(squadId: number) {
  towerBattle.startTowerBattle(squadId);
}

// Lifecycle
onMounted(() => {
  console.log('[DEBUG] Component mounted, loading state...');
  persistence.loadState();
});

onBeforeUnmount(() => {
  console.log('[DEBUG] Component unmounting, saving state...');
  persistence.saveState();
});
</script>

<template>
  <div class="min-h-screen bg-gray-900 py-8">
    <div class="container mx-auto px-4">
      
      <!-- 页面标题 -->
      <div class="text-center mb-8">
        <h1 class="text-4xl font-bold text-white mb-2">挑战塔</h1>
        <p class="text-gray-400">逐层挑战，难度递增，证明你的实力！</p>
      </div>
      
      <!-- 未登录状态 -->
      <div v-if="!authStore.isLoggedIn" class="text-center py-20">
        <h2 class="text-2xl font-bold text-gray-300 mb-4">请先登录</h2>
        <p class="text-gray-500">登录后即可参与爬塔挑战</p>
      </div>

      <!-- 爬塔模式界面 -->
      <div v-else-if="(battleState.currentPhase as any) === 'towerMode'" class="space-y-6">

        <!-- 爬塔信息面板 -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div class="grid md:grid-cols-3 gap-6">
            <!-- 当前进度 -->
            <div class="text-center">
              <h3 class="text-lg font-bold text-white mb-2">当前进度</h3>
              <div class="text-3xl font-bold text-green-400 mb-2">第 {{ towerBattle.currentTowerFloor }} 层</div>
              <div class="text-sm text-gray-400">历史最高：{{ nurtureStore.towerProgress.maxFloor }} 层</div>
            </div>

            <!-- 层数状态 -->
            <div class="text-center">
              <h3 class="text-lg font-bold text-white mb-2">层数状态</h3>
              <div class="text-2xl font-bold text-blue-400 mb-2">
                {{ nurtureStore.hasCompletedFloor(towerBattle.currentTowerFloor.value) ? '已通过' : '未挑战' }}
              </div>
              <div class="text-sm text-gray-400">每层只能挑战一次，无次数限制</div>
            </div>

            <!-- 当前敌人信息 -->
            <div class="text-center">
              <h3 class="text-lg font-bold text-white mb-2">当前层敌人</h3>
              <div v-if="!battleState.towerEnemyData.value" class="space-y-2">
                <button
                  @click="towerBattle.refreshTowerEnemies"
                  class="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                >
                  刷新敌人
                </button>
              </div>
              <div v-else class="space-y-2">
                <div class="font-bold text-red-400">{{ battleState.towerEnemyData.value.name }}</div>
                <div class="text-sm text-gray-400">{{ battleState.towerEnemyData.value.description }}</div>
                <div class="text-lg font-bold text-yellow-400">
                  战力: {{ battleState.towerEnemyData.value.floorPower }}
                </div>
                <div class="text-sm mb-2">
                  <span class="px-2 py-1 rounded text-xs font-bold"
                        :class="{
                          'bg-green-500 text-white': battleState.towerEnemyData.value.difficulty === '简单',
                          'bg-yellow-500 text-black': battleState.towerEnemyData.value.difficulty === '中等',
                          'bg-red-500 text-white': battleState.towerEnemyData.value.difficulty === '困难',
                          'bg-purple-500 text-white': battleState.towerEnemyData.value.difficulty === '极难'
                        }">
                    {{ battleState.towerEnemyData.value.difficulty }}
                  </span>
                </div>
                <button
                  @click="towerBattle.refreshTowerEnemies"
                  class="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-sm rounded transition-colors"
                >
                  重新刷新
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 选择挑战小队 -->
        <div class="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 class="text-xl font-bold text-white mb-4">选择挑战小队</h3>

          <div class="grid md:grid-cols-3 gap-6">
            <SquadCard
              v-for="squad in nurtureStore.presetSquads"
              :key="squad.id"
              :squad="squad"
              :current-tower-floor="towerBattle.currentTowerFloor.value"
              :has-completed-floor="nurtureStore.hasCompletedFloor(towerBattle.currentTowerFloor.value)"
              :tower-enemy-data="battleState.towerEnemyData.value"
              @start-battle="handleStartBattle"
              @open-character-select="openCharacterSelect"
              @update-name="updateSquadName"
            />
          </div>
        </div>

        <!-- 爬塔说明 -->
        <div class="bg-blue-900/20 border border-blue-500 rounded-lg p-4">
          <div class="flex items-start space-x-3">
            <div class="text-blue-400 text-xl">🏗️</div>
            <div>
              <h3 class="text-blue-400 font-bold mb-2">爬塔规则</h3>
              <ul class="text-sm text-gray-300 space-y-1">
                <li>• 每层敌人战力和稀有度都会递增</li>
                <li>• 胜利可获得大量经验和知识点奖励</li>
                <li>• 每日最多挑战10次</li>
                <li>• 通过当前层后解锁下一层</li>
                <li>• 每5层难度显著提升</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 战斗阶段 -->
      <BattleArena
        v-else-if="(battleState.currentPhase as any) === 'battle'"
        :player-squad="battleState.playerSquad.value"
        :enemy-squad="battleState.enemySquad.value"
        :battle-log="battleState.battleLog.value"
        :current-turn="battleState.currentTurn.value"
        :is-player-turn="battleState.isPlayerTurn.value"
        @execute-round="towerBattle.executeRound"
        @auto-finish="towerBattle.autoFinishBattle"
      />

      <!-- 结果阶段 -->
      <BattleResult
        v-else-if="(battleState.currentPhase as any) === 'result'"
        :battle-result="battleState.battleResult.value"
        :battle-log="battleState.battleLog.value"
        :selected-squad-for-battle="battleState.selectedSquadForBattle.value || 0"
        @restart="handleRestart"
        @retry-battle="handleRetryBattle"
      />
      
    </div>
    
    <!-- 角色选择弹窗 -->
    <CharacterSelectModal
      :is-open="showCharacterSelectModal"
      :position="selectedPosition"
      :current-character-id="editingSquadId ? (nurtureStore.getSquadMembers(editingSquadId)[selectedPosition] || undefined) : undefined"
      :used-character-ids="editingSquadId ? squadManager.getUsedCharacterIds(editingSquadId, selectedPosition) : []"
      @close="showCharacterSelectModal = false"
      @select="handleCharacterSelect"
      @remove="handleCharacterRemove"
    />
  </div>
</template>

<style scoped>
/* 小队选择卡片动画 */
.bg-gray-800:hover {
  transform: translateY(-2px);
  transition: transform 0.2s ease;
}

/* 角色位置方格悬停效果 */
.cursor-pointer:hover {
  transform: scale(1.02);
}
</style>