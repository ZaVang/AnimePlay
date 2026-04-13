<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { AnimeCard } from '@/types/card';
import type { CardSelectionOptions } from '@/core/systems/InteractionSystem';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

interface Props {
  isVisible: boolean;
  cards: AnimeCard[];
  options: CardSelectionOptions;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  select: [cards: AnimeCard[]];
  cancel: [];
  close: [];
}>();

const selectedCards = ref<AnimeCard[]>([]);

const availableCards = computed(() => {
  let cards = props.cards;
  if (props.options.filter) {
    cards = cards.filter(props.options.filter);
  }
  return cards;
});

function toggleCardSelection(card: AnimeCard) {
  const index = selectedCards.value.indexOf(card);
  
  if (index !== -1) {
    // Deselect
    selectedCards.value.splice(index, 1);
  } else if (selectedCards.value.length < props.options.count) {
    // Select
    selectedCards.value.push(card);
  }
}

function confirm() {
  emit('select', [...selectedCards.value]);
  selectedCards.value = [];
  emit('close');
}

function cancel() {
  selectedCards.value = [];
  emit('cancel');
  emit('close');
}

// Reset selection on visibility change
watch(() => props.isVisible, (visible) => {
  if (!visible) {
    selectedCards.value = [];
  }
});
</script>

<template>
  <div
    v-if="isVisible"
    @click.self="!options.required ? cancel() : null"
    class="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center z-50 p-4 transition-all duration-500"
  >
    <GlassPanel
      class="max-w-5xl w-full border-white/10 shadow-3xl quantic-reveal flex flex-col h-[85vh]"
    >
      <!-- Header -->
      <template #header>
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div class="space-y-1">
             <div class="text-[8px] font-display font-bold text-gold tracking-[0.5em] uppercase opacity-70">Entity Selection Protocol</div>
             <h2 class="text-3xl font-display font-black text-white uppercase tracking-tighter">{{ options.title }}</h2>
             <div v-if="options.description" class="text-[10px] font-mono text-industrial-500 uppercase tracking-widest italic opacity-60">
               {{ options.description }}
             </div>
             <div class="mt-4 inline-flex items-center gap-3 px-3 py-1 bg-white/5 border border-white/10">
                <span class="text-[9px] font-display font-bold text-gold uppercase tracking-widest animate-pulse">Required_Quota:</span>
                <span class="text-xs font-mono font-black text-white tabular-nums">
                  [{{ selectedCards.length }} / {{ options.count }}]
                </span>
             </div>
          </div>
          <TacticalButton v-if="!options.required" variant="ghost" size="sm" @click="cancel">ABORT_SELECTION</TacticalButton>
        </div>
      </template>

      <!-- Cards Grid -->
      <div class="flex-grow overflow-y-auto pr-4 -mr-4 scrollbar-none">
        <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          <div
            v-for="card in availableCards"
            :key="card.id"
            @click="toggleCardSelection(card)"
            :class="[
              'group relative cursor-pointer border transition-all duration-500 overflow-hidden',
              selectedCards.includes(card) 
                ? 'border-gold shadow-[0_0_20px_rgba(212,165,116,0.3)] scale-105 z-10' 
                : 'border-white/5 bg-black/40 hover:border-gold/30'
            ]"
          >
            <!-- Scanline decoration -->
            <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>

            <img 
              :src="card.image_path"
              class="w-full aspect-[3/4] object-cover transition-transform duration-700 group-hover:scale-110"
              :class="selectedCards.includes(card) ? 'grayscale-0' : 'grayscale-[0.5] group-hover:grayscale-0'"
              :alt="card.name"
            />
            
            <!-- Selection Indicator -->
            <div
              v-if="selectedCards.includes(card)"
              class="absolute top-2 right-2 w-7 h-7 bg-gold flex items-center justify-center border-2 border-black/80 shadow-lg"
            >
              <span class="text-black text-[12px] font-black font-mono">{{ selectedCards.indexOf(card) + 1 }}</span>
            </div>
            
            <!-- Card Info Overlay -->
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-6 scale-y-100 origin-bottom transition-transform duration-500">
              <p class="text-white text-[10px] font-display font-black truncate uppercase tracking-tighter mb-1">{{ card.name }}</p>
              <div class="text-[8px] font-mono text-industrial-400 flex items-center gap-2">
                 <span class="w-1 h-1 bg-gold/50"></span> COST: {{ card.cost }} TP
              </div>
            </div>

            <!-- Selection highlight -->
            <div v-if="selectedCards.includes(card)" class="absolute inset-0 border-2 border-gold/40 pointer-events-none"></div>
          </div>
        </div>
        
        <div v-if="availableCards.length === 0" class="flex flex-col items-center justify-center h-full py-24 text-center">
           <div class="text-[10px] font-display font-bold text-industrial-600 uppercase tracking-[0.5em] mb-4">
             VACUUM_SIGNAL // NO_ENTITIES_TARGETABLE
           </div>
        </div>
      </div>

      <!-- Footer -->
      <template #footer>
        <div class="mt-8 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div class="text-[9px] font-display font-bold text-industrial-500 uppercase tracking-widest italic opacity-60">
            System Alert: Selection must match the required data quota for successful tactical execution.
          </div>
          <div class="flex gap-4">
            <TacticalButton
              v-if="!options.required"
              variant="ghost"
              size="md"
              @click="cancel"
            >
              DISCARD
            </TacticalButton>
            <TacticalButton
              variant="primary"
              size="lg"
              @click="confirm"
              :disabled="options.required && selectedCards.length < options.count"
            >
              EXECUTE_SELECTION
            </TacticalButton>
          </div>
        </div>
      </template>
    </GlassPanel>
  </div>
</template>

<style scoped>
.shadow-3xl {
  box-shadow: 0 0 50px rgba(0, 0, 0, 0.9);
}
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>