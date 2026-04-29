<!-- SettingsModal.vue -->
<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings';
import { useThemeStore, themes } from '@/stores/theme';
import { ref, computed } from 'vue';
import { listAIProfiles } from '@/core/ai/aiProfiles';

const settingsStore = useSettingsStore();
const themeStore = useThemeStore();
const activeTab = ref('display');

// AI 对手选择
const aiProfiles = listAIProfiles();
const selectedAIId = computed({
  get: () => settingsStore.selectedAIProfileId,
  set: (v: string) => { settingsStore.selectedAIProfileId = v; settingsStore.saveSettings(); },
});
</script>

<template>
  <div class="settings-modal" :style="{ backgroundColor: 'var(--theme-bg-secondary)', color: 'var(--theme-text-primary)' }">
    
    <div class="settings-header">
      <h2>游戏设置</h2>
      <button @click="$emit('close')" class="close-btn">✕</button>
    </div>
    
    <div class="settings-tabs" :style="{ borderColor: 'var(--theme-border)' }">
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
      
      <!-- 全局主题选择 -->
      <div class="setting-group">
        <h3>🎨 全局主题</h3>
        <p class="setting-desc" :style="{ color: 'var(--theme-text-muted)' }">选择你喜欢的界面风格</p>
        
        <div class="theme-grid">
          <button 
            v-for="(theme, id) in themes" 
            :key="id"
            @click="themeStore.setTheme(id)"
            class="theme-card"
            :class="{ active: themeStore.currentThemeId === id }"
          >
            <div class="theme-preview" :style="{ backgroundColor: theme.colors.bgPrimary, borderColor: theme.colors.border }">
              <div class="preview-header" :style="{ backgroundColor: theme.colors.accent }"></div>
              <div class="preview-sidebar" :style="{ backgroundColor: theme.colors.bgSecondary }"></div>
              <div class="preview-accent" :style="{ backgroundColor: theme.colors.accent }"></div>
            </div>
            <div class="theme-info">
              <span class="theme-icon">{{ theme.icon }}</span>
              <span class="theme-name">{{ theme.name }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- 战斗速度 -->
      <div class="setting-group">
        <h3>⚡ 战斗速度</h3>
        
        <div class="style-options">
          <label class="style-option">
            <input type="radio" value="normal" v-model="settingsStore.battleSpeed" @change="settingsStore.saveSettings()" />
            <span class="option-content">
              <span class="option-name">正常</span>
              <span class="option-desc">AI思考2s / 防御1.5s / 结算3s</span>
            </span>
          </label>
          
          <label class="style-option">
            <input type="radio" value="fast" v-model="settingsStore.battleSpeed" @change="settingsStore.saveSettings()" />
            <span class="option-content">
              <span class="option-name">快速</span>
              <span class="option-desc">AI思考0.6s / 防御0.3s / 结算0.8s</span>
            </span>
          </label>
          
          <label class="style-option">
            <input type="radio" value="instant" v-model="settingsStore.battleSpeed" @change="settingsStore.saveSettings()" />
            <span class="option-content">
              <span class="option-name">瞬间</span>
              <span class="option-desc">无动画等待，立即推进</span>
            </span>
          </label>
        </div>
      </div>

      <!-- AI 对手 -->
      <div class="setting-group">
        <h3>🧠 AI 对手</h3>
        
        <div class="style-options">
          <label class="style-option">
            <span class="option-content">
              <span class="option-name">AI 档案</span>
              <select v-model="selectedAIId" class="ai-select">
                <option v-for="p in aiProfiles" :key="p.id" :value="p.id">{{ p.name }}</option>
              </select>
            </span>
          </label>
        </div>
      </div>

      <!-- 议题偏向条样式 -->
      <div class="setting-group">
        <h3>📊 议题偏向条样式</h3>
        
        <div class="style-options">
          <label class="style-option">
            <input type="radio" value="gradient" v-model="settingsStore.biasBarTheme" @change="settingsStore.saveSettings()" />
            <span class="option-content">
              <span class="option-icon">🌈</span>
              <span class="option-name">渐变色彩</span>
              <span class="option-desc">功能全面，信息丰富</span>
            </span>
          </label>
          
          <label class="style-option">
            <input type="radio" value="cyber" v-model="settingsStore.biasBarTheme" @change="settingsStore.saveSettings()" />
            <span class="option-content">
              <span class="option-icon">⚡</span>
              <span class="option-name">赛博朋克</span>
              <span class="option-desc">科技感强，视觉冲击</span>
            </span>
          </label>
          
          <label class="style-option">
            <input type="radio" value="elegant" v-model="settingsStore.biasBarTheme" @change="settingsStore.saveSettings()" />
            <span class="option-content">
              <span class="option-icon">💎</span>
              <span class="option-name">简约优雅</span>
              <span class="option-desc">简洁清晰，现代感</span>
            </span>
          </label>
        </div>
      </div>
    </div>
    
    <div v-if="activeTab === 'audio'" class="settings-content">
      <div class="setting-group">
        <h3>🔊 音频设置</h3>
        <p :style="{ color: 'var(--theme-text-muted)' }">音频功能开发中...</p>
      </div>
    </div>
  
  </div>
</template>

<style scoped>
.settings-modal {
  border-radius: 0.5rem;
  padding: 1.5rem;
  max-width: 56rem;
  width: 100%;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.settings-header h2 {
  font-size: 1.25rem;
  font-weight: bold;
}

.close-btn {
  padding: 0.5rem;
  border-radius: 0.5rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--theme-text-muted);
}

.close-btn:hover {
  background: var(--theme-bg-card);
}

.settings-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid;
}

