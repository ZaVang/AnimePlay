<script setup lang="ts">
/**
 * Character Profile - Bio-Logic Data Sheet Standard
 */
import { computed, ref } from 'vue';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';
import { generateBattleStats, calculateBattlePower } from '@/utils/battleCalculator';

// Chart.js Integration
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js';
import { Radar, Bar } from 'vue-chartjs';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale
);

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import RarityTag from '@/components/ui/RarityTag.vue';
import LoreDecoder from '@/components/ui/LoreDecoder.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const nurtureStore = useNurtureStore();

// Computeds
const levelProgress = computed(() => nurtureStore.getLevelProgress(props.character.nurtureData));

const bondLevel = computed(() => {
  const affection = props.character.nurtureData.affection;
  if (affection >= 1000) return { level: 'ETERNAL', color: 'text-clinical-danger', icon: '◈' };
  if (affection >= 800) return { level: 'DESTINY', color: 'text-clinical-danger/80', icon: '◇' };
  if (affection >= 600) return { level: 'SYNERGY', color: 'text-gold', icon: '◆' };
  if (affection >= 400) return { level: 'TRUST', color: 'text-blue-400', icon: '△' };
  if (affection >= 200) return { level: 'BOND', color: 'text-green-400', icon: '▽' };
  return { level: 'INITIAL', color: 'text-industrial-500', icon: '○' };
});

const lastInteractionText = computed(() => {
  if (!props.character.nurtureData.lastInteraction) return 'NO_DATA';
  const lastTime = new Date(props.character.nurtureData.lastInteraction);
  const now = new Date();
  const diffMs = now.getTime() - lastTime.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours > 24) return `${Math.floor(diffHours/24)}D_AGO`;
  if (diffHours > 0) return `${diffHours}H_AGO`;
  return 'JUST_NOW';
});

const actualBattleStats = computed(() => {
  return generateBattleStats(
    props.character.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 },
    props.character.nurtureData.attributes,
    props.character.nurtureData.battleEnhancements || { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 }
  );
});

const battlePower = computed(() => calculateBattlePower(actualBattleStats.value));

// Chart Configurations
const radarData = computed(() => ({
  labels: ['MOOD', 'CHARM', 'INTEL', 'STR'],
  datasets: [
    {
      label: 'Matrix_Vector',
      backgroundColor: 'rgba(212, 165, 116, 0.2)',
      borderColor: '#D4A574',
      pointBackgroundColor: '#D4A574',
      pointBorderColor: '#000',
      data: [
        props.character.nurtureData.attributes.mood,
        props.character.nurtureData.attributes.charm,
        props.character.nurtureData.attributes.intelligence,
        props.character.nurtureData.attributes.strength,
      ],
    },
  ],
}));

const radarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    r: {
      angleLines: { color: 'rgba(255, 255, 255, 0.05)' },
      grid: { color: 'rgba(255, 255, 255, 0.05)' },
      pointLabels: { color: '#666', font: { size: 9, family: 'Geist Mono', weight: 'bold' } },
      ticks: { display: false },
      suggestedMin: 0,
      suggestedMax: 100,
    },
  },
  plugins: { legend: { display: false } },
};

const barData = computed(() => ({
  labels: ['HP', 'ATK', 'DEF', 'SP', 'SPD'],
  datasets: [
    {
      backgroundColor: '#E51E5D',
      data: [
        actualBattleStats.value.hp,
        actualBattleStats.value.atk,
        actualBattleStats.value.def,
        actualBattleStats.value.sp,
        actualBattleStats.value.spd,
      ],
    },
  ],
}));

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: '#666', font: { size: 9, family: 'Geist Mono' } },
    },
    y: {
      grid: { color: 'rgba(255, 255, 255, 0.03)' },
      ticks: { display: false },
    },
  },
  plugins: { legend: { display: false } },
};
</script>

