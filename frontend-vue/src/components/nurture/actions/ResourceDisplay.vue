<script setup lang="ts">
/**
 * Resource Display - Tactical Asset Ribbon
 */
import { useEconomyStore } from '@/stores/modules/economyStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const economyStore = useEconomyStore();
</script>

<template>
  <div class="resource-display-ribbon mb-10 border-b border-white/10 pb-6 flex items-center justify-between">
    <!-- KP Readout -->
    <div class="flex items-center gap-6 group">
      <div class="w-1 h-3 bg-gold opacity-40 group-hover:opacity-100 transition-opacity"></div>
      <div class="space-y-1">
        <div class="text-[8px] font-display font-black text-industrial-500 uppercase tracking-[0.2em]">Available_Knowledge</div>
        <div class="flex items-baseline gap-2">
          <span class="text-xl font-mono font-bold text-white tabular-nums">{{ economyStore.knowledgePoints.toLocaleString() }}</span>
          <span class="text-[9px] font-display font-bold text-gold opacity-60">KP_PROTOCOL</span>
        </div>
      </div>
    </div>

    <!-- Subject Status -->
    <div class="flex items-center gap-8 text-right">
      <div class="space-y-1">
        <div class="text-[8px] font-display font-black text-industrial-500 uppercase tracking-[0.2em]">Neural_Condition</div>
        <div 
          class="flex items-center gap-3 transition-all duration-700"
          :class="{
            'text-green-400': character.nurtureData.attributes.mood >= 70,
            'text-yellow-400': character.nurtureData.attributes.mood >= 40,
            'text-hazard-rose': character.nurtureData.attributes.mood < 40
          }"
        >
          <div class="text-xl font-mono font-bold">{{ character.nurtureData.attributes.mood }}%</div>
          <div class="w-2 h-2 rounded-full shadow-lg" :class="{
            'bg-green-400 shadow-green-400/20': character.nurtureData.attributes.mood >= 70,
            'bg-yellow-400 shadow-yellow-400/20': character.nurtureData.attributes.mood >= 40,
            'bg-hazard-rose shadow-hazard-rose/20': character.nurtureData.attributes.mood < 40
          }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resource-display-ribbon {
  position: relative;
}
.text-hazard-rose { color: #E51E5D; }
.bg-hazard-rose { background-color: #E51E5D; }
.shadow-hazard-rose\/20 { shadow: 0 0 12px rgba(229, 30, 93, 0.2); }
</style>
