<script setup lang="ts">
/**
 * Squad Battle View - Tactical Command Center
 */
import { ref, computed, onMounted } from 'vue';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useSquadManager } from '@/composables/useSquadManager';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';
import SquadCard from '@/components/battle/SquadCard.vue';
import CharacterSelectModal from '@/components/battle/CharacterSelectModal.vue';

// Battle Components (Mocked for Demo)
import BattleArena from '@/components/battle/BattleArena.vue';
import BattleResult from '@/components/battle/BattleResult.vue';

const nurtureStore = useNurtureStore();
const gameDataStore = useGameDataStore();
const squadManager = useSquadManager();

// View State Layer
const currentPhase = ref<'command' | 'battle' | 'result'>('command');
const currentTowerFloor = ref(1);
const towerEnemyData = ref<any>(null);

// Modal Management
const showCharacterSelectModal = ref(false);
const editingSquadId = ref<number | null>(null);
const selectedPosition = ref(0);

// Interaction Protocols
async function fetchEnemyData() {
  // Mock fetch
  towerEnemyData.value = {
    name: '【执念之影】· 观测者',
    description: '异常量子特征点，在层级 B3 发现的敌对实体。具有高频闪变特性。',
    floorPower: 4500,
    difficulty: '极难'
  };
}

function handleStartBattle(squadId: number) {
  console.log(`Starting Engagement with Squad ${squadId}`);
  currentPhase.value = 'battle';
}

function openCharacterSelect(squadId: number, pos: number) {
  editingSquadId.value = squadId;
  selectedPosition.value = pos;
  showCharacterSelectModal.value = true;
}

function handleCharacterSelect(characterId: number) {
  if (editingSquadId.value !== null) {
    squadManager.assignToSquad(editingSquadId.value, selectedPosition.value, characterId);
    showCharacterSelectModal.value = false;
  }
}

function handleCharacterRemove() {
  if (editingSquadId.value !== null) {
    squadManager.removeFromSquad(editingSquadId.value, selectedPosition.value);
    showCharacterSelectModal.value = false;
  }
}

function updateSquadName(id: number, name: string) {
  nurtureStore.updateSquadName(id, name);
}

// Battle Logic Mock
const playerSquad = computed(() => nurtureStore.presetSquads[0]);
const enemySquad = ref([]);
const battleLog = ref([]);
const currentTurn = ref(1);
const isPlayerTurn = ref(true);
const battleResult = ref(null);

function executeRound() { /* Mock Logic */ }
function autoFinishBattle() { 
  currentPhase.value = 'result';
  battleResult.value = { win: true, rewards: [] };
}
function handleRestart() { currentPhase.value = 'command'; }
function handleRetryBattle() { currentPhase.value = 'battle'; }

onMounted(async () => {
  await fetchEnemyData();
});
</script>

