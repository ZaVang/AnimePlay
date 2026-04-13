<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultOpen: false
});

const isOpen = ref(props.defaultOpen);

function toggleOpen() {
  isOpen.value = !isOpen.value;
}
</script>

<template>
  <div class="collapsible-node-tactical quantic-reveal bg-black/40 border border-white/5 relative overflow-hidden transition-all duration-500">
    <!-- Static Backdrop Decoration -->
    <div class="absolute inset-x-0 top-0 h-px bg-white/5 pointer-events-none"></div>
    
    <!-- Title Bar: Tactical Header -->
    <div 
      class="flex items-center justify-between p-4 cursor-pointer hover:bg-gold/[0.03] transition-all group"
      @click="toggleOpen"
    >
      <div class="flex items-center gap-3">
         <div v-if="icon" class="text-xl opacity-40 group-hover:opacity-100 transition-opacity">{{ icon }}</div>
         <div class="flex flex-col">
            <div class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-[0.4em] mb-0.5">Matrix_Node_0x{{ (title.length * 7).toString(16).toUpperCase() }}</div>
            <h2 class="text-xs font-display font-black text-white uppercase tracking-widest group-hover:text-gold transition-colors italic">
              {{ title }}
            </h2>
         </div>
      </div>
      
      <!-- Fold Indicator: Tactical Switch -->
      <div class="flex items-center gap-2">
         <div class="font-mono text-[9px] font-black tracking-widest" :class="isOpen ? 'text-gold' : 'text-industrial-600'">
            {{ isOpen ? '[ COLLAPSE_ ]' : '[ EXPAND_+ ]' }}
         </div>
         <div class="w-1.5 h-1.5 transition-all duration-500" 
              :class="isOpen ? 'bg-gold shadow-[0_0_8px_#D4A574]' : 'bg-white/10'"></div>
      </div>
    </div>

    <!-- Content: Decrypted Layer -->
    <div 
      class="overflow-hidden transition-all duration-500 ease-in-out relative bg-white/[0.01]"
      :class="isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'"
    >
      <div class="border-t border-white/5 p-4">
        <slot></slot>
      </div>
      
      <!-- Bottom Corner Decoration -->
      <div class="absolute bottom-1 right-1 w-1 h-1 border-b border-r border-white/10"></div>
    </div>
  </div>
</template>

<style scoped>
.collapsible-node-tactical {
  box-shadow: inset 0 0 30px rgba(0,0,0,0.3);
}

.transition-all {
  transition-property: max-height, opacity, background-color, border-color;
}
</style>