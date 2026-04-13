<script setup lang="ts">
import type { DrawnCard } from '@/stores/gachaStore';
import AnimeCard from './AnimeCard.vue';
import CharacterCard from './CharacterCard.vue';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

// Define props
const props = defineProps<{
  isOpen: boolean;
  cards: DrawnCard[];
  gachaType: 'anime' | 'character';
}>();

// Define emits
const emit = defineEmits(['close']);

function closeModal() {
  emit('close');
}
</script>

<template>
  <!-- Tactical Overlay -->
  <div 
    v-if="isOpen" 
    @click.self="closeModal"
    class="fixed inset-0 bg-black/95 backdrop-blur-2xl flex items-center justify-center z-50 p-6 transition-all duration-700 overflow-hidden"
  >
    <!-- Background Static decoration -->
    <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>

    <!-- Modal Content: Glass Matrix -->
    <GlassPanel 
      class="max-w-6xl w-full max-h-[95vh] border-gold/20 shadow-3xl quantic-reveal overflow-hidden flex flex-col"
    >
      <template #header>
         <div class="mb-8 border-b border-white/5 pb-4">
            <div class="text-[8px] font-display font-bold text-gold tracking-[0.6em] uppercase opacity-70 mb-2">Acquisition_Protocol</div>
            <h2 class="text-3xl font-display font-black text-white uppercase tracking-tighter">DATA_SYNC_RESULTS</h2>
         </div>
      </template>

      <div class="flex-1 overflow-y-auto px-4 py-8 scrollbar-tactical">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8">
          <template v-for="card in cards" :key="card.id">
            <div class="card-entry-animation transform transition-all hover:scale-105">
                <AnimeCard 
                  v-if="gachaType === 'anime'"
                  :anime="card"
                  :is-new="card.isNew"
                  :is-duplicate="card.isDuplicate"
                  class="shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                />
                <CharacterCard 
                  v-else-if="gachaType === 'character'"
                  :character="card"
                  :is-new="card.isNew"
                  :is-duplicate="card.isDuplicate"
                  class="shadow-[0_0_20px_rgba(0,0,0,0.5)]"
                />
                
                <!-- NEW TAG (Styled for ATL) -->
                <div v-if="card.isNew" class="absolute -top-2 -right-2 z-10 skew-x-[-12deg] bg-gold text-black text-[9px] font-display font-black px-2 py-0.5 shadow-lg">
                   NEW_ASSET
                </div>
            </div>
          </template>
        </div>
      </div>

      <template #footer>
        <div class="text-center mt-12 pt-8 border-t border-white/5">
          <TacticalButton 
            variant="primary"
            size="lg"
            @click="closeModal" 
            class="min-w-[240px]"
          >
            CONFIRM_UPLINK // 确认
          </TacticalButton>
          
          <div class="mt-4 text-[7px] font-mono text-industrial-600 uppercase tracking-widest opacity-40">
            Secure_Data_Transmission_Complete_v3.2
          </div>
        </div>
      </template>

      <!-- Corner Pins -->
      <div class="absolute top-4 left-4 w-4 h-[1px] bg-white/10"></div>
      <div class="absolute top-4 left-4 w-[1px] h-4 bg-white/10"></div>
    </GlassPanel>
  </div>
</template>

<style scoped>
.scrollbar-tactical::-webkit-scrollbar {
  width: 2px;
}
.scrollbar-tactical::-webkit-scrollbar-track {
  @apply bg-transparent;
}
.scrollbar-tactical::-webkit-scrollbar-thumb {
  @apply bg-gold/20;
}

.shadow-3xl {
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.95);
}

/* Staggered entry animation for items */
.card-entry-animation {
  animation: item-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}

@keyframes item-reveal {
  0% { opacity: 0; transform: translateY(40px) scale(0.9); filter: blur(10px); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

/* Sequential delay for cards */
.card-entry-animation:nth-child(1) { animation-delay: 0.1s; }
.card-entry-animation:nth-child(2) { animation-delay: 0.15s; }
.card-entry-animation:nth-child(3) { animation-delay: 0.2s; }
.card-entry-animation:nth-child(4) { animation-delay: 0.25s; }
.card-entry-animation:nth-child(5) { animation-delay: 0.3s; }
.card-entry-animation:nth-child(6) { animation-delay: 0.35s; }
.card-entry-animation:nth-child(7) { animation-delay: 0.4s; }
.card-entry-animation:nth-child(8) { animation-delay: 0.45s; }
.card-entry-animation:nth-child(9) { animation-delay: 0.5s; }
.card-entry-animation:nth-child(10) { animation-delay: 0.55s; }
</style>
