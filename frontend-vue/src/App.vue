<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from './stores/modules/authStore';
import { useEconomyStore } from './stores/modules/economyStore';
import { useGameDataStore } from './stores/gameDataStore';

const authStore = useAuthStore();
const economyStore = useEconomyStore();
const gameDataStore = useGameDataStore();
const usernameInput = ref('');

async function handleLogin() {
  if (usernameInput.value) {
    await authStore.login(usernameInput.value);
    usernameInput.value = '';
  }
}

// 在组件挂载后，获取所有游戏核心数据
onMounted(() => {
  gameDataStore.fetchGameData();
});
</script>

<template>
  <div class="bg-industrial-900 text-industrial-100 min-h-screen selection:bg-clinical-warning selection:text-black">
    <header class="bg-industrial-800 border-b border-industrial-700 sticky top-0 z-50 font-sans">
        <div class="container mx-auto px-6">
            <div class="flex justify-between items-center py-3">
                
                <!-- Logo -->
                <RouterLink to="/" class="text-xl font-black tracking-[0.2em] text-industrial-100 hover:text-clinical-warning transition-none">
                  幻界战术终端
                </RouterLink>

                <!-- 用户信息 / 登录区域 -->
                <div class="flex items-center gap-4">
                  <div v-if="authStore.isLoggedIn" class="flex items-center gap-6 text-sm">
                      <div class="flex flex-col text-right">
                        <span class="font-bold text-white tracking-wider">用户：{{ authStore.currentUser }}</span>
                        <span class="text-xs text-industrial-300">等级.{{ String(authStore.level).padStart(2, '0') }}</span>
                      </div>
                      <div class="h-8 w-px bg-industrial-700"></div>
                      <div class="flex gap-4 text-xs tracking-wider">
                        <span class="flex flex-col">
                          <span class="text-industrial-600 border-b border-industrial-700 text-[10px]">动画核心</span>
                          <span class="text-white font-bold">{{ String(economyStore.animeGachaTickets).padStart(3, '0') }}</span>
                        </span>
                        <span class="flex flex-col">
                          <span class="text-industrial-600 border-b border-industrial-700 text-[10px]">人员核心</span>
                          <span class="text-white font-bold">{{ String(economyStore.characterGachaTickets).padStart(3, '0') }}</span>
                        </span>
                      </div>
                      <button @click="authStore.logout()" class="border border-industrial-600 px-4 py-2 text-xs font-bold tracking-wider text-industrial-300 hover:bg-clinical-danger hover:text-white hover:border-clinical-danger transition-none clip-chamfer-sm">
                          断开连接
                      </button>
                  </div>
                  <div v-else class="flex gap-3 items-center">
                      <input 
                          v-model="usernameInput" 
                          @keyup.enter="handleLogin"
                          type="text" 
                          placeholder="输入用户标识 ID" 
                          class="px-3 py-2 rounded-none bg-industrial-900 border border-industrial-600 text-sm focus:outline-none focus:border-clinical-warning transition-none w-48 placeholder-industrial-600 text-white"
                      />
                      <button @click="handleLogin" class="border border-industrial-300 bg-industrial-100 text-industrial-900 font-bold px-4 py-2 text-sm tracking-wider hover:bg-clinical-warning hover:border-clinical-warning transition-none clip-chamfer-sm">
                          接入系统
                      </button>
                  </div>
                </div>
            </div>
        </div>
    </header>

    <div class="flex">
        <nav class="w-56 bg-industrial-800 border-r border-industrial-700 p-6 pt-8 font-sans relative min-h-[calc(100vh-60px)]">
            <!-- Sidebar decoration -->
            <div class="absolute inset-0 bg-scanline pointer-events-none opacity-[0.03]"></div>
            <div class="absolute bottom-4 left-6 text-[10px] text-industrial-600 pointer-events-none font-sans">
              系统版本 // 0.9.1a<br>
              运行状态 // 正常
            </div>

            <ul class="space-y-1 relative z-10">
                <li><RouterLink to="/" class="nav-link"><span class="mr-2 opacity-30 text-xs">01</span> 主控面板</RouterLink></li>
                <li><RouterLink to="/gacha" class="nav-link"><span class="mr-2 opacity-30 text-xs">02</span> 人员招募</RouterLink></li>
                <li><RouterLink to="/collections" class="nav-link"><span class="mr-2 opacity-30 text-xs">03</span> 机密档案</RouterLink></li>
                <li><RouterLink to="/nurture" class="nav-link"><span class="mr-2 opacity-30 text-xs">04</span> 战力调优</RouterLink></li>
                <li><RouterLink to="/battle" class="nav-link"><span class="mr-2 opacity-30 text-xs">05</span> 逻辑推演</RouterLink></li>
                <li><RouterLink to="/squad-battle" class="nav-link"><span class="mr-2 opacity-30 text-xs">06</span> 战术小队</RouterLink></li>
                <li class="pt-6 mt-6 border-t border-industrial-700">
                  <RouterLink to="/settings" class="nav-link text-industrial-600 hover:text-industrial-300"><span class="mr-2 opacity-30 text-xs">99</span> 系统设置</RouterLink>
                </li>
            </ul>
        </nav>
        
        <main class="flex-1 p-8 relative">
          <!-- Background decoration for the main view -->
          <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-5 z-0 flex items-center justify-center">
            <span class="text-[12rem] leading-none font-bold whitespace-nowrap text-white" style="writing-mode: vertical-rl;">机密数据</span>
          </div>
          <div class="relative z-10 w-full h-full">
            <RouterView />
          </div>
        </main>
    </div>

  </div>
</template>

<style>
/* Font imported in index.html usually, but let's keep typography classes in Tailwind */

.nav-link {
    @apply block px-4 py-3 text-sm text-industrial-300 hover:text-industrial-100 hover:bg-industrial-700/50 transition-none border-l-4 border-transparent hover:border-industrial-300 uppercase tracking-widest;
}
.router-link-exact-active {
    @apply text-clinical-warning border-clinical-warning bg-industrial-700/30 font-bold;
}

/* Hard reset for specific card visuals waiting to be refactored */
.legendary-glow::before,
.masterpiece-shine::before,
.popular-sparkle::after {
    display: none !important;
}

/* Global utility tweaks that are outside standard tailwind can stay in main.css */
</style>