<template>
  <div class="squad-battle-view p-8 md:p-12 space-y-12 quantic-reveal h-full overflow-y-auto font-ui">
    <!-- Header: Strategic Operations -->
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/10 pb-10">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
           <div class="w-1.5 h-6 bg-gold"></div>
           <h2 class="text-xs font-display font-bold text-gold tracking-[0.4em] uppercase opacity-80">当前战术情报</h2>
        </div>
        <h1 class="text-5xl font-display font-black tracking-tighter uppercase text-white scale-y-110">演练目标确认</h1>
        <div class="text-[10px] font-mono text-industrial-300 uppercase tracking-widest mt-2">
          当前坐标: SECTOR_ABYSS // 模拟优先级: P-LEVEL 07 // 状态: 已锁定
        </div>
      </div>
      
      <div class="flex items-center gap-6 pb-1">
         <div class="text-right border-r border-white/10 pr-6">
            <span class="block text-[8px] font-display text-industrial-100 uppercase tracking-widest mb-1">同步进度</span>
            <div class="text-xs font-mono text-gold font-bold">ARC_CORE: 89%</div>
         </div>
         <TacticalButton variant="secondary" size="sm">重置模拟环境</TacticalButton>
      </div>
    </header>

    <div class="relative min-h-[600px]">
      <!-- PHASE: Command Center (Setup) -->
      <template v-if="currentPhase === 'command'">
        <div class="quantic-reveal">
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <!-- Enemy Intel Panel -->
            <div class="lg:col-span-4 space-y-8">
              <GlassPanel :reveal="false" class="border-white/5 bg-white/[0.01]">
                <template #header>
                  <div class="p-6 border-b border-white/5 bg-white/[0.02]">
                     <div class="text-[9px] font-display font-black text-gold tracking-[0.3em] uppercase opacity-80 mb-1">作战档案</div>
                     <div class="text-lg font-display font-bold text-white uppercase tracking-tighter">敌方情报摘要</div>
                  </div>
                </template>
                
                <div class="p-6 space-y-8">
                   <div v-if="!towerEnemyData" class="py-16 text-center space-y-6">
                      <div class="text-5xl opacity-5 animate-pulse">📡</div>
                      <p class="text-[8px] text-industrial-300 uppercase">正在扫描环境...</p>
                   </div>
                   
                   <div v-else class="space-y-8">
                      <div class="relative overflow-hidden group">
                         <div class="absolute inset-0 bg-gold/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                         <div class="space-y-3 relative border-l-2 border-gold/40 pl-5 py-2">
                            <div class="text-3xl font-display font-black text-white uppercase tracking-tighter tabular-nums">{{ towerEnemyData.name }}</div>
                            <div class="text-xs text-industrial-100 font-ui uppercase leading-relaxed tracking-wide italic max-w-sm opacity-90">{{ towerEnemyData.description }}</div>
                         </div>
                      </div>
                      
                      <div class="grid grid-cols-2 gap-px bg-white/5">
                         <div class="bg-black/60 p-4 border border-white/5">
                            <div class="text-[8px] font-display text-industrial-100 uppercase tracking-widest mb-1">战术评级</div>
                            <div class="text-2xl font-display text-gold font-bold tabular-nums">{{ towerEnemyData.floorPower }}</div>
                         </div>
                         <div class="bg-black/60 p-4 border border-white/5">
                            <div class="text-[8px] font-display text-industrial-100 uppercase tracking-widest mb-1">威胁评估</div>
                            <div class="text-xs font-display font-black uppercase tracking-[0.2em]" :class="{
                              'text-green-400': towerEnemyData.difficulty === '简单',
                              'text-yellow-400': towerEnemyData.difficulty === '中等',
                              'text-clinical-danger': ['困难', '极难'].includes(towerEnemyData.difficulty)
                            }">{{ towerEnemyData.difficulty }}</div>
                         </div>
                      </div>
                   </div>
                </div>
              </GlassPanel>
            </div>

            <!-- Squad Selection Panel -->
            <div class="lg:col-span-8 space-y-8">
              <div class="flex items-center justify-between border-b border-white/5 pb-6">
                 <div>
                    <h3 class="text-sm font-display font-black text-white uppercase tracking-widest">出战小队编排</h3>
                    <p class="text-[10px] text-industrial-100 uppercase mt-1.5 opacity-80 font-bold tracking-widest">请选择用于此次模拟演练的战术单元</p>
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
              :selected-squad-for-battle="0"
              @restart="handleRestart"
              @retry-battle="handleRetryBattle"
            />
          </div>
        </div>
      </template>
    </div>

    <!-- Modals -->
    <CharacterSelectModal
      v-if="showCharacterSelectModal"
      :is-open="showCharacterSelectModal"
      :position="selectedPosition"
      :current-character-id="0"
      :used-character-ids="[]"
      @close="showCharacterSelectModal = false"
      @select="handleCharacterSelect"
      @remove="handleCharacterRemove"
    />
  </div>
</template>

<style scoped>
.squad-battle-view {
  min-height: calc(100vh - 80px);
}
.scrollbar-tactical::-webkit-scrollbar {
  width: 2px;
}
.scrollbar-tactical::-webkit-scrollbar-track { background: transparent; }
.scrollbar-tactical::-webkit-scrollbar-thumb { @apply bg-white/10 hover:bg-gold/40; }
</style>