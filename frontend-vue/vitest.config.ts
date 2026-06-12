import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'

// 测试只覆盖纯逻辑（engine/utils/core 的公式与规则），用 node 环境即可。
// 组件测试如未来需要，再按需引入 jsdom/happy-dom。
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
