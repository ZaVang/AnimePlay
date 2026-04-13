<script setup lang="ts">
/**
 * Battle Result - Strategic Debriefing Standard
 */
import { computed } from 'vue';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

interface Props {
  battleResult: 'victory' | 'defeat' | null;
  battleLog: string[];
  selectedSquadForBattle: number | null;
}

interface Emits {
  (e: 'restart'): void;
  (e: 'retryBattle', squadId: number): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const isVictory = computed(() => props.battleResult === 'victory');
const resultColorClass = computed(() => isVictory.value ? 'text-cyan-400' : 'text-clinical-danger');
const resultStatusText = computed(() => isVictory.value ? 'OPERATION_SUCCESSFUL' : 'MISSION_FAILURE');
const secondaryText = computed(() => isVictory.value ? 'Strategic objectives achieved. All units returning to base.' : 'Neural link severed. Hostile presence remains active.');

const lastFiveLogs = computed(() => props.battleLog.slice(-5));

function handleRestart() {
  emit('restart');
}

function handleRetry() {
  if (props.selectedSquadForBattle !== null) {
    emit('retryBattle', props.selectedSquadForBattle);
  }
}
</script>

<template>
  <div class="battle-result-slate flex items-center justify-center min-h-[400px]">
    <GlassPanel :reveal="true" class="max-w-xl w-full border-white/10 shadow-2xl relative overflow-hidden">
      <!-- Background Ornament -->
      <div 
        class="absolute -top-12 -right-12 text-9xl font-display font-black opacity-5 pointer-events-none"
        :class="resultColorClass"
      >
        {{ isVictory ? 'WIN' : 'LOSS' }}
      </div>

      <div class="text-center py-8 space-y-10 relative">
        <!-- Status Header -->
        <div class="space-y-2">
           <div class="text-[10px] font-display font-black tracking-[0.5em] uppercase opacity-40">Tactical debriefing</div>
           <h2 class="text-4xl font-display font-black uppercase tracking-tighter" :class="resultColorClass">
             {{ resultStatusText }}
           </h2>
           <p class="text-[10px] font-display text-industrial-500 uppercase tracking-widest max-w-xs mx-auto leading-relaxed">
             {{ secondaryText }}
           </p>
        </div>

        <!-- Log Highlights -->
        <div class="space-y-3 bg-black/40 border-y border-white/5 py-6 px-4">
          <div class="text-[8px] font-display font-bold text-industrial-600 uppercase tracking-widest mb-2">Cycle Log Extract</div>
          <div
            v-for="(log, index) in lastFiveLogs"
            :key="index"
            class="text-[10px] font-mono text-industrial-400 uppercase tracking-tighter"
          >
            <span class="text-white/10 mr-2">>>></span> {{ log }}
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-col sm:flex-row gap-4 justify-center px-8">
          <TacticalButton
            variant="primary"
            class="min-w-[180px]"
            @click="handleRestart"
          >
            RETURN TO COMMAND
          </TacticalButton>

          <TacticalButton
            v-if="selectedSquadForBattle && !isVictory"
            variant="secondary"
            class="min-w-[180px]"
            @click="handleRetry"
          >
            RE-ENGAGE TARGET
          </TacticalButton>
        </div>
      </div>

      <!-- Footer Metadata -->
      <template #footer>
        <div class="flex justify-between items-center text-[8px] font-display text-industrial-600 uppercase tracking-widest py-2 border-t border-white/5 mt-8">
           <span>Unit-ID: ANIMEPLAY_SQUAD_01</span>
           <span class="animate-pulse" :class="resultColorClass">LINK_STABLE // 100%</span>
        </div>
      </template>
    </GlassPanel>
  </div>
</template>

<style scoped>
.text-clinical-danger { color: #FF4D4D; }
</style>
