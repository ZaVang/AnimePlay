<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useAuthStore } from '@/stores/modules/authStore';
import { useViewingStore } from '@/stores/modules/viewingStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import AddToQueueModal from './AddToQueueModal.vue';

const authStore = useAuthStore();
const viewingStore = useViewingStore();
const gameDataStore = useGameDataStore();

// 使用配置中的观看奖励
const VIEWING_REWARDS = GAME_CONFIG.gameplay.viewingQueue.rewards;

const isModalOpen = ref(false);
const selectedSlot = ref(0);
const now = ref(Date.now());
let timer: number;

onMounted(() => {
  timer = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);
});

onUnmounted(() => {
  clearInterval(timer);
});

function openModal(slotIndex: number) {
  selectedSlot.value = slotIndex;
  isModalOpen.value = true;
}

function handleCardSelected(animeId: number) {
  viewingStore.addToViewingQueue(animeId, selectedSlot.value);
  isModalOpen.value = false;
}

function getRemainingTime(startTime: number, durationMinutes: number) {
  const endTime = startTime + durationMinutes * 60 * 1000;
  const remaining = endTime - now.value;
  if (remaining <= 0) return '0s';
  
  const hours = Math.floor(remaining / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  return `${hours}h ${minutes}m ${seconds}s`;
}

</script>

<template>
  <div class="bg-industrial-800 border border-industrial-700 h-full flex flex-col clip-chamfer datapad-reveal">
    <div class="tactical-panel-header">
      <span class="flex items-center gap-2">
        <span class="w-2 h-2 bg-clinical-warning animate-pulse"></span>
        数据缓冲模块
      </span>
      <span class="opacity-30">安全协议：AES-256</span>
    </div>

    <div v-if="authStore.isLoggedIn" class="p-6 grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
      <div v-for="(slot, index) in viewingStore.viewingQueue" :key="index" class="relative group">
        
        <!-- Empty Slot (Tactical Mount Point) -->
        <div v-if="!slot" 
             class="h-44 flex flex-col items-center justify-center bg-industrial-900/50 border border-dashed border-industrial-600 hover:border-clinical-warning hover:bg-industrial-800 transition-all cursor-pointer group clip-chamfer-sm"
             @click="openModal(index)">
          <div class="text-center text-industrial-600 group-hover:text-clinical-warning">
             <div class="text-2xl mb-1">⎔</div>
             <span class="text-xs font-bold tracking-widest text-white">挂载数据源</span>
          </div>
          <!-- Corner decorations -->
          <div class="absolute top-0 left-0 w-2 h-2 border-t border-l border-industrial-500 opacity-30"></div>
          <div class="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-industrial-500 opacity-30"></div>
        </div>

        <!-- Occupied Slot (Active Download) -->
        <div v-else class="h-44 flex flex-col bg-industrial-900 border border-industrial-700 p-3 relative clip-chamfer-sm overflow-hidden text-white">
          <!-- Background Scanline effect for active slots -->
          <div class="absolute inset-0 bg-scanline opacity-5 pointer-events-none"></div>

          <template v-if="gameDataStore.getAnimeCardById(slot.animeId)">
            <div class="flex gap-3 mb-3">
              <div class="w-20 aspect-video bg-industrial-800 border border-industrial-700 overflow-hidden shrink-0">
                <img :src="gameDataStore.getAnimeCardById(slot.animeId)?.image_path" class="w-full h-full object-cover">
              </div>
              <div class="overflow-hidden">
                <p class="text-[12px] font-black text-white truncate">{{ gameDataStore.getAnimeCardById(slot.animeId)?.name }}</p>
                <p class="text-[10px] text-clinical-blue mt-0.5">任务槽位_{{ String(index + 1).padStart(2, '0') }}</p>
              </div>
            </div>
            
            <div class="mt-auto space-y-2">
              <div v-if="now < (slot.startTime + VIEWING_REWARDS[gameDataStore.getAnimeCardById(slot.animeId)!.rarity].time * 60 * 1000)" class="space-y-1">
                <div class="flex justify-between text-[10px] text-industrial-300">
                  <span class="font-bold">同步进度：{{ (Math.random() * 100).toFixed(1) }}%</span>
                  <span>{{ getRemainingTime(slot.startTime, VIEWING_REWARDS[gameDataStore.getAnimeCardById(slot.animeId)!.rarity].time) }}</span>
                </div>
                <div class="h-1.5 bg-industrial-800 overflow-hidden flex gap-0.5">
                  <div class="h-full bg-clinical-warning animate-pulse" :style="{ width: '60%' }"></div>
                  <div class="h-full bg-industrial-700 flex-1"></div>
                </div>
              </div>
              <div v-else>
                <button @click="viewingStore.collectFromViewingQueue(index)" 
                        class="w-full bg-clinical-warning text-industrial-900 font-black py-2.5 text-xs tracking-widest hover:bg-white transition-colors clip-chamfer-sm">
                  一键恢复数据
                </button>
              </div>
            </div>
          </template>
        </div>

      </div>
    </div>
     <div v-else class="flex-1 flex items-center justify-center py-12 opacity-30 font-sans">
       <p class="text-sm tracking-widest text-white">请先同步身份标识</p>
     </div>
  </div>
  
  <AddToQueueModal v-if="isModalOpen" :slotIndex="selectedSlot" @close="isModalOpen = false" @select="handleCardSelected" />
</template>

