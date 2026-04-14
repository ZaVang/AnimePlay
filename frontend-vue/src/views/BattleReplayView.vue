<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import TacticalButton from '@/components/ui/TacticalButton.vue';
import GlassPanel from '@/components/ui/GlassPanel.vue';

const route = useRoute();
const battleId = route.params.id;

interface ReplayLog {
  turn: number;
  action: string;
  actor: string;
  target: string;
  detail: string;
  impact: number;
}

const mockLogs = ref<ReplayLog[]>([
  { turn: 1, actor: 'Taiga', action: 'Strike', target: 'Enemy A', detail: 'Critical Edge', impact: 450 },
  { turn: 1, actor: 'Enemy A', action: 'Counter', target: 'Taiga', detail: 'Deflected', impact: 50 },
  { turn: 2, actor: 'Ami', action: 'Support', target: 'Taiga', detail: 'Energy Surge', impact: 100 },
]);

const playbackSpeed = ref(1);
const currentStep = ref(0);
</script>

<template>
  <div class="replay-terminal p-8 md:p-12 space-y-12 quantic-reveal h-full overflow-y-auto font-ui">
    <!-- Header: Mission Archive -->
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-10">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
           <div class="w-1 h-4 bg-gold"></div>
           <h2 class="text-[10px] font-display font-bold text-gold tracking-[0.6em] uppercase opacity-70">战术回溯系统</h2>
        </div>
        <h1 class="text-5xl font-display font-black tracking-tighter uppercase text-white leading-none">作战档案</h1>
        <div class="text-[8px] font-mono text-industrial-300 uppercase tracking-widest mt-2 overflow-hidden">
          UUID: REPLAY-{{ battleId }} // 任务识别码: ARCHIVE_01 // 记录点: Sector_B3
        </div>
      </div>
      
      <div class="flex items-center gap-6 pb-1">
         <div class="text-right border-r border-white/10 pr-6">
            <span class="block text-[8px] font-display text-industrial-400 uppercase tracking-widest mb-1">回放帧率</span>
            <div class="flex items-center gap-2">
               <button v-for="s in [1, 2, 4]" :key="s" @click="playbackSpeed = s" 
                  class="text-xs font-mono transition-all"
                  :class="playbackSpeed === s ? 'text-gold' : 'text-industrial-600 hover:text-industrial-300'">
                  {{ s }}X
               </button>
            </div>
         </div>
         <TacticalButton variant="secondary" size="sm">导出战术简报</TacticalButton>
      </div>
    </header>

    <!-- Main Logic Stream -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
       <!-- Replay Visualizer Placeholder -->
       <div class="lg:col-span-8 aspect-video bg-black/60 border border-white/5 relative group overflow-hidden flex flex-col items-center justify-center p-12 text-center">
          <div class="absolute inset-0 bg-grid opacity-5 pointer-events-none"></div>
          <div class="relative z-10 space-y-6">
             <div class="w-20 h-20 border-2 border-dashed border-white/10 flex items-center justify-center mx-auto group-hover:border-gold/30 transition-all duration-700">
                <div class="text-white/10 group-hover:text-gold/60 text-3xl font-black">ARCHV</div>
             </div>
             <div>
                <h3 class="text-xs font-display font-black text-white uppercase tracking-[0.4em] mb-2">等待链路信号</h3>
                <p class="text-[9px] text-industrial-500 uppercase leading-relaxed tracking-widest max-w-sm mx-auto">
                  请将 mission_archive.json 注入终端缓冲区以启动解密与回放协议。
                </p>
             </div>
             <TacticalButton variant="primary" size="md">初始化握手程序</TacticalButton>
          </div>
          <!-- Corner Accents -->
          <div class="absolute top-0 left-0 w-8 h-8 border-t border-l border-white/10 group-hover:border-gold/40 transition-all"></div>
          <div class="absolute bottom-0 right-0 w-8 h-8 border-b border-r border-white/10 group-hover:border-gold/40 transition-all"></div>
       </div>

       <!-- Side Dossier: Event Log -->
       <div class="lg:col-span-4 space-y-6">
          <div class="border-l-2 border-gold/40 pl-4 py-1">
             <h3 class="text-[10px] font-display font-black text-white uppercase tracking-widest">交战时序记录</h3>
             <p class="text-[7px] font-mono text-industrial-500 uppercase mt-1">Total_Events: {{ mockLogs.length }} // Filter: RAW_STREAM</p>
          </div>

          <div class="space-y-3 h-[400px] overflow-y-auto pr-2 scrollbar-tactical">
             <div v-for="(log, idx) in mockLogs" :key="idx" 
                class="p-4 bg-white/[0.01] border border-white/5 hover:bg-white/[0.03] transition-all group">
                <div class="flex justify-between items-start mb-2">
                   <div class="flex items-center gap-3">
                      <span class="text-[8px] font-mono text-gold flex items-center justify-center w-6 h-6 border border-gold/20">T{{ log.turn }}</span>
                      <span class="text-[10px] font-display font-bold text-white uppercase">{{ log.actor }}</span>
                   </div>
                   <span class="text-[9px] font-mono text-clinical-danger">-{{ log.impact }}HP</span>
                </div>
                <p class="text-[9px] text-industrial-400 uppercase tracking-wide">
                   执行 <span class="text-white">{{ log.action }}</span> 作用于 <span class="text-white">{{ log.target }}</span> // 特征: {{ log.detail }}
                </p>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-tactical::-webkit-scrollbar {
  width: 2px;
}
.scrollbar-tactical::-webkit-scrollbar-track {
  @apply bg-transparent;
}
.scrollbar-tactical::-webkit-scrollbar-thumb {
  @apply bg-white/10 hover:bg-gold/40;
}
.replay-terminal {
  box-shadow: inset 0 0 100px rgba(0,0,0,0.8);
}
</style>