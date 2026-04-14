<script setup lang="ts">
/**
 * AnimePlay - Tactical Command Interface
 * Root Application Container
 */
import { ref, onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from '@/stores/modules/authStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import SettingsModal from '@/views/SettingsModal.vue';

const authStore = useAuthStore();
const economyStore = useEconomyStore();
const showSettings = ref(false);

const isLoggingIn = ref(false);
const loginUsername = ref('');

function submitLogin() {
  const username = loginUsername.value.trim();
  if (username) {
    authStore.login(username);
    isLoggingIn.value = false;
    loginUsername.value = '';
  }
}


onMounted(async () => {
  // Check auth and sync economy
  if (authStore.isLoggedIn) {
     await economyStore.fetchEconomy();
  }
});
</script>

<template>
  <div class="app-terminal min-h-screen bg-abyss flex flex-row font-ui relative overflow-hidden">
    <!-- Atmospheric Layer -->
    <div class="fixed inset-0 bg-grid opacity-10 pointer-events-none"></div>
    <div class="fixed inset-0 bg-scanline pointer-events-none"></div>
    <div class="absolute inset-0 bg-gradient-to-b from-substrate/20 to-abyss pointer-events-none"></div>
    
    <!-- Left Sidebar: Tactical Command Bridge -->
    <aside class="relative z-50 border-r border-white/5 bg-black/40 backdrop-blur-xl w-64 md:w-72 flex flex-col justify-between h-screen shrink-0 overflow-y-auto scrollbar-tactical">
      <div class="flex flex-col">
          <!-- Logo Section -->
          <div class="p-8 border-b border-white/5">
              <RouterLink to="/" class="flex flex-col items-start gap-5 group hover:opacity-100 transition-all">
                  <div class="w-14 h-14 border-2 border-gold flex items-center justify-center relative overflow-hidden shrink-0 shadow-[0_0_15px_rgba(212,165,116,0.1)]">
                      <div class="absolute inset-0 bg-gold/10 group-hover:bg-gold/20 transition-colors"></div>
                      <span class="text-gold font-display font-black text-2xl relative z-10 transition-transform group-hover:scale-110">AP</span>
                  </div>
                  <div class="flex flex-col">
                      <span class="text-2xl font-display font-black text-white tracking-widest leading-none group-hover:text-gold transition-colors duration-300">ANIME_PLAY</span>
                      <span class="text-[10px] font-mono text-gold tracking-[0.4em] uppercase opacity-90 mt-2">战术指挥终端</span>
                  </div>
              </RouterLink>
          </div>

          <!-- Navigation: Central Access Nodes -->
          <nav class="flex flex-col py-6 relative">
              <RouterLink to="/" class="nav-link-tactical-v">
                  <span class="text-xl opacity-60 mr-4">⎈</span>主控中心
              </RouterLink>
              <RouterLink to="/collections" class="nav-link-tactical-v">
                  <span class="text-xl opacity-60 mr-4">🗂️</span>资源名录
              </RouterLink>
              <RouterLink to="/gacha" class="nav-link-tactical-v">
                  <span class="text-xl opacity-60 mr-4">💎</span>具现终端
              </RouterLink>
              <RouterLink to="/squad-battle" class="nav-link-tactical-v">
                  <span class="text-xl opacity-60 mr-4">⚔️</span>小队格斗
              </RouterLink>
              <RouterLink to="/battle" class="nav-link-tactical-v">
                  <span class="text-xl opacity-60 mr-4">🎴</span>卡牌对战
              </RouterLink>
              <RouterLink to="/nurture" class="nav-link-tactical-v">
                  <span class="text-xl opacity-60 mr-4">🧬</span>角色养成
              </RouterLink>
          </nav>
      </div>

      <!-- System & Auth bottom section -->
      <div class="border-t border-white/5 flex flex-col bg-black/60 shrink-0">
          <div class="p-6 space-y-6">
              <div v-if="authStore.isLoggedIn" class="space-y-6">
                  <!-- User Node -->
                  <div class="flex flex-col border-b border-white/5 pb-4">
                      <span class="block text-[9px] font-mono text-industrial-300 uppercase leading-none mb-2">当前同步节点</span>
                      <span class="text-lg font-display font-bold text-white uppercase tracking-tighter">{{ authStore.currentUser }}</span>
                      <span class="block text-[9px] font-mono text-gold opacity-60 mt-1">链路状态: 稳定</span>
                  </div>
                  
                  <!-- Economy -->
                  <div class="space-y-3">
                      <div class="flex justify-between items-end bg-white/[0.02] p-3 border border-white/5">
                          <span class="text-industrial-100 text-[10px] uppercase font-bold tracking-tighter">具现凭证 (动漫)</span>
                          <span class="text-gold font-display text-lg leading-none">{{ String(economyStore.animeGachaTickets).padStart(3, '0') }}</span>
                      </div>
                      <div class="flex justify-between items-end bg-white/[0.02] p-3 border border-white/5">
                          <span class="text-industrial-100 text-[10px] uppercase font-bold tracking-tighter">具现凭证 (角色)</span>
                          <span class="text-white font-display text-lg leading-none">{{ String(economyStore.characterGachaTickets).padStart(3, '0') }}</span>
                      </div>
                  </div>
                  
                  <!-- Actions -->
                  <div class="pt-2 flex gap-3">
                      <button @click="authStore.logout()" class="flex-1 p-3 border border-white/10 hover:border-clinical-danger/50 group transition-all text-xs font-bold tracking-widest text-industrial-400 group-hover:text-clinical-danger hover:bg-clinical-danger/10 uppercase">
                          断开链接 [注销]
                      </button>
                      <button @click="showSettings = true" class="w-12 p-3 border border-white/10 hover:border-gold/50 transition-all text-industrial-300 hover:text-gold flex justify-center items-center hover:bg-gold/10">
                          ⚙️
                      </button>
                  </div>
              </div>

              <!-- Visitor Mode -->
              <div v-else class="space-y-4">
                  <div class="mb-4">
                     <span class="block text-[9px] font-mono text-industrial-300 uppercase leading-none mb-1">访问状态</span>
                     <span class="text-xs font-display font-bold text-white/40 uppercase tracking-tighter">尚未建立操作链接</span>
                  </div>
                  
                  <div v-if="isLoggingIn" class="space-y-3 bg-black/60 p-4 border border-gold/30">
                     <input 
                        v-model="loginUsername" 
                        @keyup.enter="submitLogin"
                        type="text" 
                        class="w-full bg-black/80 border border-white/20 p-2 text-xs font-display text-white outline-none focus:border-gold transition-all placeholder:text-white/20" 
                        placeholder="输入操作员代号..."
                     />
                     <div class="flex gap-2">
                       <button @click="submitLogin" class="flex-1 px-2 py-2 bg-gold/10 hover:bg-gold/20 border border-gold/50 text-gold text-[10px] uppercase font-bold tracking-widest transition-all">验证</button>
                       <button @click="isLoggingIn = false" class="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[10px] uppercase transition-all">取消</button>
                     </div>
                  </div>

                  <button v-else @click="isLoggingIn = true" class="w-full group relative px-4 py-4 border border-gold/30 hover:border-gold transition-all overflow-hidden bg-gold/5 flex justify-center">
                      <div class="absolute inset-0 bg-gold/5 translate-y-full group-hover:translate-y-0 transition-transform"></div>
                      <div class="flex items-center gap-2 relative z-10">
                         <div class="w-1.5 h-1.5 bg-gold animate-pulse shadow-[0_0_8px_#D4A574]"></div>
                         <span class="text-xs font-display font-black text-gold uppercase tracking-widest whitespace-nowrap">身份链路验证 [登录]</span>
                      </div>
                  </button>
                   <div class="pt-2 flex justify-center">
                       <button @click="showSettings = true" class="w-full p-3 border border-white/10 hover:border-gold/50 transition-all text-industrial-300 hover:text-gold flex justify-center items-center text-xs font-bold tracking-widest uppercase hover:bg-gold/10">
                          ⚙️ 系统环境配置
                      </button>
                   </div>
              </div>
          </div>
      </div>
    </aside>

    <!-- Content Stratum -->
    <main class="flex-1 relative z-10 h-screen overflow-y-auto">
      <RouterView v-slot="{ Component }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <!-- System Layer Overlays -->
    <SettingsModal v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<style>
/* Global Design System Bridge */
.nav-link-tactical {
  @apply px-6 py-2 text-xs font-display font-black text-industrial-100 uppercase tracking-widest transition-all;
}
.nav-link-tactical:hover, .router-link-active.nav-link-tactical {
  @apply text-white scale-105;
}
.router-link-active.nav-link-tactical {
  @apply relative;
}
.router-link-active.nav-link-tactical::after {
  content: '';
  @apply absolute bottom-0 left-5 right-5 h-0.5 bg-gold;
}

/* Vertical Nav Styles */
.nav-link-tactical-v {
  @apply flex items-center px-8 py-5 text-xs font-display font-black text-industrial-100 uppercase tracking-widest transition-all bg-transparent relative border-l-2 border-transparent;
}
.nav-link-tactical-v:hover {
  @apply text-white bg-white/[0.02] border-white/20 pl-10;
}
.router-link-active.nav-link-tactical-v {
  @apply text-gold bg-gold/[0.05] border-gold pl-10;
}
.router-link-active.nav-link-tactical-v span {
  @apply opacity-100 text-gold shadow-[0_0_10px_rgba(212,165,116,0.3)];
}

.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from { opacity: 0; transform: translateY(4px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-4px); }

/* Custom Scrollbar for Main and Aside Content Area */
main::-webkit-scrollbar, aside::-webkit-scrollbar {
  width: 4px;
}
main::-webkit-scrollbar-track, aside::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.3);
}
main::-webkit-scrollbar-thumb, aside::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
main::-webkit-scrollbar-thumb:hover, aside::-webkit-scrollbar-thumb:hover {
  background: rgba(212, 165, 116, 0.3);
}
</style>
