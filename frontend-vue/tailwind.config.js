/** @type {import('tailwindcss').Config} */

/** 语义色 → 皮肤变量（真值在 src/assets/skins.css，随 <html data-skin> 切换）。 */
const skinColor = (token) => `rgb(var(--c-${token}) / <alpha-value>)`;

module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ===== 语义令牌（S7 起新代码一律用这些）=====
        // 表面：app 页面底 / header 顶栏侧栏 / surface 面板 / surface-2 嵌套·输入 / elevated 弹窗
        app: skinColor('app'),
        header: skinColor('header'),
        surface: { DEFAULT: skinColor('surface'), 2: skinColor('surface-2') },
        elevated: skinColor('elevated'),
        // 文字：ink 主 / ink-2 次 / ink-3 弱化 / on-accent 强调色表面上的文字
        ink: { DEFAULT: skinColor('ink'), 2: skinColor('ink-2'), 3: skinColor('ink-3') },
        'on-accent': skinColor('on-accent'),
        // 强调：accent 主 / accent-strong 悬停加深（暗色皮肤为提亮）/ accent-soft 淡底
        accent: {
          DEFAULT: skinColor('accent'),
          strong: skinColor('accent-2'),
          soft: skinColor('accent-soft'),
        },
        highlight: skinColor('highlight'),
        // 状态
        success: skinColor('success'),
        warning: skinColor('warning'),
        danger: skinColor('danger'),
        info: skinColor('info'),
        // 线条
        line: { DEFAULT: skinColor('line'), 2: skinColor('line-2') },

        // ===== 旧静态调色板（C2 全站迁移后删除，勿在新代码使用）=====
        cream: {
          50: '#FFFDF7',
          100: '#FFF8E7',
          200: '#FDF3D7',
          300: '#F8EBCC',
        },
        warm: {
          50: '#FEFDFB',
          100: '#FDF9F3',
          200: '#FAF5EC',
          300: '#F5EDE0',
          400: '#EDE3D3',
          500: '#E5D9C6',
        },
        teal: {
          primary: '#2BA8A2',
          light: '#3CC4BD',
          dark: '#1E8C86',
        },
        gold: {
          accent: '#FFD23F',
          light: '#FFE066',
          dark: '#E6B800',
        },
        coral: {
          accent: '#EF6C4A',
          light: '#F58B6F',
          dark: '#D45A3B',
        },
        sidebar: {
          bg: '#FFF8E7',
          hover: '#F5EDE0',
        },
        main: {
          bg: '#FEFDFB',
          card: '#FFFFFF',
        }
      },
      borderRadius: {
        panel: 'var(--sk-radius-panel)',
        control: 'var(--sk-radius-control)',
      },
      boxShadow: {
        card: 'var(--sk-shadow-card)',
        pop: 'var(--sk-shadow-pop)',
        glow: 'var(--sk-glow-accent)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
  ],
}
