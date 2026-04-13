<script setup lang="ts">
import { computed } from 'vue';
import type { Card, Rarity } from '@/types';

const props = defineProps<{
  character: Card;
  isActive: boolean;
}>();

const rarityColorMap: Record<Rarity, string> = {
  UR: 'border-clinical-danger shadow-[0_0_15px_#E51E5D]',
  HR: 'border-gold shadow-[0_0_10px_#D4A574]',
  SSR: 'border-amber-500/60',
  SR: 'border-blue-500/40',
  R: 'border-green-500/30',
  N: 'border-industrial-700/20',
};

const rarityClass = computed(() => rarityColorMap[props.character.rarity] || rarityColorMap.N);
</script>

<template>
  <div
    class="character-item relative w-24 h-36 overflow-hidden transition-all duration-500 transform border"
    :class="[
      rarityClass,
      isActive ? 'scale-110 z-10 border-gold' : 'scale-100 opacity-60 border-white/5 grayscale-[0.3]'
    ]"
  >
    <!-- Background Static decoration -->
    <div class="absolute inset-0 bg-scanline opacity-10 pointer-events-none"></div>

    <img :src="character.image_path" :alt="character.name" class="w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-110">
    
    <!-- Identity Overlay -->
    <div class="absolute bottom-0 left-0 right-0 bg-black/80 p-2 border-t border-white/5">
      <div class="text-[6px] font-display font-bold text-industrial-500 uppercase tracking-widest leading-none mb-1">Operative_ID</div>
      <p class="text-[9px] font-display font-black text-white uppercase truncate tracking-tight" :title="character.name">
        {{ character.name }}
      </p>
    </div>

    <!-- Active Indicator: Tactical Banner -->
    <div v-if="isActive" class="absolute top-1 left-1 z-10 skew-x-[-12deg] bg-gold text-black text-[9px] font-display font-black px-2 py-0.5 shadow-[0_0_10px_#D4A574]">
      ACTIVE_DEPLOYMENT
    </div>

    <!-- Secondary Node lines -->
    <div class="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20"></div>
  </div>
</template>

<style scoped>
.character-item {
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.7);
}

.character-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, transparent 100%);
  pointer-events: none;
}
</style>
