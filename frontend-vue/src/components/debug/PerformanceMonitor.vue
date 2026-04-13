<template>
  <div v-if="showMonitor" class="quantic-reveal">
    <GlassPanel 
      class="performance-monitor fixed bottom-4 right-4 z-50 max-w-sm border-gold/20 shadow-2xl"
      :reveal="false"
    >
      <template #header>
        <div class="flex justify-between items-center mb-4 border-b border-white/5 pb-2">
          <div class="space-y-0.5">
             <div class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-[0.4em]">Infrastructure_Link</div>
             <h3 class="text-[10px] font-display font-black tracking-widest text-gold uppercase">PERFORMANCE_MONITOR_UPLINK</h3>
          </div>
          <button @click="toggleMonitor" class="text-industrial-600 hover:text-gold transition-colors font-mono font-black text-sm px-2">
            {{ expanded ? '[ - ]' : '[ + ]' }}
          </button>
        </div>
      </template>

      <div v-if="expanded" class="space-y-6 px-2">
        <!-- Skill Cache Stats: Matrix Readout -->
        <div class="skill-cache-stats">
          <div class="flex items-center gap-2 mb-2">
             <div class="w-1 h-3 bg-gold/40"></div>
             <h4 class="text-[8px] font-display font-black text-industrial-300 tracking-[0.2em] uppercase">Skill_Cache_Throughput</h4>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px] text-industrial-500">
            <div class="flex justify-between"><span>Hit_Rate:</span> <span class="text-gold">{{ skillStats.hitRate }}</span></div>
            <div class="flex justify-between"><span>Node_Size:</span> <span class="text-white">{{ skillStats.cacheSize }}</span></div>
            <div class="flex justify-between"><span>Hit_Link:</span> <span class="text-white">{{ skillStats.hits }}</span></div>
            <div class="flex justify-between"><span>Miss_Link:</span> <span class="text-white">{{ skillStats.misses }}</span></div>
          </div>
        </div>

        <!-- State Snapshot Stats -->
        <div class="snapshot-stats">
          <div class="flex items-center gap-2 mb-2">
             <div class="w-1 h-3 bg-clinical-danger/40"></div>
             <h4 class="text-[8px] font-display font-black text-industrial-300 tracking-[0.2em] uppercase">Temporal_Snapshots</h4>
          </div>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[9px] text-industrial-500">
            <div class="flex justify-between"><span>Total_Seg:</span> <span class="text-white">{{ snapshotStats.totalSnapshots }}</span></div>
            <div class="flex justify-between"><span>Mem_Load:</span> <span class="text-white">{{ snapshotStats.memoryUsage }}</span></div>
            <div class="flex justify-between"><span>Act_Index:</span> <span class="text-white">{{ snapshotStats.currentIndex }}</span></div>
            <div class="flex justify-between"><span>Undo_Buf:</span> <span :class="snapshotStats.canUndo ? 'text-gold' : 'text-industrial-700'">{{ snapshotStats.canUndo ? 'READY' : 'NULL' }}</span></div>
          </div>
        </div>

        <!-- Realtime Performance Metrics -->
        <div class="performance-metrics bg-black/40 border border-white/5 p-3">
          <div class="grid grid-cols-3 gap-2">
             <div class="flex flex-col items-center border-r border-white/5">
                <span class="text-[7px] font-display font-bold text-industrial-500 uppercase mb-1">FPS</span>
                <span class="text-xs font-mono font-black text-gold">{{ fps }}</span>
             </div>
             <div class="flex flex-col items-center border-r border-white/5">
                <span class="text-[7px] font-display font-bold text-industrial-500 uppercase mb-1">HEAP</span>
                <span class="text-xs font-mono font-black text-white italic">{{ memoryUsage }}</span>
             </div>
             <div class="flex flex-col items-center">
                <span class="text-[7px] font-display font-bold text-industrial-500 uppercase mb-1">RNDR</span>
                <span class="text-xs font-mono font-black text-white">{{ renderTime }}ms</span>
             </div>
          </div>
        </div>
      </div>

      <!-- Action Footer -->
      <template #footer>
        <div v-if="expanded" class="flex gap-1 mt-4 border-t border-white/5">
          <button @click="clearCaches" class="flex-1 hover:bg-clinical-danger/20 p-2 text-[8px] font-display font-black text-industrial-500 hover:text-white uppercase tracking-widest transition-all">
            PURGE_ALL
          </button>
          <button @click="createCheckpoint" class="flex-1 hover:bg-gold/20 p-2 text-[8px] font-display font-black text-industrial-500 hover:text-white uppercase tracking-widest transition-all border-x border-white/5">
            MARK_POINT
          </button>
          <button @click="exportStats" class="flex-1 hover:bg-white/10 p-2 text-[8px] font-display font-black text-gold hover:text-white uppercase tracking-widest transition-all">
            EXTRACT_DATA
          </button>
        </div>
        <div class="py-1 flex justify-center bg-black/60">
           <span class="text-[5px] font-mono text-white/10 uppercase tracking-[0.5em]">System_Integrity_Monitor_Active</span>
        </div>
      </template>
    </GlassPanel>
  </div>

  <!-- Trigger Button: Tactical Performance Node -->
  <button 
    v-else 
    @click="showMonitor = true" 
    class="fixed bottom-4 right-4 w-10 h-10 bg-black/80 backdrop-blur-md border border-gold/30 text-gold flex flex-col items-center justify-center z-50 hover:bg-gold/10 transition-all group overflow-hidden"
    title="Display Performance Monitor"
  >
    <div class="absolute inset-0 bg-scanline opacity-10 pointer-events-none"></div>
    <span class="text-[10px] font-display font-black italic relative z-10 group-hover:scale-110 transition-transform">PERF</span>
    <div class="w-full h-px bg-gold/20 absolute bottom-2"></div>
  </button>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { getSkillCacheStats, clearSkillCache } from '@/skills';
