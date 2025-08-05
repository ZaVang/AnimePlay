<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores/userStore';
import GachaResultModal from '@/components/GachaResultModal.vue';
import type { DrawnCard } from '@/stores/gachaStore';

const userStore = useUserStore();
const activeGachaType = ref<'anime' | 'character'>('anime');

// 控制弹窗的状态
const isModalOpen = ref(false);
const drawnCardsResult = ref<DrawnCard[]>([]);

async function handleDraw(count: number) {
    const drawnCards = await userStore.drawCards(activeGachaType.value, count);
    if (drawnCards) {
        // 更新结果并打开弹窗
        drawnCardsResult.value = drawnCards;
        isModalOpen.value = true;
    }
}

function closeModal() {
    isModalOpen.value = false;
}
</script>

<template>
  <div>
    <div class="bg-white rounded-lg shadow-sm text-gray-800">
      <!-- Header with Gacha Type Selector -->
      <div class="border-b border-gray-200">
        <div class="px-6 pt-4 pb-2">
          <h2 class="text-xl font-bold text-center mb-3">抽卡系统</h2>
          <div class="flex justify-center gap-2 mb-4">
            <button 
              @click="activeGachaType = 'anime'"
              :class="['gacha-type-btn', { 'active': activeGachaType === 'anime' }]"
              class="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md text-sm hover:bg-indigo-700"
            >
              动画抽卡
            </button>
            <button 
              @click="activeGachaType = 'character'"
              :class="['gacha-type-btn', { 'active': activeGachaType === 'character' }]"
              class="bg-pink-600 text-white font-semibold py-2 px-4 rounded-md text-sm hover:bg-pink-700"
            >
              角色抽卡
            </button>
          </div>
        </div>
      </div>

      <!-- Content Area -->
      <div class="p-6">
        <!-- Anime Gacha Content -->
        <div v-if="activeGachaType === 'anime'">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">动画标准卡池</h3>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">拥有：</span>
              <span class="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-semibold">
                {{ userStore.playerState.animeGachaTickets }} 张动画券
              </span>
            </div>
          </div>
          <div class="text-center mb-4">
            <button @click="handleDraw(1)" class="bg-indigo-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-indigo-700 text-sm">
              单次抽卡
            </button>
            <button @click="handleDraw(10)" class="bg-amber-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-amber-600 ml-3 text-sm">
              十次抽卡
            </button>
          </div>
          <div class="text-center">
            <a href="#" class="text-xs text-gray-500 hover:underline">概率一览</a>
          </div>
        </div>

        <!-- Character Gacha Content -->
        <div v-if="activeGachaType === 'character'">
          <div class="flex justify-between items-center mb-4">
            <h3 class="text-lg font-semibold">角色标准卡池</h3>
            <div class="flex items-center gap-2">
              <span class="text-sm text-gray-600">拥有：</span>
              <span class="bg-pink-100 text-pink-800 px-2 py-1 rounded-full text-xs font-semibold">
                {{ userStore.playerState.characterGachaTickets }} 张角色券
              </span>
            </div>
          </div>
          <div class="text-center mb-4">
            <button @click="handleDraw(1)" class="bg-pink-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-pink-700 text-sm">
              单次抽卡
            </button>
            <button @click="handleDraw(10)" class="bg-purple-500 text-white font-semibold py-2 px-6 rounded-lg hover:bg-purple-600 ml-3 text-sm">
              十次抽卡
            </button>
          </div>
          <div class="text-center">
            <a href="#" class="text-xs text-gray-500 hover:underline">概率一览</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Gacha Result Modal -->
    <GachaResultModal
      :is-open="isModalOpen"
      :cards="drawnCardsResult"
      :gacha-type="activeGachaType"
      @close="closeModal"
    />
  </div>
</template>

<style scoped>
.gacha-type-btn {
  transition: opacity 0.2s;
}
.gacha-type-btn.active {
  opacity: 1;
  box-shadow: 0 0 15px rgba(167, 139, 250, 0.7);
}
.gacha-type-btn:not(.active) {
  opacity: 0.6;
}
</style>
