<script setup lang="ts">
/**
 * Squad Battle View - Tactical Briefing Standard
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

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const authStore = useAuthStore();
const nurtureStore = useNurtureStore();
const gameDataStore = useGameDataStore();

const { 
  currentPhase, 
  playerSquad, 
  enemySquad, 
  battleLog, 
  currentTurn, 
  isPlayerTurn, 
  battleResult, 
  selectedSquadForBattle,
  towerEnemyData,
  returnToTowerMode
} = useBattleState();

const squadManager = useSquadManager();
const { 
  currentTowerFloor, 
  startTowerBattle, 
  refreshTowerEnemies, 
  executeRound, 
  autoFinishBattle 
} = useTowerBattle(
  playerSquad,
  enemySquad,
  currentPhase,
  battleLog,
  currentTurn,
  isPlayerTurn,
  battleResult,
  selectedSquadForBattle,
  ref('tower'), // currentBattleMode
  towerEnemyData,
  squadManager.createSquadMember
);

const persistence = useBattlePersistence(
  currentPhase,
  towerEnemyData
);

const showCharacterSelectModal = ref(false);
const selectedPosition = ref(0);
const editingSquadId = ref<number | null>(null);

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
  startTowerBattle(squadId);
  persistence.saveState();
}

function handleRestart() {
  returnToTowerMode();
  persistence.saveState();
}

function handleRetryBattle(squadId: number) {
  startTowerBattle(squadId);
}

onMounted(() => persistence.loadState());
onBeforeUnmount(() => persistence.saveState());
</script>

<template>
  <div class="squad-battle-view bg-black relative overflow-hidden font-ui">
    <!-- Atmospheric Underlay -->
    <div class="absolute inset-0 bg-grid opacity-10 pointer-events-none"></div>
    <div class="absolute inset-0 bg-scanlines opacity-[0.03] pointer-events-none"></div>
    
    <div class="relative z-10 p-4 md:p-8 space-y-12">
      <!-- PHASE: Tower Mode Dashboard -->
      <template v-if="currentPhase === 'towerMode'">
        <!-- Header: Command Center -->
        <header class="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-10">
          <div class="space-y-2">
            <h2 class="text-[10px] font-display font-bold text-gold tracking-[0.6em] uppercase opacity-70">Logistics Command</h2>
            <h1 class="text-5xl font-display font-black tracking-tighter uppercase text-white leading-none">Strategic Tower</h1>
            <div class="text-[8px] font-mono text-industrial-600 uppercase tracking-widest mt-2">Coordinates: Sector_7-04 // Mode: Tactical_Engagement</div>
          </div>
          
          <div class="flex items-center gap-6">
            <div class="text-right border-r border-white/10 pr-6">
               <div class="text-[8px] font-display text-industrial-500 uppercase tracking-widest">Protocol Version</div>
               <div class="text-xs font-mono text-white opacity-80 uppercase">APV.1044-T</div>
            </div>
            <div class="bg-gold/[0.03] px-8 py-4 border border-gold/20 relative group">
               <div class="absolute top-0 right-0 w-1 h-1 bg-gold animate-pulse"></div>
               <span class="text-[9px] font-display text-gold/60 uppercase tracking-widest block mb-1">Target Floor</span>
               <span class="text-3xl font-display font-black text-gold tabular-nums">FL-{{ String(currentTowerFloor).padStart(2, '0') }}</span>
            </div>
          </div>
        </header>
        
        <!-- Login Check -->
        <div v-if="!authStore.isLoggedIn" class="py-32 text-center space-y-4">
          <div class="text-4xl opacity-10">🔒</div>
          <p class="text-industrial-500 font-display text-[10px] tracking-[0.4em] uppercase">Auth Required // Database Closed</p>
          <TacticalButton variant="primary" size="sm">UPLINK_IDENTITY</TacticalButton>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 quantic-reveal items-start">
          
          <!-- Left: Intelligence Dossier -->
          <div class="lg:col-span-4 space-y-8">
             <GlassPanel :reveal="false" class="border-white/5 bg-white/[0.01]">
               <template #header>
                 <div class="p-6 border-b border-white/5 bg-white/[0.02]">
                    <div class="text-[9px] font-display font-black text-gold tracking-[0.3em] uppercase opacity-80 mb-1">Combat Dossier</div>
                    <div class="text-lg font-display font-bold text-white uppercase tracking-tighter">Enemy Intelligence</div>
                 </div>
               </template>
               
               <div class="p-6 space-y-8">
                  <div v-if="!towerEnemyData" class="py-16 text-center space-y-6">
                     <div class="text-5xl opacity-5 animate-pulse">📡</div>
                     <div class="space-y-1">
                        <p class="text-[10px] text-industrial-500 uppercase tracking-widest">No Signal Detected</p>
                        <p class="text-[8px] text-industrial-600 uppercase">Scanning environment...</p>
                     </div>
                     <TacticalButton variant="primary" size="sm" @click="refreshTowerEnemies">Initiate Deep Scan</TacticalButton>
                  </div>
                  
                  <div v-else class="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                     <div class="relative overflow-hidden group">
                        <div class="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div class="space-y-2 relative border-l-2 border-gold/40 pl-4 py-2">
                           <div class="text-2xl font-display font-black text-white uppercase tracking-tighter tabular-nums">{{ towerEnemyData.name }}</div>
                           <div class="text-[9px] text-industrial-500 font-ui uppercase leading-relaxed tracking-wide italic max-w-xs">{{ towerEnemyData.description }}</div>
                        </div>
                     </div>
                     
                     <div class="grid grid-cols-2 gap-px bg-white/5">
                        <div class="bg-black/60 p-4 border border-white/5">
                           <div class="text-[8px] font-display text-industrial-500 uppercase tracking-widest mb-1">Combat Rating</div>
                           <div class="text-2xl font-display text-gold font-bold tabular-nums">{{ towerEnemyData.floorPower }}</div>
                        </div>
                        <div class="bg-black/60 p-4 border border-white/5">
                           <div class="text-[8px] font-display text-industrial-500 uppercase tracking-widest mb-1">Threat Status</div>
                           <div class="text-xs font-display font-black uppercase tracking-[0.2em]" :class="{
                             'text-green-400/80': towerEnemyData.difficulty === '简单',
                             'text-yellow-400/80': towerEnemyData.difficulty === '中等',
                             'text-clinical-danger': ['困难', '极难'].includes(towerEnemyData.difficulty)
                           }">{{ towerEnemyData.difficulty }}</div>
                        </div>
                     </div>
                     
                     <!-- Enemy Metadata List -->
                     <ul class="space-y-3 p-1">
                        <li class="flex items-center justify-between group">
                           <span class="text-[8px] font-display text-industrial-600 uppercase">Location_ID</span>
                           <span class="text-[9px] font-mono text-industrial-400 group-hover:text-white transition-colors">77-B/FL-{{ currentTowerFloor }}</span>
                        </li>
                        <li class="flex items-center justify-between group">
                           <span class="text-[8px] font-display text-industrial-600 uppercase">Energy_Sign</span>
                           <span class="text-[9px] font-mono text-gold group-hover:text-gold transition-colors">POS_WAVE</span>
                        </li>
                     </ul>

                     <TacticalButton variant="secondary" size="xs" class="w-full" @click="refreshTowerEnemies">RE_CALIBRATE_INTEL</TacticalButton>
                  </div>
               </div>
             </GlassPanel>

             <!-- Briefing Protocol -->
             <div class="bg-white/[0.01] border border-white/5 p-6 space-y-4 relative">
                <div class="absolute top-0 right-0 w-8 h-8 opacity-5">
                   <svg viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
                </div>
                <h3 class="text-[8px] font-display font-black text-industrial-500 tracking-[0.4em] uppercase">Protocol: Briefing_Delta</h3>
                <ul class="text-[8px] text-industrial-500 space-y-3 font-ui uppercase tracking-widest list-none">
                  <li class="flex items-center gap-3"><span class="w-1 h-1 bg-gold/40"></span> Power intensity increases per cycle</li>
                  <li class="flex items-center gap-3"><span class="w-1 h-1 bg-gold/40"></span> Victory resolves reward manifest</li>
                  <li class="flex items-center gap-3"><span class="w-1 h-1 bg-gold/40"></span> Max: 10 engagements per session</li>
               </ul>
             </div>
          </div>

          <!-- Right: Squad Assembly Control -->
          <div class="lg:col-span-8 space-y-10">
             <div class="flex items-end justify-between border-b border-white/5 pb-6">
               <div class="space-y-1">
                  <h3 class="text-[9px] font-display font-bold text-white tracking-[0.3em] uppercase">Tactical Selection</h3>
                  <p class="text-[7px] font-mono text-industrial-600 uppercase tracking-widest">Available_Presets: {{ nurtureStore.presetSquads.length }} // Max_Sync: FL-{{ nurtureStore.towerProgress.maxFloor }}</p>
               </div>
             </div>

             <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
               <SquadCard
                 v-for="squad in nurtureStore.presetSquads"
                 :key="squad.id"
                 :squad="squad"
                 :current-tower-floor="currentTowerFloor"
                 :has-completed-floor="nurtureStore.hasCompletedFloor(currentTowerFloor)"
                 :tower-enemy-data="towerEnemyData || {}"
                 @start-battle="handleStartBattle"
                 @open-character-select="openCharacterSelect"
                 @update-name="updateSquadName"
               />
             </div>
          </div>
        </div>
      </template>

      <!-- PHASE: Engagement (Battle) -->
      <template v-else-if="currentPhase === 'battle'">
        <div class="quantic-reveal h-[calc(100vh-140px)] flex flex-col">
          <BattleArena
            :player-squad="playerSquad"
            :enemy-squad="enemySquad"
            :battle-log="battleLog"
            :current-turn="currentTurn"
            :is-player-turn="isPlayerTurn"
            @execute-round="executeRound"
            @auto-finish="autoFinishBattle"
          />
        </div>
      </template>

      <!-- PHASE: Debrief (Result) -->
      <template v-else-if="currentPhase === 'result'">
        <div class="quantic-reveal py-12 flex justify-center">
          <div class="max-w-4xl w-full">
            <BattleResult
              :battle-result="battleResult"
              :battle-log="battleLog"
              :selected-squad-for-battle="selectedSquadForBattle || 0"
              @restart="handleRestart"
              @retry-battle="handleRetryBattle"
            />
          </div>
        </div>
      </template>

      <!-- Modals -->
      <CharacterSelectModal
        :is-open="showCharacterSelectModal"
        :position="selectedPosition"
        :current-character-id="editingSquadId ? (nurtureStore.getSquadMembers(editingSquadId)[selectedPosition] ?? undefined) : undefined"
        :used-character-ids="editingSquadId ? squadManager.getUsedCharacterIds(editingSquadId, selectedPosition) : []"
        @close="showCharacterSelectModal = false"
        @select="handleCharacterSelect"
        @remove="handleCharacterRemove"
      />
    </div>
  </div>
</template>

<style scoped>
.squad-battle-view {
  min-height: calc(100vh - 80px);
}
.bg-grid {
  background-size: 40px 40px;
  background-image: 
    linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
}
.bg-scanlines {
  background: linear-gradient(
    to bottom,
    transparent 50%,
    rgba(255, 255, 255, 0.5) 50%
  );
  background-size: 100% 4px;
}
</style>