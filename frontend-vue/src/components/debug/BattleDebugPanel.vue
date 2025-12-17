<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { battleDebugLogger } from '@/core/debug/BattleDebugLogger';
import type { DebugConfig, BattleSessionLog } from '@/types/debug';

const isVisible = ref(false);
// 确保获取最新配置
const config = ref<DebugConfig>({
  enabled: false,
  logLevel: 'normal',
  trackCalculations: true,
  trackEffects: true,
  trackStateChanges: true,
  autoExport: false,
  maxActionsPerSession: 1000
});
const sessionSummary = ref<string | null>(null);

// 确保配置状态同步
const refreshConfig = () => {
  const currentConfig = battleDebugLogger.getConfig();
  config.value = { ...currentConfig }; // 使用解构创建新对象确保 Vue 的响应性
};

// 更新会话摘要
const updateSummary = () => {
  sessionSummary.value = battleDebugLogger.getSessionSummary();
};

// 定时更新摘要
let summaryTimer: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  refreshConfig();
  updateSummary();
  updateCurrentSession();
  summaryTimer = setInterval(() => {
    updateSummary();
    updateCurrentSession();
    // 只在调试模式启用时才刷新配置，且频率降低
  }, 3000); // 3秒刷新一次就足够了
});

onUnmounted(() => {
  if (summaryTimer) {
    clearInterval(summaryTimer);
  }
});

// 当前会话信息 - 使用ref来强制响应性
const currentSessionData = ref<BattleSessionLog | null>(null);

// 更新会话数据
const updateCurrentSession = () => {
  try {
    const session = battleDebugLogger.getCurrentSession();
    currentSessionData.value = session;
    console.log('🐛 updateCurrentSession called, session:', session ? 'found' : 'null');
  } catch (error) {
    console.error('🐛 Error getting current session:', error);
    currentSessionData.value = null;
  }
};

const currentSession = computed(() => currentSessionData.value);

// 开启/关闭调试模式
function toggleDebugMode() {
  const newEnabled = !config.value.enabled;

  // 先更新 logger 配置
  battleDebugLogger.configure({ enabled: newEnabled });

  // 如果启用调试模式并且当前没有会话，创建一个新的会话
  if (newEnabled && !battleDebugLogger.getCurrentSession()) {
    console.log('🐛 Creating new debug session...');
    battleDebugLogger.startSession('Player Deck', 'AI Deck', 'Unknown');
  }

  // 然后更新本地状态
  config.value = { ...config.value, enabled: newEnabled };

  if (newEnabled) {
    console.log('🐛 Debug mode enabled');
  } else {
    console.log('🐛 Debug mode disabled');
  }

  // 强制更新会话数据
  updateCurrentSession();

  // 确保状态同步
  setTimeout(() => {
    refreshConfig();
  }, 100);
}

// 更新配置
function updateConfig() {
  battleDebugLogger.configure(config.value);
  console.log('🐛 Debug config updated:', config.value);

  // 确保状态同步
  setTimeout(() => {
    refreshConfig();
  }, 100);
}

// 导出日志
function exportLog() {
  battleDebugLogger.exportSession();
}

// 清理会话
function clearSession() {
  if (confirm('确定要清理当前调试会话吗？')) {
    battleDebugLogger.cleanup();
    updateSummary();
  }
}

// 复制会话ID
function copySessionId() {
  if (currentSession.value) {
    (window as any).navigator.clipboard.writeText(currentSession.value.sessionId);
    (window as any).alert('会话ID已复制到剪贴板');
  }
}

// 查看详细日志
const showDetailedLog = ref(false);
const detailedLogData = ref<string>('');

function viewDetailedLog() {
  if (currentSession.value) {
    detailedLogData.value = JSON.stringify(currentSession.value, null, 2);
    showDetailedLog.value = true;
  }
}

// 切换面板显示
function togglePanel() {
  isVisible.value = !isVisible.value;
}
</script>

