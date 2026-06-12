// stores/settings.ts
import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useSettingsStore = defineStore('settings', () => {
  // 战斗速度设置
  type BattleSpeed = 'normal' | 'fast' | 'instant';
  type DelayKey = 'aiThink' | 'aiDefense' | 'settle';
  const battleSpeed = ref<BattleSpeed>('normal');
  const selectedAIProfileId = ref<string>('config-ai');

  const speedPresets: Record<BattleSpeed, Record<DelayKey, number>> = {
    normal: { aiThink: 2000, aiDefense: 1500, settle: 3000 },
    fast: { aiThink: 600, aiDefense: 300, settle: 800 },
    instant: { aiThink: 0, aiDefense: 0, settle: 0 },
  };

  function getBattleDelay(key: DelayKey): number {
    return speedPresets[battleSpeed.value][key];
  }

  // 议题偏向条主题
  const biasBarTheme = ref<'gradient' | 'cyber' | 'elegant'>('gradient');
  
  // 是否显示快速切换按钮
  const showThemeSwitcher = ref(false);

  // （S7 清理：旧 uiTheme/themePresets/applyPreset 死配置已删——无 UI 入口，
  //  全局换肤现归 stores/theme.ts 皮肤系统）

  // 切换议题偏向条主题
  function cycleBarTheme() {
    const themes = ['gradient', 'cyber', 'elegant'] as const;
    const currentIndex = themes.indexOf(biasBarTheme.value);
    const nextIndex = (currentIndex + 1) % themes.length;
    biasBarTheme.value = themes[nextIndex];
    
    // 保存到本地存储
    saveSettings();
  }
  
  // 保存设置到本地存储
  function saveSettings() {
    localStorage.setItem('ui-settings', JSON.stringify({
      battleSpeed: battleSpeed.value,
      selectedAIProfileId: selectedAIProfileId.value,
      biasBarTheme: biasBarTheme.value,
      showThemeSwitcher: showThemeSwitcher.value
    }));
  }
  
  // 加载设置
  function loadSettings() {
    const saved = localStorage.getItem('ui-settings');
    if (saved) {
      const settings = JSON.parse(saved);
      battleSpeed.value = settings.battleSpeed || 'normal';
      selectedAIProfileId.value = settings.selectedAIProfileId || 'config-ai';
      biasBarTheme.value = settings.biasBarTheme || 'gradient';
      showThemeSwitcher.value = settings.showThemeSwitcher || false;
    }
  }
  
  // 初始化时加载设置
  loadSettings();
  
  return {
    battleSpeed,
    getBattleDelay,
    selectedAIProfileId,
    biasBarTheme,
    showThemeSwitcher,
    cycleBarTheme,
    saveSettings,
    loadSettings
  };
});