<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { DialogueAction } from '@/core/systems/DialogueSystem';

interface Props {
  action: DialogueAction | null;
  position: 'left' | 'right';
  character?: {
    name: string;
    avatar?: string;
  };
}

const props = defineProps<Props>();

const isVisible = ref(false);
const bubbleRef = ref<HTMLElement>();
const typewriterText = ref('');

// Tactical Position Classes
const bubbleClasses = computed(() => {
  const base = [
    'tactical-speech-bubble',
    'relative',
    'max-w-xl',
    'min-w-64',
    'p-6',
    'border',
    'backdrop-blur-xl',
    'transition-all',
    'duration-500'
  ];

  if (props.position === 'left') {
    base.push('border-gold/30', 'bg-black/60', 'ml-6');
  } else {
    base.push('border-clinical-danger/30', 'bg-black/60', 'mr-6');
  }

  if (isVisible.value) {
    base.push('opacity-100 translate-y-0 scale-100');
  } else {
    base.push('opacity-0 translate-y-4 scale-95');
  }

  return base.join(' ');
});

// Character identity prefix
const operatorId = computed(() => {
  if (!props.character) return 'SYSTEM';
  return props.position === 'left' ? `USER // ${props.character.name}` : `RIVAL // ${props.character.name}`;
});

// Watch for action changes
watch(() => props.action, async (newAction) => {
  if (newAction) {
    isVisible.value = true;
    
    // Typewriter with tactical delay
    if (newAction.type === 'speech') {
      await typewriterEffect(newAction.content);
    } else {
      typewriterText.value = newAction.content;
    }

    // Auto-hide session
    setTimeout(() => {
      isVisible.value = false;
    }, newAction.duration || 3000);
  } else {
    isVisible.value = false;
    typewriterText.value = '';
  }
}, { immediate: true });

async function typewriterEffect(text: string) {
  typewriterText.value = '';
  const chars = text.split('');
  let currentIndex = 0;
  
  const animate = () => {
    if (currentIndex < chars.length) {
      typewriterText.value += chars[currentIndex];
      currentIndex++;
      setTimeout(() => requestAnimationFrame(animate), 20);
    }
  };
  requestAnimationFrame(animate);
}

function handleBubbleClick() {
  if (bubbleRef.value) {
    bubbleRef.value.classList.add('pulse-surge');
    setTimeout(() => {
      bubbleRef.value?.classList.remove('pulse-surge');
    }, 500);
  }
}
</script>

<template>
  <div 
    v-if="action" 
    class="speech-bubble-container"
    :class="position === 'left' ? 'justify-start' : 'justify-end'"
  >
    <div 
      ref="bubbleRef"
      :class="bubbleClasses"
      @click="handleBubbleClick"
    >
      <!-- Background Scanline decoration -->
      <div class="absolute inset-0 bg-scanline opacity-[0.05] pointer-events-none"></div>

      <!-- Tactical Header -->
      <div class="flex items-center justify-between mb-4 border-b border-white/5 pb-2">
         <div class="flex items-center gap-3">
            <div 
              v-if="character && character.avatar" 
              class="w-8 h-8 border border-white/20 bg-black/40 grayscale group-hover:grayscale-0 transition-all"
              :style="{ backgroundImage: `url(${character.avatar})`, backgroundSize: 'cover', backgroundPosition: 'top' }"
            ></div>
            <div class="flex flex-col">
               <span class="text-[7px] font-display font-bold text-industrial-500 uppercase tracking-[0.2em]">Active_Signal_Origin</span>
               <span class="text-[10px] font-mono font-black text-white uppercase tracking-tight">{{ operatorId }}</span>
            </div>
         </div>
         <div class="text-[7px] font-mono text-gold opacity-40 animate-pulse tabular-nums">UPLINK_STABLE</div>
      </div>

      <!-- Dialogue Core -->
      <div class="dialogue-content relative">
        <p class="text-[14px] leading-relaxed font-ui italic text-industrial-100 tracking-wide text-shadow-tactical">
          {{ typewriterText }}
        </p>
      </div>

      <!-- Action Status Indicator -->
      <div 
        v-if="action.type === 'action'" 
        class="mt-4 flex justify-end"
      >
        <span class="text-[8px] px-3 py-1 bg-gold text-black font-display font-black uppercase tracking-[0.2em] skew-x-[-12deg]">
          {{ action.actionType || 'EXECUTE_PROTOCOL' }}
        </span>
      </div>

      <!-- Corner Pins -->
      <div class="absolute top-0 left-0 w-2 h-px bg-current opacity-40"></div>
      <div class="absolute top-0 left-0 w-px h-2 bg-current opacity-40"></div>
      <div class="absolute bottom-0 right-0 w-2 h-px bg-current opacity-40"></div>
      <div class="absolute bottom-0 right-0 w-px h-2 bg-current opacity-40"></div>
    </div>
  </div>
</template>

<style scoped>
.speech-bubble-container {
  @apply flex w-full my-6;
}

.tactical-speech-bubble {
  @apply shadow-2xl;
  box-shadow: 0 0 40px rgba(0, 0, 0, 0.9);
}

.tactical-speech-bubble:hover {
  @apply cursor-pointer;
  box-shadow: 0 0 50px rgba(212, 165, 116, 0.1);
}

.text-shadow-tactical {
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.1);
}

/* Pulse surge effect */
.pulse-surge {
  animation: surge 0.5s cubic-bezier(0, 0, 0.2, 1);
}

@keyframes surge {
  0% { transform: scale(1); border-color: inherit; }
  50% { transform: scale(1.02); border-color: #d4a574; }
  100% { transform: scale(1); border-color: inherit; }
}

/* Entrance physics */
@keyframes bubble-tactical-appear {
  0% { opacity: 0; transform: translateY(20px) scale(0.95); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

.tactical-speech-bubble {
  will-change: transform, opacity;
  animation: bubble-tactical-appear 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
</style>