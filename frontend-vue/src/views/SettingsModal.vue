<!-- SettingsModal.vue -->
<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings';
import { ref, computed } from 'vue';
import { listAIProfiles } from '@/core/ai/aiProfiles';

const settingsStore = useSettingsStore();
const activeTab = ref('display');

// 主题预览数据
const mockBias = ref(4);

// AI 对手选择（设置持久化）
const aiProfiles = listAIProfiles();
const selectedAIId = computed({
  get: () => settingsStore.selectedAIProfileId,
  set: (v: string) => { settingsStore.selectedAIProfileId = v; settingsStore.saveSettings(); },
});
</script>

<template>
  <div class="settings-modal">
    <div class="settings-header">
      <h2>游戏设置</h2>
      <button @click="$emit('close')" class="close-btn">✕</button>
    </div>
    
    <div class="settings-tabs">
      <button 
        @click="activeTab = 'display'" 
        :class="{ active: activeTab === 'display' }"
      >
        显示设置
      </button>
      <button 
        @click="activeTab = 'audio'" 
        :class="{ active: activeTab === 'audio' }"
      >
        音频设置
      </button>
    </div>
    
    <div v-if="activeTab === 'display'" class="settings-content">
      <!-- 主题预设 -->
      <div class="setting-group">
        <h3>UI主题预设</h3>
        <div class="theme-presets">
          <button 
            v-for="(preset, name) in settingsStore.themePresets" 
            :key="name"
            @click="settingsStore.applyPreset(name)"
            class="preset-btn"
            :class="{ active: settingsStore.uiTheme.biasBar === preset.biasBar }"
          >
            <span class="preset-icon">{{ 
              name === 'classic' ? '🎨' : 
              name === 'cyberpunk' ? '🤖' : '✨' 
            }}</span>
            <span class="preset-name">{{ 
              name === 'classic' ? '经典' : 
              name === 'cyberpunk' ? '赛博朋克' : '简约' 
            }}</span>
          </button>
        </div>
      </div>
      
      <!-- 战斗速度 -->
      <div class="setting-group">
        <h3>战斗速度</h3>
        <div class="style-options">
          <label class="style-option">
            <input type="radio" value="normal" v-model="settingsStore.battleSpeed" @change="settingsStore.saveSettings()" />
            <span class="option-content">
              <span class="option-icon">⏱️</span>
              <span class="option-name">正常</span>
              <span class="option-desc">AI思考2s / 防御1.5s / 结算3s</span>
            </span>
          </label>
          <label class="style-option">
            <input type="radio" value="fast" v-model="settingsStore.battleSpeed" @change="settingsStore.saveSettings()" />
            <span class="option-content">
              <span class="option-icon">⚡</span>
              <span class="option-name">快速</span>
              <span class="option-desc">AI思考0.6s / 防御0.3s / 结算0.8s</span>
            </span>
          </label>
          <label class="style-option">
            <input type="radio" value="instant" v-model="settingsStore.battleSpeed" @change="settingsStore.saveSettings()" />
            <span class="option-content">
              <span class="option-icon">🚀</span>
              <span class="option-name">瞬间</span>
              <span class="option-desc">无动画等待，立即推进</span>
            </span>
          </label>
        </div>
      </div>

      <!-- AI 对手 -->
      <div class="setting-group">
        <h3>AI 对手</h3>
        <div class="style-options">
          <label class="style-option">
            <span class="option-content">
              <span class="option-icon">🧠</span>
              <span class="option-name">AI 档案</span>
              <select v-model="selectedAIId" class="ml-auto bg-warm-300 text-white rounded px-3 py-1 border border-warm-300">
                <option v-for="p in aiProfiles" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </span>
          </label>
        </div>
      </div>

      <!-- 议题偏向条样式 -->
      <div class="setting-group">
        <h3>议题偏向条样式</h3>
        <div class="bias-bar-selector">
          <div class="preview-container">
            <!-- 预览当前选择的样式 -->
            <div class="preview-box">
              <BiasBarGradient 
                v-if="settingsStore.biasBarTheme === 'gradient'"
                :topic-bias="mockBias"
                class="preview-scale"
              />
              <BiasBarCyber 
                v-else-if="settingsStore.biasBarTheme === 'cyber'"
                :topic-bias="mockBias"
                class="preview-scale"
              />
              <BiasBarElegant 
                v-else
                :topic-bias="mockBias"
                class="preview-scale"
              />
            </div>
          </div>
          
          <div class="style-options">
            <label 
              v-for="theme in ['gradient', 'cyber', 'elegant']" 
              :key="theme"
              class="style-option"
            >
              <input 
                type="radio" 
                :value="theme" 
                v-model="settingsStore.biasBarTheme"
                @change="settingsStore.saveSettings()"
              />
              <span class="option-content">
                <span class="option-icon">{{
                  theme === 'gradient' ? '🌈' :
                  theme === 'cyber' ? '⚡' : '💎'
                }}</span>
                <span class="option-name">{{
                  theme === 'gradient' ? '渐变色彩' :
                  theme === 'cyber' ? '赛博朋克' : '简约优雅'
                }}</span>
                <span class="option-desc">{{
                  theme === 'gradient' ? '功能全面，信息丰富' :
                  theme === 'cyber' ? '科技感强，视觉冲击' : '简洁清晰，现代感'
                }}</span>
              </span>
            </label>
          </div>
        </div>
        
        <!-- 快速切换开关 -->
        <div class="toggle-option">
          <label>
            <input 
              type="checkbox" 
              v-model="settingsStore.showThemeSwitcher"
              @change="settingsStore.saveSettings()"
            />
            <span>在战斗中显示快速切换按钮</span>
          </label>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-modal {
  @apply bg-cream-100 rounded-lg p-6 max-w-4xl w-full;
}

.settings-header {
  @apply flex justify-between items-center mb-6;
}

.settings-tabs {
  @apply flex gap-4 mb-6 border-b border-warm-400;
}

.settings-tabs button {
  @apply px-4 py-2 text-gray-600 hover:text-white transition-colors;
}

.settings-tabs button.active {
  @apply text-white border-b-2 border-blue-500;
}

.setting-group {
  @apply mb-8;
}

.setting-group h3 {
  @apply text-lg font-semibold mb-4;
}

.theme-presets {
  @apply flex gap-4;
}

.preset-btn {
  @apply flex flex-col items-center gap-2 p-4 rounded-lg;
  @apply bg-warm-300/50 hover:bg-warm-300 transition-all;
  @apply border-2 border-transparent;
}

.preset-btn.active {
  @apply border-blue-500 bg-warm-300;
}

.bias-bar-selector {
  @apply flex gap-6;
}

.preview-container {
  @apply w-32;
}

.preview-box {
  @apply h-64 flex items-center justify-center bg-warm-400 rounded-lg p-2;
}

.preview-scale {
  transform: scale(0.8);
}

.style-options {
  @apply flex-1 space-y-3;
}

.style-option {
  @apply flex items-center p-3 rounded-lg;
  @apply bg-warm-300/30 hover:bg-warm-300/50 cursor-pointer;
  @apply transition-all;
}

.style-option input[type="radio"] {
  @apply mr-3;
}

.option-content {
  @apply flex-1 flex items-center gap-3;
}

.option-icon {
  @apply text-2xl;
}

.option-name {
  @apply font-semibold;
}

.option-desc {
  @apply text-sm text-gray-600 ml-auto;
}

.toggle-option {
  @apply mt-4 p-3 bg-warm-300/30 rounded-lg;
}

.toggle-option label {
  @apply flex items-center gap-2 cursor-pointer;
}
</style>