<template>
  <!-- 调试按钮 -->
  <div class="debug-button-container">
    <button
      @click="togglePanel"
      class="debug-toggle-btn"
      :class="{ active: config.enabled }"
      title="战斗调试面板"
    >
      🐛
    </button>
  </div>

  <!-- 调试面板 -->
  <div v-if="isVisible" class="debug-panel">
    <div class="debug-panel-header">
      <h3>🐛 战斗调试面板</h3>
      <button @click="togglePanel" class="close-btn">&times;</button>
    </div>

    <div class="debug-panel-content">
      <!-- 基础控制 -->
      <div class="debug-section">
        <h4>基础控制</h4>
        <div class="debug-controls">
          <label class="debug-checkbox">
            <input
              type="checkbox"
              :checked="config.enabled"
              @change="toggleDebugMode"
            />
            <span>启用调试模式</span>
          </label>
        </div>
      </div>

      <!-- 详细配置 -->
      <div v-if="config.enabled" class="debug-section">
        <h4>调试配置</h4>
        <div class="debug-controls">
          <div class="debug-control-group">
            <label>日志级别:</label>
            <select v-model="config.logLevel" @change="updateConfig">
              <option value="minimal">最少</option>
              <option value="normal">普通</option>
              <option value="verbose">详细</option>
            </select>
          </div>

          <label class="debug-checkbox">
            <input
              type="checkbox"
              v-model="config.trackCalculations"
              @change="updateConfig"
            />
            <span>跟踪强度/费用计算</span>
          </label>

          <label class="debug-checkbox">
            <input
              type="checkbox"
              v-model="config.trackEffects"
              @change="updateConfig"
            />
            <span>跟踪技能效果</span>
          </label>

          <label class="debug-checkbox">
            <input
              type="checkbox"
              v-model="config.trackStateChanges"
              @change="updateConfig"
            />
            <span>跟踪状态变化</span>
          </label>

          <label class="debug-checkbox">
            <input
              type="checkbox"
              v-model="config.autoExport"
              @change="updateConfig"
            />
            <span>游戏结束自动导出</span>
          </label>
        </div>
      </div>

      <!-- 会话信息 -->
      <div v-if="config.enabled && currentSession" class="debug-section">
        <h4>当前会话</h4>
        <div class="session-info">
          <div class="session-summary">
            <pre>{{ sessionSummary }}</pre>
          </div>

          <div class="session-actions">
            <button @click="copySessionId" class="debug-btn small">
              📋 复制会话ID
            </button>
            <button @click="viewDetailedLog" class="debug-btn small">
              👁️ 查看详细日志
            </button>
            <button @click="exportLog" class="debug-btn small primary">
              💾 导出日志
            </button>
            <router-link to="/battle-replay" class="debug-btn small">
              🎬 打开回放器
            </router-link>
            <button @click="clearSession" class="debug-btn small danger">
              🗑️ 清理会话
            </button>
          </div>
        </div>
      </div>

      <!-- 使用说明 -->
      <div class="debug-section">
        <h4>使用说明</h4>
        <div class="debug-help">
          <p>• <strong>启用调试模式</strong>：开始记录战斗详细日志</p>
          <p>• <strong>查看详细日志</strong>：在界面中直接查看完整的JSON格式日志</p>
          <p>• <strong>导出日志</strong>：将完整战斗记录下载到浏览器的下载文件夹</p>
          <p>• <strong>跟踪计算</strong>：记录卡牌强度和费用的详细计算过程</p>
          <p>• <strong>跟踪效果</strong>：记录所有技能和被动效果的激活</p>
          <p>• <strong>跟踪状态</strong>：记录声望、TP、话题偏向的变化</p>
        </div>
      </div>
    </div>
  </div>

  <!-- 遮罩 -->
  <div v-if="isVisible" class="debug-overlay" @click="togglePanel"></div>

  <!-- 详细日志查看模态框 -->
  <div v-if="showDetailedLog" class="log-modal-overlay" @click="showDetailedLog = false">
    <div class="log-modal" @click.stop>
      <div class="log-modal-header">
        <h3>详细战斗日志</h3>
        <button @click="showDetailedLog = false" class="close-btn">&times;</button>
      </div>
      <div class="log-modal-content">
        <div class="log-controls">
          <button
            @click="() => { (window as any).navigator.clipboard.writeText(detailedLogData); (window as any).alert('日志已复制到剪贴板'); }"
            class="debug-btn small"
          >
            📋 复制日志
          </button>
          <button
            @click="exportLog(); showDetailedLog = false"
            class="debug-btn small primary"
          >
            💾 下载文件
          </button>
        </div>
        <pre class="log-content">{{ detailedLogData }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.debug-button-container {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.debug-toggle-btn {
  @apply bg-gray-800 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl;
  @apply hover:bg-gray-700 transition-all duration-200 shadow-lg;
  border: none;
  cursor: pointer;
}

.debug-toggle-btn.active {
  @apply bg-blue-600 hover:bg-blue-700;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.debug-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1001;
}

.debug-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1002;
  @apply bg-gray-900 text-white rounded-lg shadow-2xl;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.debug-panel-header {
  @apply bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700;
  position: sticky;
  top: 0;
  z-index: 10;
}

.debug-panel-header h3 {
  @apply text-lg font-semibold m-0;
}

.close-btn {
  @apply text-gray-400 hover:text-white text-2xl;
  background: none;
  border: none;
  cursor: pointer;
}

.debug-panel-content {
  @apply p-4;
}

.debug-section {
  @apply mb-6;
}

.debug-section h4 {
  @apply text-sm font-semibold text-blue-400 mb-3;
}

.debug-controls {
  @apply space-y-3;
}

.debug-control-group {
  @apply flex items-center gap-2;
}

.debug-control-group label {
  @apply text-sm text-gray-300 min-w-[80px];
}

.debug-control-group select {
  @apply bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm;
}

.debug-checkbox {
  @apply flex items-center gap-2 text-sm text-gray-300 cursor-pointer;
}

.debug-checkbox input[type="checkbox"] {
  @apply w-4 h-4;
}

.session-info {
  @apply space-y-3;
}

.session-summary {
  @apply bg-gray-800 rounded p-3 border border-gray-700;
}

.session-summary pre {
  @apply text-sm text-green-400 m-0 font-mono;
  white-space: pre-wrap;
}

.session-actions {
  @apply flex gap-2 flex-wrap;
}

.debug-btn {
  @apply px-3 py-2 rounded text-sm font-medium transition-all duration-200;
}

.debug-btn.small {
  @apply px-2 py-1 text-xs;
}

.debug-btn.primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.debug-btn.danger {
  @apply bg-red-600 text-white hover:bg-red-700;
}

.debug-btn:not(.primary):not(.danger) {
  @apply bg-gray-700 text-gray-300 hover:bg-gray-600;
}

.debug-help {
  @apply text-sm text-gray-400 space-y-1;
}

.debug-help p {
  @apply m-0;
}

/* 滚动条样式 */
.debug-panel::-webkit-scrollbar {
  width: 6px;
}

.debug-panel::-webkit-scrollbar-track {
  @apply bg-gray-800;
}

.debug-panel::-webkit-scrollbar-thumb {
  @apply bg-gray-600 rounded;
}

.debug-panel::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500;
}

/* 详细日志模态框样式 */
.log-modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.log-modal {
  @apply bg-gray-900 text-white rounded-lg shadow-2xl;
  width: 90%;
  max-width: 1000px;
  height: 80vh;
  display: flex;
  flex-direction: column;
}

.log-modal-header {
  @apply bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-700;
  flex-shrink: 0;
}

.log-modal-header h3 {
  @apply text-lg font-semibold m-0;
}

.log-modal-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.log-controls {
  @apply p-3 border-b border-gray-700 flex gap-2;
  flex-shrink: 0;
}

.log-content {
  @apply text-sm text-green-400 m-0 font-mono bg-black p-4;
  flex: 1;
  overflow: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.log-content::-webkit-scrollbar {
  width: 8px;
}

.log-content::-webkit-scrollbar-track {
  @apply bg-gray-800;
}

.log-content::-webkit-scrollbar-thumb {
  @apply bg-gray-600 rounded;
}

.log-content::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500;
}
</style>