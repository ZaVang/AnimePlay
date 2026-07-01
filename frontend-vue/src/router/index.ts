import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView
    },
    {
      path: '/gacha',
      name: 'gacha',
      component: () => import('../views/GachaView.vue')
    },
    {
      path: '/collections',
      name: 'collections',
      component: () => import('../views/CollectionsView.vue')
    },
    {
      path: '/battle',
      name: 'battle',
      component: () => import('../views/BattleView.vue')
    },
    {
      path: '/squad-battle',
      name: 'squadBattle',
      redirect: { path: '/homestead', query: { tab: 'explore' } }
    },
    {
      path: '/nurture',
      name: 'nurture',
      redirect: { path: '/homestead', query: { tab: 'characters' } }
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue')
    },
    {
      // S13-D5：基地 hub 统一家园/角色/编队/探索/战斗入口；旧 /squad-battle、/nurture 保持重定向兼容。
      path: '/homestead',
      name: 'homestead',
      component: () => import('../views/HomesteadHubView.vue')
    },
    {
      path: '/minigames',
      name: 'minigames',
      component: () => import('../views/MiniGamesView.vue')
    },
    {
      // 每个小游戏独立全屏页面（evolution-11）
      path: '/minigames/:gameId',
      name: 'minigamePlay',
      component: () => import('../views/MiniGamePlayView.vue')
    },
    {
      // 小游戏统一进 /minigames Hub；旧 /guess 链接重定向兼容
      path: '/guess',
      redirect: '/minigames'
    }
  ]
})

export default router
