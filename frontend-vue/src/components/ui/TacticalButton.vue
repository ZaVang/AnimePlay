<script setup lang="ts">
import { ref } from 'vue';
import { useTacticalAudio } from '@/composables/useTacticalAudio';

interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'secondary',
  size: 'md',
  disabled: false,
  loading: false,
  type: 'button'
});

const emits = defineEmits(['click']);
const { playClick, playHover, playSurge } = useTacticalAudio();
const isSurging = ref(false);

function handleClick(event: MouseEvent) {
  if (!props.disabled && !props.loading) {
    if (props.variant === 'primary') {
      playSurge();
      triggerSurgeAnim();
    } else {
      playClick();
    }
    emits('click', event);
  }
}

function triggerSurgeAnim() {
  isSurging.value = true;
  setTimeout(() => {
    isSurging.value = false;
  }, 400); // Matches pulse-surge duration in main.css
}

function handleHover() {
  if (!props.disabled && !props.loading) {
    playHover();
  }
}
</script>

<template>
  <button
    :type="type"
    @click="handleClick"
    @mouseenter="handleHover"
    :disabled="disabled || loading"
    :class="[
      'tactical-button group relative overflow-hidden transition-all duration-500 font-display uppercase tracking-[0.2em]',
      { 'fx-surge-active': isSurging },
      // Variant styles
      variant === 'primary' ? 'border-gold text-gold hover:text-black' : '',
      variant === 'secondary' ? 'border-white/10 text-industrial-300 hover:border-gold/50 hover:text-gold' : '',
      variant === 'danger' ? 'border-clinical-danger/40 text-clinical-danger hover:bg-clinical-danger hover:text-white' : '',
      // Size styles
      size === 'xs' ? 'py-1 px-2 text-[7px]' : '',
      size === 'sm' ? 'py-1.5 px-4 text-[9px]' : '',
      size === 'md' ? 'py-2.5 px-8 text-[11px]' : '',
      size === 'lg' ? 'py-4 px-12 text-[13px]' : '',
      // State styles
      disabled || loading ? 'opacity-30 grayscale cursor-not-allowed' : 'cursor-pointer'
    ]"
    class="border"
  >
    <!-- Background reveal effect -->
    <div 
      v-if="!disabled"
      class="absolute inset-0 transition-transform duration-500 translate-y-full group-hover:translate-y-0"
      :class="variant === 'primary' ? 'bg-gold' : 'bg-white/5'"
    ></div>

    <!-- Edge Scan GLSL-like Effect -->
    <div 
      v-if="!disabled"
      class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
    >
      <div class="absolute inset-0 bg-scanline-vertical"></div>
    </div>

    <span class="relative z-10 flex items-center justify-center gap-2">
      <span v-if="loading" class="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full"></span>
      <slot />
    </span>
  </button>
</template>

<style scoped>
.tactical-button {
  font-family: 'Unbounded', sans-serif;
  clip-path: polygon(0 0, 95% 0, 100% 20%, 100% 100%, 5% 100%, 0 80%);
}

.tactical-button.variant-primary {
  box-shadow: 0 0 15px rgba(212, 165, 116, 0.1);
}

.bg-scanline-vertical {
  width: 100%;
  height: 200%;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    rgba(212, 165, 116, 0.1) 48%,
    rgba(255, 255, 255, 0.2) 50%,
    rgba(212, 165, 116, 0.1) 52%,
    transparent 100%
  );
  animation: scan-vertical 2s linear infinite;
  position: absolute;
  top: -100%;
}

@keyframes scan-vertical {
  from { transform: translateY(0); }
  to { transform: translateY(50%); }
}
</style>
