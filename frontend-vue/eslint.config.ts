import { globalIgnores } from 'eslint/config'
import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

// To allow more languages other than `ts` in `.vue` files, uncomment the following lines:
// import { configureVueProject } from '@vue/eslint-config-typescript'
// configureVueProject({ scriptLangs: ['ts', 'tsx'] })
// More info at https://github.com/vuejs/eslint-config-typescript/#advanced-setup

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{ts,mts,tsx,vue}'],
  },

  globalIgnores(['**/dist/**', '**/dist-ssr/**', '**/coverage/**']),

  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  skipFormatting,

  // 约定：下划线前缀的参数/变量表示「有意不使用」（如兼容签名占位）
  {
    name: 'app/unused-vars-convention',
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },

  // ─── 架构铁律：依赖只能向下（views → components → stores → engine）───
  // engine 是纯游戏逻辑层，将来与 Node 服务端共享；任何向上依赖都是架构破窗。
  // 详见 src/engine/README.md 与 docs/FUTURE.md。
  {
    name: 'arch/engine-purity',
    files: ['src/engine/**/*.{ts,mts,tsx,vue}'],
    ignores: ['src/engine/**/*.test.ts'], // 测试文件可以用任何东西来搭测试台
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['vue', 'vue-*', '@vue/*', 'pinia', '@vueuse/*'],
              message: 'engine 必须框架无关（将来要在 Node 服务端运行）。',
            },
            {
              group: ['@/stores', '@/stores/*', '**/stores/**'],
              message: 'engine 不得依赖 stores —— 依赖只能向下。状态由调用方传入。',
            },
            {
              group: ['@/components/*', '@/views/*', '@/composables/*', '@/infra/*', '**/components/**', '**/views/**', '**/infra/**'],
              message: 'engine 不得依赖 UI/IO 层 —— 依赖只能向下。',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'engine 不做 I/O，网络请求放 infra/。' },
        { name: 'localStorage', message: 'engine 不做持久化，放 infra/persistence。' },
        { name: 'document', message: 'engine 不碰 DOM。' },
        { name: 'window', message: 'engine 不碰 DOM/BOM。' },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message: 'engine 内禁止直接 Math.random —— 用注入的 RNG（engine/rng.ts），否则无法测试/回放/服务端权威化。',
        },
      ],
    },
  },
  {
    name: 'arch/lib-purity',
    files: ['src/lib/**/*.{ts,mts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['vue', 'vue-*', '@vue/*', 'pinia', '@/stores', '@/stores/*', '@/engine/*', '@/components/*', '@/views/*'],
              message: 'lib 是通用工具层：不依赖框架、不含游戏概念（游戏逻辑放 engine，Vue 逻辑放 composables）。',
            },
          ],
        },
      ],
    },
  },
)
