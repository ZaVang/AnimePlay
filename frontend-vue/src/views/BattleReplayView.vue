<script setup lang="ts">
/**
 * Battle Replay View - Mission Archives Standard
 */
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { BattleReplayManager, type ReplayState } from '@/core/replay/BattleReplayManager';
import type { BattleSessionLog, ActionRecord } from '@/types/debug';
import ActionDetailCard from '@/components/replay/ActionDetailCard.vue';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const replayManager = ref<BattleReplayManager>(new BattleReplayManager());
const replayState = ref<ReplayState | null>(null);
const currentAction = ref<ActionRecord | null>(null);
const sessionInfo = ref<any>(null);
const sessionActions = ref<ActionRecord[]>([]);

const fileInput = ref<HTMLInputElement | null>(null);
const showActionDetails = ref(false);
const selectedActionIndex = ref(-1);

// Playback Logic
const controls = computed(() => replayManager.value.getControls());
const progress = computed(() => replayManager.value.getProgress());

const isLoaded = computed(() => replayState.value !== null);
const isPlaying = computed(() => replayState.value?.isPlaying || false);
const canStepBack = computed(() => (replayState.value?.currentActionIndex || 0) > -1);
const canStepForward = computed(() => {
  if (!replayState.value || !sessionInfo.value) return false;
  return replayState.value.currentActionIndex < sessionInfo.value.actionCount - 1;
});

onMounted(() => {
  replayManager.value.setOnStateChange((state: ReplayState) => {
    replayState.value = state;
    currentAction.value = replayManager.value.getCurrentAction();
  });
});

onUnmounted(() => replayManager.value.cleanup());

watch(() => replayState.value?.currentActionIndex, (newIndex) => {
  if (newIndex !== undefined && newIndex >= 0) selectedActionIndex.value = newIndex;
});

function loadLogFile() { fileInput.value?.click(); }

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
      if (fileInput.value) fileInput.value.value = '';
    } catch (error) {
      console.error('Archive read error:', error);
    }
  };
  reader.readAsText(file);
}

const speedOptions = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1.0x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2.0x' }
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function getActionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'play_card': 'CARD_EXEC',
    'clash_resolve': 'CLASH_RESL',
    'turn_end': 'CYCLE_END',
    'turn_start': 'CYCLE_INIT',
    'skill_activation': 'SKILL_ACTV',
    'effect_apply': 'EFFECT_APPLY'
  };
  return labels[type] || type.toUpperCase();
}

function jumpToAction(index: number) {
  controls.value.jumpToAction(index);
  selectedActionIndex.value = index;
}

function getPlayerName(playerId: 'playerA' | 'playerB'): string {
  if (!replayState.value) return playerId.toUpperCase();
  return replayState.value[playerId].name.toUpperCase();
}
</script>

