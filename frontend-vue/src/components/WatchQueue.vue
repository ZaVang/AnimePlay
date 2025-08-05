<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import AddToQueueModal from './AddToQueueModal.vue';

const userStore = useUserStore();
const gameDataStore = useGameDataStore();

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
  userStore.addToViewingQueue(animeId, selectedSlot.value);
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
  <div class="bg-gray-800 p-6 rounded-lg shadow-lg border border-gray-700">
    <h2 class="text-2xl font-bold text-white mb-4">观看队列</h2>
    
    <div v-if="userStore.isLoggedIn" class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div v-for="(slot, index) in userStore.playerState.viewingQueue" :key="index">
        
        <!-- Empty Slot -->
        <div v-if="!slot" 
             class="h-48 flex items-center justify-center bg-gray-700/50 rounded-lg border-2 border-dashed border-gray-600 hover:border-green-500 hover:bg-gray-700 transition cursor-pointer"
             @click="openModal(index)">
          <div class="text-center text-gray-400">
             <svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
             <span class="font-bold">添加动画</span>
          </div>
        </div>

        <!-- Occupied Slot -->
        <div v-else class="h-48 flex flex-col items-center justify-center bg-gray-700 rounded-lg p-2 text-center">
          <template v-if="gameDataStore.getAnimeCardById(slot.animeId)">
            <img :src="gameDataStore.getAnimeCardById(slot.animeId)?.image_path" class="w-24 aspect-[3/2] object-cover rounded-md mb-2">
            <p class="font-bold text-sm truncate w-full">{{ gameDataStore.getAnimeCardById(slot.animeId)?.name }}</p>
            
            <div v-if="now < (slot.startTime + userStore.VIEWING_REWARDS[gameDataStore.getAnimeCardById(slot.animeId)!.rarity].time * 60 * 1000)">
              <p class="text-xs text-gray-400">
                剩余: {{ getRemainingTime(slot.startTime, userStore.VIEWING_REWARDS[gameDataStore.getAnimeCardById(slot.animeId)!.rarity].time) }}
              </p>
            </div>
            <div v-else>
              <button @click="userStore.collectFromViewingQueue(index)" class="mt-2 bg-green-500 text-white font-bold py-1 px-3 rounded-lg text-xs hover:bg-green-600">
                收获
              </button>
            </div>
          </template>
        </div>

      </div>
    </div>
     <p v-else class="text-gray-500 text-center py-4">请先登录</p>
  </div>
  
  <AddToQueueModal v-if="isModalOpen" :slotIndex="selectedSlot" @close="isModalOpen = false" @select="handleCardSelected" />
</template>
