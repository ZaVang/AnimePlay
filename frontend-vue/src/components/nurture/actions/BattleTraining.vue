<script setup lang="ts">
/**
 * Battle Training - Combat Intensity Enhancement Interface
 */
import { useAuthStore } from '@/stores/modules/authStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';
import { useCharacterTraining } from '@/composables/useCharacterTraining';
import { useTrainingTimer } from '@/composables/useTrainingTimer';
import { 
  generateBattleStats, 
  simulateBattle,
  type BattleStats 
} from '@/utils/battleCalculator';

// Atomic Components
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const authStore = useAuthStore();
const economyStore = useEconomyStore();
const nurtureStore = useNurtureStore();
const { battleTrainingPrograms } = useCharacterTraining(props.character);
const {
  trainingAnimations,
  isTrainingOnCooldown,
  getTrainingCooldownRemaining,
  formatCooldownTime,
  setTrainingCooldown,
  startTrainingAnimation
} = useTrainingTimer();

function generateTrainingOpponent(trainingStat: string, playerStats: BattleStats): BattleStats {
  const baseOpponent: BattleStats = {
    hp: playerStats.hp * 0.8,
    atk: playerStats.atk * 0.9,
    def: playerStats.def * 0.8,
    sp: playerStats.sp * 0.8,
    spd: playerStats.spd * 0.9
  };
  
  switch (trainingStat) {
    case 'atk': baseOpponent.def *= 1.2; break;
    case 'def': baseOpponent.atk *= 1.2; break;
    case 'sp': baseOpponent.sp *= 1.3; break;
    case 'spd': baseOpponent.spd *= 1.3; break;
    case 'hp': baseOpponent.hp *= 1.4; break;
  }
  
  return {
    hp: Math.floor(baseOpponent.hp),
    atk: Math.floor(baseOpponent.atk),
    def: Math.floor(baseOpponent.def),
    sp: Math.floor(baseOpponent.sp),
    spd: Math.floor(baseOpponent.spd)
  };
}

function processBattleTrainingResult(program: any, battleResult: any) {
  const characterId = props.character.id;
  if (battleResult.winner === 'attacker') {
    nurtureStore.enhanceBattleStat(characterId, program.stat, program.gain);
    nurtureStore.addCharacterExp(characterId, 25);
    authStore.addLog(`ENGAGEMENT // VICTORY // ${program.stat.toUpperCase()}_TUNED`, 'success');
  } else if (battleResult.winner === 'defender') {
    const reducedGain = Math.ceil(program.gain * 0.4);
    nurtureStore.enhanceBattleStat(characterId, program.stat, reducedGain);
    nurtureStore.addCharacterExp(characterId, 10);
    authStore.addLog(`ENGAGEMENT // DEFEAT // MINIMAL_SYNC_LOGGED`, 'warning');
  } else {
    const mediumGain = Math.ceil(program.gain * 0.7);
    nurtureStore.enhanceBattleStat(characterId, program.stat, mediumGain);
    nurtureStore.addCharacterExp(characterId, 18);
    authStore.addLog(`ENGAGEMENT // STALEMATE // STEADY_ANALYSIS`, 'info');
  }
}

function startBattleTraining(programId: string) {
  const program = battleTrainingPrograms.value.find(p => p.id === programId);
  if (!program || !program.available) return;
  if (isTrainingOnCooldown(programId)) {
    authStore.addLog('SYSTEM // COMBAT_SIM_IN_PROGRESS', 'warning');
    return;
  }
  if (economyStore.knowledgePoints < program.cost) {
    authStore.addLog('SYSTEM // INSUFFICIENT_KNOWLEDGE', 'warning');
    return;
  }

  economyStore.knowledgePoints -= program.cost;
  const currentBattleStats = generateBattleStats(
    props.character.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 },
    props.character.nurtureData.attributes,
    props.character.nurtureData.battleEnhancements || { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 }
  );
  const trainingOpponent = generateTrainingOpponent(program.stat, currentBattleStats);
  const battleResult = simulateBattle(currentBattleStats, trainingOpponent);
  
  processBattleTrainingResult(program, battleResult);
  
  const nurtureData = nurtureStore.getNurtureData(props.character.id);
  nurtureData.attributes.mood = Math.max(5, nurtureData.attributes.mood - 8);
  nurtureData.attributes.strength = Math.max(10, nurtureData.attributes.strength - 3);
  
  setTrainingCooldown(programId, 30);
  startTrainingAnimation(programId);
}
</script>

