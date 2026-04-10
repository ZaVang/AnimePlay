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
  <div class="bg-abyss text-industrial-100 min-h-screen selection:bg-gold selection:text-black font-ui">
    <header class="glass-substrate sticky top-0 z-50 font-ui transition-all duration-500">
        <div class="container mx-auto px-6">
            <div class="flex justify-between items-center py-3">
                
                <!-- Logo -->
                <RouterLink to="/" class="text-xl font-display font-bold tracking-[0.2em] text-industrial-100 hover:text-gold transition-all duration-300">
                  ANIME<span class="text-gold">PLAY</span> // 终端
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
                          <span class="text-industrial-500 text-[9px] uppercase font-bold">Anime Core</span>
                          <span class="text-white font-display text-xs text-right">{{ String(economyStore.animeGachaTickets).padStart(3, '0') }}</span>
                        </span>
                        <span class="flex flex-col">
                          <span class="text-industrial-500 text-[9px] uppercase font-bold">Personnel</span>
                          <span class="text-white font-display text-xs text-right">{{ String(economyStore.characterGachaTickets).padStart(3, '0') }}</span>
                        </span>
                      </div>
                      <button @click="authStore.logout()" class="border border-white/10 px-4 py-2 text-[10px] font-bold tracking-widest text-industrial-300 hover:bg-clinical-danger hover:text-white hover:border-clinical-danger transition-all duration-300 uppercase">
                          Disconnect
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
        <nav class="w-64 bg-substrate/40 border-r border-white/5 p-6 pt-8 font-ui relative min-h-[calc(100vh-64px)]">
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
    @apply block px-4 py-3 text-[11px] text-industrial-400 hover:text-industrial-100 hover:bg-white/5 transition-all duration-300 border-l-2 border-transparent hover:border-gold uppercase tracking-[0.2em] font-medium;
}
.router-link-exact-active {
    @apply text-gold border-gold bg-gold/5 font-bold;
}

/* Hard reset for specific card visuals waiting to be refactored */
.legendary-glow::before,
.masterpiece-shine::before,
.popular-sparkle::after {
    display: none !important;
}

/* Global utility tweaks that are outside standard tailwind can stay in main.css */
</style>
