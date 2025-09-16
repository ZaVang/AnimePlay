import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { useGameDataStore } from '@/stores/gameDataStore'
import { setupErrorBoundary, createVueErrorHandler } from '@/utils/errorBoundary'
import './assets/main.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)
const pinia = createPinia()

// 设置全局错误边界 - 临时禁用以便调试
// setupErrorBoundary()
// app.config.errorHandler = createVueErrorHandler()

app.use(pinia)
app.use(router)

// Load master data using the existing gameDataStore before mounting the app
const gameDataStore = useGameDataStore(pinia);
gameDataStore.fetchGameData().then(() => {
  app.mount('#app');
  console.log('App mounted after game data has been fetched.');

  // 开发环境调试工具
  if (import.meta.env.DEV) {
    import('./debug/skillDebug').then(module => {
      setTimeout(() => module.debugSkillSystem(), 1000);
    });

    import('./debug/test-skill-registration').then(module => {
      (window as any).testSkills = module;
      console.log('技能测试工具已加载，使用 testSkills.testAisakaTaigaSkills() 测试');
    });

    import('./debug/test-skill-triggers').then(module => {
      (window as any).testTriggers = module;
      console.log('技能触发测试已加载，使用 testTriggers.testTaigaSkillTriggers() 测试');
    });

    import('./debug/test-battle-skills').then(module => {
      (window as any).testBattle = module;
      console.log('战斗技能测试已加载，使用 testBattle.simulateTaigaBattle() 测试');
    });

    import('./debug/test-akashi-skills').then(module => {
      (window as any).testAkashi = module;
      console.log('明石技能分析已加载，使用 testAkashi.analyzeAkashiSkills() 分析');
    });
  }
}).catch(error => {
  console.error("Failed to fetch game data before mounting:", error);
  // Optionally, you can show an error message to the user on the screen here
});
