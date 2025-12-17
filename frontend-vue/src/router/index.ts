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
      path: '/skill-test',
      name: 'skillTest',
      component: () => import('../views/SkillTestView.vue')
    },
    {
      path: '/battle-replay',
      name: 'battleReplay',
      component: () => import('../views/BattleReplayView.vue')
    }
  ]
})

export default router
