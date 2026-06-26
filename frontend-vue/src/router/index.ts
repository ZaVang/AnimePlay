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
      component: () => import('../views/SquadBattleView.vue')
    },
    {
      path: '/nurture',
      name: 'nurture',
      component: () => import('../views/NurtureView.vue')
    },
    {
      path: '/settings',
      name: 'settings',
      component: () => import('../views/SettingsView.vue')
    },
    {
      // I5-T4：家园页完整冻结——导航已藏 + 路由 redirect 到首页，手敲 /homestead 不再渲染半成品。
      // component import 已删（HomesteadView 移出构建产物）；view 文件保留（冻结不删除，SD 素材就绪可恢复）。
      path: '/homestead',
      redirect: '/'
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
