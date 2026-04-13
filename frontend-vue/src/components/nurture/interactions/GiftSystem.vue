<script setup lang="ts">
/**
 * Gift System - Resource Transfer Protocol Substrate
 */
import { ref } from 'vue';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';
import { useInteractionData } from '@/composables/useInteractionData';
import { useInteractionEffects } from '@/composables/useInteractionEffects';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const { availableGifts } = useInteractionData(props.character);
const { giveGift } = useInteractionEffects(props.character);

function handleGiveGift(gift: any) {
  giveGift(gift);
  emit('close');
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[110] p-4 quantic-reveal" @click.self="$emit('close')">
    <GlassPanel class="max-w-2xl w-full border-hazard-rose/20 shadow-3xl relative overflow-hidden">
      
      <!-- Header -->
      <template #header>
        <div class="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.02]">
          <div class="space-y-1">
            <h3 class="text-[10px] font-display font-bold text-hazard-rose tracking-[0.3em] uppercase opacity-70">Logistics Transfer</h3>
            <div class="text-xl font-display font-black text-white uppercase tracking-tighter">Strategic Gifts</div>
          </div>
          <TacticalButton variant="secondary" size="xs" @click="$emit('close')">TERMINATE</TacticalButton>
        </div>
      </template>

      <!-- Gift Selection Grid -->
      <div class="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto scrollbar-none">
        <div 
          v-for="gift in availableGifts" 
          :key="gift.id"
          class="group relative bg-white/[0.02] border border-white/5 p-4 hover:border-hazard-rose/30 transition-all cursor-pointer overflow-hidden"
          :class="{
            'border-gold/30': gift.rarity === 'rare',
            'border-cyan-400/30': gift.rarity === 'uncommon'
          }"
          @click="handleGiveGift(gift)"
        >
          <!-- Grid Ornament -->
          <div class="absolute inset-0 bg-grid opacity-5 pointer-events-none"></div>

          <div class="relative flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 flex items-center justify-center bg-white/[0.03] border border-white/10 text-2xl group-hover:scale-110 transition-transform">
                {{ gift.icon }}
              </div>
              <div class="space-y-1">
                <h4 class="text-xs font-display font-black text-white uppercase tracking-wider">{{ gift.name }}</h4>
                <p class="text-[9px] text-industrial-500 uppercase font-display line-clamp-1 max-w-[120px]">{{ gift.description }}</p>
              </div>
            </div>

            <div class="text-right space-y-1">
              <div class="text-xs font-mono font-bold text-hazard-rose">+{{ gift.affectionGain }} <span class="text-[7px] opacity-60">AFF</span></div>
              <div class="text-[9px] font-mono text-industrial-500">{{ gift.cost }} <span class="text-[7px] opacity-60">KP</span></div>
            </div>
          </div>
          
          <!-- Stat Preview Overlay -->
          <div class="mt-4 flex gap-4 border-t border-white/5 pt-3">
             <div v-if="gift.moodGain" class="text-[8px] font-mono text-hazard-rose/60 uppercase">MOOD+{{ gift.moodGain }}</div>
             <div v-if="gift.charmGain" class="text-[8px] font-mono text-hazard-rose/60 uppercase">CHARM+{{ gift.charmGain }}</div>
             <div v-if="gift.intelligenceGain" class="text-[8px] font-mono text-hazard-rose/60 uppercase">INTEL+{{ gift.intelligenceGain }}</div>
          </div>
        </div>
      </div>
    </GlassPanel>
  </div>
</template>

<style scoped>
.bg-grid {
  background-size: 20px 20px;
  background-image: 
    linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
}
.scrollbar-none::-webkit-scrollbar { display: none; }
.text-hazard-rose { color: #E51E5D; }
.border-hazard-rose\/20 { border-color: rgba(229, 30, 93, 0.2); }
</style>