<template>
  <div class="battle-replay-slate p-6 md:p-12 space-y-12 font-mono relative overflow-hidden">
    <!-- Background Static -->
    <div class="fixed inset-0 bg-scanline opacity-10 pointer-events-none"></div>
    
    <!-- Top Bar: Archive Status -->
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-12 relative z-10">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
           <div class="w-1 h-4 bg-cyan-400"></div>
           <h2 class="text-[10px] font-display font-bold text-cyan-400 tracking-[0.5em] uppercase opacity-70">Mission_Archives</h2>
        </div>
        <h1 class="text-4xl font-display font-black tracking-tighter uppercase text-white italic scale-y-110">PLAYBACK_LOGIC_STREAM</h1>
      </div>
      
      <div class="flex items-center gap-6 pb-1">
        <TacticalButton variant="secondary" size="md" @click="loadLogFile">LOAD_MISSION_DATA</TacticalButton>
        <input ref="fileInput" type="file" accept=".json" @change="handleFileChange" class="hidden" />
      </div>
    </header>

    <!-- Content: Mission Data -->
    <main v-if="isLoaded" class="quantic-reveal space-y-12 relative z-10">
      
      <!-- Metadata Matrix -->
      <div v-if="sessionInfo" class="grid grid-cols-2 md:grid-cols-4 gap-4 p-8 border border-white/5 bg-black/40">
        <div v-for="(val, key) in { 'Archive_ID': sessionInfo.sessionId, 'Duration': formatTime(sessionInfo.duration), 'Total_Actions': sessionInfo.actionCount, 'Winner': sessionInfo.winner ? getPlayerName(sessionInfo.winner) : 'N/A' }" :key="key" class="space-y-2">
          <div class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-widest">{{ key }}</div>
          <div class="text-xs font-mono font-black text-white tracking-widest tabular-nums uppercase border-l border-white/10 pl-3 italic">{{ val }}</div>
        </div>
      </div>

      <!-- Playback Console -->
      <GlassPanel :reveal="false" class="border-cyan-400/20 bg-cyan-400/[0.01] p-8">
        <div class="flex flex-col md:flex-row items-center justify-between gap-12">
          <!-- Main Sequential Controls -->
           <div class="flex items-center gap-4">
             <TacticalButton variant="secondary" size="sm" @click="controls.stop()">STOP_SEQ</TacticalButton>
             <TacticalButton variant="secondary" size="sm" :disabled="!canStepBack" @click="controls.stepBackward()">PREV_STEP</TacticalButton>
             <TacticalButton variant="primary" size="md" class="min-w-[150px]" @click="isPlaying ? controls.pause() : controls.play()">
               {{ isPlaying ? 'PAUSE_BITSTREAM' : 'EXECUTE_STREAM' }}
             </TacticalButton>
             <TacticalButton variant="secondary" size="sm" :disabled="!canStepForward" @click="controls.stepForward()">NEXT_STEP</TacticalButton>
           </div>

           <!-- Playback Frequency -->
           <div class="flex flex-col items-end gap-2">
              <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-widest">Temporal_Frequency</div>
              <div class="flex gap-2">
                <button 
                  v-for="opt in speedOptions" 
                  :key="opt.value"
                  @click="controls.setSpeed(opt.value)"
                  class="text-[9px] font-mono px-3 py-1.5 border transition-all"
                  :class="replayState?.playbackSpeed === opt.value ? 'bg-cyan-400 text-black border-cyan-400 font-bold' : 'text-industrial-500 border-white/5 hover:border-white/20'"
                >
                  {{ opt.label }}
                </button>
              </div>
           </div>
        </div>

        <!-- Scrubber: Tactical Track -->
        <div class="mt-10 relative h-1 bg-white/5 overflow-hidden">
           <div class="h-full bg-cyan-400 shadow-[0_0_10px_#22D3EE] transition-all duration-300" :style="{ width: `${progress}%` }"></div>
        </div>
      </GlassPanel>

      <!-- Tactical Analytics Layer -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
        
        <!-- Field Manifest -->
        <div class="lg:col-span-8 space-y-12">
           <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
              <!-- Operative A State -->
              <div class="space-y-6">
                <div class="flex items-center gap-4 border-l-2 border-cyan-400 pl-4">
                   <div class="w-1.5 h-1.5 bg-cyan-400"></div>
                   <h3 class="text-xs font-display font-black text-white uppercase italic tracking-widest">{{ replayState?.playerA.name }}</h3>
                </div>
                <GlassPanel :reveal="false" class="border-white/5 bg-white/[0.01] p-6">
                   <div class="grid grid-cols-3 gap-6 text-center">
                     <div v-for="(v, k) in { 'REPUTATION': replayState?.playerA.reputation, 'TP_AMP': replayState?.playerA.tp, 'LOADOUT': replayState?.playerA.handCount }" :key="k" class="space-y-2">
                        <div class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-[0.2em]">{{ k }}</div>
                        <div class="text-2xl font-mono font-black text-white tracking-tighter">{{ v }}</div>
                     </div>
                   </div>
                </GlassPanel>
              </div>

              <!-- Operative B State -->
              <div class="space-y-6">
                <div class="flex items-center gap-4 flex-row-reverse text-right border-r-2 border-clinical-danger pr-4">
                   <div class="w-1.5 h-1.5 bg-clinical-danger"></div>
                   <h3 class="text-xs font-display font-black text-white uppercase italic tracking-widest">{{ replayState?.playerB.name }}</h3>
                </div>
                <GlassPanel :reveal="false" class="border-white/5 bg-white/[0.01] p-6">
                   <div class="grid grid-cols-3 gap-6 text-center">
                     <div v-for="(v, k) in { 'REPUTATION': replayState?.playerB.reputation, 'TP_AMP': replayState?.playerB.tp, 'LOADOUT': replayState?.playerB.handCount }" :key="k" class="space-y-2">
                        <div class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-[0.2em]">{{ k }}</div>
                        <div class="text-2xl font-mono font-black text-white tracking-tighter">{{ v }}</div>
                     </div>
                   </div>
                </GlassPanel>
              </div>
           </div>

           <!-- Action Focus Node -->
           <div v-if="currentAction" class="quantic-reveal">
              <div class="flex items-center gap-3 mb-6">
                 <h4 class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-[0.5em]">Tactical_Focus_Matrix</h4>
                 <div class="flex-1 h-px bg-white/5"></div>
              </div>
              <ActionDetailCard :action="currentAction" />
           </div>
        </div>

        <!-- Action Timeline Stream -->
        <div class="lg:col-span-4 space-y-6">
           <div class="flex items-center justify-between border-b border-white/5 pb-4">
             <h3 class="text-[10px] font-display font-bold text-gold tracking-widest uppercase">Action_Timeline_Stream</h3>
             <TacticalButton variant="secondary" size="xs" @click="showActionDetails = !showActionDetails">
               {{ showActionDetails ? 'MASK_METADATA' : 'EXPOSE_METADATA' }}
             </TacticalButton>
           </div>

           <div class="timeline-scroll h-[60vh] overflow-y-auto space-y-3 pr-4 scrollbar-tactical">
              <div
                v-for="(action, index) in sessionActions"
                :key="index"
                @click="jumpToAction(index)"
                class="timeline-node p-4 border transition-all cursor-pointer group relative overflow-hidden"
                :class="[
                  index === replayState?.currentActionIndex ? 'bg-cyan-400/10 border-cyan-400/60' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]',
                  index === selectedActionIndex ? 'ring-1 ring-gold/40 shadow-[0_0_15px_rgba(212,165,116,0.1)]' : ''
                ]"
              >
                <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>
                
                <div class="flex items-center gap-5 relative z-10">
                  <div class="text-[10px] font-mono font-black opacity-30 tabular-nums">#{{ String(index + 1).padStart(3, '0') }}</div>
                  <div class="flex-1">
                    <div class="flex justify-between items-center mb-1.5">
                      <span class="text-[10px] font-display font-black text-white uppercase tracking-widest italic">{{ getActionTypeLabel(action.actionType) }}</span>
                      <span class="text-[8px] font-mono font-bold text-cyan-400 tracking-widest px-1.5 py-0.5 bg-cyan-400/10">{{ getPlayerName(action.playerId) }}</span>
                    </div>
                    <div class="text-[10px] text-industrial-500 uppercase tracking-tighter line-clamp-1 leading-tight">{{ action.description }}</div>
                  </div>
                </div>
                <div v-if="showActionDetails && action.details" class="mt-4 pt-4 border-t border-white/5 relative z-10 quantic-reveal">
                  <pre class="text-[9px] font-mono text-industrial-400 overflow-x-hidden leading-relaxed">{{ JSON.stringify(action.details, null, 2) }}</pre>
                </div>
              </div>
           </div>
        </div>
      </div>
    </main>

    <!-- Initial State: Connection Pending -->
    <div v-else class="h-[75vh] flex items-center justify-center relative z-10">
       <div class="text-center space-y-10 max-w-sm group">
          <div class="relative flex items-center justify-center">
             <div class="w-16 h-16 border border-white/10 group-hover:border-white/30 rotate-45 transition-all duration-1000"></div>
             <div class="absolute w-12 h-12 border border-gold/10 group-hover:border-gold/30 -rotate-12 transition-all duration-1000"></div>
             <div class="absolute font-display font-black text-white/10 group-hover:text-gold/60 text-xl tracking-widest">ARCHV</div>
          </div>
          <div class="space-y-4">
            <h3 class="text-sm font-display font-bold text-white uppercase tracking-[0.5em]">Awaiting_Uplink_Signal</h3>
            <p class="text-[9px] text-industrial-500 uppercase leading-relaxed tracking-[0.1em] px-8">Feed mission_archive.json into the terminal buffer to initiate decryption and playback protocols.</p>
          </div>
          <div class="flex justify-center pt-4">
            <TacticalButton variant="primary" size="md" @click="loadLogFile">INITIATE_HANDSHAKE</TacticalButton>
          </div>
       </div>
    </div>

    <!-- Final Infrastructure Reading -->
    <footer class="fixed bottom-4 right-8 text-[6px] font-display font-bold text-industrial-700 uppercase tracking-[0.8em] opacity-40 z-20 pointer-events-none">
       System_Replay_Engine_v1.2.0 // Buffering_Status: Nominal
    </footer>
  </div>
</template>

<style scoped>
.battle-replay-slate {
  min-height: calc(100vh - 80px);
}
.timeline-node {
  clip-path: polygon(0 0, 100% 0, 100% 85%, 95% 100%, 0 100%);
}
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