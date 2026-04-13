<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { getCurrentUpPool, getTimeUntilNextRotation, isAnimeCard, isCharacterCard } from '@/utils/gachaRotation';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';

const props = defineProps<{
  gachaType: 'anime' | 'character';
}>();

const gameDataStore = useGameDataStore();
const rotationTimer = ref<{ hours: number; minutes: number }>({ hours: 0, minutes: 0 });
let intervalId: any = null;

const upConfig = computed(() => {
  return props.gachaType === 'anime' ? GAME_CONFIG.animeSystem.rateUp : GAME_CONFIG.characterSystem.rateUp;
});

// Dynamic UP cards selection
const upCards = computed(() => {
  const cardSource = props.gachaType === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
  if (cardSource.length === 0) return [];
  
  try {
    const { urId, hrId } = getCurrentUpPool(props.gachaType);
    const urCard = cardSource.find(card => card.id === urId);
    const hrCard = cardSource.find(card => card.id === hrId);
    return [urCard, hrCard].filter(Boolean);
  } catch (error) {
    return [];
  }
});

function updateRotationTimer() {
  rotationTimer.value = getTimeUntilNextRotation();
}

onMounted(() => {
  updateRotationTimer();
  intervalId = setInterval(updateRotationTimer, 60000);
});

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId);
});
</script>

<template>
  <div v-if="upCards.length > 0" class="up-banner-tactical quantic-reveal overflow-hidden relative mb-8">
    <!-- Background Static decoration -->
    <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>

    <div class="flex justify-between items-start mb-6 border-b border-white/5 pb-4">
      <div>
         <div class="text-[7px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70 mb-1">Uplink_Sequencer</div>
         <h3 class="text-xl font-display font-black text-white uppercase tracking-tighter italic">SEQUENTIAL_UPLINK_PROTOCOL</h3>
      </div>
      
      <!-- Rotation Timer: Tactical Readout -->
      <div class="flex flex-col items-end">
         <span class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-widest mb-1">Rotation_Cycle</span>
         <div class="bg-black/40 border border-white/10 px-3 py-1 flex items-center gap-2">
            <div class="w-1 h-1 bg-gold animate-pulse"></div>
            <span class="font-mono text-[10px] font-black text-gold tabular-nums uppercase">
              T-MINUS [{{ rotationTimer.hours }}H:{{ rotationTimer.minutes }}M]
            </span>
         </div>
      </div>
    </div>
    
    <div class="flex justify-center items-center gap-8 mb-6">
      <div v-for="(card, index) in upCards" :key="card!.id" class="relative group">
        <div class="transform transition-all duration-700 group-hover:scale-105">
           <AnimeCard v-if="gachaType === 'anime' && card && isAnimeCard(card)" :anime="card" class="w-32" />
           <CharacterCard v-if="gachaType === 'character' && card && isCharacterCard(card)" :character="card" class="w-32" />
        </div>
        
        <!-- Rarity Tags: Skewed Tactical Style -->
        <div v-if="card" class="absolute -top-2 -right-3 z-10 skew-x-[-12deg] px-3 py-0.5 text-[9px] font-display font-black shadow-lg"
             :class="{
               'bg-clinical-danger text-white': card.rarity === 'UR',
               'bg-gold text-black': card.rarity === 'HR'
             }">
          {{ card.rarity }}_SPEC
        </div>
      </div>
    </div>
    
    <div class="text-center p-4 bg-white/[0.02] border border-white/5 relative">
      <!-- Decor Pits -->
      <div class="absolute top-0 left-0 w-1 h-1 bg-white/10"></div>
      <div class="absolute bottom-0 right-0 w-1 h-1 bg-white/10"></div>
      
      <div class="space-y-1">
        <p class="text-[10px] font-display font-bold text-industrial-200 uppercase tracking-tight">
          PROBABILITY_SYNC: <span class="text-gold font-black">{{ (upConfig.hrChance * 100).toFixed(0) }}%</span> BIAS FOR DESIGNATED TARGETS
        </p>
        <div class="flex justify-center gap-8 text-[7px] font-mono text-industrial-500 uppercase tracking-widest opacity-60">
           <span v-if="upConfig.hrPityPulls > 0">HR_PITY_THRESHOLD: [{{ upConfig.hrPityPulls }}]</span>
           <span v-if="upConfig.urPityPulls > 0">UR_PITY_THRESHOLD: [{{ upConfig.urPityPulls }}]</span>
        </div>
      </div>
    </div>

    <!-- Secondary info tag -->
    <div class="mt-4 text-[7px] font-display font-bold text-industrial-600 uppercase tracking-widest text-center opacity-40">
       DAILY_ROTATION_PROTOCOL_ACTIVE_0000Z
    </div>
  </div>
</template>

<style scoped>
.up-banner-tactical {
  @apply bg-black/40 backdrop-blur-md p-6 border border-white/5;
}
</style>
