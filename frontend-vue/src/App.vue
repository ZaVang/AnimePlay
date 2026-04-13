<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
import { useAuthStore } from '@/stores/modules/authStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import AbyssEnvironment from '@/components/env/AbyssEnvironment.vue';

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

onMounted(() => {
  gameDataStore.fetchGameData();
});
</script>

<template>
  <div id="app-container" class="min-h-screen relative text-industrial-100 font-ui selection:bg-gold/30 selection:text-white overflow-x-hidden">
    <!-- Kinetic Environment Layer -->
    <AbyssEnvironment />

    <header class="glass-substrate sticky top-0 z-50 font-ui border-b border-white/5 backdrop-blur-xl bg-abyss/40">
        <div class="mx-auto px-6">
            <div class="flex justify-between items-center py-3">
                <!-- Logo -->
                <RouterLink to="/" class="text-xl font-display font-bold tracking-[0.2em] text-industrial-100 hover:text-gold transition-all duration-300">
                  ANIME<span class="text-gold">PLAY</span> // <span class="opacity-50 text-[10px] tracking-widest uppercase">Terminal</span>
                </RouterLink>

                <!-- User Info / Login -->
                <div class="flex items-center gap-4">
                  <div v-if="authStore.isLoggedIn" class="flex items-center gap-6 text-sm">
                      <div class="flex flex-col text-right">
                        <span class="font-bold text-white tracking-wider uppercase">User: {{ authStore.currentUser }}</span>
                        <span class="text-xs text-industrial-500 font-display">LEVEL.{{ String(authStore.level).padStart(2, '0') }}</span>
                      </div>
                      <div class="h-8 w-px bg-white/5"></div>
                      <div class="flex gap-4 text-xs tracking-wider">
                        <div class="flex flex-col items-end">
                          <span class="text-industrial-500 text-[9px] uppercase font-bold tracking-tighter">Anime Core</span>
                          <span class="text-white font-display text-xs">{{ String(economyStore.animeGachaTickets).padStart(3, '0') }}</span>
                        </div>
                        <div class="flex flex-col items-end">
                          <span class="text-industrial-500 text-[9px] uppercase font-bold tracking-tighter">Personnel</span>
                          <span class="text-white font-display text-xs">{{ String(economyStore.characterGachaTickets).padStart(3, '0') }}</span>
                        </div>
                      </div>
                      <button @click="authStore.logout()" class="border border-white/10 px-4 py-2 text-[10px] font-bold tracking-widest text-industrial-400 hover:bg-clinical-danger hover:text-white hover:border-clinical-danger transition-all duration-500 uppercase">
                          Disconnect
                      </button>
                  </div>
                  <div v-else class="flex gap-3 items-center">
                      <input 
                          v-model="usernameInput" 
                          @keyup.enter="handleLogin"
                          type="text" 
                          placeholder="INPUT SYSTEM ID" 
                          class="bg-black/40 border border-white/10 px-4 py-2 text-[11px] font-display text-white focus:border-gold/50 outline-none transition-all placeholder:opacity-30"
                      />
                      <button @click="handleLogin" class="bg-gold text-black font-display font-bold px-4 py-2 text-[11px] tracking-widest hover:bg-white transition-all uppercase">
                          Connect
                      </button>
                  </div>
                </div>
            </div>
        </div>
    </header>

    <div class="flex relative z-10">
        <!-- Sidebar Navigation -->
        <nav class="w-64 bg-black/20 backdrop-blur-sm border-r border-white/5 p-6 pt-10 font-ui sticky top-16 h-[calc(100vh-64px)] overflow-y-auto">
            <!-- Sidebar decoration -->
            <div class="absolute inset-0 bg-scanline pointer-events-none opacity-[0.02]"></div>
            <div class="absolute bottom-6 left-6 text-[8px] text-industrial-600 pointer-events-none font-display tracking-widest uppercase space-y-1">
              <div>System // 0.9.1A</div>
              <div>Status // Operational</div>
            </div>

            <ul class="space-y-1">
                <li><RouterLink to="/" class="nav-link"><span class="mr-3 opacity-20 text-[10px] font-display">01</span> Overview</RouterLink></li>
                <li><RouterLink to="/gacha" class="nav-link"><span class="mr-3 opacity-20 text-[10px] font-display">02</span> Recruitment</RouterLink></li>
                <li><RouterLink to="/collections" class="nav-link"><span class="mr-3 opacity-20 text-[10px] font-display">03</span> Archives</RouterLink></li>
                <li><RouterLink to="/nurture" class="nav-link"><span class="mr-3 opacity-20 text-[10px] font-display">04</span> Optimization</RouterLink></li>
                <li><RouterLink to="/battle" class="nav-link"><span class="mr-3 opacity-20 text-[10px] font-display">05</span> Inference</RouterLink></li>
                <li><RouterLink to="/squad-battle" class="nav-link"><span class="mr-3 opacity-20 text-[10px] font-display">06</span> Tactical</RouterLink></li>
                
                <li class="pt-8 mt-8 border-t border-white/5 opacity-50">
                  <RouterLink to="/settings" class="nav-link text-industrial-600 hover:text-industrial-300"><span class="mr-3 opacity-20 text-[10px] font-display">99</span> Service</RouterLink>
                </li>
            </ul>
        </nav>
        
        <main class="flex-1 p-6 md:p-10 min-h-[calc(100vh-64px)] relative">
          <!-- Atmosphere Overlay -->
          <div class="absolute inset-0 pointer-events-none overflow-hidden opacity-[0.02] z-0 flex items-center justify-center select-none">
            <span class="text-[15rem] font-display font-black whitespace-nowrap text-white uppercase" style="writing-mode: vertical-rl;">Aririgi</span>
          </div>
          
          <div class="relative z-10 w-full h-full">
            <RouterView v-slot="{ Component }">
              <transition name="quantic-reveal" mode="out-in">
                <component :is="Component" />
              </transition>
            </RouterView>
          </div>
        </main>
    </div>
  </div>
</template>

<style>
.nav-link {
    @apply block px-4 py-3 text-[11px] font-display text-industrial-400 hover:text-industrial-100 hover:bg-white/[0.03] transition-all duration-300 border-l-2 border-transparent hover:border-gold uppercase tracking-[0.2em] font-medium;
}
.router-link-exact-active {
    @apply text-gold border-gold bg-gold/5 font-bold;
}

/* Transition: Quantic Reveal */
.quantic-reveal-enter-active,
.quantic-reveal-leave-active {
  transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
}

.quantic-reveal-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.quantic-reveal-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
