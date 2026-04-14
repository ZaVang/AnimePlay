<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuthStore } from '@/stores/modules/authStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useNurtureStore } from '@/stores/modules/nurtureStore';

// Dashboard Components
import PlayerStatus from '@/components/PlayerStatus.vue';
import WatchQueue from '@/components/WatchQueue.vue';
import ActivityLog from '@/components/ActivityLog.vue';
import CollectionPreview from '@/components/CollectionPreview.vue';

const authStore = useAuthStore();
const economyStore = useEconomyStore();
const nurtureStore = useNurtureStore();
</script>

<template>
  <div class="home-terminal p-8 md:p-12 space-y-12 quantic-reveal h-full overflow-y-auto">
    <!-- Top Identity Band -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-white/10 pb-10">
      <div class="flex-1 space-y-2">
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 bg-gold animate-pulse"></div>
          <p class="text-[9px] font-display font-bold text-gold tracking-[0.6em] uppercase opacity-70">战术信息网格 // 控制中心</p>
        </div>
        <h1 class="text-6xl font-display font-black text-white tracking-tighter uppercase leading-none">情报枢纽</h1>
        <p class="text-[10px] font-mono text-industrial-100 uppercase tracking-widest mt-2 opacity-80">
          坐标: TOKYO_DISTRICT_03 // 系统状态: 正常 // 核心负载: 100%
        </p>
      </div>

      <div class="flex flex-col md:flex-row items-center justify-end gap-6 relative group overflow-hidden">
         <div class="px-6 py-4 bg-gold/[0.03] border border-gold/20 flex flex-col items-end">
             <span class="block text-[10px] font-display text-industrial-100 uppercase tracking-widest mb-1 opacity-70">全阵列资产总额</span>
             <span class="text-3xl font-display font-black text-gold tabular-nums">{{ economyStore.animeGachaTickets + economyStore.characterGachaTickets }}</span>
         </div>
      </div>
    </header>

    <!-- Operational Dashboard (Only if logged in) -->
    <template v-if="authStore.isLoggedIn">
        <!-- Player Status Section -->
        <PlayerStatus />

        <!-- Watch Queue (占满整行) -->
        <WatchQueue />

        <!-- Bottom Row: Activity Log & Collection Preview (1:1比例) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
            <!-- Left: Activity Log -->
            <div class="flex flex-col h-full">
                <ActivityLog class="flex-1" />
            </div>

            <!-- Right: Collection Preview -->
            <div class="flex flex-col h-full">
                <CollectionPreview class="flex-1" />
            </div>
        </div>
    </template>
    
    <template v-else>
        <!-- Visitor Placeholder -->
        <div class="border border-white/10 bg-white/[0.02] p-24 flex flex-col items-center justify-center text-center">
            <div class="w-20 h-20 mb-6 opacity-30 text-6xl">🔒</div>
            <h2 class="text-2xl font-display font-bold text-white uppercase tracking-widest mb-4">访客接入模式</h2>
            <p class="text-industrial-300 max-w-lg text-sm leading-relaxed mx-auto">
                您当前没有任何操作授权。请使用左侧控制台申请身份链路验证（登录）以获取完整的终端情报控制权。
            </p>
        </div>
    </template>
  </div>
</template>

<style scoped>
/* Scoped styles */
</style>
