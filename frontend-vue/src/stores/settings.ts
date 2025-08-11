// stores/settings.ts
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  // 议题偏向条主题
  const biasBarTheme = ref<'gradient' | 'cyber' | 'elegant'>('gradient');
  
  // 是否显示快速切换按钮
  const showThemeSwitcher = ref(false);
  
  // 其他UI主题设置
  const uiTheme = ref({
    biasBar: 'gradient',
    battleLog: 'classic',
    characterCards: 'standard',
    effects: 'normal'
  });
  
  // 预设主题包
  const themePresets = {
    classic: {
      biasBar: 'gradient',
      battleLog: 'classic',
      characterCards: 'standard',
      effects: 'normal'
    },
    cyberpunk: {
      biasBar: 'cyber',
      battleLog: 'terminal',
      characterCards: 'hologram',
      effects: 'neon'
    },
    minimal: {
      biasBar: 'elegant',
      battleLog: 'minimal',
      characterCards: 'simple',
      effects: 'subtle'
    }
  };
  
  // 切换议题偏向条主题
  function cycleBarTheme() {
    const themes = ['gradient', 'cyber', 'elegant'] as const;
    const currentIndex = themes.indexOf(biasBarTheme.value);
    const nextIndex = (currentIndex + 1) % themes.length;
    biasBarTheme.value = themes[nextIndex];
    
    // 保存到本地存储
    saveSettings();
  }
  
  // 应用预设主题
  function applyPreset(presetName: keyof typeof themePresets) {
    const preset = themePresets[presetName];
    uiTheme.value = { ...preset };
    biasBarTheme.value = preset.biasBar as any;
    saveSettings();
  }
  
  // 保存设置到本地存储
  function saveSettings() {
    localStorage.setItem('ui-settings', JSON.stringify({
      biasBarTheme: biasBarTheme.value,
      uiTheme: uiTheme.value,
      showThemeSwitcher: showThemeSwitcher.value
    }));
  }
  
  // 加载设置
  function loadSettings() {
    const saved = localStorage.getItem('ui-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      biasBarTheme.value = settings.biasBarTheme || 'gradient';
      uiTheme.value = settings.uiTheme || themePresets.classic;
      showThemeSwitcher.value = settings.showThemeSwitcher || false;
    }
  }
  
  // 初始化时加载设置
  loadSettings();
  
  return {
    biasBarTheme,
    showThemeSwitcher,
    uiTheme,
    themePresets,
    cycleBarTheme,
    applyPreset,
    saveSettings,
    loadSettings
  };
});