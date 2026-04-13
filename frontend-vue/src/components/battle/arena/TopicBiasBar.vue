<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/battle';
import { useSettingsStore } from '@/stores/settings';

// Themes mapping
import BiasBarGradient from '@/themes/topicBiasBar/Gradient.vue';
import BiasBarCyber from '@/themes/topicBiasBar/Cyber.vue';
import BiasBarElegant from '@/themes/topicBiasBar/Elegant.vue';

const gameStore = useGameStore();
const settingsStore = useSettingsStore();

// Get active theme
const currentTheme = computed(() => settingsStore.biasBarTheme || 'gradient');

// Component mapping
const themeComponents = {
  gradient: BiasBarGradient,
  cyber: BiasBarCyber,
  elegant: BiasBarElegant
};

const CurrentBiasBar = computed(() => themeComponents[currentTheme.value]);
</script>

<template>
  <div class="bias-bar-container quantic-reveal relative">
    <!-- Component Switch Anim -->
    <Transition name="theme-switch" mode="out-in">
      <component 
        :is="CurrentBiasBar" 
        :key="currentTheme"
        :topic-bias="gameStore.topicBias"
      />
    </Transition>
    
    <!-- Tactical Theme Switcher: Terminal Style -->
    <button 
      v-if="settingsStore.showThemeSwitcher"
      @click="settingsStore.cycleBarTheme()"
      class="theme-switch-btn group"
      :title="`UI_PROTOCOL: ${currentTheme.toUpperCase()}`"
    >
      <div class="flex flex-col items-center">
         <div class="w-1 h-1 bg-gold opacity-40 group-hover:opacity-100 group-hover:scale-125 transition-all mb-0.5"></div>
         <span class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-tighter group-hover:text-gold transition-colors">OS_STYLE</span>
      </div>
      
      <!-- Border feedback -->
      <div class="absolute inset-0 border border-white/5 group-hover:border-gold/30 transition-colors"></div>
    </button>
  </div>
</template>

<style scoped>
.bias-bar-container {
  @apply relative;
}

.theme-switch-btn {
  @apply absolute top-1 right-1 px-2 py-1 bg-black/40 backdrop-blur-md;
  @apply flex items-center justify-center;
  @apply transition-all duration-300;
  @apply z-20;
}

/* Theme switch animations */
.theme-switch-enter-active,
.theme-switch-leave-active {
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.theme-switch-enter-from {
  opacity: 0;
  filter: blur(10px);
  transform: scale(0.95);
}

.theme-switch-leave-to {
  opacity: 0;
  filter: blur(10px);
  transform: scale(1.05);
}
</style>