<script setup lang="ts">
interface Props {
  reveal?: boolean;
  delay?: number;
  interactive?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  reveal: true,
  delay: 0,
  interactive: false
});
</script>

<template>
  <div
    class="glass-panel group relative transition-all duration-700 overflow-hidden"
    :class="[
      reveal ? 'quantic-reveal' : '',
      interactive ? 'hover:border-gold/30 hover:shadow-gold/5' : ''
    ]"
    :style="{ animationDelay: `${delay}ms` }"
  >
    <!-- Glass Substrate Core -->
    <div class="absolute inset-0 glass-substrate -z-10 group-hover:bg-white/[0.02] transition-colors duration-700"></div>
    
    <!-- Edge Highlight -->
    <div class="absolute inset-0 border border-white/5 pointer-events-none group-hover:border-white/10 transition-colors duration-700"></div>
    
    <!-- Inner Content -->
    <div class="relative p-6">
      <slot name="header" />
      <div class="panel-content">
        <slot />
      </div>
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.glass-panel {
  /* Using the global .glass-substrate utility from main.css */
  border-radius: 12px;
}

.quantic-reveal {
  opacity: 0;
  transform: translateY(10px);
  animation: quantic-reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes quantic-reveal {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
