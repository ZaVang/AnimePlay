/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 浅色暖调主题
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
        // 兼容旧名称
        sidebar: {
          bg: '#FFF8E7',
          hover: '#F5EDE0',
        },
        main: {
          bg: '#FEFDFB',
          card: '#FFFFFF',
        }
      },
    },
  },
  plugins: [
    require('@tailwindcss/aspect-ratio'),
  ],
}
