<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/stores/modules/authStore';
import { useViewingStore } from '@/stores/modules/viewingStore';

const authStore = useAuthStore();
const viewingStore = useViewingStore();

const stats = computed(() => viewingStore.viewingStats);
const totalWatchedHours = computed(() => Math.floor(stats.value.totalWatchTime / 60));
const totalWatchedMinutes = computed(() => stats.value.totalWatchTime % 60);

const topGenres = computed(() => {
  return Object.entries(stats.value.genreProgress)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
});

const progressLevel = computed(() => {
  if (stats.value.consecutiveDays >= 30) return { level: 'MASTER_05', color: 'text-gold', icon: '◈' };
  if (stats.value.consecutiveDays >= 14) return { level: 'EXPERT_04', color: 'text-blue-400', icon: '◇' };
  if (stats.value.consecutiveDays >= 7) return { level: 'ENTHUSIAST_03', color: 'text-green-400', icon: '△' };
  if (stats.value.consecutiveDays >= 3) return { level: 'CADET_02', color: 'text-yellow-400', icon: '▽' };
  return { level: 'INITIATE_01', color: 'text-industrial-600', icon: '○' };
});
</script>

<template>
  <div class="viewing-stats-monitor-tactical h-full flex flex-col bg-black/60 backdrop-blur-md border border-white/5 relative overflow-hidden">
    <!-- Static Backdrop Decoration -->
    <div class="absolute inset-x-0 top-0 h-px bg-white/10 pointer-events-none"></div>
    <div class="absolute inset-0 bg-scanline opacity-[0.02] pointer-events-none"></div>

    <div class="p-6 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
      <div class="flex items-center gap-3">
        <div class="w-1.5 h-3 bg-gold"></div>
        <span class="text-[10px] font-display font-black text-white uppercase tracking-[0.2em] italic self-center">LOGISTIC_STREAMS_MONITOR</span>
      </div>
      <div class="flex items-center gap-2">
         <div class="w-1 h-1 bg-gold animate-ping"></div>
         <span class="text-[8px] font-display font-bold text-gold uppercase tracking-widest opacity-60">LIVE_TELEMETRY</span>
      </div>
    </div>

    <div v-if="authStore.isLoggedIn" class="p-6 space-y-8 flex-1 overflow-y-auto scrollbar-tactical">
      <!-- Authorization Tier Badge -->
      <div class="p-5 bg-black/40 border-l-2 border-gold flex justify-between items-start relative group">
        <div class="space-y-4">
          <div class="space-y-1">
             <div class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-[0.4em]">Authorization_Tier</div>
             <div class="text-2xl font-display font-black tracking-tighter text-white uppercase italic" :class="progressLevel.color">
               {{ progressLevel.level }}
             </div>
          </div>
          <div class="flex flex-col gap-1">
             <div class="text-[7px] font-display font-bold text-industrial-600 uppercase tracking-widest">Active_Uptime_Link</div>
             <div class="text-[10px] font-mono font-black text-white tracking-widest">{{ stats.consecutiveDays }}_DAYS_NOMINAL</div>
          </div>
        </div>
        <div class="text-4xl opacity-10 group-hover:opacity-20 transition-opacity text-white">{{ progressLevel.icon }}</div>
        
        <!-- Corner Decoration -->
        <div class="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-white/10"></div>
      </div>

      <!-- Core Usage Metrics -->
      <div class="grid grid-cols-2 gap-4">
        <div class="bg-white/[0.02] border border-white/5 p-4 flex flex-col items-center group hover:bg-white/[0.04] transition-all">
          <div class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-widest mb-1 group-hover:text-gold transition-colors">Accumulated_Runtime</div>
          <div class="text-lg font-mono font-black text-white tabular-nums tracking-tighter">{{ totalWatchedHours }}H {{ totalWatchedMinutes }}M</div>
        </div>
        <div class="bg-white/[0.02] border border-white/5 p-4 flex flex-col items-center group hover:bg-white/[0.04] transition-all">
          <div class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-widest mb-1 group-hover:text-white transition-colors">Asset_Nodes_Synced</div>
          <div class="text-lg font-mono font-black text-industrial-100 tabular-nums tracking-tighter">{{ viewingStore.watchedAnime.size }}U</div>
        </div>
      </div>

      <!-- Affinity Matrix (Progress Bars) -->
      <div v-if="topGenres.length > 0" class="quantic-reveal">
        <div class="flex items-center gap-3 mb-6">
           <h4 class="text-[8px] font-display font-bold text-gold tracking-[0.4em] uppercase">Genre_Affinity_Matrix</h4>
           <div class="flex-1 h-px bg-white/5"></div>
        </div>
        
        <div class="space-y-6">
          <div v-for="[genre, count] in topGenres" :key="genre" class="space-y-2">
            <div class="flex justify-between items-baseline">
              <span class="text-[8px] font-display font-black text-white uppercase tracking-widest">{{ genre }}</span>
              <span class="text-[9px] font-mono text-industrial-500 tabular-nums">{{ count }}_BIAS</span>
            </div>
            <!-- Tactical Segmented Progress -->
            <div class="flex gap-1 h-1.5">
              <div 
                v-for="i in 10" 
                :key="i"
                class="flex-1 transition-all duration-700"
                :class="(i / 10) * 100 <= (count / Math.max(...topGenres.map(([,c]) => c))) * 100 
                        ? 'bg-gold shadow-[0_0_5px_#D4A574/50]' 
                        : 'bg-white/5'"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- System Prompt Readout -->
      <div class="bg-black/40 border border-white/5 p-4 quantic-reveal relative">
        <div class="absolute top-0 right-0 w-1.5 h-px bg-gold/40"></div>
        <div class="flex items-start gap-3">
          <span class="text-gold font-bold text-[9px] animate-pulse">>></span>
          <div class="text-[8px] font-display font-black text-industrial-300 uppercase tracking-wider leading-relaxed">
            <span v-if="stats.consecutiveDays < 7">
              MAINTAIN_TERMINAL_UPTIME_LINK FOR <span class="text-gold">{{ 7 - stats.consecutiveDays }}</span>_DAYS TO ACHIEVE [ENTHUSIAST_LEVEL] AUTHORIZATION.
            </span>
            <span v-else-if="stats.consecutiveDays < 14">
              MAINTAIN_TERMINAL_UPTIME_LINK FOR <span class="text-gold">{{ 14 - stats.consecutiveDays }}</span>_DAYS TO ACHIEVE [EXPERT_LEVEL] AUTHORIZATION.
            </span>
            <span v-else-if="stats.consecutiveDays < 30">
              MAINTAIN_TERMINAL_UPTIME_LINK FOR <span class="text-gold">{{ 30 - stats.consecutiveDays }}</span>_DAYS TO ACHIEVE [MASTER_LEVEL] AUTHORIZATION.
            </span>
            <span v-else>
              MAXIMUM_AUTHORIZATION_TIER_ACHIEVED. CONTINUOUS_SYNC_RECOMMENDED.
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <div v-else class="flex-1 flex flex-col items-center justify-center py-20 opacity-20">
      <div class="text-5xl mb-6 grayscale brightness-0 invert">🛡️</div>
      <p class="text-[8px] font-display font-bold text-white uppercase tracking-[0.5em] text-center px-12 leading-loose">
        ENCRYPTION_PROTOCOL_ACTIVE // IDENTITY_CONFIRMATION_REQUIRED
      </p>
    </div>
  </div>
</template>

<style scoped>
.scrollbar-tactical::-webkit-scrollbar {
  width: 1px;
}
.scrollbar-tactical::-webkit-scrollbar-track {
  @apply bg-transparent;
}
.scrollbar-tactical::-webkit-scrollbar-thumb {
  @apply bg-gold/10 hover:bg-gold/30;
}
</style>