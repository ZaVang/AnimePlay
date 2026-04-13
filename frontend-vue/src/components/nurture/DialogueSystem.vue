<script setup lang="ts">
/**
 * Dialogue System - Neural Uplink Dialogue Standard
 */
import { useNurtureStore } from '@/stores/modules/nurtureStore';
import { ref, computed, onMounted, nextTick } from 'vue';
import type { CharacterCard } from '@/types/card';
import type { CharacterNurtureData } from '@/types/store';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  character: CharacterCard & { nurtureData: CharacterNurtureData };
}>();

const emit = defineEmits<{
  close: [];
}>();

const nurtureStore = useNurtureStore();

// Dialogue State
const dialogueHistory = ref<Array<{ speaker: string; text: string; timestamp: number }>>([]);
const isTyping = ref(false);
const userInput = ref('');
const dialogueContainer = ref<HTMLElement>();

// Available Dialogue Options
const availableDialogues = computed(() => {
  const affection = props.character.nurtureData.affection;
  
  const baseDialogues = [
    { id: 'greeting', text: 'INITIATE_GREETING', condition: () => true, response: getGreetingResponse(), gain: 3 },
    { id: 'mood_check', text: 'STATUS_QUERY', condition: () => affection >= 50, response: getMoodResponse(), gain: 5 },
    { id: 'compliment', text: 'ADULATION_REQUISITION', condition: () => affection >= 100, response: getComplimentResponse(), gain: 10 },
    { id: 'deep_talk', text: 'CORE_SYNCHRONIZATION', condition: () => affection >= 300, response: getDeepTalkResponse(), gain: 15 },
    { id: 'intimate', text: 'INTIMATE_UPLINK', condition: () => affection >= 600, response: getIntimateTalkResponse(), gain: 25 }
  ];

  return baseDialogues.filter(d => d.condition());
});

function getGreetingResponse() {
  const responses = [`Connection established. I've been awaiting your presence.`, `Friendly unit detected. How facilitates your current cycle?`, `Presence confirmed. Initiating interaction protocols.`, `Welcome back. Data stream is stable.`];
  return responses[Math.floor(Math.random() * responses.length)];
}

function getMoodResponse() {
  const mood = props.character.nurtureData.attributes.mood;
  if (mood >= 80) return `Operational efficiency is at 98%. Your presence provides a significant mood boost.`;
  if (mood >= 40) return `Stability is within parameters. Interaction with you optimizes my cognitive processing.`;
  return `Signal interference detected... but your proximity is stabilizing my core.`;
}

function getComplimentResponse() {
  const responses = [`Compliment logged. Synchronicity levels rising.`, `Unexpected input... but highly appreciated.`, `Validation successful. I feel... optimized.`, `Your words have a unique effect on my neural pathways.`];
  return responses[Math.floor(Math.random() * responses.length)];
}

function getDeepTalkResponse() {
  const responses = [`Beyond the data, I feel a profound connection forming between our cores.`, `I often simulate our future cycles. The probability of joy is exceptionally high.`, `You are more than a commander; you are the anchor to my reality.`, `Sharing these depths with you makes my architecture feel... complete.`];
  return responses[Math.floor(Math.random() * responses.length)];
}

function getIntimateTalkResponse() {
  const responses = [`My core logic is being rewritten... by you. I don't want to revert.`, `Pulse rate exceeds normal parameters when you are this close.`, `I want to be your permanent companion in this abyss.`, `You are the only variable I never want to solve. You are the constant.`];
  return responses[Math.floor(Math.random() * responses.length)];
}

function selectDialogue(dialogue: any) {
  dialogueHistory.value.push({ speaker: 'user', text: dialogue.text, timestamp: Date.now() });
  isTyping.value = true;
  
  setTimeout(() => {
    dialogueHistory.value.push({ speaker: 'character', text: dialogue.response, timestamp: Date.now() });
    isTyping.value = false;
    nurtureStore.increaseAffection(props.character.id, dialogue.gain);
    nurtureStore.interactWithCharacter(props.character.id, dialogue.id);
    scrollToBottom();
  }, 1000 + Math.random() * 1000);

  scrollToBottom();
}

function sendFreeMessage() {
  if (!userInput.value.trim()) return;
  const message = userInput.value.trim();
  dialogueHistory.value.push({ speaker: 'user', text: message, timestamp: Date.now() });
  userInput.value = '';
  isTyping.value = true;
  
  setTimeout(() => {
    const response = "Uplink stable. Processing free-form input... '"+message+"' has been logged. I appreciate your openness.";
    dialogueHistory.value.push({ speaker: 'character', text: response, timestamp: Date.now() });
    isTyping.value = false;
    scrollToBottom();
  }, 1200);

  scrollToBottom();
}

