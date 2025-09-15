<template>
  <div v-if="showMonitor" class="performance-monitor fixed bottom-4 right-4 bg-gray-800 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm">
    <div class="flex justify-between items-center mb-2">
      <h3 class="text-lg font-bold">性能监控</h3>
      <button @click="toggleMonitor" class="text-gray-400 hover:text-white">
        {{ expanded ? '−' : '+' }}
      </button>
    </div>
    
    <div v-if="expanded" class="space-y-3">
      <!-- 技能缓存统计 -->
      <div class="skill-cache-stats">
        <h4 class="font-semibold text-yellow-400">技能缓存</h4>
        <div class="text-sm grid grid-cols-2 gap-1">
          <div>命中率: {{ skillStats.hitRate }}</div>
          <div>缓存大小: {{ skillStats.cacheSize }}</div>
          <div>命中: {{ skillStats.hits }}</div>
          <div>未命中: {{ skillStats.misses }}</div>
          <div>清理: {{ skillStats.evictions }}</div>
          <div>总调用: {{ skillStats.totalExecutions }}</div>
        </div>
      </div>

      <!-- 状态快照统计 -->
      <div class="snapshot-stats">
        <h4 class="font-semibold text-blue-400">状态快照</h4>
        <div class="text-sm grid grid-cols-2 gap-1">
          <div>快照数: {{ snapshotStats.totalSnapshots }}</div>
          <div>内存: {{ snapshotStats.memoryUsage }}</div>
          <div>当前索引: {{ snapshotStats.currentIndex }}</div>
          <div>可撤销: {{ snapshotStats.canUndo ? '是' : '否' }}</div>
          <div>可重做: {{ snapshotStats.canRedo ? '是' : '否' }}</div>
        </div>
      </div>

      <!-- 实时性能指标 -->
      <div class="performance-metrics">
        <h4 class="font-semibold text-green-400">性能指标</h4>
        <div class="text-sm">
          <div>FPS: {{ fps }}</div>
          <div>内存使用: {{ memoryUsage }}</div>
          <div>渲染时间: {{ renderTime }}ms</div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="action-buttons flex gap-2 text-xs">
        <button @click="clearCaches" class="bg-red-600 hover:bg-red-700 px-2 py-1 rounded">
          清理缓存
        </button>
        <button @click="createCheckpoint" class="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded">
          创建检查点
        </button>
        <button @click="exportStats" class="bg-green-600 hover:bg-green-700 px-2 py-1 rounded">
          导出统计
        </button>
      </div>
    </div>
  </div>

  <!-- 触发按钮（当监控器隐藏时） -->
  <button 
    v-else 
    @click="showMonitor = true" 
    class="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-700 z-50"
    title="显示性能监控"
  >
    📊
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { getSkillCacheStats, clearSkillCache } from '@/skills/effects';
import { battleStateSnapshot } from '@/core/systems/BattleStateSnapshot';
import { useGameStore, usePlayerStore } from '@/stores/battle';

const gameStore = useGameStore();
const playerStore = usePlayerStore();

const showMonitor = ref(false);
const expanded = ref(true);

// 统计数据
const skillStats = ref({
  hits: 0,
  misses: 0,
  evictions: 0,
  totalExecutions: 0,
  hitRate: '0.00%',
  cacheSize: 0
});

const snapshotStats = ref({
  totalSnapshots: 0,
  currentIndex: -1,
  canUndo: false,
  canRedo: false,
  memoryUsage: '0 KB'
});

// 性能指标
const fps = ref(0);
const memoryUsage = ref('未知');
const renderTime = ref(0);

let updateInterval: NodeJS.Timeout | null = null;
let fpsCounter = 0;
let fpsLastTime = performance.now();

// 更新统计数据
function updateStats() {
  // 更新技能缓存统计
  skillStats.value = getSkillCacheStats();
  
  // 更新快照统计
  snapshotStats.value = battleStateSnapshot.getStats();
  
  // 更新性能指标
  updatePerformanceMetrics();
}

// 更新性能指标
function updatePerformanceMetrics() {
  const now = performance.now();
  fpsCounter++;
  
  if (now - fpsLastTime >= 1000) {
    fps.value = Math.round(fpsCounter * 1000 / (now - fpsLastTime));
    fpsCounter = 0;
    fpsLastTime = now;
  }

  // 获取内存使用情况（如果浏览器支持）
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    const used = (memory.usedJSHeapSize / 1024 / 1024).toFixed(2);
    const total = (memory.totalJSHeapSize / 1024 / 1024).toFixed(2);
    memoryUsage.value = `${used}/${total} MB`;
  }

  // 模拟渲染时间
  renderTime.value = Math.random() * 2 + 0.5;
}

// 切换监控器展开状态
function toggleMonitor() {
  expanded.value = !expanded.value;
}

// 清理所有缓存
function clearCaches() {
  clearSkillCache();
  battleStateSnapshot.clearAll();
  console.log('🧹 所有缓存已清理');
}

// 创建检查点
function createCheckpoint() {
  battleStateSnapshot.createCheckpoint(
    gameStore.$state,
    playerStore.playerA,
    playerStore.playerB,
    `手动检查点_${Date.now()}`
  );
  console.log('📍 检查点已创建');
}

// 导出统计信息
function exportStats() {
  const stats = {
    skillCache: skillStats.value,
    stateSnapshot: snapshotStats.value,
    performance: {
      fps: fps.value,
      memory: memoryUsage.value,
      renderTime: renderTime.value
    },
    timestamp: new Date().toISOString()
  };
  
  const dataStr = JSON.stringify(stats, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `battle-performance-stats-${Date.now()}.json`;
  link.click();
  
  console.log('📊 统计信息已导出');
}

// 生命周期
onMounted(() => {
  // 在开发环境中自动显示
  if (import.meta.env.DEV) {
    showMonitor.value = true;
  }
  
  // 每秒更新统计数据
  updateInterval = setInterval(updateStats, 1000);
  updateStats(); // 立即更新一次
});

onUnmounted(() => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});

// 键盘快捷键支持
onMounted(() => {
  const handleKeydown = (event: KeyboardEvent) => {
    // Ctrl+Shift+P 切换性能监控器
    if (event.ctrlKey && event.shiftKey && event.key === 'P') {
      showMonitor.value = !showMonitor.value;
      event.preventDefault();
    }
  };
  
  document.addEventListener('keydown', handleKeydown);
  
  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown);
  });
});
</script>

<style scoped>
.performance-monitor {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  max-height: 80vh;
  overflow-y: auto;
}

.performance-monitor::-webkit-scrollbar {
  width: 4px;
}

.performance-monitor::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}

.performance-monitor h4 {
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding-bottom: 2px;
  margin-bottom: 4px;
}

.action-buttons button {
  transition: all 0.2s ease;
}

.action-buttons button:hover {
  transform: scale(1.05);
}
</style>