<script setup lang="ts">
/**
 * Gacha Rates Modal - Manifest Probability Sheet Standard
 */
import { computed } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  gachaType: 'anime' | 'character';
  show: boolean;
}>();

const emit = defineEmits(['close']);

const rarityConfig = computed(() => 
  props.gachaType === 'anime' ? GAME_CONFIG.animeSystem.rarityConfig : GAME_CONFIG.characterSystem.rarityConfig
);

const rateUpConfig = computed(() =>
    props.gachaType === 'anime' ? GAME_CONFIG.animeSystem.rateUp : GAME_CONFIG.characterSystem.rateUp
);

const rates = computed(() => {
  const entries = Object.entries(rarityConfig.value).filter(([, d]) => d.p > 0);
  const total = entries.reduce((sum, [, d]) => sum + d.p, 0);
  return entries.map(([rarity, d]) => ({
    rarity,
    ...d,
    probability: `${((d.p / total) * 100).toFixed(2)}%`,
  })).sort((a, b) => (rarityConfig.value[b.rarity as any]?.p || 0) - (rarityConfig.value[a.rarity as any]?.p || 0));
});

</script>

<template>
  <div v-if="show" @click.self="emit('close')" class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 quantic-reveal">
    <GlassPanel class="max-w-md w-full border-gold/20 shadow-2xl relative overflow-hidden">
      
      <!-- Modal Header -->
      <template #header>
        <div class="p-6 border-b border-white/5 bg-white/[0.02] text-center">
          <div class="text-[8px] font-display font-bold text-gold tracking-[0.4em] uppercase mb-1">Probability Manifest</div>
          <h2 class="text-lg font-display font-black text-white uppercase tracking-tighter">{{ gachaType === 'anime' ? 'Anime Artifacts' : 'Personnel Profiles' }}</h2>
        </div>
      </template>

      <!-- Content Scroll -->
      <div class="p-6 space-y-8 overflow-y-auto max-h-[60vh] scrollbar-none">
        
        <!-- Base Probability Table -->
        <section class="space-y-4">
          <div class="flex items-center gap-2">
            <div class="w-1 h-3 bg-gold"></div>
            <h3 class="text-[10px] font-display font-black text-white uppercase tracking-widest">Base Vectors</h3>
          </div>
          
          <div class="bg-black/40 border border-white/5 overflow-hidden">
             <table class="w-full text-left font-mono">
                <thead class="bg-white/[0.03] text-[8px] text-industrial-500 uppercase tracking-widest">
                   <tr>
                      <th class="px-4 py-3 font-bold">Rarity_Class</th>
                      <th class="px-4 py-3 font-bold text-right">Yield_Rate</th>
                   </tr>
                </thead>
                <tbody class="text-[10px]">
                   <tr v-for="rate in rates" :key="rate.rarity" class="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td class="px-4 py-3">
                         <span class="inline-block px-2 py-0.5 font-display font-black text-[9px]" :class="[rate.c, rate.c.includes('from') ? 'bg-gradient-to-r text-white' : 'text-gold border border-gold/30']">
                            {{ rate.rarity }}
                         </span>
                      </td>
                      <td class="px-4 py-3 text-right font-bold text-white">{{ rate.probability }}</td>
                   </tr>
                </tbody>
             </table>
          </div>
        </section>

        <!-- Logic & Mechanics -->
        <section class="space-y-4">
          <div class="flex items-center gap-2">
            <div class="w-1 h-3 bg-cyan-400"></div>
            <h3 class="text-[10px] font-display font-black text-white uppercase tracking-widest">Logic Protocols</h3>
          </div>

          <div class="space-y-3 font-display">
            <!-- Pity Mechanism -->
            <div class="bg-white/[0.02] border border-white/5 p-4 space-y-2 relative overflow-hidden group">
               <div class="absolute inset-0 bg-grid opacity-5 pointer-events-none"></div>
               <div class="text-[9px] font-black text-cyan-400 uppercase tracking-tighter">[CONSECUTIVE_YIELD_GUARANTEE]</div>
               <p class="text-[10px] text-industrial-400 leading-relaxed">System ensures at least <span class="text-white">1x SSR+</span> result every <span class="text-cyan-400 font-mono">10</span> cycles.</p>
            </div>

            <!-- Rate Up -->
            <div v-if="rateUpConfig && rateUpConfig.ids.length > 0" class="bg-white/[0.02] border border-white/5 p-4 space-y-2">
               <div class="text-[9px] font-black text-gold uppercase tracking-tighter">[BIAS_UPLINK_PROBABILITY]</div>
               <p class="text-[10px] text-industrial-400 leading-relaxed">HR/UR yields have a <span class="text-gold font-mono">{{ rateUpConfig.hrChance * 100 }}%</span> probability to resolve to target UP Manifests.</p>
            </div>

            <!-- Hard Pity -->
            <div v-if="rateUpConfig && (rateUpConfig.hrPityPulls > 0 || rateUpConfig.urPityPulls > 0)" class="bg-white/[0.02] border border-white/5 p-4 space-y-4">
               <div class="text-[9px] font-black text-clinical-danger uppercase tracking-tighter">[FAILSAFE_CALIBRATION]</div>
               
               <div v-if="rateUpConfig.hrPityPulls > 0" class="flex justify-between items-center text-[10px] border-l border-clinical-danger/30 pl-3">
                 <span class="text-industrial-500 uppercase">HR_Manifest_Pity</span>
                 <span class="text-white font-mono">{{ rateUpConfig.hrPityPulls }} CYCLES</span>
               </div>

               <div v-if="rateUpConfig.urPityPulls > 0" class="flex justify-between items-center text-[10px] border-l border-gold/30 pl-3">
                 <span class="text-industrial-500 uppercase">UR_Total_Pity</span>
                 <span class="text-gold font-mono">{{ rateUpConfig.urPityPulls }} CYCLES</span>
               </div>
               
               <p class="text-[8px] text-industrial-600 uppercase italic">AHEAD_OF_TARGET: Acquisition of target rarity resets respective failsafe counter.</p>
            </div>
          </div>
        </section>
      </div>

      <!-- Footer Action -->
      <div class="p-6 border-t border-white/5 bg-white/[0.01] flex justify-end">
        <TacticalButton variant="secondary" size="sm" @click="emit('close')">DISMISS_DATA</TacticalButton>
      </div>
    </GlassPanel>
  </div>
</template>

<style scoped>
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
.bg-grid {
  background-size: 20px 20px;
  background-image: 
    linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
}
</style>
