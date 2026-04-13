<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { battleDebugLogger } from '@/core/debug/BattleDebugLogger';
import type { DebugConfig, BattleSessionLog } from '@/types/debug';
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const isVisible = ref(false);
const config = reactive<DebugConfig>({
  enabled: false,
  logLevel: 'normal',
  trackCalculations: true,
  trackEffects: true,
  trackStateChanges: true,
  autoExport: false,
  maxActionsPerSession: 1000
});
const sessionSummary = ref<string | null>(null);

const refreshConfig = () => {
  const currentConfig = battleDebugLogger.getConfig();
  Object.assign(config, currentConfig);
};

const updateSummary = () => {
  sessionSummary.value = battleDebugLogger.getSessionSummary();
};

let summaryTimer: any = null;

onMounted(() => {
  refreshConfig();
  updateSummary();
  updateCurrentSession();
  summaryTimer = setInterval(() => {
    updateSummary();
    updateCurrentSession();
  }, 3000);
});

onUnmounted(() => {
  if (summaryTimer) clearInterval(summaryTimer);
});

const currentSessionData = ref<BattleSessionLog | null>(null);

const updateCurrentSession = () => {
  try {
    const session = battleDebugLogger.getCurrentSession();
    currentSessionData.value = session;
  } catch (error) {
    currentSessionData.value = null;
  }
};

const currentSession = computed(() => currentSessionData.value);

function toggleDebugMode() {
  const newEnabled = !config.enabled;
  battleDebugLogger.configure({ enabled: newEnabled });
  if (newEnabled && !battleDebugLogger.getCurrentSession()) {
    battleDebugLogger.startSession('Player Deck', 'AI Deck', 'Unknown');
  }
  config.enabled = newEnabled;
  updateCurrentSession();
  setTimeout(refreshConfig, 100);
}

function updateConfig() {
  battleDebugLogger.configure(config);
  setTimeout(refreshConfig, 100);
}

function exportLog() {
  battleDebugLogger.exportSession();
}

function clearSession() {
  if (confirm('INIT_PURGE_SEQUENCE: CLEAR ACTIVE DEBUG SESSION?')) {
    battleDebugLogger.cleanup();
    updateSummary();
  }
}

function copySessionId() {
  if (currentSession.value) {
    (window as any).navigator.clipboard.writeText(currentSession.value.sessionId);
    console.log('STATUS // SESSION_ID_COPIED');
  }
}

const showDetailedLog = ref(false);
const detailedLogData = ref<string>('');

function viewDetailedLog() {
  if (currentSession.value) {
    detailedLogData.value = JSON.stringify(currentSession.value, null, 2);
    showDetailedLog.value = true;
  }
}

function copyDetailedLog() {
  if (detailedLogData.value) {
    (window as any).navigator.clipboard.writeText(detailedLogData.value);
    console.log('STATUS // RAW_BUFFER_COPIED');
  }
}

function togglePanel() {
  isVisible.value = !isVisible.value;
}
</script>