.settings-tabs button {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--theme-text-secondary);
  transition: all 0.2s;
}

.settings-tabs button.active {
  color: var(--theme-accent);
  border-bottom: 2px solid var(--theme-accent);
  font-weight: 600;
}

.setting-group {
  margin-bottom: 2rem;
}

.setting-group h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.setting-desc {
  font-size: 0.875rem;
  margin-bottom: 1rem;
}

/* 主题网格 */
.theme-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.theme-card {
  padding: 0.75rem;
  border-radius: 0.75rem;
  border: 2px solid var(--theme-border);
  background: var(--theme-bg-card);
  cursor: pointer;
  transition: all 0.2s;
}

.theme-card:hover {
  border-color: var(--theme-accent);
  transform: translateY(-2px);
}

.theme-card.active {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 3px var(--theme-accent-light);
}

.theme-preview {
  height: 60px;
  border-radius: 0.5rem;
  border: 1px solid;
  position: relative;
  overflow: hidden;
}

.preview-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 12px;
}

.preview-sidebar {
  position: absolute;
  top: 12px;
  left: 0;
  width: 20px;
  bottom: 0;
}

.preview-accent {
  position: absolute;
  top: 20px;
  left: 28px;
  width: 30px;
  height: 8px;
  border-radius: 4px;
}

.theme-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.theme-icon {
  font-size: 1.25rem;
}

.theme-name {
  font-size: 0.875rem;
  font-weight: 500;
}

/* 选项样式 */
.style-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.style-option {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-radius: 0.5rem;
  background: var(--theme-bg-card);
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--theme-border);
}

.style-option:hover {
  border-color: var(--theme-accent);
}

.style-option input[type="radio"] {
  margin-right: 0.75rem;
  accent-color: var(--theme-accent);
}

.option-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.option-icon {
  font-size: 1.25rem;
}

.option-name {
  font-weight: 500;
}

.option-desc {
  font-size: 0.875rem;
  color: var(--theme-text-muted);
  margin-left: auto;
}

.ai-select {
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  background: var(--theme-bg-primary);
  border: 1px solid var(--theme-border);
  color: var(--theme-text-primary);
  margin-left: auto;
}
</style>
