<!-- SettingsModal.vue -->
<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings';
import { useThemeStore } from '@/stores/theme';
import { useUserStore } from '@/stores/userStore';
import { SKINS } from '@/config/skins';
import { ref, computed } from 'vue';
import { listAIProfiles } from '@/config/aiProfiles';

const settingsStore = useSettingsStore();
const themeStore = useThemeStore();
const userStore = useUserStore();
const activeTab = ref('display');

// 换肤：门面统一处理（应用 + 登录态下随存档保存；未登录时 saveToServer 自动跳过）
function handleSelectSkin(skinId: string) {
  userStore.setSkin(skinId);
}

// AI 对手选择
const aiProfiles = listAIProfiles();
const selectedAIId = computed({
  get: () => settingsStore.selectedAIProfileId,
  set: (v: string) => { settingsStore.selectedAIProfileId = v; settingsStore.saveSettings(); },
});
</script>

<template>
  <div class="settings-modal app-panel text-ink">

    <div class="settings-header">
      <h2>游戏设置</h2>
      <button @click="$emit('close')" class="close-btn" title="返回主页">✕</button>
    </div>

    <div class="settings-tabs border-line">
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

      <!-- 皮肤装扮 -->
      <div class="setting-group">
        <h3>🎨 皮肤装扮</h3>
        <p class="setting-desc text-ink-3">
          颜色、材质与装饰一起换。皮肤跟随账号存档，换设备登录自动恢复。
        </p>

        <div class="skin-grid">
          <button
            v-for="skin in SKINS"
            :key="skin.id"
            @click="handleSelectSkin(skin.id)"
            class="skin-card"
            :class="{ active: themeStore.currentSkinId === skin.id }"
          >
            <!-- 皮肤预览：底色 + 面板 + 文字线 + 强调点（展示各自皮肤的静态色板） -->
            <div class="skin-preview" :style="{ background: skin.preview.app }">
              <div class="skin-preview-panel" :style="{ background: skin.preview.surface }">
                <span class="skin-preview-line" :style="{ background: skin.preview.ink }"></span>
                <span class="skin-preview-line short" :style="{ background: skin.preview.ink }"></span>
              </div>
              <span class="skin-preview-dot" :style="{ background: skin.preview.accent }"></span>
            </div>
            <div class="skin-info">
              <span class="skin-title">{{ skin.icon }} {{ skin.name }}</span>
              <span v-if="skin.unlock.type === 'points'" class="skin-lock">
                🔒 {{ skin.unlock.cost }} 知识点
              </span>
              <span v-else-if="themeStore.currentSkinId === skin.id" class="skin-current">使用中</span>
            </div>
            <p class="skin-desc text-ink-3">{{ skin.description }}</p>
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
              <select v-model="selectedAIId" class="ai-select input-control">
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
        <p class="text-ink-3">音频功能开发中...</p>
      </div>
    </div>

  </div>
</template>

<style scoped>
.settings-modal {
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
  border-radius: var(--sk-radius-control);
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgb(var(--c-ink-3));
}

.close-btn:hover {
  background: rgb(var(--c-surface-2));
  color: rgb(var(--c-ink));
}

.settings-tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgb(var(--c-line));
}

.settings-tabs button {
  padding: 0.5rem 1rem;
  background: transparent;
  border: none;
  cursor: pointer;
  color: rgb(var(--c-ink-2));
  transition: all 0.2s;
}

.settings-tabs button.active {
  color: rgb(var(--c-accent));
  border-bottom: 2px solid rgb(var(--c-accent));
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

/* 皮肤网格 */
.skin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}

.skin-card {
  padding: 0.75rem;
  border-radius: var(--sk-radius-panel);
  border: 2px solid rgb(var(--c-line));
  background: rgb(var(--c-surface));
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.skin-card:hover {
  border-color: rgb(var(--c-accent));
  transform: translateY(-2px);
}

.skin-card.active {
  border-color: rgb(var(--c-accent));
  box-shadow: 0 0 0 3px rgb(var(--c-accent) / 0.25);
}

.skin-preview {
  height: 64px;
  border-radius: 0.5rem;
  position: relative;
  overflow: hidden;
  border: 1px solid rgb(0 0 0 / 0.08);
}

.skin-preview-panel {
  position: absolute;
  left: 10px;
  top: 10px;
  right: 34px;
  bottom: 10px;
  border-radius: 6px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.skin-preview-line {
  display: block;
  height: 4px;
  border-radius: 2px;
  width: 70%;
}

.skin-preview-line.short {
  width: 45%;
  opacity: 0.45;
}

.skin-preview-dot {
  position: absolute;
  right: 10px;
  top: 10px;
  width: 16px;
  height: 16px;
  border-radius: 9999px;
}

.skin-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.skin-title {
  font-size: 0.875rem;
  font-weight: 600;
}

.skin-current {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgb(var(--c-on-accent));
  background: rgb(var(--c-accent));
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

.skin-lock {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgb(var(--c-warning));
}

.skin-desc {
  font-size: 0.75rem;
  margin-top: 0.375rem;
  line-height: 1.4;
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
  border-radius: var(--sk-radius-control);
  background: rgb(var(--c-surface-2));
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid rgb(var(--c-line));
}

.style-option:hover {
  border-color: rgb(var(--c-accent));
}

.style-option input[type="radio"] {
  margin-right: 0.75rem;
  accent-color: rgb(var(--c-accent));
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
  color: rgb(var(--c-ink-3));
  margin-left: auto;
}

.ai-select {
  margin-left: auto;
}
</style>
