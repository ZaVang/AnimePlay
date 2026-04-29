// stores/theme.ts
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export interface ThemeColors {
  // 背景色
  bgPrimary: string;      // 主背景
  bgSecondary: string;    // 次背景/侧边栏
  bgCard: string;         // 卡片背景
  bgHeader: string;       // 顶部栏背景
  
  // 文字色
  textPrimary: string;    // 主文字
  textSecondary: string;  // 次要文字
  textMuted: string;      // 弱化文字
  
  // 强调色
  accent: string;         // 主强调色
  accentHover: string;    // 悬停状态
  accentLight: string;    // 浅色版本
  
  // 边框和分割线
  border: string;
  borderLight: string;
  
  // 特殊色
  success: string;
  warning: string;
  danger: string;
}

export interface Theme {
  id: string;
  name: string;
  description: string;
  icon: string;
  colors: ThemeColors;
}

// 主题定义
export const themes: Record<string, Theme> = {
  warm: {
    id: 'warm',
    name: '暖调浅色',
    description: '温暖的米黄色调，柔和舒适',
    icon: '🌅',
    colors: {
      bgPrimary: '#FEFDFB',
      bgSecondary: '#FFF8E7',
      bgCard: '#F5EDE0',
      bgHeader: '#FFF8E7',
      textPrimary: '#374151',
      textSecondary: '#4B5563',
      textMuted: '#9CA3AF',
      accent: '#2BA8A2',
      accentHover: '#1E8C86',
      accentLight: '#3CC4BD',
      border: '#F5EDE0',
      borderLight: '#EDE3D3',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF6C4A',
    }
  },
  flip7: {
    id: 'flip7',
    name: 'Flip7 青绿',
    description: '清新的青绿色调，卡牌游戏风格',
    icon: '🃏',
    colors: {
      bgPrimary: '#EFF8F7',
      bgSecondary: '#E8F6F5',
      bgCard: '#FFFFFF',
      bgHeader: '#E8F6F5',
      textPrimary: '#1F2937',
      textSecondary: '#4B5563',
      textMuted: '#9CA3AF',
      accent: '#2BA8A2',
      accentHover: '#1E8C86',
      accentLight: '#3CC4BD',
      border: '#D1E5E3',
      borderLight: '#E8F6F5',
      success: '#10B981',
      warning: '#FFD23F',
      danger: '#EF6C4A',
    }
  },
  dark: {
    id: 'dark',
    name: '深色霓虹',
    description: '赛博朋克风格，霓虹灯效果',
    icon: '🌃',
    colors: {
      bgPrimary: '#111827',
      bgSecondary: '#1F2937',
      bgCard: '#374151',
      bgHeader: '#1F2937',
      textPrimary: '#F9FAFB',
      textSecondary: '#E5E7EB',
      textMuted: '#9CA3AF',
      accent: '#10B981',
      accentHover: '#059669',
      accentLight: '#34D399',
      border: '#374151',
      borderLight: '#4B5563',
      success: '#34D399',
      warning: '#FBBF24',
      danger: '#F87171',
    }
  },
  ocean: {
    id: 'ocean',
    name: '海洋蓝',
    description: '深邃的蓝色调，宁静优雅',
    icon: '🌊',
    colors: {
      bgPrimary: '#F0F9FF',
      bgSecondary: '#E0F2FE',
      bgCard: '#FFFFFF',
      bgHeader: '#E0F2FE',
      textPrimary: '#1E3A5F',
      textSecondary: '#3B6B9A',
      textMuted: '#7BA3C9',
      accent: '#0284C7',
      accentHover: '#0369A1',
      accentLight: '#38BDF8',
      border: '#BAE6FD',
      borderLight: '#E0F2FE',
      success: '#059669',
      warning: '#D97706',
      danger: '#DC2626',
    }
  },
  sakura: {
    id: 'sakura',
    name: '樱花粉',
    description: '浪漫的粉色系，温柔甜美',
    icon: '🌸',
    colors: {
      bgPrimary: '#FFF5F7',
      bgSecondary: '#FCE7F3',
      bgCard: '#FFFFFF',
      bgHeader: '#FCE7F3',
      textPrimary: '#831843',
      textSecondary: '#9D174D',
      textMuted: '#BE185D',
      accent: '#EC4899',
      accentHover: '#DB2777',
      accentLight: '#F472B6',
      border: '#FBCFE8',
      borderLight: '#FCE7F3',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
    }
  },
  forest: {
    id: 'forest',
    name: '森林绿',
    description: '自然的绿色系，清新治愈',
    icon: '🌲',
    colors: {
      bgPrimary: '#F0FDF4',
      bgSecondary: '#DCFCE7',
      bgCard: '#FFFFFF',
      bgHeader: '#DCFCE7',
      textPrimary: '#14532D',
      textSecondary: '#166534',
      textMuted: '#22C55E',
      accent: '#16A34A',
      accentHover: '#15803D',
      accentLight: '#22C55E',
      border: '#BBF7D0',
      borderLight: '#DCFCE7',
      success: '#16A34A',
      warning: '#CA8A04',
      danger: '#DC2626',
    }
  }
};

export const useThemeStore = defineStore('theme', () => {
  const currentThemeId = ref<string>('warm');
  
  const currentTheme = ref<Theme>(themes.warm);
  
  function setTheme(themeId: string) {
    if (themes[themeId]) {
      currentThemeId.value = themeId;
      currentTheme.value = themes[themeId];
      applyThemeToDom(themes[themeId]);
      saveTheme();
    }
  }
  
  function applyThemeToDom(theme: Theme) {
    const root = document.documentElement;
    Object.entries(theme.colors).forEach(([key, value]) => {
      // 转换 camelCase 到 kebab-case
      const cssVar = key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--theme-${cssVar}`, value);
    });
  }
  
  function saveTheme() {
    localStorage.setItem('app-theme', currentThemeId.value);
  }
  
  function loadTheme() {
    const saved = localStorage.getItem('app-theme');
    if (saved && themes[saved]) {
      setTheme(saved);
    } else {
      applyThemeToDom(currentTheme.value);
    }
  }
  
  // 初始化
  loadTheme();
  
  return {
    currentThemeId,
    currentTheme,
    themes,
    setTheme,
    loadTheme,
  };
});
