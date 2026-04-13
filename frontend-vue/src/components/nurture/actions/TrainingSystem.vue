<script setup lang="ts">
/**
 * Training System - Bio-Logic Tuning Interface
 */
import { useAuthStore } from '@/stores/modules/authStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';
import { useCharacterTraining } from '@/composables/useCharacterTraining';
import { useTrainingTimer } from '@/composables/useTrainingTimer';

// Atomic Components
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const authStore = useAuthStore();
const economyStore = useEconomyStore();
const nurtureStore = useNurtureStore();
const { trainingPrograms, getAttributeProgress } = useCharacterTraining(props.character);
const {
  trainingAnimations,
  isTrainingOnCooldown,
  getTrainingCooldownRemaining,
  formatCooldownTime,
  setTrainingCooldown,
  startTrainingAnimation
} = useTrainingTimer();

function startTraining(programId: string) {
  const program = trainingPrograms.value.find(p => p.id === programId);
  if (!program || !program.available) return;
  
  if (isTrainingOnCooldown(programId)) {
    authStore.addLog('SYSTEM // COOLDOWN_ACTIVE', 'warning');
    return;
  }
  
  if (economyStore.knowledgePoints < program.cost) {
    authStore.addLog('SYSTEM // INSUFFICIENT_KNOWLEDGE', 'warning');
    return;
  }

  economyStore.knowledgePoints -= program.cost;
  nurtureStore.enhanceAttribute(props.character.id, program.attribute, program.gain);
  
  const nurtureData = nurtureStore.getNurtureData(props.character.id);
  nurtureData.attributes.mood = Math.max(10, nurtureData.attributes.mood - 5);
  
  setTrainingCooldown(programId, program.duration);
  startTrainingAnimation(programId);
  
  authStore.addLog(`PROTOCOL // ${program.name.toUpperCase()}_INITIATED`, 'success');
  
  setTimeout(() => {
    authStore.addLog(`PROTOCOL // ${program.name.toUpperCase()}_COMPLETE`, 'success');
  }, program.duration * 60 * 1000);
}

function getAttributeColor(attr: string) {
  if (attr === 'charm') return 'text-hazard-rose';
  if (attr === 'intelligence') return 'text-cyan-400';
  return 'text-green-400';
}
</script>

<template>
  <div class="training-system space-y-8">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div 
        v-for="program in trainingPrograms" 
        :key="program.id"
        class="training-card group relative bg-black/60 border border-white/10 p-6 transition-all duration-500 hover:border-hazard-rose/40 hover:bg-white/[0.02] overflow-hidden"
        :class="{ 'opacity-50 grayscale': !program.available && !trainingAnimations[program.id] }"
      >
        <!-- Tactical Overlays -->
        <div class="absolute inset-0 bg-grid opacity-5 pointer-events-none"></div>
        <div 
          v-if="trainingAnimations[program.id]" 
          class="absolute inset-0 bg-gradient-to-t from-hazard-rose/10 via-transparent to-hazard-rose/10 animate-pulse-tactical pointer-events-none"
        ></div>
        <div class="absolute top-0 right-0 p-2 text-[6px] font-mono text-industrial-700 opacity-40">
           ID: {{ program.id.toUpperCase() }} // AUTH: LEVEL_1
        </div>

        <!-- Header -->
        <div class="flex justify-between items-start mb-6 relative z-10">
           <div class="text-4xl grayscale group-hover:grayscale-0 transition-transform duration-700 group-hover:scale-110">{{ program.icon }}</div>
           <div class="text-right">
             <div class="text-[8px] font-display font-black text-industrial-500 uppercase tracking-widest mb-1">Protocol_Cost</div>
             <div class="text-xs font-mono font-bold text-gold tabular-nums">{{ program.cost }} KP</div>
           </div>
        </div>

        <!-- Info -->
        <div class="space-y-1 mb-8 relative z-10">
          <h4 class="text-[11px] font-display font-black text-white uppercase tracking-widest">{{ program.name }}</h4>
          <p class="text-[9px] text-industrial-500 leading-relaxed uppercase tracking-tighter opacity-80">{{ program.description }}</p>
        </div>

        <!-- Attribute Progress -->
        <div class="space-y-3 mb-8 relative z-10">
           <div class="flex justify-between text-[8px] font-display font-black uppercase tracking-[0.2em]">
              <span :class="getAttributeColor(program.attribute)">{{ program.attribute }}</span>
              <span class="text-white">+{{ program.gain }} GAIN</span>
           </div>
           <div class="h-1 bg-white/[0.05] rounded-none overflow-hidden border border-white/5">
              <div 
                class="h-full transition-all duration-1000"
                :class="{
                  'bg-hazard-rose shadow-[0_0_12px_#E51E5D]': program.attribute === 'charm',
                  'bg-cyan-400 shadow-[0_0_12px_#22D3EE]': program.attribute === 'intelligence',
                  'bg-green-400 shadow-[0_0_12px_#4ADE80]': program.attribute === 'strength'
                }"
                :style="{ width: `${getAttributeProgress(character.nurtureData.attributes[program.attribute])}%` }"
              ></div>
           </div>
        </div>

        <!-- Timer / Action -->
        <div class="space-y-4 relative z-10">
           <Transition name="fade">
              <div v-if="isTrainingOnCooldown(program.id)" class="text-center py-2 bg-hazard-rose/5 border border-hazard-rose/20 mb-2">
                 <div class="text-[8px] font-display font-black text-hazard-rose animate-pulse uppercase mb-1">SYNCHRONIZING_COGNITION</div>
                 <div class="text-xs font-mono text-white tabular-nums tracking-tighter">{{ formatCooldownTime(getTrainingCooldownRemaining(program.id)) }}</div>
              </div>
           </Transition>

           <TacticalButton
             variant="secondary"
             class="w-full !rounded-none"
             size="sm"
             :disabled="!program.available || economyStore.knowledgePoints < program.cost || isTrainingOnCooldown(program.id)"
             @click="startTraining(program.id)"
           >
             <span v-if="isTrainingOnCooldown(program.id)">LINK_BUSY...</span>
             <span v-else-if="!program.available">MOOD_CRITICAL</span>
             <span v-else>INITIATE_UPGRADE</span>
           </TacticalButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.training-card {
  clip-path: polygon(0 0, 100% 0, 100% 90%, 94% 100%, 0 100%);
}

@keyframes pulse-tactical {
  0% { opacity: 0.1; }
  50% { opacity: 0.3; }
  100% { opacity: 0.1; }
}
.animate-pulse-tactical { animation: pulse-tactical 2s ease-in-out infinite; }

.bg-grid {
  background-size: 20px 20px;
  background-image: 
    linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px);
}

.text-hazard-rose { color: #E51E5D; }
.bg-hazard-rose { background-color: #E51E5D; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