<template>
  <!-- Debug Toggle: Tactical Node -->
  <div class="fixed top-20 right-4 z-50">
    <button
      @click="togglePanel"
      class="w-12 h-10 bg-black/80 backdrop-blur-md border border-gold/40 text-gold flex flex-col items-center justify-center transition-all group overflow-hidden"
      :class="{ 'animate-pulse bg-gold/5 shadow-[0_0_15px_rgba(212,165,116,0.2)]': config.enabled }"
    >
      <div class="absolute inset-0 bg-scanline opacity-10 pointer-events-none"></div>
      <span class="text-[9px] font-display font-black tracking-widest relative z-10">AUDIT</span>
      <div class="w-2 h-[2px]" :class="config.enabled ? 'bg-gold' : 'bg-gold/20'"></div>
    </button>
  </div>

  <!-- Debug Panel Overlay: Strategic Archive -->
  <div v-if="isVisible" class="fixed inset-0 z-[100] flex items-center justify-center p-6">
    <div class="absolute inset-0 bg-black/90 backdrop-blur-2xl" @click="togglePanel"></div>
    
    <GlassPanel class="max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col border-gold/30 shadow-3xl quantic-reveal px-0">
      <template #header>
        <div class="flex justify-between items-start mb-8 border-b border-white/5 pb-4 px-8 pt-4">
          <div class="space-y-1">
             <div class="text-[7px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70">Infrastructure_Audit</div>
             <h3 class="text-xl font-display font-black tracking-tighter text-white uppercase italic">STRATEGIC_AUDIT_CONSOLE</h3>
          </div>
          <button @click="togglePanel" class="text-industrial-600 hover:text-white font-mono text-xl transition-colors p-2">
            [ X ]
          </button>
        </div>
      </template>

      <div class="flex-1 overflow-y-auto px-8 space-y-10 scrollbar-tactical pb-10">
        <!-- Control Stratum -->
        <section class="space-y-4">
          <h4 class="text-[8px] font-display font-bold text-gold/40 tracking-[0.3em] uppercase italic">System_Activation_Protocol</h4>
          <div class="bg-white/[0.02] p-6 border border-white/5 flex items-center justify-between group">
             <span class="text-[10px] font-display font-black uppercase tracking-widest text-industrial-200 group-hover:text-white transition-colors">Debugger_Uplink_Cycle</span>
             <TacticalButton 
                :variant="config.enabled ? 'primary' : 'secondary'" 
                size="sm" 
                @click="toggleDebugMode"
                class="min-w-[120px]"
             >
               {{ config.enabled ? 'DISCONNECT' : 'INITIALIZE' }}
             </TacticalButton>
          </div>
        </section>

        <!-- Config Stratum -->
        <section v-if="config.enabled" class="space-y-4 quantic-reveal" style="animation-delay: 0.1s">
          <h4 class="text-[8px] font-display font-bold text-gold/40 tracking-[0.3em] uppercase italic">Stream_Calibration</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div class="space-y-3">
                <label class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-widest pl-1">Verbosity_Magnitude</label>
                <select v-model="config.logLevel" @change="updateConfig" class="w-full bg-black/60 border border-white/10 p-3 text-[10px] font-display text-gold outline-none uppercase tracking-widest cursor-pointer">
                  <option value="minimal" class="bg-industrial-900">MINIMAL_LOG</option>
                  <option value="normal" class="bg-industrial-900">OPERATIONAL_DATA</option>
                  <option value="verbose" class="bg-industrial-900">EXTENDED_TELEMETRY</option>
                </select>
             </div>
             <div class="flex flex-col gap-4 justify-center">
                <label class="flex items-center gap-4 cursor-pointer group">
                  <div class="w-3 h-3 border border-white/20 flex items-center justify-center transition-all group-hover:border-gold/50">
                     <input type="checkbox" v-model="config.trackCalculations" @change="updateConfig" class="opacity-0 absolute inset-0 cursor-pointer">
                     <div v-if="config.trackCalculations" class="w-1.5 h-1.5 bg-gold shadow-[0_0_5px_#D4A574]"></div>
                  </div>
                  <span class="text-[9px] font-display font-bold text-industrial-400 group-hover:text-white transition-colors uppercase tracking-widest">Track_Intensities</span>
                </label>
                <label class="flex items-center gap-4 cursor-pointer group">
                  <div class="w-3 h-3 border border-white/20 flex items-center justify-center transition-all group-hover:border-gold/50">
                     <input type="checkbox" v-model="config.trackEffects" @change="updateConfig" class="opacity-0 absolute inset-0 cursor-pointer">
                     <div v-if="config.trackEffects" class="w-1.5 h-1.5 bg-gold shadow-[0_0_5px_#D4A574]"></div>
                  </div>
                  <span class="text-[9px] font-display font-bold text-industrial-400 group-hover:text-white transition-colors uppercase tracking-widest">Track_Activations</span>
                </label>
             </div>
          </div>
        </section>

        <!-- Session Stream Monitor -->
        <section v-if="config.enabled && currentSession" class="space-y-4 quantic-reveal" style="animation-delay: 0.2s">
          <h4 class="text-[8px] font-display font-bold text-gold/40 tracking-[0.3em] uppercase italic">Active_Session_Datastream</h4>
          <div class="bg-black/60 border border-white/10 p-5 relative overflow-hidden group">
             <div class="absolute inset-0 bg-scanline opacity-[0.03]"></div>
             <pre class="text-[10px] font-mono text-cyan/70 scrollbar-none max-h-56 overflow-y-auto leading-relaxed relative z-10">{{ sessionSummary }}</pre>
             <div class="absolute bottom-1 right-2 text-[5px] font-mono text-white/5 uppercase tracking-[0.5em]">DATALAYER_RAW_v2.0</div>
          </div>
          <div class="grid grid-cols-2 lg:grid-cols-5 gap-2">
             <TacticalButton variant="secondary" size="sm" @click="copySessionId">COPY_UID</TacticalButton>
             <TacticalButton variant="secondary" size="sm" @click="viewDetailedLog">INSPECT</TacticalButton>
             <TacticalButton variant="primary" size="sm" @click="exportLog">EXPORT</TacticalButton>
             <router-link to="/battle-replay" class="contents">
                <TacticalButton variant="secondary" size="sm" class="w-full">REPLAY_S</TacticalButton>
             </router-link>
             <TacticalButton variant="danger" size="sm" @click="clearSession">PURGE_M</TacticalButton>
          </div>
        </section>
      </div>

      <template #footer>
         <div class="py-2 flex justify-center bg-black/60 border-t border-white/5">
            <span class="text-[6px] font-mono text-white/10 uppercase tracking-[0.8em]">STRATEGIC_AUDIT_PROTOCOL_LOCKED</span>
         </div>
      </template>
    </GlassPanel>
  </div>

  <!-- Detailed Inspector Modal -->
  <div v-if="showDetailedLog" class="fixed inset-0 z-[200] flex items-center justify-center p-12">
    <div class="absolute inset-0 bg-black/95 backdrop-blur-3xl" @click="showDetailedLog = false"></div>
    <GlassPanel class="max-w-5xl w-full h-[85vh] flex flex-col border-gold/40 shadow-3xl quantic-reveal p-0 overflow-hidden">
      <template #header>
        <div class="flex justify-between items-center px-8 py-6 border-b border-white/5">
           <div class="space-y-1">
              <div class="text-[7px] font-display font-bold text-gold tracking-[0.4em] uppercase opacity-70">Raw_Buffer_Inspection</div>
              <h3 class="text-xl font-display font-black tracking-widest text-white uppercase italic">DATA_LAYER_INSPECTOR</h3>
           </div>
           <TacticalButton variant="secondary" size="sm" @click="showDetailedLog = false">TERMINATE_VIEW</TacticalButton>
        </div>
      </template>
      <div class="flex-grow flex flex-col p-8 overflow-hidden">
         <div class="flex gap-4 mb-6">
           <TacticalButton variant="primary" size="sm" @click="copyDetailedLog">
              COPY_RAW_BUFFER
           </TacticalButton>
         </div>
         <div class="flex-grow bg-black/60 p-8 border border-white/5 relative group overflow-hidden">
            <div class="absolute inset-0 bg-scanline opacity-10 pointer-events-none"></div>
            <pre class="w-full h-full font-mono text-[10px] text-cyan/60 overflow-auto scrollbar-tactical leading-loose">{{ detailedLogData }}</pre>
         </div>
      </div>
    </GlassPanel>
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

.shadow-3xl {
  box-shadow: 0 0 60px rgba(0,0,0,0.9);
}

.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>