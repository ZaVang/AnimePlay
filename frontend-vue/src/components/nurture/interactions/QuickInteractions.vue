<script setup lang="ts">
/**
 * Quick Interactions - Tactical Engagement Strip
 */
import { useEconomyStore } from '@/stores/modules/economyStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';
import { useInteractionEffects } from '@/composables/useInteractionEffects';

// Atomic Components
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const economyStore = useEconomyStore();
const { quickChat, quickGift } = useInteractionEffects(props.character);
</script>

<template>
  <div class="mb-8 space-y-4">
    <div class="flex items-center gap-2">
      <div class="w-1 h-3 bg-cyan-400"></div>
      <h3 class="text-[10px] font-display font-black text-white uppercase tracking-[0.3em]">Quick Response Vectors</h3>
    </div>
    
    <div class="grid grid-cols-2 gap-4">
      <!-- Quick Chat -->
      <TacticalButton 
        variant="secondary" 
        size="md" 
        @click="quickChat"
        class="group !justify-start p-4"
      >
        <div class="flex items-center gap-4 text-left">
          <div class="text-2xl group-hover:scale-110 transition-transform">💬</div>
          <div class="space-y-0.5">
            <div class="text-[10px] font-display font-black text-white uppercase tracking-wider">CASUAL_UPLINK</div>
            <div class="text-[8px] font-mono text-cyan-400 opacity-60">+05-15 AFF_DELTA</div>
          </div>
        </div>
      </TacticalButton>

      <!-- Quick Gift -->
      <TacticalButton 
        variant="primary" 
        size="md" 
        @click="quickGift"
        :disabled="economyStore.knowledgePoints < 25"
        class="group !justify-start p-4 border-hazard-rose/30"
      >
        <div class="flex items-center gap-4 text-left">
          <div class="text-2xl group-hover:scale-110 transition-transform">🎁</div>
          <div class="space-y-0.5">
            <div class="text-[10px] font-display font-black text-white uppercase tracking-wider">MINOR_LARGESSE</div>
            <div class="text-[8px] font-mono text-hazard-rose opacity-60">25 KP_REQUISITION</div>
          </div>
        </div>
      </TacticalButton>
    </div>
  </div>
</template>

<style scoped>
.text-hazard-rose { color: #E51E5D; }
</style>
