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
      },
      // 裸 `border` 类的默认边框色跟随皮肤（替代 Tailwind 默认 gray-200）
      borderColor: {
        DEFAULT: 'rgb(var(--c-line) / <alpha-value>)',
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