<template>
  <div class="character-profile-tactical-slate quantic-reveal space-y-8">
    
    <!-- Hero Stratum -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
      <!-- Portrait Module -->
      <div class="lg:col-span-4 border border-white/5 relative bg-black/40 overflow-hidden group">
        <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>
        <img 
          :src="character.image_path" 
          :alt="character.name"
          class="w-full h-full object-cover grayscale-[0.4] group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-110"
        >
        <div class="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black via-black/60 to-transparent">
           <div class="flex items-center justify-between mb-4">
             <RarityTag :rarity="character.rarity" />
             <div class="text-[8px] font-display font-bold text-gold tracking-[0.4em] uppercase opacity-70">Bio_Manifest</div>
           </div>
           <h3 class="text-4xl font-display font-black text-white uppercase tracking-tighter italic">
             {{ character.name }}
           </h3>
        </div>
      </div>

      <!-- Cognitive Data Grid -->
      <div class="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <!-- Neural Link Intensity -->
        <GlassPanel :reveal="false" class="border-clinical-danger/20 bg-clinical-danger/[0.01]">
           <div class="flex justify-between items-start mb-6">
             <div class="space-y-1">
                <div class="text-[7px] font-display font-bold text-clinical-danger tracking-[0.4em] uppercase opacity-60">Neural_Bond_Intensity</div>
                <div class="text-2xl font-display font-black uppercase tracking-widest" :class="bondLevel.color">{{ bondLevel.level }}</div>
             </div>
             <div class="text-3xl opacity-20 text-clinical-danger">{{ bondLevel.icon }}</div>
           </div>
           <!-- Segmented Tactical Progress -->
           <div class="flex gap-1 mb-3">
              <div v-for="i in 10" :key="i" class="h-1.5 flex-1 relative bg-white/5 overflow-hidden">
                 <div class="h-full bg-clinical-danger shadow-[0_0_8px_#E51E5D] transition-all duration-1000" 
                      :style="{ width: `${Math.max(0, Math.min(100, (character.nurtureData.affection / 1000 * 10 - (i-1)) * 100))}%` }"></div>
              </div>
           </div>
           <div class="flex justify-between text-[9px] font-mono text-industrial-500 uppercase tracking-widest">
             <span class="flex items-center gap-2"><div class="w-1 h-1 bg-clinical-danger"></div> Sync_Factor</span>
             <span class="text-white">{{ character.nurtureData.affection }} / 1000_MAX</span>
           </div>
        </GlassPanel>

        <!-- Personnel Progression -->
        <GlassPanel :reveal="false" class="border-gold/20 bg-gold/[0.01]">
           <div class="flex justify-between items-start mb-6">
             <div class="space-y-1">
                <div class="text-[7px] font-display font-bold text-gold tracking-[0.4em] uppercase opacity-60">Exp_Load_Manifest</div>
                <div class="text-2xl font-display font-black text-white uppercase tracking-widest">RANK.{{ character.nurtureData.level || 0 }}</div>
             </div>
             <div class="text-xl text-gold font-display font-bold animate-pulse">⚡</div>
           </div>
           <!-- Segmented Tactical Progress -->
           <div class="flex gap-1 mb-3">
              <div v-for="i in 8" :key="i" class="h-1.5 flex-1 relative bg-white/5 overflow-hidden">
                 <div class="h-full bg-gold shadow-[0_0_8px_#D4A574] transition-all duration-1000" 
                      :style="{ width: `${Math.max(0, Math.min(100, (levelProgress.percentage / 100 * 8 - (i-1)) * 100))}%` }"></div>
              </div>
           </div>
           <div class="flex justify-between text-[9px] font-mono text-industrial-500 uppercase tracking-widest">
             <span class="flex items-center gap-2"><div class="w-1 h-1 bg-gold"></div> Sequential_Gain</span>
             <span class="text-white">{{ levelProgress.current }} / {{ levelProgress.required }}_ACAP</span>
           </div>
        </GlassPanel>

        <!-- Performance Analytics -->
        <div class="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
           <!-- Matrix Radar -->
           <div class="bg-black/40 border border-white/5 p-6 flex flex-col items-center relative">
              <div class="absolute top-2 left-2 text-[6px] font-mono text-white/10 uppercase tracking-[0.4em]">Matrix_Cognition_Scan</div>
              <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-[0.2em] self-start mb-6 border-l-2 border-gold/40 pl-3 uppercase">Cognitive_Vector_Analysis</div>
              <div class="w-full h-44 relative z-10">
                 <Radar :data="radarData" :options="radarOptions" />
              </div>
           </div>
           
           <!-- Combat Variance Bar -->
           <div class="bg-black/40 border border-white/5 p-6 flex flex-col items-center relative">
              <div class="absolute top-2 left-2 text-[6px] font-mono text-white/10 uppercase tracking-[0.4em]">Combat_Readout_Sync</div>
              <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-[0.2em] self-start mb-6 border-l-2 border-clinical-danger/40 pl-3 uppercase">Performance_Variance_Metrics</div>
              <div class="w-full h-44 relative z-10">
                 <Bar :data="barData" :options="barOptions" />
              </div>
           </div>
        </div>
      </div>
    </div>

    <!-- Personnel Power Grid -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
       <!-- Primary Power Core -->
       <div class="bg-gold/[0.02] border border-gold/10 p-8 flex flex-col items-center justify-center text-center space-y-4 relative overflow-hidden group">
          <div class="absolute inset-0 bg-grid opacity-[0.03] pointer-events-none"></div>
          <div class="absolute top-0 right-0 p-2 opacity-20">
             <div class="w-4 h-px bg-gold"></div>
          </div>
          <div class="text-[8px] font-display font-bold text-industrial-400 uppercase tracking-[0.5em] relative">Combat_Intensity_Index</div>
          <div class="text-5xl font-display font-black text-gold tracking-tighter relative tabular-nums scale-y-110">
             {{ battlePower.toLocaleString() }}
          </div>
          <div class="flex items-center gap-2 relative">
             <div class="w-1 h-1 bg-gold animate-ping"></div>
             <span class="text-[8px] font-display font-bold text-gold/60 uppercase tracking-widest">Class_S_Verified</span>
          </div>
       </div>

       <!-- Attributes Cluster -->
       <div class="md:col-span-3 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div v-for="(val, attr) in character.nurtureData.attributes" :key="attr" 
               class="bg-black/40 border border-white/5 p-5 flex flex-col justify-between transition-all hover:bg-white/[0.04] hover:border-gold/20 group relative overflow-hidden">
             <!-- Corner Detail -->
             <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/5"></div>
             
             <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-[0.3em] group-hover:text-gold transition-colors">{{ attr }}_VAL</div>
             <div class="flex items-end gap-3 justify-between">
                <div class="text-2xl font-display font-black text-white tabular-nums tracking-tighter">{{ val }}</div>
                <div class="w-px h-2 bg-gold/20 mb-1.5"></div>
             </div>
          </div>
       </div>
    </div>

    <!-- Decryption Layer: Lore Fragments -->
    <div v-if="character.lore_fragments && character.lore_fragments.length > 0" class="space-y-6 pt-8">
      <div class="flex items-center gap-4">
        <div class="h-px flex-1 bg-white/5"></div>
        <div class="text-[9px] font-display font-bold text-gold tracking-[0.6em] uppercase">NEURAL_FRAGMENT_REPOSITORY</div>
        <div class="h-px flex-1 bg-white/5"></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div v-for="fragment in character.lore_fragments" :key="fragment.id" 
             class="border transition-all duration-700 p-6 flex flex-col group relative overflow-hidden"
             :class="character.nurtureData.unlockedLoreIndices?.includes(fragment.id) 
                     ? 'border-gold/20 bg-gold/[0.01]' 
                     : 'opacity-40 grayscale border-white/10 bg-black/60 cursor-not-allowed'">
          
          <div class="flex justify-between items-start mb-4 border-b border-white/5 pb-2">
            <div class="text-[7px] font-mono font-bold text-industrial-500 uppercase">FRAGMENT_IDENTIFIER: [{{ fragment.id }}]</div>
            <div v-if="!character.nurtureData.unlockedLoreIndices?.includes(fragment.id)" class="text-[7px] font-bold text-clinical-danger tracking-widest uppercase">SYSCAP_ENCRYPTED</div>
            <div v-else class="text-[7px] font-bold text-gold tracking-widest uppercase">MANIFEST_DECODED</div>
          </div>
          
          <h4 class="text-sm font-display font-black text-white uppercase tracking-tight mb-4 group-hover:text-gold transition-colors">{{ fragment.title }}</h4>
          
          <div class="text-[11px] font-sans leading-relaxed min-h-[4em] text-industrial-300">
            <LoreDecoder v-if="character.nurtureData.unlockedLoreIndices?.includes(fragment.id)" :text="fragment.content" :delay="200" />
            <span v-else class="text-industrial-600 font-mono italic flex flex-col gap-2">
              <span>ACCESS_RESTRICTED // ENCRYPTION_OVERRIDE_FAILURE</span>
              <span class="bg-clinical-danger/10 px-2 py-1 inline-block w-fit text-clinical-danger text-[9px] font-bold uppercase tracking-widest">REQ_INTIMACY: {{ fragment.requiredIntimacy || '???' }}_VAL</span>
            </span>
          </div>

          <div v-if="!character.nurtureData.unlockedLoreIndices?.includes(fragment.id) && character.nurtureData.affection >= (fragment.requiredIntimacy || 0)" 
               class="mt-6">
            <TacticalButton variant="secondary" size="sm" @click="nurtureStore.unlockLore(character.id, fragment.id)" class="w-full">
               EXECUTE_DECODING_PROTOCOL
            </TacticalButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Final Metadata Readout -->
    <footer class="flex flex-col md:flex-row items-center justify-between text-[7px] font-display text-industrial-700 uppercase tracking-[0.3em] pt-8 border-t border-white/5 gap-4">
       <div class="flex gap-12">
          <span class="flex items-center gap-3">
             <div class="w-1 h-3 bg-industrial-800"></div> 
             INTERACTION_SEQUENCE_COUNT: <span class="text-industrial-400 font-mono">{{ character.nurtureData.totalInteractions }}</span>
          </span>
          <span class="flex items-center gap-3">
             <div class="w-1 h-3 bg-industrial-800"></div> 
             LAST_UPLINK_EVENT: <span class="text-industrial-400 font-mono">{{ lastInteractionText }}</span>
          </span>
       </div>
       <div class="animate-pulse flex items-center gap-2 text-clinical-danger font-bold opacity-60">
          <div class="w-1 h-1 bg-clinical-danger shadow-[0_0_8px_#E51E5D]"></div>
          BIOMETRIC_SENSOR_CONNECTED // 240.22hz
       </div>
    </footer>
  </div>
</template>

<style scoped>
.bg-grid {
  background-size: 30px 30px;
  background-image: 
    linear-gradient(to right, rgba(212,165,116,0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(212,165,116,0.03) 1px, transparent 1px);
}

.character-profile-tactical-slate {
  --clinical-danger: #E51E5D;
}
</style>