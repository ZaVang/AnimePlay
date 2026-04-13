<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { usePlayerStore, useGameStore } from '@/stores/battle';
import { hasSkillEffect, runEffect } from '@/skills/registry';
import type { CharacterCard } from '@/types/card';

// Atomic Components
import TacticalButton from '@/components/ui/TacticalButton.vue';

const gameDataStore = useGameDataStore();
const playerStore = usePlayerStore();
const gameStore = useGameStore();

const taigaCharacter = ref<CharacterCard | null>(null);
const playerReputation = ref(25);
const playerTP = ref(10);
const activeEffects = ref<any[]>([]);
const testLogs = ref<Array<{ time: string; message: string; type: string }>>([]);

const skillStatus = computed(() => [
  {
    name: 'PALM_TIGER_STRIKE',
    id: '逢坂大河_掌中老虎',
    registered: hasSkillEffect('逢坂大河_掌中老虎')
  },
  {
    name: 'TSUNDERE_REACTION',
    id: '逢坂大河_傲娇反击',
    registered: hasSkillEffect('逢坂大河_傲娇反击')
  }
]);

const canUsePalmTiger = computed(() => {
  return playerReputation.value < 30 && playerTP.value >= 3;
});

function addLog(message: string, type = 'info') {
  const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
  testLogs.value.unshift({ time, message: message.toUpperCase(), type }); // Unshift to see latest first
}

function updateReputation() {
  playerStore.playerA.reputation = playerReputation.value;
  addLog(`REPUTATION_BIAS_UPDATED: ${playerReputation.value}`);
}

function updateTP() {
  playerStore.playerA.tp = playerTP.value;
  addLog(`TP_AMPLITUDE_SYNCED: ${playerTP.value}`);
}

async function testSkillRegistration() {
  addLog('INITIATING_REGISTRATION_AUDIT...');
  for (const skill of skillStatus.value) {
    addLog(`${skill.id}: ${skill.registered ? 'READY' : 'NULL'}`, skill.registered ? 'success' : 'error');
  }
}

async function usePalmTiger() {
  try {
    addLog('EXECUTING: PALM_TIGER_STRIKE');
    await runEffect('逢坂大河_掌中老虎', {
      event: 'onPlay',
      playerId: 'playerA',
      role: 'attacker'
    });
    addLog('PROTOCOL_SUCCESS: PALM_TIGER_STRIKE_CONFIRMED', 'success');
  } catch (error) {
    addLog(`PROTOCOL_FAILURE: ${error}`, 'error');
  }
}

async function activateTsundereCounter() {
  try {
    addLog('EXECUTING: TSUNDERE_REACTION');
    await runEffect('逢坂大河_傲娇反击', {
      event: 'onPlay',
      playerId: 'playerA',
      role: 'attacker'
    });
    addLog('PROTOCOL_SUCCESS: TSUNDERE_REACTION_ACTIVE', 'success');
  } catch (error) {
    addLog(`PROTOCOL_FAILURE: ${error}`, 'error');
  }
}

onMounted(() => {
  taigaCharacter.value = gameDataStore.getCharacterCardById(1762);
  if (taigaCharacter.value) {
    addLog(`OPERATIVE_IDENTIFIED: ${taigaCharacter.value.name}`, 'success');
    playerStore.playerA.characters[0] = taigaCharacter.value;
    playerStore.playerA.activeCharacterIndex = 0;
  } else {
    addLog('CRITICAL_FAILURE: OPERATIVE_DATA_NOT_FOUND', 'error');
  }
  updateReputation();
  updateTP();
  addLog('SIMULATION_CHAMBER_INITIALIZED');
});
</script>

