<script setup lang="ts">
/**
 * Campus Activities - Institutional Engagement Substrate
 */
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

const { campusActivities, isCampusActivityAvailable } = useInteractionData(props.character);
const { doCampusActivity } = useInteractionEffects(props.character);

function handleDoCampusActivity(activity: any) {
  if (isCampusActivityAvailable(activity)) {
    doCampusActivity(activity);
    emit('close');
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 quantic-reveal" @click.self="$emit('close')">
    <GlassPanel class="max-w-2xl w-full border-blue-400/20 shadow-3xl relative overflow-hidden">
      
      <!-- Header -->
      <template #header>
        <div class="flex justify-between items-center p-6 border-b border-white/5 bg-white/[0.02]">
          <div class="space-y-1">
            <h3 class="text-[10px] font-display font-bold text-blue-400 tracking-[0.3em] uppercase opacity-70">Academy Interlink</h3>
            <div class="text-xl font-display font-black text-white uppercase tracking-tighter">Campus Engagements</div>
          </div>
          <TacticalButton variant="secondary" size="xs" @click="$emit('close')">DISCONNECT</TacticalButton>
        </div>
      </template>

      <!-- Activity List -->
      <div class="p-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-none">
        <div 
          v-for="activity in campusActivities" 
          :key="activity.id"
          class="group relative bg-white/[0.02] border border-white/5 p-5 hover:border-blue-400/30 transition-all cursor-pointer overflow-hidden"
          :class="{ 'opacity-40 grayscale pointer-events-none': !isCampusActivityAvailable(activity) }"
          @click="handleDoCampusActivity(activity)"
        >
          <!-- Grid Ornament -->
          <div class="absolute inset-0 bg-grid opacity-5 pointer-events-none"></div>

          <div class="relative flex items-center justify-between">
            <div class="flex items-center gap-6">
              <div class="w-14 h-14 flex items-center justify-center bg-white/[0.03] border border-white/10 text-3xl group-hover:scale-110 transition-transform">
                {{ activity.icon }}
              </div>
              <div class="space-y-1">
                <h4 class="text-sm font-display font-black text-white uppercase tracking-wider">{{ activity.name }}</h4>
                <p class="text-[10px] text-industrial-500 uppercase font-display line-clamp-1 max-w-sm">{{ activity.description }}</p>
                
                <!-- Requirements -->
                <div class="flex items-center gap-4 pt-2">
                   <div class="text-[8px] font-mono text-industrial-600 uppercase">AFF_REQ: {{ activity.requirements.affection }}+</div>
                   <div class="text-[8px] font-mono text-industrial-600 uppercase">MOOD_REQ: {{ activity.requirements.mood }}+</div>
                   <div class="text-[8px] font-mono text-industrial-600 uppercase">CYCLE_LOAD: {{ activity.duration }}m</div>
                </div>
              </div>
            </div>

            <div class="text-right space-y-2">
              <div class="text-lg font-mono font-bold text-blue-400">+{{ activity.affectionGain }} <span class="text-[8px] opacity-60">AFF</span></div>
              <div class="flex items-center justify-end gap-2">
                 <div class="text-[10px] font-mono text-industrial-400">{{ activity.cost }} <span class="text-[8px] opacity-60">KP</span></div>
              </div>
            </div>
          </div>
          
          <!-- Stat Preview Overlay -->
          <div class="mt-4 flex gap-6 border-t border-white/5 pt-3">
             <div v-if="activity.moodGain" class="text-[9px] font-mono text-blue-400/60 uppercase">MOOD+{{ activity.moodGain }}</div>
             <div v-if="activity.charmGain" class="text-[9px] font-mono text-blue-400/60 uppercase">CHARM+{{ activity.charmGain }}</div>
             <div v-if="activity.intelligenceGain" class="text-[9px] font-mono text-blue-400/60 uppercase">INTEL+{{ activity.intelligenceGain }}</div>
             <div v-if="activity.strengthGain" class="text-[9px] font-mono text-blue-400/60 uppercase">STR+{{ activity.strengthGain }}</div>
          </div>
        </div>
      </div>
    </GlassPanel>
  </div>
</template>

<style scoped>
.bg-grid {
  background-size: 30px 30px;
  background-image: 
    linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px);
}
.scrollbar-none::-webkit-scrollbar { display: none; }
</style>