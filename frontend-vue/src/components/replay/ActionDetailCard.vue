<script setup lang="ts">
/**
 * Action Detail Card - Tactical Archive Leaf Standard
 */
import type { ActionRecord } from '@/types/debug';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import RarityTag from '@/components/ui/RarityTag.vue';

interface Props {
  action: ActionRecord;
  playerNames: { playerA: string; playerB: string };
}

const props = defineProps<Props>();

function getActionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'play_card': 'CARD_EXECUTION',
    'clash_resolve': 'LOGIC_RESOLUTION',
    'turn_end': 'CYCLE_TERMINATE',
    'turn_start': 'CYCLE_INITIALIZE',
    'skill_activation': 'NEURAL_TRIGGER',
    'effect_apply': 'DATA_MODIFICATION'
  };
  return labels[type] || type.toUpperCase();
}

function getActionTypeColor(type: string): string {
  const colors: Record<string, string> = {
    'play_card': 'text-cyan-400',
    'clash_resolve': 'text-gold',
    'turn_end': 'text-industrial-500',
    'turn_start': 'text-green-400',
    'skill_activation': 'text-clinical-warning',
    'effect_apply': 'text-clinical-danger'
  };
  return colors[type] || 'text-white';
}

function getPlayerName(playerId: 'playerA' | 'playerB'): string {
  return props.playerNames[playerId]?.toUpperCase() || playerId.toUpperCase();
}

function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
</script>