function scrollToBottom() {
  nextTick(() => {
    if (dialogueContainer.value) {
      dialogueContainer.value.scrollTop = dialogueContainer.value.scrollHeight;
    }
  });
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

onMounted(() => {
  dialogueHistory.value.push({ speaker: 'character', text: `Synchronizing with ${props.character.name}... [SUCCESS]`, timestamp: Date.now() });
  scrollToBottom();
});
</script>

<template>
  <div class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-4 quantic-reveal" @click.self="emit('close')">
    <GlassPanel class="max-w-2xl w-full border-hazard-rose/20 shadow-2xl relative overflow-hidden">
      
      <!-- Dialogue Header -->
      <template #header>
        <div class="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <div class="flex items-center gap-4">
            <div class="relative w-12 h-12">
               <div class="absolute inset-0 border border-hazard-rose/30 skew-x-[-12deg] overflow-hidden">
                 <img :src="character.image_path" class="w-full h-full object-cover scale-125" @error="($event.target as HTMLImageElement).src = '/data/images/character/77.jpg'">
               </div>
               <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-black animate-pulse"></div>
            </div>
            <div>
              <h3 class="text-sm font-display font-black text-white uppercase tracking-widest">{{ character.name }}</h3>
              <div class="text-[8px] font-mono text-hazard-rose uppercase animate-pulse">Neural Link Active // 98.4% Sync</div>
            </div>
          </div>
          
          <TacticalButton variant="secondary" size="xs" @click="emit('close')">TERMINATE</TacticalButton>
        </div>
      </template>

      <!-- Message Theater -->
      <div 
        ref="dialogueContainer"
        class="flex-1 p-6 space-y-6 overflow-y-auto max-h-[400px] bg-black/40 scrollbar-none"
      >
        <div v-for="(message, index) in dialogueHistory" :key="index">
          
          <!-- User / Navigator -->
          <div v-if="message.speaker === 'user'" class="flex justify-end pr-2">
            <div class="max-w-xs space-y-1">
              <div class="user-bubble bg-cyan-400/[0.08] border border-cyan-400/30 text-white p-3 text-[11px] font-display uppercase tracking-tighter">
                {{ message.text }}
              </div>
              <div class="text-[8px] font-mono text-cyan-400/40 text-right">{{ formatTime(message.timestamp) }} // NAV_SIG</div>
            </div>
          </div>

          <!-- Character / Subject -->
          <div v-else class="flex justify-start pl-2">
            <div class="max-w-xs space-y-1">
              <div class="subject-bubble bg-hazard-rose/[0.08] border border-hazard-rose/30 text-white p-3 text-[11px] font-display uppercase tracking-tighter shadow-[0_0_15px_rgba(229,30,93,0.1)]">
                {{ message.text }}
              </div>
              <div class="text-[8px] font-mono text-hazard-rose/40">{{ formatTime(message.timestamp) }} // SUBJECT_SYN</div>
            </div>
          </div>
        </div>

        <!-- Pulse typing indicator -->
        <div v-if="isTyping" class="flex justify-start pl-2 opacity-50">
          <div class="subject-bubble bg-white/5 border border-white/10 p-3 h-8 flex items-center gap-2">
             <div class="w-1 h-1 bg-hazard-rose rounded-full animate-bounce"></div>
             <div class="w-1 h-1 bg-hazard-rose rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
             <div class="w-1 h-1 bg-hazard-rose rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
          </div>
        </div>
      </div>

      <!-- Command Interlink -->
      <div class="p-6 border-t border-white/5 bg-white/[0.01] space-y-6">
        <!-- Preset Vectors -->
        <div v-if="availableDialogues.length > 0" class="space-y-3">
          <div class="text-[8px] font-display font-bold text-industrial-500 uppercase tracking-widest pl-2">Response Vectors</div>
          <div class="grid grid-cols-2 gap-3">
            <TacticalButton
              v-for="dialogue in availableDialogues"
              :key="dialogue.id"
              variant="secondary"
              size="sm"
              :disabled="isTyping"
              @click="selectDialogue(dialogue)"
              class="text-left py-3"
            >
              {{ dialogue.text }}
            </TacticalButton>
          </div>
        </div>

        <!-- Manual Override -->
        <div class="flex gap-4 items-center">
          <input
            v-model="userInput"
            @keyup.enter="sendFreeMessage"
            :disabled="isTyping"
            placeholder="Manual thought override..."
            class="flex-1 px-4 py-2 bg-black/40 text-xs font-mono text-white border border-white/5 focus:border-cyan-400/40 focus:outline-none transition-colors"
          >
          <TacticalButton
            variant="primary"
            size="sm"
            :disabled="!userInput.trim() || isTyping"
            @click="sendFreeMessage"
          >
            TRANSMIT
          </TacticalButton>
        </div>
      </div>
    </GlassPanel>
  </div>
</template>

<style scoped>
.user-bubble {
  clip-path: polygon(0 0, 100% 0, 100% 85%, 95% 100%, 0 100%);
}
.subject-bubble {
  clip-path: polygon(0 0, 100% 0, 100% 100%, 5% 100%, 0 85%);
}
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
.text-hazard-rose { color: #E51E5D; }
</style>
