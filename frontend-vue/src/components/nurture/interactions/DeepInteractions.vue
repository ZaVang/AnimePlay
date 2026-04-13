<script setup lang="ts">
/**
 * Deep Interactions - Strategic Engagement Matrix
 */
import { useEconomyStore } from '@/stores/modules/economyStore';
import { ref } from 'vue';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';
import { useInteractionData } from '@/composables/useInteractionData';

// Atomic Components
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const emit = defineEmits<{
  startDialogue: [];
  openGift: [];
  openActivity: [];
  openCampus: [];
}>();

const economyStore = useEconomyStore();
const { availableInteractions } = useInteractionData(props.character);

function executeInteraction(interactionId: string) {
  switch (interactionId) {
    case 'dialogue': emit('startDialogue'); break;
    case 'gift': emit('openGift'); break;
    case 'activity': emit('openActivity'); break;
    case 'campus_activity': emit('openCampus'); break;
  }
}
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center gap-2">
      <div class="w-1 h-3 bg-gold"></div>
      <h3 class="text-[10px] font-display font-black text-white uppercase tracking-[0.3em]">Deep Strategic Vectors</h3>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <TacticalButton
        v-for="interaction in availableInteractions" 
        :key="interaction.id"
        variant="secondary"
        size="md"
        @click="executeInteraction(interaction.id)"
        :disabled="!interaction.available"
        class="group !items-start !justify-start p-5 h-auto text-left relative overflow-hidden"
      >
        <!-- Grid Overlay -->
        <div class="absolute inset-0 bg-grid opacity-5 pointer-events-none"></div>

        <div class="relative z-10 flex flex-col gap-4 w-full">
          <div class="flex items-center justify-between w-full">
             <div class="text-3xl group-hover:scale-110 transition-transform">{{ interaction.icon }}</div>
             <div v-if="interaction.cost.type === 'knowledge'" class="text-[9px] font-mono text-gold/60 uppercase">COST: {{ interaction.cost.amount }} KP</div>
          </div>

          <div class="space-y-1">
            <h4 class="text-[11px] font-display font-black text-white uppercase tracking-wider">{{ interaction.name }}</h4>
            <p class="text-[9px] text-industrial-500 uppercase leading-relaxed line-clamp-2">{{ interaction.description }}</p>
          </div>
          
          <div v-if="!interaction.available" class="pt-2 border-t border-white/5">
             <div class="text-[8px] font-mono text-clinical-danger uppercase animate-pulse">
                [ACCESS_DENIED] // 
                <span v-if="interaction.id === 'gift' && economyStore.knowledgePoints < 10">LOW_KP</span>
                <span v-else-if="interaction.id === 'activity' && character.nurtureData.affection < 100">LOW_AFF</span>
                <span v-else>AUTH_FAILURE</span>
             </div>
          </div>
        </div>
      </TacticalButton>
    </div>
  </div>
</template>

<style scoped>
.bg-grid {
  background-size: 20px 20px;
  background-image: 
    linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
}
.text-clinical-danger { color: #FF4D4D; }
</style>
