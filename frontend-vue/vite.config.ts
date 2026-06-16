import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// S10-T4：dev server 默认收敛到 localhost，不再硬编码 0.0.0.0 / allowedHosts:true。
// 需要 LAN / 隧道（cloudflared、ngrok 等）访问时，经环境变量按需放开：
//   VITE_HOST=0.0.0.0            —— 监听所有网卡（LAN/隧道场景）
//   VITE_ALLOWED_HOSTS=a.com,b.com  —— 放行指定主机名（逗号分隔）
//   VITE_ALLOWED_HOSTS=all       —— 放行所有主机名（仅在受信隧道下使用）
const devHost = process.env.VITE_HOST ?? 'localhost'
const allowedHostsEnv = process.env.VITE_ALLOWED_HOSTS?.trim()
const allowedHosts =
  allowedHostsEnv === 'all'
    ? true
    : allowedHostsEnv
      ? allowedHostsEnv.split(',').map(h => h.trim()).filter(Boolean)
      : undefined // 默认：仅 localhost（vite 默认行为，不放行任意主机名）

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
    host: devHost,
    port: 5173,
    allowedHosts,
    proxy: {
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
      allow: ['..'],
    },
  },
})
