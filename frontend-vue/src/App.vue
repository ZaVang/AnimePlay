<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useUserStore } from './stores/userStore';
import { useGameDataStore } from './stores/gameDataStore';
import { useThemeStore } from './stores/theme';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();
useThemeStore(); // 初始化皮肤（实例化即应用设备缓存的皮肤）
const usernameInput = ref('');

async function handleLogin() {
  if (usernameInput.value) {
    await userStore.login(usernameInput.value);
    usernameInput.value = '';
  }
}

async function handleLogout() {
  await userStore.logout();
}

onMounted(() => {
  gameDataStore.fetchGameData();
});
</script>

<template>
  <div class="app-shell min-h-screen text-ink">

    <header class="sticky top-0 z-50 border-b border-line bg-header/90 shadow-sm backdrop-blur">

        <div class="container mx-auto px-4">

            <div class="flex justify-between items-center py-3">

                <!-- Logo -->
                <RouterLink to="/" class="logo-link text-2xl font-bold text-accent transition-colors">
                  动画宅的自我修养
                </RouterLink>

                <!-- 用户信息 / 登录区域 -->
                <div class="flex items-center gap-3">

                  <div v-if="userStore.isLoggedIn" class="flex items-center gap-4 text-sm">

                      <div class="flex flex-col text-right">
                        <span class="font-bold text-accent">{{ userStore.currentUser }}</span>
                        <span class="text-xs text-ink-3">Lv. {{ userStore.playerState.level }}</span>
                      </div>

                      <div class="h-8 w-px bg-line-2"></div>

                      <div class="flex items-center gap-3 text-xs text-ink-2">
                        <span>动画券: {{ userStore.playerState.animeGachaTickets }}</span>
                        <span>角色券: {{ userStore.playerState.characterGachaTickets }}</span>
                      </div>

                      <button @click="handleLogout" class="btn-danger">
                          登出
                      </button>

                  </div>

                  <div v-else class="flex gap-2 items-center">
                      <input
                          v-model="usernameInput"
                          @keyup.enter="handleLogin"
                          type="text"
                          placeholder="用户名"
                          class="input-control w-40"
                      />

                      <button @click="handleLogin" class="btn-primary">
                          登录
                      </button>

                  </div>
                </div>

            </div>

        </div>

    </header>

    <div class="flex">

        <nav class="w-48 p-4 pt-6 border-r border-line bg-header/60">

            <ul class="space-y-2">
                <li><RouterLink to="/" class="nav-link">主页</RouterLink></li>
                <li><RouterLink to="/gacha" class="nav-link">抽卡系统</RouterLink></li>
                <li><RouterLink to="/collections" class="nav-link">卡牌收藏</RouterLink></li>
                <li><RouterLink to="/battle" class="nav-link">宅理论战</RouterLink></li>
                <li><RouterLink to="/squad-battle" class="nav-link">小队战斗</RouterLink></li>
                <li><RouterLink to="/nurture" class="nav-link">角色养成</RouterLink></li>
                <li><RouterLink to="/guess" class="nav-link">🎭 猜角色</RouterLink></li>
                <li><RouterLink to="/settings" class="nav-link">设置</RouterLink></li>
            </ul>

        </nav>

        <main class="flex-1 p-6 min-w-0">
          <RouterView />
        </main>

    </div>

  </div>
</template>

<style>
/* 应用底：皮肤材质（渐变/纹理随 data-skin 切换） */
.app-shell {
    background: var(--sk-app-bg);
    background-attachment: fixed;
}

/* 导航链接样式 */
.nav-link {
    display: block;
    padding: 0.5rem 1rem;
    border-radius: var(--sk-radius-control);
    color: rgb(var(--c-ink-2));
    transition: all 0.2s;
}

.nav-link:hover {
    background-color: rgb(var(--c-surface-2));
    color: rgb(var(--c-ink));
}

/* 只有导航链接的选中状态才有强调色背景 */
.nav-link.router-link-exact-active {
    background-color: rgb(var(--c-accent));
    color: rgb(var(--c-on-accent));
    font-weight: bold;
    box-shadow: var(--sk-glow-accent);
}

/* Logo 链接始终保持原样 */
.logo-link.router-link-exact-active {
    color: rgb(var(--c-accent));
    font-weight: bold;
    background: none;
}

/* Card effects（稀有度特效：跨皮肤固定的品牌色，不随皮肤变） */
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
