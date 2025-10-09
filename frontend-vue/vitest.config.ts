import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      exclude: [...configDefaults.exclude, 'e2e/**'],
      root: fileURLToPath(new URL('./', import.meta.url)),
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html'],
        include: [
          'src/core/**/*.ts',
          'src/skills/**/*.ts',
          'src/composables/**/*.ts',
          'src/stores/**/*.ts',
          'src/utils/**/*.ts'
        ],
        exclude: [
          '**/*.d.ts',
          '**/*.config.*',
          '**/types/**',
          '**/__tests__/**',
          '**/index.ts'
        ],
        thresholds: {
          lines: 60,
          functions: 60,
          branches: 60,
          statements: 60
        }
      }
    }
  })
)