<template>
  <div class="action-detail-slate font-ui space-y-6 quantic-reveal">
    <!-- Header: Operational Metadata -->
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/5 pb-4">
      <div class="space-y-1">
        <div class="text-[8px] font-display font-bold tracking-[0.4em] uppercase" :class="getActionTypeColor(action.actionType)">
          {{ getActionTypeLabel(action.actionType) }}
        </div>
        <div class="text-lg font-display font-black text-white uppercase tracking-tighter line-clamp-1">
          {{ action.description }}
        </div>
      </div>
      
      <div class="flex items-center gap-4 text-[9px] font-mono">
        <div class="px-2 py-0.5 bg-white/5 border border-white/10 text-industrial-400">CYCLE_{{ action.turn }}</div>
        <div class="text-industrial-600">{{ formatTimestamp(action.timestamp) }}</div>
      </div>
    </div>

    <!-- Personnel & Subject Data -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      <!-- Operator Info -->
      <div class="flex items-center gap-4 bg-white/[0.02] p-4 border border-white/5">
        <div class="w-1.5 h-1.5 rounded-full" :class="action.playerId === 'playerA' ? 'bg-cyan-400' : 'bg-clinical-danger'"></div>
        <div class="flex-1">
          <div class="text-[8px] font-display font-bold text-industrial-500 uppercase">Operator</div>
          <div class="text-xs font-display font-black text-white">{{ getPlayerName(action.playerId) }}</div>
        </div>
        
        <template v-if="action.beforeState[action.playerId].activeCharacter">
          <div class="h-8 w-px bg-white/10"></div>
          <div class="text-right">
             <div class="text-[8px] font-display font-bold text-industrial-500 uppercase">Neural Subject</div>
             <div class="text-xs font-display font-black text-gold">{{ action.beforeState[action.playerId].activeCharacter!.name }}</div>
          </div>
        </template>
      </div>

      <!-- Result Outcome Summary (Contextual) -->
      <div v-if="action.actionType === 'clash_resolve'" class="bg-gold/5 border border-gold/20 p-4 flex items-center justify-between">
         <div class="text-[10px] font-display font-black text-gold uppercase tracking-widest">Resolution Result</div>
         <div class="text-xs font-display font-bold text-white uppercase tabular-nums">
           {{ action.details.result?.winner === 'draw' ? 'EQUILIBRIUM' : 'DOMINANCE_RESOLVED' }}
         </div>
      </div>
    </div>

    <!-- Deep Details (Type Specific) -->
    <div class="space-y-6">
      <!-- 1. Play Card Details -->
      <div v-if="action.actionType === 'play_card' && action.details.card" class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
           <GlassPanel :reveal="false" class="border-cyan-400/20 bg-cyan-400/[0.02]">
             <div class="flex items-start gap-4">
               <div class="w-12 h-16 border border-white/10 overflow-hidden skew-x-[-12deg] flex-shrink-0">
                  <img :src="action.details.card.image_path" class="w-full h-full object-cover scale-110 grayscale-[0.3]">
               </div>
               <div class="space-y-1">
                 <RarityTag :rarity="action.details.card.rarity" size="xs" />
                 <div class="text-xs font-display font-black text-white uppercase">{{ action.details.card.name }}</div>
                 <div class="text-[8px] font-mono text-cyan-400">{{ action.details.style?.toUpperCase() || 'STANDARD_EXEC' }}</div>
               </div>
             </div>
           </GlassPanel>

           <div v-if="action.details.strengthCalculation" class="space-y-4">
              <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-widest">Strength Analytics</div>
              <div class="bg-black/40 border border-white/5 p-4 space-y-4 font-mono">
                 <div class="flex justify-between items-center text-[10px]">
                   <span class="text-industrial-500">BASE_VECTOR</span>
                   <span class="text-white">{{ action.details.strengthCalculation.baseStrength }}</span>
                 </div>
                 <div v-for="bonus in action.details.strengthCalculation.strengthBonuses" :key="bonus.source" class="flex justify-between text-[9px] border-l border-gold/30 pl-3">
                   <div class="text-industrial-400">{{ bonus.source.toUpperCase() }}</div>
                   <div class="text-gold font-bold">+{{ bonus.amount }}</div>
                 </div>
                 <div class="pt-2 border-t border-white/10 flex justify-between items-center">
                    <span class="text-[10px] font-display font-bold text-white">FINAL_OUTPUT</span>
                    <span class="text-lg font-black text-cyan-400">{{ action.details.strengthCalculation.finalStrength }}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <!-- 2. Clash Resolve Details -->
      <div v-if="action.actionType === 'clash_resolve'" class="space-y-6">
         <div class="grid grid-cols-3 gap-1 bg-white/[0.02] border border-white/5 p-1">
            <div class="text-center py-4 space-y-2">
               <div class="text-[8px] font-display text-industrial-500">FRIENDLY_PWR</div>
               <div class="text-3xl font-display font-black text-cyan-400 tabular-nums">{{ action.details.attackStrength || 0 }}</div>
            </div>
            <div class="flex items-center justify-center text-xl opacity-20 italic">VS</div>
            <div class="text-center py-4 space-y-2">
               <div class="text-[8px] font-display text-industrial-500">HOSTILE_PWR</div>
               <div class="text-3xl font-display font-black text-clinical-danger tabular-nums">{{ action.details.defenseStrength || 0 }}</div>
            </div>
         </div>
         
         <div v-if="action.details.result" class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div class="space-y-3">
               <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-widest">Reputation Delta</div>
               <div class="space-y-2">
                 <div v-for="player in (['playerA', 'playerB'] as const)" :key="player" class="flex justify-between items-center bg-black/40 p-3 border border-white/5">
                    <span class="text-[9px] font-display font-bold text-white uppercase">{{ playerNames[player] }}</span>
                    <span class="text-xs font-mono font-bold" 
                      :class="action.details.result.reputationChange[player] >= 0 ? 'text-green-400' : 'text-clinical-danger'">
                      {{ action.details.result.reputationChange[player] >= 0 ? '+' : '' }}{{ action.details.result.reputationChange[player] }}
                    </span>
                 </div>
               </div>
            </div>
            <div class="space-y-3">
               <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-widest">Environmental Status</div>
               <div class="bg-indigo-900/10 border border-indigo-500/20 p-4 h-[94px] flex flex-col justify-center">
                  <div class="flex justify-between items-center">
                     <span class="text-[9px] font-display font-bold text-white uppercase">Topic Bias Delta</span>
                     <span class="text-xs font-mono font-bold text-indigo-400">
                       {{ action.details.result.topicBiasChange >= 0 ? '+' : '' }}{{ action.details.result.topicBiasChange }}
                     </span>
                  </div>
                  <div class="mt-4 h-1 bg-white/5 relative overflow-hidden">
                    <div class="h-full bg-indigo-500 transition-all duration-500" 
                      :style="{ width: `${50 + (action.details.result.topicBiasChange * 10)}%`, marginLeft: action.details.result.topicBiasChange < 0 ? 'auto' : '0' }"></div>
                  </div>
               </div>
            </div>
         </div>
      </div>

      <!-- 3. Skill Activation -->
      <div v-if="action.actionType === 'skill_activation'" class="bg-clinical-warning/5 border border-clinical-warning/20 p-6 space-y-4">
         <div class="flex items-center gap-3">
            <div class="w-2 h-2 bg-clinical-warning rounded-full shadow-[0_0_8px_#EAB308]"></div>
            <h5 class="text-xs font-display font-black text-white uppercase">{{ action.details.skillName }}</h5>
         </div>
         <p class="text-[10px] text-industrial-400 uppercase leading-relaxed font-display">
           {{ action.details.effectDescription }}
         </p>
         <div v-if="action.details.effectDuration" class="text-[8px] font-mono text-clinical-warning uppercase">DUR: {{ action.details.effectDuration }} CYCLES</div>
      </div>

      <!-- State Evolution -->
      <div class="space-y-4 border-t border-white/5 pt-8">
         <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-[0.4em]">Signal State Evolution</div>
         <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div v-for="state in (['before', 'after'] as const)" :key="state" class="bg-white/[0.01] border border-white/5 p-4 space-y-3">
               <div class="text-[8px] font-display font-bold text-industrial-600 uppercase">{{ state.toUpperCase() }}_TRANSITION</div>
               <div class="grid grid-cols-3 gap-2 text-center">
                  <div v-for="(v, k) in { 
                    'REP': action[`${state}State` as keyof ActionRecord][action.playerId].reputation,
                    'TP': action[`${state}State` as keyof ActionRecord][action.playerId].tp,
                    'BIAS': action[`${state}State` as keyof ActionRecord].game.topicBias
                  }" :key="k" class="space-y-1">
                    <div class="text-[7px] font-display font-bold text-industrial-500">{{ k }}</div>
                    <div class="text-xs font-mono font-bold text-white">{{ v }}</div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.action-detail-slate {
  background: radial-gradient(circle at top right, rgba(212, 165, 116, 0.05), transparent);
}
.text-clinical-warning { color: #EAB308; }
.text-clinical-danger { color: #FF4D4D; }
</style>