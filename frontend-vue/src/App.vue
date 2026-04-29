<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useUserStore } from './stores/userStore';
import { useGameDataStore } from './stores/gameDataStore';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const usernameInput = ref('');

async function handleLogin() {
  if (usernameInput.value) {
    await userStore.login(usernameInput.value);
    usernameInput.value = '';
  }
}

onMounted(() => {
  gameDataStore.fetchGameData();
});
</script>

<template>
  
  <div class="bg-cream-100 text-gray-700 min-h-screen">
    
    <header class="bg-cream-100 shadow-sm border-b border-warm-300 sticky top-0 z-50">
        
        <div class="container mx-auto px-4">
            
            <div class="flex justify-between items-center py-3">
                
                <!-- Logo - 使用普通样式，不受选中状态影响 -->
                <RouterLink to="/" class="logo-link text-2xl font-bold text-teal-primary hover:text-teal-dark transition-colors">
                  动画宅的自我修养
                </RouterLink>

                <!-- 用户信息 / 登录区域 -->
                <div class="flex items-center gap-3">
                  
                  <div v-if="userStore.isLoggedIn" class="flex items-center gap-4 text-sm">
                      
                      <div class="flex flex-col text-right">
                        <span class="font-bold text-teal-primary">{{ userStore.currentUser }}</span>
                        <span class="text-xs text-gray-500">Lv. {{ userStore.playerState.level }}</span>
                      </div>
                      
                      <div class="h-8 w-px bg-warm-300"></div>
                      
                      <div class="flex items-center gap-3 text-xs text-gray-600">
                        <span>动画券: {{ userStore.playerState.animeGachaTickets }}</span>
                        <span>角色券: {{ userStore.playerState.characterGachaTickets }}</span>
                      </div>
                      
                      <button @click="userStore.logout()" class="bg-coral-accent hover:bg-coral-dark text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                          登出
                      </button>
                  
                  </div>
                  
                  <div v-else class="flex gap-2 items-center">
                      <input 
                          v-model="usernameInput" 
                          @keyup.enter="handleLogin"
                          type="text" 
                          placeholder="用户名" 
                          class="px-3 py-2 rounded-lg bg-white border border-warm-300 focus:outline-none focus:ring-2 focus:ring-teal-primary transition w-40 text-gray-700"
                      />
                      
                      <button @click="handleLogin" class="bg-teal-primary hover:bg-teal-dark text-white font-bold py-2 px-4 rounded-lg transition-colors">
                          登录
                      </button>
                  
                  </div>
                </div>
            
            </div>
        
        </div>
    
    </header>

    <div class="flex">
        
        <nav class="w-48 bg-cream-100 p-4 pt-6 border-r border-warm-300">
            
            <ul class="space-y-2">
                <li><RouterLink to="/" class="nav-link">主页</RouterLink></li>
                <li><RouterLink to="/gacha" class="nav-link">抽卡系统</RouterLink></li>
                <li><RouterLink to="/collections" class="nav-link">卡牌收藏</RouterLink></li>
                <li><RouterLink to="/battle" class="nav-link">宅理论战</RouterLink></li>
                <li><RouterLink to="/squad-battle" class="nav-link">小队战斗</RouterLink></li>
                <li><RouterLink to="/nurture" class="nav-link">角色养成</RouterLink></li>
                <li><RouterLink to="/settings" class="nav-link">设置</RouterLink></li>
            </ul>
        
        </nav>
        
        <main class="flex-1 p-6 bg-warm-50">
          <RouterView />
        </main>
    
    </div>

  </div>
</template>

<style>
body { font-family: 'Noto Sans SC', sans-serif; }

/* 导航链接样式 */
.nav-link {
    @apply block px-4 py-2 rounded-lg text-gray-600 hover:bg-warm-300 hover:text-gray-800 transition-colors duration-200;
}

/* 只有导航链接的选中状态才有绿色背景 */
.nav-link.router-link-exact-active {
    @apply bg-teal-primary text-white font-bold;
}

/* Logo 链接始终保持原样 */
.logo-link.router-link-exact-active {
    @apply text-teal-primary font-bold;
    background: none;
}

/* Card effects */
.legendary-glow::before {
    content: '';
    position: absolute;
    top: -2px; left: -2px; right: -2px; bottom: -2px;
    background: linear-gradient(45deg, #FFD23F, #FFC107, #FFD23F, #FFC107);
    background-size: 400% 400%;
    border-radius: inherit;
    z-index: -1;
    animation: legendary-shine 2s infinite;
}
.masterpiece-shine::before {
    content: '';
    position: absolute;
    top: -1px; left: -1px; right: -1px; bottom: -1px;
    background: linear-gradient(45deg, #2BA8A2, #3CC4BD, #2BA8A2, #3CC4BD);
    background-size: 400% 400%;
    border-radius: inherit;
    z-index: -1;
    animation: masterpiece-pulse 1.5s infinite;
}
.popular-sparkle::after {
    content: '✨';
    position: absolute;
    top: 2px;
    left: 2px;
    font-size: 12px;
    animation: sparkle 2s infinite;
}
@keyframes legendary-shine {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
}
@keyframes masterpiece-pulse {
    0%, 100% { background-position: 0% 50%; opacity: 0.8; }
    50% { background-position: 100% 50%; opacity: 1; }
}
@keyframes sparkle {
    0%, 100% { opacity: 0.5; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.2); }
}
</style>
