import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      // 仅代理以 /api 或 /data 开头的请求，避免错误匹配 /src/data/**
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/data': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
    fs: {
      // Allow serving files from one level up to the project root
      allow: ['..'],
    },
  },
})