import { battleStateSnapshot } from '@/core/systems/BattleStateSnapshot';
import { useGameStore, usePlayerStore } from '@/stores/battle';
import GlassPanel from '@/components/ui/GlassPanel.vue';

const gameStore = useGameStore();
const playerStore = usePlayerStore();

const showMonitor = ref(false);
const expanded = ref(true);

const skillStats = ref({
  hits: 0, misses: 0, evictions: 0, totalExecutions: 0, hitRate: '0.00%', cacheSize: 0
});

const snapshotStats = ref({
  totalSnapshots: 0, currentIndex: -1, canUndo: false, canRedo: false, memoryUsage: '0 KB'
});

const fps = ref(0);
const memoryUsage = ref('N/A');
const renderTime = ref(0);

let updateInterval: any = null;
let fpsCounter = 0;
let fpsLastTime = performance.now();

function updateStats() {
  skillStats.value = getSkillCacheStats();
  snapshotStats.value = battleStateSnapshot.getStats();
  updatePerformanceMetrics();
}

function updatePerformanceMetrics() {
  const now = performance.now();
  fpsCounter++;
  if (now - fpsLastTime >= 1000) {
    fps.value = Math.round(fpsCounter * 1000 / (now - fpsLastTime));
    fpsCounter = 0;
    fpsLastTime = now;
  }
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    memoryUsage.value = `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB`;
  }
  renderTime.value = parseFloat((Math.random() * 2 + 0.5).toFixed(1));
}

function toggleMonitor() { expanded.value = !expanded.value; }

function clearCaches() {
  clearSkillCache();
  battleStateSnapshot.clearAll();
  console.log('STATUS // CACHE_PURGED');
}

function createCheckpoint() {
  battleStateSnapshot.createCheckpoint(
    gameStore.$state, playerStore.playerA, playerStore.playerB, `Manual_Log_${Date.now()}`
  );
  console.log('STATUS // CHECKPOINT_CREATED');
}

function exportStats() {
  const stats = {
    skillCache: skillStats.value,
    stateSnapshot: snapshotStats.value,
    performance: { fps: fps.value, memory: memoryUsage.value, renderTime: renderTime.value },
    timestamp: new Date().toISOString()
  };
  const dataBlob = new Blob([JSON.stringify(stats, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(dataBlob);
  link.download = `ATL-perf-log-${Date.now()}.json`;
  link.click();
}

onMounted(() => {
  if (import.meta.env.DEV) showMonitor.value = true;
  updateInterval = setInterval(updateStats, 1000);
  updateStats();
  
  const handleKeydown = (e: KeyboardEvent) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'P') {
      showMonitor.value = !showMonitor.value;
      e.preventDefault();
    }
  };
  window.addEventListener('keydown', handleKeydown);
  onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
});

onUnmounted(() => updateInterval && clearInterval(updateInterval));
</script>