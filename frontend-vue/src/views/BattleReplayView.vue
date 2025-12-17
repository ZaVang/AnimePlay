<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { BattleReplayManager, type ReplayState } from '@/core/replay/BattleReplayManager';
import type { BattleSessionLog, ActionRecord } from '@/types/debug';
import ActionDetailCard from '@/components/replay/ActionDetailCard.vue';

const replayManager = ref<BattleReplayManager>(new BattleReplayManager());
const replayState = ref<ReplayState | null>(null);
const currentAction = ref<ActionRecord | null>(null);
const sessionInfo = ref<any>(null);
const sessionActions = ref<ActionRecord[]>([]);

const fileInput = ref<HTMLInputElement | null>(null);
const showActionDetails = ref(false);
const selectedActionIndex = ref(-1);

// 播放控制
const controls = computed(() => replayManager.value.getControls());
const progress = computed(() => replayManager.value.getProgress());

// 状态显示
const isLoaded = computed(() => replayState.value !== null);
const isPlaying = computed(() => replayState.value?.isPlaying || false);
const canStepBack = computed(() => (replayState.value?.currentActionIndex || 0) > -1);
const canStepForward = computed(() => {
  if (!replayState.value || !sessionInfo.value) return false;
  return replayState.value.currentActionIndex < sessionInfo.value.actionCount - 1;
});

// 设置状态变化监听
onMounted(() => {
  replayManager.value.setOnStateChange((state: ReplayState) => {
    replayState.value = state;
    currentAction.value = replayManager.value.getCurrentAction();
  });
});

onUnmounted(() => {
  replayManager.value.cleanup();
});

// 监听动作索引变化
watch(() => replayState.value?.currentActionIndex, (newIndex) => {
  if (newIndex !== undefined && newIndex >= 0) {
    selectedActionIndex.value = newIndex;
  }
});

/**
 * 加载日志文件
 */
function loadLogFile() {
  fileInput.value?.click();
}

/**
 * 处理文件选择
 */
function handleFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const logData: BattleSessionLog = JSON.parse(e.target?.result as string);
      replayManager.value.loadSession(logData);
      sessionInfo.value = replayManager.value.getSessionInfo();
      sessionActions.value = logData.actions || [];

      // 重置文件输入
      if (fileInput.value) {
        fileInput.value.value = '';
      }
    } catch (error) {
      alert('无法解析日志文件，请确保文件格式正确。');
      console.error('Log file parse error:', error);
    }
  };
  reader.readAsText(file);
}

/**
 * 播放速度选项
 */
const speedOptions = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
  { value: 3, label: '3x' }
];

/**
 * 格式化时间
 */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 格式化动作类型
 */
function getActionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'play_card': '出牌',
    'clash_resolve': '冲突解算',
    'turn_end': '回合结束',
    'turn_start': '回合开始',
    'skill_activation': '技能激活',
    'effect_apply': '效果应用'
  };
  return labels[type] || type;
}

/**
 * 跳转到指定动作
 */
function jumpToAction(index: number) {
  controls.value.jumpToAction(index);
  selectedActionIndex.value = index;
}

/**
 * 获取玩家名称
 */
function getPlayerName(playerId: 'playerA' | 'playerB'): string {
  if (!replayState.value) return playerId;
  return replayState.value[playerId].name;
}
</script>

