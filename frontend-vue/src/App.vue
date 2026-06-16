<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useUserStore } from './stores/userStore';
import { useGameDataStore } from './stores/gameDataStore';
import { useThemeStore } from './stores/theme';
import { useOnboardingStore } from './stores/onboarding';
import { useDailyStore } from './stores/daily';
import { useCodexStore } from './stores/codex';
import { useAchievementsStore } from './stores/achievements';
import { useAchievementsReadStore } from './stores/achievementsRead';
import { DAILY_TASKS, WEEKLY_TASKS } from './config/dailyTasks';
import OnboardingGuide from './components/OnboardingGuide.vue';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();
const onboardingStore = useOnboardingStore();
const dailyStore = useDailyStore();
const codexStore = useCodexStore();
const achievementsStore = useAchievementsStore();
const achievementsReadStore = useAchievementsReadStore();
useThemeStore(); // 初始化皮肤（实例化即应用设备缓存的皮肤）

// --- B3：跨系统红点信号（纯派生，领取/查看后即时消失） ---

/** 主页红点：有任一日/周任务做满未领，或今日登录奖励可领。 */
const homeHasSignal = computed(() => {
  if (!userStore.isLoggedIn) return false;
  const todayKey = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  })();
  const loginClaimable = dailyStore.lastLoginDate !== todayKey;
  const dailyClaimable = DAILY_TASKS.some(t => dailyStore.isComplete(t.id) && !dailyStore.isClaimed(t.id));
  const weeklyClaimable = WEEKLY_TASKS.some(t => dailyStore.isWeeklyComplete(t.id) && !dailyStore.isWeeklyClaimed(t.id));
  return loginClaimable || dailyClaimable || weeklyClaimable;
});

/** 卡牌收藏红点：有图鉴里程碑达成未领，或成就有新解锁未读。 */
const collectionsHasSignal = computed(() => {
  if (!userStore.isLoggedIn) return false;
  const milestoneClaimable = codexStore.claimableMilestones.length > 0;
  const achievementUnread = achievementsReadStore.hasUnread(achievementsStore.unlocked.length);
  return milestoneClaimable || achievementUnread;
});
const usernameInput = ref('');
const passwordInput = ref('');
const loginError = ref('');
const loggingIn = ref(false);

async function handleLogin() {
  if (loggingIn.value) return;
  if (!usernameInput.value || !passwordInput.value) {
    loginError.value = '请输入用户名和密码。';
    return;
  }
  loggingIn.value = true;
  loginError.value = '';
  const result = await userStore.login(usernameInput.value, passwordInput.value);
  loggingIn.value = false;
  if (result.ok) {
    usernameInput.value = '';
    passwordInput.value = '';
    // E3-T1：登录成功后，未看过引导的设备弹首登引导（localStorage 设备标志，不进存档）
    onboardingStore.maybeStartGuide();
  } else {
    loginError.value = result.error ?? '登录失败，请重试。';
    passwordInput.value = '';
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

    <!-- S7 决策：桌面优先。小屏只提示，不做完整适配（移动端重排推迟到 S11 视图迁移再议） -->
    <div class="md:hidden bg-warning/15 text-warning text-center text-xs px-3 py-1.5">
      📺 本作按桌面浏览器设计，小屏体验可能错位，建议使用电脑访问
    </div>

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

                  <div v-else class="flex flex-col items-end gap-1">
                      <div class="flex gap-2 items-center">
                          <input
                              v-model="usernameInput"
                              @keyup.enter="handleLogin"
                              type="text"
                              autocomplete="username"
                              placeholder="用户名"
                              class="input-control w-32"
                          />
                          <input
                              v-model="passwordInput"
                              @keyup.enter="handleLogin"
                              type="password"
                              autocomplete="current-password"
                              placeholder="密码"
                              class="input-control w-32"
                          />

                          <button @click="handleLogin" :disabled="loggingIn" class="btn-primary">
                              {{ loggingIn ? '登录中…' : '登录' }}
                          </button>
                      </div>

                      <p v-if="loginError" class="text-xs text-danger">{{ loginError }}</p>
                  </div>
                </div>

            </div>

        </div>

    </header>

    <div class="flex">

        <nav class="w-48 p-4 pt-6 border-r border-line bg-header/60">

            <ul class="space-y-2">
                <li>
                  <RouterLink to="/" class="nav-link nav-link-dot">
                    主页
                    <span v-if="homeHasSignal" class="nav-dot" aria-label="有可领取的奖励"></span>
                  </RouterLink>
                </li>
                <li><RouterLink to="/gacha" class="nav-link">抽卡系统</RouterLink></li>
                <li>
                  <RouterLink to="/collections" class="nav-link nav-link-dot">
                    卡牌收藏
                    <span v-if="collectionsHasSignal" class="nav-dot" aria-label="有新解锁或可领取"></span>
                  </RouterLink>
                </li>
                <li><RouterLink to="/battle" class="nav-link">宅理论战</RouterLink></li>
                <li><RouterLink to="/squad-battle" class="nav-link">小队战斗</RouterLink></li>
                <li><RouterLink to="/nurture" class="nav-link">角色养成</RouterLink></li>
                <li><RouterLink to="/guess" class="nav-link">🎭 猜角色</RouterLink></li>
                <li><RouterLink to="/settings" class="nav-link">设置</RouterLink></li>
            </ul>

        </nav>

        <main class="flex-1 p-6 min-w-0">
          <!-- S9：非阻塞挂载后的数据门控——就绪前不渲染路由（视图都假定主数据已在） -->
          <div v-if="gameDataStore.error" class="data-gate">
            <p class="text-4xl mb-3">😵</p>
            <p class="font-bold text-lg mb-1">游戏数据加载失败</p>
            <p class="text-sm text-ink-3 mb-4">{{ gameDataStore.error }}</p>
            <button class="btn-primary" @click="gameDataStore.fetchGameData()">重试</button>
          </div>
          <div v-else-if="!gameDataStore.isReady" class="data-gate">
            <div class="loading-spinner mb-4"></div>
            <p class="text-sm text-ink-2">正在加载卡牌数据…</p>
          </div>
          <RouterView v-else />
        </main>

    </div>

    <!-- E3-T1：首登引导遮罩（z-index 高于 header；内部 Teleport 到 body） -->
    <OnboardingGuide />

  </div>
</template>

<style>
/* 应用底：皮肤材质（渐变/纹理随 data-skin 切换） */
.app-shell {
    background: var(--sk-app-bg);
    background-attachment: fixed;
}

/* S9：数据加载门控 */
.data-gate {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 50vh;
    text-align: center;
}
.loading-spinner {
    width: 40px;
    height: 40px;
    border: 3px solid rgb(var(--c-line));
    border-top-color: rgb(var(--c-accent));
    border-radius: 9999px;
    animation: data-gate-spin 0.8s linear infinite;
}
@keyframes data-gate-spin {
    to { transform: rotate(360deg); }
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

/* B3：带红点的导航项——让 .nav-dot 相对定位锚到右侧 */
.nav-link-dot {
    position: relative;
}
.nav-dot {
    position: absolute;
    top: 0.45rem;
    right: 0.6rem;
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 9999px;
    background-color: rgb(var(--c-danger));
    box-shadow: 0 0 0 2px rgb(var(--c-header));
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
