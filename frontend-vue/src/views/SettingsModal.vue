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
  <div class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm quantic-reveal" @click.self="$emit('close')">
    <GlassPanel class="settings-modal-terminal max-w-4xl w-full border-gold/30 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden">
      <!-- Header -->
      <template #header>
          <div class="flex items-center justify-between mb-8 pb-4 border-b border-white/10">
            <div>
              <h2 class="text-2xl font-display font-black text-white tracking-tighter uppercase">系统环境配置</h2>
              <div class="text-[10px] font-mono text-industrial-300 uppercase tracking-[0.4em] mt-1">OPERATING_ENVIRONMENT // NODE_01</div>
            </div>
            <button @click="$emit('close')" class="w-10 h-10 border border-white/10 flex items-center justify-center text-industrial-400 hover:text-white hover:border-white/30 transition-all text-xl">✕</button>
          </div>
      </template>
      
      <!-- Tabs -->
      <div class="flex gap-2 border-b border-white/5 mb-8">
        <button 
          v-for="tab in ['display', 'audio']" 
          :key="tab"
          @click="activeTab = tab" 
          class="px-8 py-3 text-[11px] font-display font-bold tracking-widest uppercase transition-all"
          :class="activeTab === tab ? 'text-gold border-b-2 border-gold' : 'text-industrial-500 hover:text-white'"
        >
          {{ tab === 'display' ? '显示设置' : '音频设置' }}
        </button>
      </div>
      
      <!-- Content -->
      <div v-if="activeTab === 'display'" class="settings-content space-y-12 h-[60vh] overflow-y-auto pr-4 scrollbar-none custom-scroll">
        
        <!-- Theme Presets -->
        <section class="space-y-6">
          <h3 class="text-xs font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">界面预设</h3>
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
              <div class="text-sm font-display font-bold text-white uppercase mb-1">{{ 
                name === 'classic' ? '经典' : 
                name === 'cyberpunk' ? '赛博' : '极简' 
              }}</div>
              <div class="text-[10px] text-industrial-300 uppercase tracking-tighter opacity-80">系统默认预设</div>
              <div v-if="settingsStore.uiTheme.biasBar === preset.biasBar" class="absolute top-2 right-2 w-1.5 h-1.5 bg-gold rounded-full shadow-[0_0_8px_#D4A574]"></div>
            </button>
          </div>
        </section>
        
        <!-- Combat Speed -->
        <section class="space-y-6">
          <h3 class="text-xs font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">战术处理速度</h3>
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
                  <div class="text-xs font-display font-black text-white uppercase">{{ speed === 'normal' ? '标准' : speed === 'fast' ? '加速' : '瞬时' }}</div>
                  <div class="text-[10px] text-industrial-300 uppercase tracking-tighter opacity-80">{{ speed === 'normal' ? '完整逻辑等待' : speed === 'fast' ? '快速循环' : '零延迟' }}</div>
                </div>
              </div>
            </label>
          </div>
        </section>
        
        <!-- AI Profile -->
        <section class="space-y-6">
          <h3 class="text-xs font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">认知对抗模型</h3>
          <GlassPanel :reveal="false" class="border-white/5 bg-white/[0.02] p-6">
             <div class="flex items-center justify-between">
               <div class="flex items-center gap-4">
                 <span class="text-2xl opacity-60">🧠</span>
                 <div class="space-y-0.5">
                   <div class="text-xs font-display font-bold text-white uppercase">神经矩阵配置</div>
                   <div class="text-[10px] text-industrial-300 uppercase tracking-tighter opacity-80">决定敌方逻辑与难度</div>
                 </div>
               </div>
               <select v-model="selectedAIId" class="bg-black/80 border border-gold/20 text-xs font-display text-gold p-3 outline-none uppercase tracking-widest focus:border-gold transition-all">
                  <option v-for="p in aiProfiles" :key="p.id" :value="p.id">{{ p.name }}</option>
               </select>
             </div>
          </GlassPanel>
        </section>
  
        <!-- Bias Bar Theme -->
        <section class="space-y-6 pb-8">
          <h3 class="text-xs font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">视觉偏好组件</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
             <!-- Preview -->
             <div class="bg-black/60 border border-white/10 p-8 flex items-center justify-center relative overflow-hidden group">
                <div class="absolute inset-0 bg-scanline opacity-[0.03] pointer-events-none"></div>
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
                    <div class="text-xs font-display font-black text-white uppercase">{{ theme }}</div>
                  </div>
                  <div v-if="biasBarTheme === theme" class="w-2 h-2 bg-gold rounded-full shadow-[0_0_8px_#D4A574]"></div>
                </label>
             </div>
          </div>
        </section>
      </div>
  
      <!-- Audio & Sensory FX -->
      <div v-if="activeTab === 'audio'" class="settings-content space-y-12 h-[60vh] overflow-y-auto pr-4 scrollbar-none custom-scroll">
         <!-- Master Volume -->
         <section class="space-y-6">
          <h3 class="text-xs font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">听觉强度</h3>
          <GlassPanel :reveal="false" class="border-white/5 bg-white/[0.02] p-8">
             <div class="flex flex-col gap-6">
               <div class="flex justify-between items-center text-xs font-display font-bold uppercase tracking-widest">
                  <span class="text-industrial-300">输出增益控制</span>
                  <span class="text-gold tabular-nums text-lg">{{ Math.round(fxStore.masterVolume * 100) }}%</span>
               </div>
               <input 
                 type="range" 
                 min="0" 
                 max="1" 
                 step="0.01" 
                 :value="fxStore.masterVolume"
                 @input="(e) => fxStore.setVolume(parseFloat((e.target as any).value))"
                 class="w-full h-1.5 bg-white/10 appearance-none cursor-pointer accent-gold"
               />
               <div class="flex justify-between text-[9px] font-mono text-industrial-100 uppercase tracking-tighter opacity-60">
                  <span>0.00_MIN</span>
                  <span>0.50_BALANCED</span>
                  <span>1.00_MAX_CAP</span>
               </div>
             </div>
          </GlassPanel>
         </section>
  
         <!-- Protocol Toggles -->
         <section class="space-y-6 pb-12">
          <h3 class="text-xs font-display font-bold text-gold/60 tracking-widest uppercase border-l-2 border-gold pl-4">中枢感官协议</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
             <!-- Audio Toggle -->
             <button 
               @click="fxStore.toggleAudio()"
               class="p-6 bg-white/5 border border-white/5 text-left transition-all hover:bg-white/[0.08]"
               :class="{ 'border-gold/40 bg-gold/[0.02]': fxStore.isAudioEnabled }"
             >
               <div class="flex items-center justify-between mb-3">
                 <span class="text-2xl">{{ fxStore.isAudioEnabled ? '🔊' : '🔇' }}</span>
                 <div :class="fxStore.isAudioEnabled ? 'bg-gold shadow-[0_0_8px_#D4A574]' : 'bg-white/10'" class="w-2 h-2 rounded-full"></div>
               </div>
               <div class="text-sm font-display font-black text-white uppercase mb-1">战术音频反馈</div>
               <div class="text-[10px] text-industrial-300 uppercase tracking-tighter opacity-80">实时合成脉冲与提示音</div>
             </button>
  
             <!-- Visual FX Toggle -->
             <button 
               @click="fxStore.toggleVisualFX()"
               class="p-6 bg-white/5 border border-white/5 text-left transition-all hover:bg-white/[0.08]"
               :class="{ 'border-gold/40 bg-gold/[0.02]': fxStore.isVisualFXEnabled }"
             >
               <div class="flex items-center justify-between mb-3">
                 <span class="text-2xl">{{ fxStore.isVisualFXEnabled ? '👁️' : '🕶️' }}</span>
                 <div :class="fxStore.isVisualFXEnabled ? 'bg-gold shadow-[0_0_8px_#D4A574]' : 'bg-white/10'" class="w-2 h-2 rounded-full"></div>
               </div>
               <div class="text-sm font-display font-black text-white uppercase mb-1">视网像增强覆盖</div>
               <div class="text-[10px] text-industrial-300 uppercase tracking-tighter opacity-80">GLSL 级语义响应式视觉特效</div>
             </button>
          </div>
         </section>
      </div>
    </GlassPanel>
  </div>
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