<template>
  <div class="battle-replay-view">
    <div class="replay-header">
      <h1>🎬 战斗回放系统</h1>
      <button @click="loadLogFile" class="load-btn">
        📁 加载日志文件
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".json"
        @change="handleFileChange"
        style="display: none"
      />
    </div>

    <!-- 会话信息 -->
    <div v-if="sessionInfo" class="session-info">
      <div class="info-grid">
        <div class="info-item">
          <span class="label">会话ID:</span>
          <span class="value">{{ sessionInfo.sessionId }}</span>
        </div>
        <div class="info-item">
          <span class="label">时长:</span>
          <span class="value">{{ formatTime(sessionInfo.duration) }}</span>
        </div>
        <div class="info-item">
          <span class="label">动作数:</span>
          <span class="value">{{ sessionInfo.actionCount }}</span>
        </div>
        <div class="info-item" v-if="sessionInfo.winner">
          <span class="label">获胜者:</span>
          <span class="value winner">{{ getPlayerName(sessionInfo.winner) }}</span>
        </div>
      </div>
    </div>

    <div v-if="isLoaded" class="replay-content">
      <!-- 播放控制 -->
      <div class="controls-panel">
        <div class="playback-controls">
          <button
            @click="controls.stop()"
            class="control-btn"
            title="停止"
          >
            ⏹️
          </button>
          <button
            @click="controls.stepBackward()"
            class="control-btn"
            :disabled="!canStepBack"
            title="上一步"
          >
            ⏮️
          </button>
          <button
            @click="isPlaying ? controls.pause() : controls.play()"
            class="control-btn play-btn"
            title="播放/暂停"
          >
            {{ isPlaying ? '⏸️' : '▶️' }}
          </button>
          <button
            @click="controls.stepForward()"
            class="control-btn"
            :disabled="!canStepForward"
            title="下一步"
          >
            ⏭️
          </button>
        </div>

        <div class="speed-control">
          <span class="speed-label">速度:</span>
          <select
            :value="replayState?.playbackSpeed || 1"
            @change="controls.setSpeed(Number(($event.target as HTMLSelectElement).value))"
            class="speed-select"
          >
            <option v-for="option in speedOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>

      <!-- 当前状态显示 -->
      <div class="state-display">
        <div class="players-state">
          <!-- 玩家A状态 -->
          <div class="player-panel">
            <h3>{{ replayState?.playerA.name || 'Player A' }}</h3>
            <div class="player-stats">
              <div class="stat">
                <span class="stat-label">声望:</span>
                <span class="stat-value">{{ replayState?.playerA.reputation }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">TP:</span>
                <span class="stat-value">{{ replayState?.playerA.tp }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">手牌:</span>
                <span class="stat-value">{{ replayState?.playerA.handCount }}</span>
              </div>
            </div>
          </div>

          <!-- 游戏状态 -->
          <div class="game-state">
            <div class="turn-info">
              <div class="turn">回合 {{ replayState?.game.turn }}</div>
              <div class="phase">{{ replayState?.game.phase }}</div>
              <div class="active-player">
                当前玩家: {{ getPlayerName(replayState?.game.activePlayer || 'playerA') }}
              </div>
            </div>
            <div class="topic-bias">
              <span class="label">话题偏向:</span>
              <span class="value" :class="{
                positive: (replayState?.game.topicBias || 0) > 0,
                negative: (replayState?.game.topicBias || 0) < 0
              }">
                {{ replayState?.game.topicBias || 0 }}
              </span>
            </div>
          </div>

          <!-- 玩家B状态 -->
          <div class="player-panel">
            <h3>{{ replayState?.playerB.name || 'Player B' }}</h3>
            <div class="player-stats">
              <div class="stat">
                <span class="stat-label">声望:</span>
                <span class="stat-value">{{ replayState?.playerB.reputation }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">TP:</span>
                <span class="stat-value">{{ replayState?.playerB.tp }}</span>
              </div>
              <div class="stat">
                <span class="stat-label">手牌:</span>
                <span class="stat-value">{{ replayState?.playerB.handCount }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 当前动作详细信息 -->
        <div v-if="currentAction" class="current-action">
          <h4>当前动作详情</h4>
          <ActionDetailCard
            :action="currentAction"
            :player-names="{
              playerA: replayState?.playerA.name || 'Player A',
              playerB: replayState?.playerB.name || 'Player B'
            }"
          />
        </div>
      </div>

      <!-- 动作列表 -->
      <div class="actions-list">
        <div class="actions-header">
          <h4>动作历史</h4>
          <button
            @click="showActionDetails = !showActionDetails"
            class="toggle-details-btn"
          >
            {{ showActionDetails ? '隐藏详情' : '显示详情' }}
          </button>
        </div>

        <div class="actions-scroll">
          <div
            v-for="(action, index) in sessionActions"
            :key="action.id || index"
            class="action-item"
            :class="{
              active: index === selectedActionIndex,
              current: index === replayState?.currentActionIndex
            }"
            @click="jumpToAction(index)"
          >
            <div class="action-summary">
              <span class="action-index">{{ index + 1 }}</span>
              <span class="action-type-label">{{ getActionTypeLabel(action.actionType) }}</span>
              <span class="action-player-name">{{ getPlayerName(action.playerId) }}</span>
              <span class="action-desc">{{ action.description }}</span>
            </div>

            <div v-if="showActionDetails && action.details" class="action-details">
              <pre>{{ JSON.stringify(action.details, null, 2) }}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else class="empty-state">
      <div class="empty-content">
        <div class="empty-icon">📁</div>
        <h3>请加载战斗日志文件</h3>
        <p>选择一个从调试面板导出的 JSON 格式战斗日志文件来开始回放。</p>
        <button @click="loadLogFile" class="empty-load-btn">
          选择文件
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-replay-view {
  @apply min-h-screen bg-gray-100 p-6;
}

.replay-header {
  @apply flex items-center justify-between mb-6 bg-white rounded-lg shadow p-4;
}

.replay-header h1 {
  @apply text-2xl font-bold text-gray-800 m-0;
}

.load-btn {
  @apply bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors;
}

.session-info {
  @apply bg-white rounded-lg shadow p-4 mb-6;
}

.info-grid {
  @apply grid grid-cols-2 md:grid-cols-4 gap-4;
}

.info-item {
  @apply flex flex-col;
}

.info-item .label {
  @apply text-sm text-gray-500 font-medium;
}

.info-item .value {
  @apply text-lg font-semibold text-gray-800;
}

.info-item .winner {
  @apply text-green-600;
}

.replay-content {
  @apply space-y-6;
}

.controls-panel {
  @apply bg-white rounded-lg shadow p-4;
}

.playback-controls {
  @apply flex items-center gap-2 mb-4;
}

.control-btn {
  @apply w-10 h-10 rounded-full border-2 border-gray-300 bg-white hover:bg-gray-50 transition-colors;
  @apply flex items-center justify-center text-lg;
}

.control-btn:disabled {
  @apply opacity-50 cursor-not-allowed hover:bg-white;
}

.play-btn {
  @apply border-blue-500 text-blue-500 hover:bg-blue-50;
}

.speed-control {
  @apply flex items-center gap-2 mb-4;
}

.speed-label {
  @apply text-sm font-medium text-gray-700;
}

.speed-select {
  @apply px-2 py-1 border border-gray-300 rounded;
}

.progress-bar {
  @apply w-full h-2 bg-gray-200 rounded-full overflow-hidden;
}

.progress-fill {
  @apply h-full bg-blue-500 transition-all duration-200;
}

.state-display {
  @apply bg-white rounded-lg shadow p-6;
}

.players-state {
  @apply grid grid-cols-1 md:grid-cols-3 gap-6 mb-6;
}

.player-panel {
  @apply text-center;
}

.player-panel h3 {
  @apply text-xl font-bold text-gray-900 mb-4;
}

.player-stats {
  @apply space-y-3;
}

.stat {
  @apply flex justify-between bg-white p-2 rounded border;
}

.stat-label {
  @apply text-base font-bold text-gray-800;
}

.stat-value {
  @apply font-bold text-lg text-blue-700;
}

.game-state {
  @apply text-center border-l border-r border-gray-200 px-6;
}

.turn-info {
  @apply space-y-3 mb-6;
}

.turn {
  @apply text-3xl font-bold text-blue-700 bg-blue-50 px-4 py-2 rounded-lg;
}

.phase {
  @apply text-base font-bold text-white bg-indigo-600 px-3 py-2 rounded-lg;
}

.active-player {
  @apply text-base font-bold text-green-700 bg-green-50 px-3 py-2 rounded;
}

.topic-bias {
  @apply flex justify-center gap-3 bg-white p-3 rounded-lg border-2 border-gray-200;
}

.topic-bias .label {
  @apply font-bold text-gray-900;
}

.topic-bias .value.positive {
  @apply text-red-700 font-bold bg-red-100 px-2 py-1 rounded;
}

.topic-bias .value.negative {
  @apply text-blue-700 font-bold bg-blue-100 px-2 py-1 rounded;
}

.current-action {
  @apply border-t border-gray-200 pt-4;
}

.current-action h4 {
  @apply text-xl font-bold text-gray-900 mb-4;
}

.actions-list {
  @apply bg-white rounded-lg shadow-lg border border-gray-200;
}

.actions-header {
  @apply flex justify-between items-center p-4 border-b-2 border-gray-300 bg-gray-50;
}

.actions-header h4 {
  @apply text-xl font-bold text-gray-900 m-0;
}

.toggle-details-btn {
  @apply text-base font-medium text-blue-700 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded;
}

.actions-scroll {
  @apply max-h-96 overflow-y-auto;
}

.action-item {
  @apply border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition-all duration-200;
}

.action-item.active {
  @apply bg-blue-100 border-blue-400 shadow-md;
}

.action-item.current {
  @apply bg-yellow-100 border-yellow-400 shadow-md;
}

.action-summary {
  @apply flex items-center gap-4 p-4;
}

.action-index {
  @apply text-sm bg-gray-800 text-white px-3 py-1 rounded-full font-bold min-w-[2.5rem] text-center;
}

.action-type-label {
  @apply text-sm bg-blue-600 text-white px-3 py-1 rounded-full font-medium;
}

.action-player-name {
  @apply text-base font-bold text-green-700 bg-green-50 px-2 py-1 rounded;
}

.action-desc {
  @apply text-base font-medium text-gray-900 flex-1;
}

.action-details {
  @apply bg-gray-50 p-3 border-t border-gray-200;
}

.action-details pre {
  @apply text-xs text-gray-600 whitespace-pre-wrap;
}

.empty-state {
  @apply flex items-center justify-center min-h-[60vh];
}

.empty-content {
  @apply text-center max-w-md mx-auto;
}

.empty-icon {
  @apply text-6xl mb-4;
}

.empty-content h3 {
  @apply text-xl font-semibold text-gray-800 mb-2;
}

.empty-content p {
  @apply text-gray-600 mb-6;
}

.empty-load-btn {
  @apply bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors;
}
</style>