<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useUserStore } from './stores/userStore';
import { useGameDataStore } from './stores/gameDataStore';
import { useThemeStore } from './stores/theme';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const themeStore = useThemeStore();
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
  <div class="min-h-screen theme-bg-primary" :style="{ color: 'var(--theme-text-primary)' }">
    
    <header class="shadow-sm border-b theme-bg-header sticky top-0 z-50" :style="{ borderColor: 'var(--theme-border)' }">
        
        <div class="container mx-auto px-4">
            
            <div class="flex justify-between items-center py-3">
                
                <!-- Logo -->
                <RouterLink to="/" class="logo-link text-2xl font-bold transition-colors" :style="{ color: 'var(--theme-accent)' }">
                  动画宅的自我修养
                </RouterLink>

                <!-- 用户信息 / 登录区域 -->
                <div class="flex items-center gap-3">
                  
                  <div v-if="userStore.isLoggedIn" class="flex items-center gap-4 text-sm">
                      
                      <div class="flex flex-col text-right">
                        <span class="font-bold" :style="{ color: 'var(--theme-accent)' }">{{ userStore.currentUser }}</span>
                        <span class="text-xs" :style="{ color: 'var(--theme-text-muted)' }">Lv. {{ userStore.playerState.level }}</span>
                      </div>
                      
                      <div class="h-8 w-px" :style="{ backgroundColor: 'var(--theme-border)' }"></div>
                      
                      <div class="flex items-center gap-3 text-xs" :style="{ color: 'var(--theme-text-secondary)' }">
                        <span>动画券: {{ userStore.playerState.animeGachaTickets }}</span>
                        <span>角色券: {{ userStore.playerState.characterGachaTickets }}</span>
                      </div>
                      
                      <button class="font-bold py-2 px-4 rounded-lg text-sm transition-colors" 
                        :style="{ backgroundColor: 'var(--theme-danger)', color: 'white' }">
                          登出
                      </button>
                  
                  </div>
                  
                  <div v-else class="flex gap-2 items-center">
                      <input 
                          v-model="usernameInput" 
                          @keyup.enter="handleLogin"
                          type="text" 
                          placeholder="用户名" 
                          class="px-3 py-2 rounded-lg bg-white border focus:outline-none transition w-40"
                          :style="{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-primary)' }"
                      />
                      
                      <button @click="handleLogin" class="btn-accent font-bold py-2 px-4 rounded-lg">
                          登录
                      </button>
                  
                  </div>
                </div>
            
            </div>
        
        </div>
    
    </header>

    <div class="flex">
        
        <nav class="w-48 p-4 pt-6 border-r" :style="{ backgroundColor: 'var(--theme-bg-secondary)', borderColor: 'var(--theme-border)' }">
            
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
        
        <main class="flex-1 p-6" :style="{ backgroundColor: 'var(--theme-bg-primary)' }">
          <RouterView />
        </main>
    
    </div>

  </div>
</template>

<style>
body { font-family: 'Noto Sans SC', sans-serif; }

/* 导航链接样式 */
.nav-link {
    display: block;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    color: var(--theme-text-secondary);
    transition: all 0.2s;
}

.nav-link:hover {
    background-color: var(--theme-bg-card);
    color: var(--theme-text-primary);
}

/* 只有导航链接的选中状态才有强调色背景 */
.nav-link.router-link-exact-active {
    background-color: var(--theme-accent);
    color: white;
    font-weight: bold;
}

/* Logo 链接始终保持原样 */
.logo-link.router-link-exact-active {
    color: var(--theme-accent);
    font-weight: bold;
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
