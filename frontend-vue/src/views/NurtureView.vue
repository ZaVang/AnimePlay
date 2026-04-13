<script setup lang="ts">
/**
 * Nurture View - Bio-Logic Optimization Lab
 */
import { ref, computed } from 'vue';
import { useAuthStore } from '@/stores/modules/authStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import CharacterSelector from '@/components/nurture/CharacterSelector.vue';
import CharacterProfile from '@/components/nurture/CharacterProfile.vue';
import InteractionPanel from '@/components/nurture/InteractionPanel.vue';
import NurtureActions from '@/components/nurture/NurtureActions.vue';
import DialogueSystem from '@/components/nurture/DialogueSystem.vue';
import CollapsiblePanel from '@/components/nurture/CollapsiblePanel.vue';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const authStore = useAuthStore();
const nurtureStore = useNurtureStore();
const gameDataStore = useGameDataStore();

// State
const selectedCharacterId = ref<number | null>(null);
const dialogueActive = ref(false);

// Computed
const selectedCharacter = computed(() => {
  if (!selectedCharacterId.value) return null;
  const character = gameDataStore.getCharacterCardById(selectedCharacterId.value);
  if (!character) return null;
  
  const nurtureData = nurtureStore.getNurtureData(selectedCharacterId.value);
  return { ...character, nurtureData };
});

// Handlers
function selectCharacter(characterId: number) {
  selectedCharacterId.value = characterId;
}

function startDialogue() {
  if (selectedCharacter.value) dialogueActive.value = true;
}

function endDialogue() {
  dialogueActive.value = false;
}
</script>

<template>
  <div class="nurture-view p-4 md:p-8 space-y-8 font-ui">
    
    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
      <div class="space-y-2">
        <h2 class="text-[10px] font-display font-bold text-hazard-rose tracking-[0.5em] uppercase opacity-70">Bio-Logic Lab</h2>
        <h1 class="text-4xl font-display font-bold tracking-tighter uppercase text-white">Personnel Tuning</h1>
      </div>
      
      <div class="flex items-center gap-6">
        <div v-if="selectedCharacter" class="text-right">
          <div class="text-[9px] font-display text-industrial-500 uppercase">Current Subject</div>
          <div class="text-lg font-display text-white font-black uppercase">{{ selectedCharacter.name }}</div>
        </div>
        <CharacterSelector 
          :selected-character-id="selectedCharacterId"
          @select="selectCharacter"
        />
      </div>
    </header>

    <!-- Main Content -->
    <div v-if="!authStore.isLoggedIn" class="py-24 text-center">
      <p class="text-industrial-500 font-display text-xs tracking-widest uppercase">Bio-Metric Lock Active // Login Required</p>
    </div>

    <div v-else class="quantic-reveal space-y-8">
      
      <!-- Selection Placeholder -->
      <div v-if="!selectedCharacter" class="h-[60vh] flex items-center justify-center">
        <GlassPanel class="max-w-md w-full text-center border-white/5">
           <div class="py-12 space-y-6">
             <div class="text-6xl opacity-20">🧬</div>
             <div class="space-y-2">
                <h3 class="text-sm font-display font-bold text-white uppercase tracking-widest">Awaiting Neural Link</h3>
                <p class="text-xs text-industrial-500 max-w-xs mx-auto leading-relaxed">Select a personnel file from the top-right console to begin optimization protocols.</p>
             </div>
             <div class="pt-4 flex justify-center">
                <div class="w-12 h-0.5 bg-hazard-rose/30 animate-pulse"></div>
             </div>
           </div>
        </GlassPanel>
      </div>

      <!-- Optimization Dashboard -->
      <div v-else class="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        
        <!-- Profile Column -->
        <div class="xl:col-span-4 space-y-6">
           <CharacterProfile :character="selectedCharacter" />
        </div>

        <!-- Interaction & Actions Column -->
        <div class="xl:col-span-8 space-y-8">
           <!-- Interactions -->
           <div class="quantic-reveal" style="animation-delay: 100ms">
             <div class="flex items-center gap-3 mb-4">
               <div class="w-1.5 h-1.5 bg-hazard-rose rounded-full shadow-[0_0_8px_#E51E5D]"></div>
               <h3 class="text-xs font-display font-bold text-white uppercase tracking-widest">Social Synthesis</h3>
             </div>
             
             <GlassPanel :reveal="false" class="border-white/5 bg-hazard-rose/[0.01]">
                <InteractionPanel 
                  :character="selectedCharacter"
                  @start-dialogue="startDialogue"
                />
             </GlassPanel>
           </div>

           <!-- Optimization Tasks -->
           <div class="quantic-reveal" style="animation-delay: 200ms">
             <div class="flex items-center gap-3 mb-4">
               <div class="w-1.5 h-1.5 bg-hazard-rose rounded-full shadow-[0_0_8px_#E51E5D]"></div>
               <h3 class="text-xs font-display font-bold text-white uppercase tracking-widest">Bio-Logic Tuning</h3>
             </div>

             <GlassPanel :reveal="false" class="border-gold/10 bg-gold/[0.01]">
                <NurtureActions :character="selectedCharacter" />
             </GlassPanel>
           </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <DialogueSystem 
      v-if="dialogueActive && selectedCharacter"
      :character="selectedCharacter"
      @close="endDialogue"
    />
  </div>
</template>

<style scoped>
.nurture-view {
  min-height: calc(100vh - 80px);
}

.text-hazard-rose {
  color: #E51E5D;
}

.bg-hazard-rose {
  background-color: #E51E5D;
}
</style>