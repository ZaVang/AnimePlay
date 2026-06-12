import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { installImgFallback } from '@/utils/imgFallback'
import './assets/skins.css'
import './assets/main.css'

import App from './App.vue'
import router from './router'

installImgFallback()

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// S9：非阻塞挂载——立即出壳，主数据由 App.onMounted 触发拉取，
// 就绪前 App 显示加载态（失败/超时提供重试），不再白屏等 API。
app.mount('#app')
