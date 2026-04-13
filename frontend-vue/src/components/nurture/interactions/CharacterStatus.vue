<script setup lang="ts">
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();
</script>

<template>
  <!-- Biometric Status Monitor -->
  <div class="character-status-uplink quantic-reveal mt-6 p-4 bg-black/40 border border-white/5 relative overflow-hidden group">
    <!-- Static Backdrop Decoration -->
    <div class="absolute inset-x-0 top-0 h-px bg-white/10 group-hover:bg-gold/30 transition-colors"></div>
    
    <div class="flex items-center">
      <!-- Status Pulse Glyph -->
      <div class="relative flex items-center justify-center mr-4">
         <div class="w-1.5 h-1.5 rounded-full animate-ping absolute"
              :class="character.nurtureData.attributes.mood >= 60 ? 'bg-gold' : 'bg-clinical-danger'"></div>
         <div class="w-1.5 h-1.5 rounded-full relative z-10"
              :class="character.nurtureData.attributes.mood >= 60 ? 'bg-gold' : 'bg-clinical-danger'"></div>
      </div>

      <div class="flex-1 flex flex-col">
         <div class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-[0.4em] mb-0.5">Semantical_Vibe_Index</div>
         <div class="flex items-baseline gap-2">
            <span class="text-[10px] font-display font-black text-white uppercase tracking-widest">{{ character.name }}</span>
            <span class="text-[10px] font-display font-black uppercase tracking-tighter" :class="{
              'text-gold font-black': character.nurtureData.attributes.mood >= 80,
              'text-gold/80': character.nurtureData.attributes.mood >= 60,
              'text-industrial-300': character.nurtureData.attributes.mood >= 40,
              'text-clinical-danger/60': character.nurtureData.attributes.mood >= 20,
              'text-clinical-danger font-black animate-pulse': character.nurtureData.attributes.mood < 20
            }">
              {{ character.nurtureData.attributes.mood >= 80 ? 'OPTIMIZED' : 
                 character.nurtureData.attributes.mood >= 60 ? 'STABLE' :
                 character.nurtureData.attributes.mood >= 40 ? 'OPERATIONAL' :
                 character.nurtureData.attributes.mood >= 20 ? 'DEGRADED' : 'CRITICAL_FAILURE' }}
            </span>
            <span class="text-[8px] font-mono text-industrial-600 tabular-nums ml-auto opacity-40">[{{ character.nurtureData.attributes.mood }}%]</span>
         </div>
      </div>
    </div>

    <!-- Background Decoration Pits -->
    <div class="absolute bottom-1 right-1 w-1 h-1 border-b border-r border-white/10"></div>
  </div>
</template>

<style scoped>
.character-status-uplink {
  box-shadow: inset 0 0 20px rgba(0,0,0,0.5);
}
</style>