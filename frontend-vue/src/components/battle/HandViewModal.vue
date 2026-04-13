<script setup lang="ts">
import { computed } from 'vue';
import type { AnimeCard } from '@/types/card';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

interface Props {
  isVisible: boolean;
  cards: AnimeCard[];
  title: string;
  subtitle?: string;
  emptyMessage?: string;
  showTypes?: boolean;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  close: [];
}>();

const cardTypes = computed(() => {
  if (!props.showTypes) return [];
  
  const types = new Set<string>();
  props.cards.forEach(card => {
    if (card.synergy_tags) {
      card.synergy_tags.forEach(tag => types.add(tag));
    }
  });
  return Array.from(types);
});

function close() {
  emit('close');
}

function onImageError(event: Event) {
  const target = event.target as HTMLImageElement;
  // Local fallback to consistent tactical placeholder
  target.src = '/data/images/anime/default_tactical.jpg';
}
</script>

<template>
  <div
    v-if="isVisible"
    @click.self="close"
    class="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4 transition-all duration-500"
  >
    <GlassPanel
      class="max-w-5xl w-full border-white/10 shadow-3xl quantic-reveal flex flex-col h-[85vh]"
    >
      <!-- Header -->
      <template #header>
        <div class="flex justify-between items-center mb-8">
          <div class="space-y-1">
             <div class="text-[8px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70">Resource Inventory Protocol</div>
             <h2 class="text-3xl font-display font-black text-white uppercase tracking-tighter">{{ title }}</h2>
             <p v-if="subtitle" class="text-[10px] font-mono text-industrial-500 uppercase tracking-widest italic opacity-60">{{ subtitle }}</p>
          </div>
          <TacticalButton variant="ghost" size="sm" @click="close">DISCONNECT_VIEW</TacticalButton>
        </div>
      </template>

      <!-- Cards Display -->
      <div class="flex-grow overflow-y-auto pr-4 -mr-4 scrollbar-none">
        <div v-if="cards.length > 0" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          <div
            v-for="(card, index) in cards"
            :key="`${card.id}-${index}`"
            class="group relative border border-white/5 bg-black/40 hover:border-gold/30 transition-all duration-500 overflow-hidden"
          >
            <!-- Scanline decoration -->
            <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>

            <img 
              :src="card.image_path"
              class="w-full aspect-[3/4] object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110"
              :alt="card.name"
              @error="onImageError"
            />
            
            <!-- Card Info Overlay -->
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-8">
              <p class="text-white text-[10px] font-display font-black truncate uppercase mb-1 tracking-tighter group-hover:text-gold transition-colors">{{ card.name }}</p>
              <div class="flex justify-between items-center text-[8px] font-mono text-industrial-400 uppercase">
                <span class="flex items-center gap-1 group-hover:text-blue-400 transition-colors">
                  <span class="w-1 h-1 bg-blue-400/40"></span> COST: {{ card.cost }} TP
                </span>
                <span v-if="card.synergy_tags && card.synergy_tags.length > 0" class="truncate ml-2 opacity-60">
                  #{{ card.synergy_tags[0] }}
                </span>
              </div>
            </div>
            
            <!-- Type Label -->
            <div 
              v-if="card.effectDescription"
              class="absolute top-2 left-2 bg-gold text-black text-[8px] font-display font-black px-2 py-0.5 tracking-widest uppercase"
            >
              DATA_LINK
            </div>
            
            <!-- Hover light glow -->
            <div class="absolute inset-0 opacity-0 group-hover:opacity-10 dark:bg-gold/20 pointer-events-none transition-opacity"></div>
          </div>
        </div>
        
        <div v-else class="flex flex-col items-center justify-center h-full py-24 text-center">
           <div class="text-[10px] font-display font-bold text-industrial-600 uppercase tracking-[0.5em] mb-4">
             {{ emptyMessage || 'NO_DATA_STREAM_DETECTED' }}
           </div>
           <div class="w-16 h-px bg-white/5"></div>
        </div>
      </div>

      <!-- Footer -->
      <template #footer>
        <div class="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div class="flex flex-wrap gap-8 text-[8px] font-display font-bold text-industrial-600 uppercase tracking-widest">
            <span class="flex items-center gap-2"><span class="w-1 h-1 bg-gold/40"></span> TOTAL_ENTITIES: {{ cards.length }}</span>
            <span v-if="showTypes && cardTypes.length > 0" class="flex items-center gap-2">
              <span class="w-1 h-1 bg-gold/40"></span> SEMANTIC_TYPES: {{ cardTypes.join(' // ') }}
            </span>
          </div>
          <TacticalButton
            variant="primary"
            size="lg"
            @click="close"
          >
            CONFIRM_UPLINK
          </TacticalButton>
        </div>
      </template>
    </GlassPanel>
  </div>
</template>

<style scoped>
.shadow-3xl {
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.9);
}
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>