<template>
  <div class="battle-training space-y-8">
    <div class="flex items-center gap-4 mb-2">
       <div class="w-2 h-4 bg-clinical-danger shadow-[0_0_8px_#FF4D4D] animate-pulse"></div>
       <div class="space-y-0.5">
          <h3 class="text-[10px] font-display font-black text-white uppercase tracking-[0.2em]">Combat Simulation Protocols</h3>
          <div class="text-[7px] font-mono text-clinical-danger/60 uppercase tracking-widest">Type: Neural_Clash_Optimization</div>
       </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div 
        v-for="program in battleTrainingPrograms" 
        :key="program.id"
        class="battle-card group relative bg-black/60 border border-white/10 p-6 transition-all duration-500 hover:border-clinical-danger/40 hover:bg-white/[0.02] overflow-hidden"
        :class="{ 'opacity-50 grayscale': !program.available && !trainingAnimations[program.id] }"
      >
        <!-- Simulation Overlays -->
        <div class="absolute inset-0 bg-grid opacity-5 pointer-events-none"></div>
        <div v-if="trainingAnimations[program.id]" class="absolute inset-0 bg-gradient-to-t from-clinical-danger/10 via-transparent to-clinical-danger/10 animate-scanline pointer-events-none"></div>
        <div class="absolute top-0 right-0 p-2 text-[6px] font-mono text-industrial-700 opacity-40 uppercase tracking-tighter">
           ID: {{ program.id.toUpperCase() }} // SECTOR_{{ program.stat.substring(0,2).toUpperCase() }}
        </div>

        <div class="flex justify-between items-start mb-6 relative z-10">
           <div class="text-4xl grayscale group-hover:grayscale-0 transition-transform duration-700 group-hover:scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.1)]">{{ program.icon }}</div>
           <div class="text-right">
             <div class="text-[8px] font-display font-black text-industrial-500 uppercase tracking-widest mb-1">Resource_Drain</div>
             <div class="text-xs font-mono font-bold text-gold tabular-nums">{{ program.cost }} KP</div>
           </div>
        </div>

        <div class="space-y-1 mb-8 relative z-10">
          <h4 class="text-[11px] font-display font-black text-white uppercase tracking-widest">{{ program.name }}</h4>
          <p class="text-[9px] text-industrial-500 leading-relaxed uppercase tracking-tighter opacity-80 line-clamp-2">{{ program.description }}</p>
        </div>

        <!-- Combat Stats Bonus -->
        <div class="space-y-3 mb-8 relative z-10">
           <div class="flex justify-between text-[8px] font-display font-black uppercase tracking-[0.2em]">
              <span class="text-clinical-danger">{{ program.stat }} Enhancement</span>
              <span class="text-white">+{{ program.gain }}% VARIANCE</span>
           </div>
           <div class="h-1 bg-white/[0.05] border border-white/5 rounded-none overflow-hidden">
              <div 
                class="h-full bg-clinical-danger shadow-[0_0_12px_#FF4D4D] transition-all duration-1000"
                :style="{ width: `${Math.min(100, character.nurtureData.battleEnhancements?.[program.stat] || 0)}%` }"
              ></div>
           </div>
           <div class="flex justify-between text-[7px] font-mono text-industrial-600 uppercase tracking-tighter">
              <span>Verified_Intensity</span>
              <span>VAL: {{ character.nurtureData.battleEnhancements?.[program.stat] || 0 }}%</span>
           </div>
        </div>

        <!-- Requirements Matrix -->
        <div class="mb-8 grid grid-cols-2 gap-px bg-white/5 border border-white/5 relative z-10">
           <div v-for="(val, key) in program.requirements" :key="key" class="bg-black/40 p-2 flex justify-between items-center group/req transition-colors hover:bg-white/[0.05]">
             <span class="text-[7px] font-display text-industrial-500 uppercase tracking-widest">{{ key }}</span>
             <span class="text-[8px] font-mono text-white opacity-60 underline decoration-white/20 underline-offset-4 group-hover/req:opacity-100">{{ val }}</span>
           </div>
        </div>

        <!-- Deployment Interface -->
        <div class="space-y-4 relative z-10">
           <Transition name="fade">
              <div v-if="isTrainingOnCooldown(program.id)" class="text-center py-2 bg-clinical-danger/5 border border-clinical-danger/20 mb-2">
                 <div class="text-[8px] font-display font-black text-clinical-danger animate-pulse uppercase mb-1">SIMULATION_IN_PROGRESS</div>
                 <div class="text-xs font-mono text-white tabular-nums tracking-tighter">{{ formatCooldownTime(getTrainingCooldownRemaining(program.id)) }}</div>
              </div>
           </Transition>

           <TacticalButton
             variant="primary"
             class="w-full !rounded-none"
             size="sm"
             :disabled="!program.available || economyStore.knowledgePoints < program.cost || isTrainingOnCooldown(program.id)"
             @click="startBattleTraining(program.id)"
           >
             <span v-if="isTrainingOnCooldown(program.id)">CLASHING...</span>
             <span v-else-if="!program.available">LINK_LOCKED</span>
             <span v-else>INITIATE_ENGAGEMENT</span>
           </TacticalButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-card {
  clip-path: polygon(0 0, 100% 0, 100% 90%, 94% 100%, 0 100%);
}

@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
.animate-scanline {
  background: linear-gradient(to bottom, transparent, rgba(255, 77, 77, 0.2), transparent);
  height: 50%;
  animation: scanline 2.5s ease-in-out infinite;
}

.bg-grid {
  background-size: 20px 20px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
}

.text-clinical-danger { color: #FF4D4D; }
.bg-clinical-danger { background-color: #FF4D4D; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
