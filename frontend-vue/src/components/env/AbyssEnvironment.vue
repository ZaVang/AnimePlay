<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';

const mouseX = ref(0);
const mouseY = ref(0);

function handleMouseMove(e: MouseEvent) {
  mouseX.value = (e.clientX / window.innerWidth - 0.5) * 20; // -10 to 10
  mouseY.value = (e.clientY / window.innerHeight - 0.5) * 20; // -10 to 10
}

onMounted(() => {
  window.addEventListener('mousemove', handleMouseMove);
});

onBeforeUnmount(() => {
  window.removeEventListener('mousemove', handleMouseMove);
});
</script>

<template>
  <div class="abyss-env fixed inset-0 pointer-events-none -z-20 overflow-hidden bg-[#08080C]">
    <!-- Layer 1: Kinetic Grid -->
    <div 
      class="absolute inset-0 transition-transform duration-300 ease-out"
      :style="{ transform: `translate(${mouseX}px, ${mouseY}px) scale(1.05)` }"
    >
      <div class="grid-mesh absolute inset-0 opacity-[0.03]"></div>
    </div>

    <!-- Layer 2: Floating Sparkles (Particles) -->
    <div class="particles absolute inset-0">
      <div v-for="i in 15" :key="i" class="sparkle" :style="{
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${3 + Math.random() * 4}s`
      }"></div>
    </div>

    <!-- Layer 3: Peripheral Glows -->
    <div class="radial-glow top-left absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gold/5 blur-[120px]"></div>
    <div class="radial-glow bottom-right absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan/5 blur-[120px]"></div>
  </div>
</template>

<style scoped>
.abyss-env {
  perspective: 1000px;
}

.grid-mesh {
  background-image: 
    linear-gradient(rgba(212, 165, 116, 0.4) 1px, transparent 1px),
    linear-gradient(90deg, rgba(212, 165, 116, 0.4) 1px, transparent 1px);
  background-size: 60px 60px;
}

.sparkle {
  position: absolute;
  width: 2px;
  height: 2px;
  background: #D4A574;
  border-radius: 50%;
  box-shadow: 0 0 10px #D4A574;
  opacity: 0;
  animation: sparkle-float linear infinite;
}

@keyframes sparkle-float {
  0% { transform: translateY(0) scale(0); opacity: 0; }
  20% { opacity: 0.6; }
  80% { opacity: 0.3; }
  100% { transform: translateY(-100px) scale(0.5); opacity: 0; }
}

.radial-glow {
  mix-blend-mode: plus-lighter;
  pointer-events: none;
}
</style>
