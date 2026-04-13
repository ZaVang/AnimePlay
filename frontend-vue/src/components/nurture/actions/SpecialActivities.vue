<script setup lang="ts">
/**
 * Special Activities - Personnel Engagement Interface
 */
import { useAuthStore } from '@/stores/modules/authStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';
import { useCharacterTraining } from '@/composables/useCharacterTraining';

// Atomic Components
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const authStore = useAuthStore();
const economyStore = useEconomyStore();
const nurtureStore = useNurtureStore();
const { specialActivities } = useCharacterTraining(props.character);

function performSpecialActivity(activityId: string) {
  const activity = specialActivities.value.find(a => a.id === activityId);
  if (!activity || !activity.available) return;
  
  if (economyStore.knowledgePoints < activity.cost) {
    authStore.addLog('SYSTEM // INSUFFICIENT_KNOWLEDGE', 'warning');
    return;
  }

  economyStore.knowledgePoints -= activity.cost;
  const nurtureData = nurtureStore.getNurtureData(props.character.id);

  switch (activityId) {
    case 'rest':
      nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + 15);
      const attrs = ['charm', 'intelligence', 'strength'] as const;
      const randomAttr = attrs[Math.floor(Math.random() * attrs.length)];
      nurtureStore.enhanceAttribute(props.character.id, randomAttr, 1);
      break;
    case 'meditation':
      nurtureStore.enhanceAttribute(props.character.id, 'charm', 2);
      nurtureStore.enhanceAttribute(props.character.id, 'intelligence', 2);
      nurtureStore.enhanceAttribute(props.character.id, 'strength', 2);
      nurtureData.attributes.mood = Math.min(100, nurtureData.attributes.mood + 10);
      break;
    case 'special_event':
      nurtureStore.increaseAffection(props.character.id, 100);
      nurtureData.specialEvents.push(`special_event_${Date.now()}`);
      break;
  }
  
  authStore.addLog(`PROTOCOL // ${activity.name.toUpperCase()}_COMPLETE`, 'success');
}

function getActivityColor(activityId: string) {
  if (activityId === 'special_event') return 'text-hazard-rose';
  return 'text-gold';
}
</script>

<template>
  <div class="special-activities space-y-8">
    <div class="flex items-center gap-4 mb-2">
       <div class="w-2 h-4 bg-gold shadow-[0_0_8px_#D4A574] animate-pulse"></div>
       <div class="space-y-0.5">
          <h3 class="text-[10px] font-display font-black text-white uppercase tracking-[0.2em]">Special Engagement Protocols</h3>
          <div class="text-[7px] font-mono text-gold/60 uppercase tracking-widest">Type: Socio_Neural_Sync</div>
       </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div 
        v-for="activity in specialActivities" 
        :key="activity.id"
        class="activity-card group relative bg-black/60 border border-white/10 p-6 transition-all duration-500 hover:border-gold/40 hover:bg-white/[0.02] overflow-hidden"
        :class="{ 'opacity-40 grayscale': !activity.available }"
      >
        <!-- Engagement Overlays -->
        <div class="absolute inset-0 bg-grid opacity-5 pointer-events-none"></div>
        <div class="absolute top-0 right-0 p-2 text-[6px] font-mono text-industrial-700 opacity-40 uppercase tracking-tighter">
           UID: ACT_{{ activity.id.toUpperCase() }} // PRIORITY_HIGH
        </div>

        <!-- Header -->
        <div class="flex justify-between items-start mb-6 relative z-10">
           <div class="text-4xl grayscale group-hover:grayscale-0 transition-transform duration-700 group-hover:scale-110 drop-shadow-[0_0_12px_rgba(255,255,255,0.05)]">{{ activity.icon }}</div>
           <div class="text-right">
             <div class="text-[8px] font-display font-black text-industrial-500 uppercase tracking-widest mb-1">Resource_Value</div>
             <div class="text-xs font-mono font-bold text-gold tabular-nums">{{ activity.cost }} KP</div>
           </div>
        </div>

        <!-- Info -->
        <div class="space-y-1 mb-6 relative z-10">
          <h4 class="text-[11px] font-display font-black text-white uppercase tracking-widest">{{ activity.name }}</h4>
          <p class="text-[9px] text-industrial-500 leading-relaxed uppercase tracking-tighter opacity-80">{{ activity.description }}</p>
        </div>

        <!-- Effect Vector -->
        <div class="bg-white/[0.03] border border-white/5 p-3 text-center mb-8 relative z-10">
          <div class="text-[9px] font-display font-black uppercase tracking-[0.2em]" :class="getActivityColor(activity.id)">
            PROJECTION: {{ activity.effect }}
          </div>
          <div class="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-px bg-white/10 group-hover:w-full transition-all duration-700"></div>
        </div>

        <!-- Sync Status / Action -->
        <div class="space-y-4 relative z-10">
           <div v-if="!activity.available" class="text-center py-2 bg-hazard-rose/[0.03] border border-hazard-rose/10 mb-2">
              <div class="text-[7px] font-display font-black text-hazard-rose uppercase tracking-widest mb-1">REQUIRE_BOND_INTENSITY</div>
              <div class="text-[10px] font-mono text-white opacity-40">{{ activity.id === 'special_event' ? 'CORE_500+' : 'BASE_200+' }}</div>
           </div>

           <TacticalButton
             variant="secondary"
             class="w-full !rounded-none"
             size="sm"
             :disabled="!activity.available || economyStore.knowledgePoints < activity.cost"
             @click="performSpecialActivity(activity.id)"
           >
             <span v-if="!activity.available">LINK_LOCKED</span>
             <span v-else-if="economyStore.knowledgePoints < activity.cost">KP_INSUFFICIENT</span>
             <span v-else>INITIATE_UPLINK</span>
           </TacticalButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.activity-card {
  clip-path: polygon(0 0, 100% 0, 100% 90%, 94% 100%, 0 100%);
}

.bg-grid {
  background-size: 20px 20px;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
}

.text-hazard-rose { color: #E51E5D; }
</style>
