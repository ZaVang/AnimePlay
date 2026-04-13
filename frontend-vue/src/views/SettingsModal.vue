<script setup lang="ts">
/**
 * Settings Modal - Terminal Configuration Protocol
 */
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useSettingsStore } from '@/stores/settings';
import { listAIProfiles } from '@/core/ai/aiProfiles';
import { useFXStore } from '@/stores/modules/fxStore';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

// Background Components (Preview)
import BiasBarGradient from '@/themes/topicBiasBar/Gradient.vue';
import BiasBarCyber from '@/themes/topicBiasBar/Cyber.vue';
import BiasBarElegant from '@/themes/topicBiasBar/Elegant.vue';

const settingsStore = useSettingsStore();
const fxStore = useFXStore();
const { battleSpeed, biasBarTheme, selectedAIProfileId } = storeToRefs(settingsStore);

const activeTab = ref('display');

// Theme preview data
const mockBias = ref(4);

// AI Profiles
const aiProfiles = listAIProfiles();

const selectedAIId = computed({
  get: () => selectedAIProfileId.value,
  set: (v: string) => { 
    selectedAIProfileId.value = v; 
    settingsStore.saveSettings(); 
  },
});

defineEmits(['close']);
</script>

<template>
  <GlassPanel class="settings-modal-terminal max-w-4xl w-full border-gold/30 shadow-2xl">
    <!-- Header -->
    <template #header>
      <div class="flex justify-between items-center mb-8">
        <div class="space-y-1">
          <h2 class="text-[10px] font-display font-bold text-gold tracking-[0.4em] uppercase opacity-70">Configuration</h2>
          <h2 class="text-2xl font-display font-black text-white uppercase tracking-tighter">System Service</h2>
        </div>
        <TacticalButton variant="secondary" size="sm" @click="$emit('close')">DISCONNECT</TacticalButton>
      </div>
    </template>
    
    <!-- Tabs -->
    <div class="flex gap-2 border-b border-white/5 mb-8">
      <button 
        v-for="tab in ['display', 'audio']" 
        :key="tab"
        @click="activeTab = tab" 
        class="px-6 py-2 text-[10px] font-display font-bold tracking-widest uppercase transition-all"
        :class="activeTab === tab ? 'text-gold border-b border-gold' : 'text-industrial-500 hover:text-white'"
      >
        {{ tab }}
      </button>
    </div>
    
    <!-- Content -->
    <div v-if="activeTab === 'display'" class="settings-content space-y-12 quantic-reveal h-[60vh] overflow-y-auto pr-4 scrollbar-none">
      
      <!-- Theme Presets -->
      <section class="space-y-6">
        <h3 class="text-[10px] font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">Interface Presets</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button 
            v-for="(preset, name) in settingsStore.themePresets" 
            :key="name"
            @click="settingsStore.applyPreset(name)"
            class="preset-card group relative bg-white/5 border border-white/5 p-6 text-left transition-all hover:bg-white/[0.08]"
            :class="{ 'border-gold/40 bg-gold/[0.02]': settingsStore.uiTheme.biasBar === preset.biasBar }"
          >
            <div class="text-2xl mb-4 grayscale group-hover:grayscale-0 transition-all">{{ 
              name === 'classic' ? '🎨' : 
              name === 'cyberpunk' ? '🤖' : '✨' 
            }}</div>
            <div class="text-xs font-display font-bold text-white uppercase mb-1">{{ 
              name === 'classic' ? 'Classic' : 
              name === 'cyberpunk' ? 'Cyberpunk' : 'Minimal' 
            }}</div>
            <div class="text-[8px] text-industrial-500 uppercase tracking-tighter">System Default Preset</div>
            <div v-if="settingsStore.uiTheme.biasBar === preset.biasBar" class="absolute top-2 right-2 w-1 h-1 bg-gold rounded-full shadow-[0_0_8px_#D4A574]"></div>
          </button>
        </div>
      </section>
      
      <!-- Combat Speed -->
      <section class="space-y-6">
        <h3 class="text-[10px] font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">Tactical Processing Speed</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label 
            v-for="speed in ['normal', 'fast', 'instant']" 
            :key="speed"
            class="speed-option relative bg-white/5 border border-white/5 p-4 cursor-pointer hover:bg-white/[0.08] transition-all"
            :class="{ 'border-gold/40 bg-gold/[0.02]': battleSpeed === speed }"
          >
            <input type="radio" :value="speed" v-model="battleSpeed" @change="settingsStore.saveSettings()" class="sr-only" />
            <div class="flex items-center gap-4">
              <span class="text-xl">{{ speed === 'normal' ? '⏱️' : speed === 'fast' ? '⚡' : '🚀' }}</span>
              <div class="space-y-0.5">
                <div class="text-[10px] font-display font-black text-white uppercase">{{ speed === 'normal' ? 'Standard' : speed === 'fast' ? 'Accelerated' : 'Instant' }}</div>
                <div class="text-[8px] text-industrial-500 uppercase tracking-tighter">{{ speed === 'normal' ? 'Full Logic Wait' : speed === 'fast' ? 'Rapid Cycle' : 'Zero Latency' }}</div>
              </div>
            </div>
          </label>
        </div>
      </section>
      
      <!-- AI Profile -->
      <section class="space-y-6">
        <h3 class="text-[10px] font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">Cognitive Adversary</h3>
        <GlassPanel :reveal="false" class="border-white/5 bg-white/[0.02]">
           <div class="flex items-center justify-between">
             <div class="flex items-center gap-4">
               <span class="text-2xl opacity-40">🧠</span>
               <div class="space-y-0.5">
                 <div class="text-[10px] font-display font-bold text-white uppercase">Neural Matrix Profile</div>
                 <div class="text-[8px] text-industrial-500 uppercase tracking-tighter">Determines enemy logic and difficulty</div>
               </div>
             </div>
             <select v-model="selectedAIId" class="bg-black/60 border border-white/10 text-[10px] font-display text-gold p-2 outline-none uppercase tracking-widest">
                <option v-for="p in aiProfiles" :key="p.id" :value="p.id">{{ p.name }}</option>
             </select>
           </div>
        </GlassPanel>
      </section>

      <!-- Bias Bar Theme -->
      <section class="space-y-6 pb-8">
        <h3 class="text-[10px] font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">Visual Bias Component</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
           <!-- Preview -->
           <div class="bg-black/60 border border-white/10 p-8 flex items-center justify-center">
              <BiasBarGradient v-if="biasBarTheme === 'gradient'" :topic-bias="mockBias" class="scale-125" />
              <BiasBarCyber v-else-if="biasBarTheme === 'cyber'" :topic-bias="mockBias" class="scale-125" />
              <BiasBarElegant v-else :topic-bias="mockBias" class="scale-125" />
           </div>

           <div class="space-y-3">
             <label 
                v-for="theme in ['gradient', 'cyber', 'elegant']" 
                :key="theme"
                class="flex items-center justify-between p-4 bg-white/5 border border-white/5 cursor-pointer hover:bg-white/[0.08] transition-all"
                :class="{ 'border-gold/40 bg-gold/[0.02]': biasBarTheme === theme }"
              >
                <input type="radio" :value="theme" v-model="biasBarTheme" @change="settingsStore.saveSettings()" class="sr-only" />
                <div class="flex items-center gap-4">
                  <span class="text-xl">{{ theme === 'gradient' ? '🌈' : theme === 'cyber' ? '⚡' : '💎' }}</span>
                  <div class="text-[10px] font-display font-black text-white uppercase">{{ theme }}</div>
                </div>
                <div v-if="biasBarTheme === theme" class="w-1.5 h-1.5 bg-gold rounded-full shadow-[0_0_8px_#D4A574]"></div>
              </label>
           </div>
        </div>
      </section>
    </div>

    <!-- Audio & Sensory FX -->
    <div v-if="activeTab === 'audio'" class="settings-content space-y-12 quantic-reveal h-[60vh] overflow-y-auto pr-4 scrollbar-none">
       <!-- Master Volume -->
       <section class="space-y-6">
        <h3 class="text-[10px] font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">Auditory Intensity</h3>
        <GlassPanel :reveal="false" class="border-white/5 bg-white/[0.02] p-8">
           <div class="flex flex-col gap-6">
             <div class="flex justify-between items-center text-[10px] font-display font-bold uppercase tracking-widest">
                <span class="text-industrial-500">Output Gain Control</span>
                <span class="text-gold tabular-nums">{{ Math.round(fxStore.masterVolume * 100) }}%</span>
             </div>
             <input 
               type="range" 
               min="0" 
               max="1" 
               step="0.01" 
               :value="fxStore.masterVolume"
               @input="(e) => fxStore.setVolume(parseFloat((e.target as HTMLInputElement).value))"
               class="w-full h-1 bg-white/10 appearance-none cursor-pointer accent-gold"
             />
             <div class="flex justify-between text-[8px] font-mono text-white/20 uppercase tracking-tighter">
                <span>0.00_MIN</span>
                <span>0.50_BALANCED</span>
                <span>1.00_MAX_CAP</span>
             </div>
           </div>
        </GlassPanel>
       </section>

       <!-- Protocol Toggles -->
       <section class="space-y-6 pb-12">
        <h3 class="text-[10px] font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">Sensory Protocols</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
           <!-- Audio Toggle -->
           <button 
             @click="fxStore.toggleAudio()"
             class="p-6 bg-white/5 border border-white/5 text-left transition-all hover:bg-white/[0.08]"
             :class="{ 'border-gold/40 bg-gold/[0.02]': fxStore.isAudioEnabled }"
           >
             <div class="flex items-center justify-between mb-2">
               <span class="text-xl">{{ fxStore.isAudioEnabled ? '🔊' : '🔇' }}</span>
               <div :class="fxStore.isAudioEnabled ? 'bg-gold shadow-[0_0_8px_#D4A574]' : 'bg-white/10'" class="w-1.5 h-1.5 rounded-full"></div>
             </div>
             <div class="text-[10px] font-display font-black text-white uppercase mb-1">Tactical Audio Feedback</div>
             <div class="text-[8px] text-industrial-500 uppercase tracking-tighter">Real-time synthetic blips and chimes</div>
           </button>

           <!-- Visual FX Toggle -->
           <button 
             @click="fxStore.toggleVisualFX()"
             class="p-6 bg-white/5 border border-white/5 text-left transition-all hover:bg-white/[0.08]"
             :class="{ 'border-gold/40 bg-gold/[0.02]': fxStore.isVisualFXEnabled }"
           >
             <div class="flex items-center justify-between mb-2">
               <span class="text-xl">{{ fxStore.isVisualFXEnabled ? '👁️' : '🕶️' }}</span>
               <div :class="fxStore.isVisualFXEnabled ? 'bg-gold shadow-[0_0_8px_#D4A574]' : 'bg-white/10'" class="w-1.5 h-1.5 rounded-full"></div>
             </div>
             <div class="text-[10px] font-display font-black text-white uppercase mb-1">Retinal Surge Overlays</div>
             <div class="text-[8px] text-industrial-500 uppercase tracking-tighter">GLSL-grade responsive visual feedback</div>
           </button>
        </div>
       </section>
    </div>
  </GlassPanel>
</template>

<style scoped>
.preset-card {
  clip-path: polygon(0 0, 100% 0, 100% 85%, 90% 100%, 0 100%);
}
.speed-option {
  clip-path: polygon(0 0, 100% 0, 100% 80%, 85% 100%, 0 100%);
}
.scrollbar-none::-webkit-scrollbar { display: none; }
.scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
</style>