<template>
  <div class="skill-test-simulation min-h-screen bg-black text-white p-8 font-mono relative overflow-hidden">
    <!-- Static Backdrop Decoration -->
    <div class="fixed inset-0 bg-scanline opacity-10 pointer-events-none"></div>
    <div class="fixed inset-0 bg-grid opacity-5 pointer-events-none"></div>

    <!-- Header Protocol -->
    <div class="flex justify-between items-end mb-12 border-b border-white/10 pb-6 relative z-10">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
           <div class="w-1 h-4 bg-gold"></div>
           <h2 class="text-[10px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70">Simulation_Chamber</h2>
        </div>
        <h1 class="text-4xl font-display font-black tracking-tighter uppercase italic scale-y-110">
          PERSONNEL_SIM_PROTO // {{ taigaCharacter?.name || 'UNKNOWN_OP' }}
        </h1>
      </div>
      <div class="text-[8px] text-industrial-600 uppercase tracking-[0.5em] pb-1">Operational_v0.8.4_Debug</div>
    </div>

    <!-- Simulation Matrix -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
      
      <!-- Registration Index -->
      <section class="bg-black/60 border border-white/5 p-6 space-y-4 shadow-2xl">
        <div class="flex items-center gap-2 mb-4 border-l-2 border-gold/40 pl-3">
           <h4 class="text-[9px] font-display font-black text-industrial-400 uppercase tracking-widest">Registration_Index</h4>
        </div>
        <div class="space-y-3">
          <div v-for="skill in skillStatus" :key="skill.name" class="flex justify-between items-center bg-white/[0.02] p-3 border border-white/5">
            <span class="text-[10px] font-display font-black text-white tracking-widest">{{ skill.name }}</span>
            <div class="flex items-center gap-2">
               <div class="w-1.5 h-1.5" :class="skill.registered ? 'bg-gold' : 'bg-clinical-danger'"></div>
               <span class="text-[8px] font-mono font-bold" :class="skill.registered ? 'text-gold' : 'text-clinical-danger'">
                 {{ skill.registered ? 'REGISTERED' : 'NULL_STATE' }}
               </span>
            </div>
          </div>
        </div>
      </section>

      <!-- Personnel Bios -->
      <section class="bg-black/60 border border-white/5 p-6 space-y-4 shadow-2xl">
        <div class="flex items-center gap-2 mb-4 border-l-2 border-gold/40 pl-3">
           <h4 class="text-[9px] font-display font-black text-industrial-400 uppercase tracking-widest">Personnel_Bios</h4>
        </div>
        <div v-if="taigaCharacter" class="space-y-3 text-[10px]">
           <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-industrial-500">IDENTIFIER:</span> <span class="text-white">{{ taigaCharacter.name }}</span></div>
           <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-industrial-500">NODE_UID:</span> <span class="text-gold">{{ taigaCharacter.id }}</span></div>
           <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-industrial-500">SPEC_CLASS:</span> <span class="text-white">{{ taigaCharacter.rarity }}</span></div>
           <div class="flex justify-between border-b border-white/5 pb-1"><span class="text-industrial-500">SKILL_NODES:</span> <span class="text-white">{{ taigaCharacter.skills?.length || 0 }}_UNITS</span></div>
        </div>
        <p v-else class="text-clinical-danger text-[9px] font-black animate-pulse">CRITICAL_FAILURE: BIOS_STREAM_INTERRUPTED</p>
      </section>

      <!-- Param Configuration -->
      <section class="bg-black/60 border border-white/5 p-6 space-y-4 shadow-2xl">
        <div class="flex items-center gap-2 mb-4 border-l-2 border-gold/40 pl-3">
           <h4 class="text-[9px] font-display font-black text-industrial-400 uppercase tracking-widest">Param_Configuration</h4>
        </div>
        <div class="space-y-5">
           <div class="space-y-2">
              <label class="text-[8px] text-industrial-500 uppercase tracking-widest pl-1">Reputation_Bias</label>
              <input v-model.number="playerReputation" type="number" 
                     class="w-full bg-black/60 border border-white/10 p-2 text-gold font-mono text-xl outline-none focus:border-gold/50 transition-all tabular-nums"
                     @change="updateReputation">
           </div>
           <div class="space-y-2">
              <label class="text-[8px] text-industrial-500 uppercase tracking-widest pl-1">TP_Amplitude</label>
              <input v-model.number="playerTP" type="number" 
                     class="w-full bg-black/60 border border-white/10 p-2 text-white font-mono text-xl outline-none focus:border-gold/50 transition-all tabular-nums"
                     @change="updateTP">
           </div>
        </div>
      </section>

      <!-- Simulation Controls -->
      <section class="bg-black/60 border border-white/5 p-6 space-y-4 shadow-2xl md:col-span-2 lg:col-span-1">
        <div class="flex items-center gap-2 mb-4 border-l-2 border-gold/40 pl-3">
           <h4 class="text-[9px] font-display font-black text-industrial-400 uppercase tracking-widest">Simulation_Controls</h4>
        </div>
        <div class="grid grid-cols-1 gap-3">
          <TacticalButton @click="testSkillRegistration" variant="secondary" size="md">SYNC_AUDIT</TacticalButton>
          <TacticalButton @click="usePalmTiger" variant="primary" size="md" :disabled="!canUsePalmTiger">EXECUTE_PALM_STRIKE</TacticalButton>
          <TacticalButton @click="activateTsundereCounter" variant="secondary" size="md">ACTIVATE_TSUNDERE_REACTION</TacticalButton>
        </div>
      </section>

      <!-- Active Log Stream -->
      <section class="bg-black/60 border border-white/5 p-6 space-y-4 shadow-2xl md:col-span-2">
        <div class="flex items-center justify-between mb-4 border-l-2 border-gold/40 pl-3">
           <h4 class="text-[9px] font-display font-black text-industrial-400 uppercase tracking-widest">Active_Simulation_Log_Stream</h4>
           <span class="text-[7px] text-industrial-600 uppercase tracking-widest">Buffer_Active</span>
        </div>
        <div class="bg-black border border-white/10 p-4 h-56 overflow-hidden relative">
           <div class="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black to-transparent pointer-events-none z-10"></div>
           <div class="space-y-1.5 h-full overflow-y-auto scrollbar-none relative z-0">
             <div v-for="(log, index) in testLogs" :key="index" class="text-[10px] flex gap-4 group">
               <span class="text-industrial-700 font-bold tabular-nums">[{{ log.time }}]</span>
               <span class="flex-1 tracking-tight" :class="{
                 'text-clinical-danger': log.type === 'error',
                 'text-gold': log.type === 'success',
                 'text-industrial-300': log.type === 'info'
               }">
                 {{ log.message }}
               </span>
               <div class="w-1 h-3 group-first:bg-gold/20"></div>
             </div>
           </div>
        </div>
      </section>
    </div>

    <!-- Secondary info tag -->
    <div class="fixed bottom-4 left-6 text-[7px] font-display font-bold text-industrial-600 uppercase tracking-[0.6em] opacity-40">
       Simulation_Session_ID: 0x{{ Date.now().toString(16).toUpperCase() }} // Mode: Tactical_Stress_Test
    </div>
  </div>
</template>

<style scoped>
.bg-grid {
  background-size: 40px 40px;
  background-image: 
    linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
}

.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }

.shadow-2xl {
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.8);
}
</style>