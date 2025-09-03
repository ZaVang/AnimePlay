<script setup lang="ts">
import { ref } from 'vue';
import { useUserStore } from '@/stores/userStore';
import GachaResultModal from '@/components/GachaResultModal.vue';
import GachaRatesModal from '@/components/gacha/GachaRatesModal.vue';
import UpBanner from '@/components/gacha/UpBanner.vue';
import GachaShop from '@/components/gacha/GachaShop.vue';
import GachaHistory from '@/components/gacha/GachaHistory.vue';
import type { DrawnCard } from '@/stores/gachaStore';

const userStore = useUserStore();
const activeGachaType = ref<'anime' | 'character'>('anime');
const activeTab = ref<'pool' | 'shop' | 'history'>('pool');

// 控制抽卡结果弹窗的状态
const isResultModalOpen = ref(false);
const drawnCardsResult = ref<DrawnCard[]>([]);

// 控制概率详情弹窗的状态
const isRatesModalOpen = ref(false);

// 加载状态和错误处理
const isDrawing = ref(false);
const drawError = ref<string>('');

async function handleDraw(count: number) {
    if (isDrawing.value) return; // 防止重复点击
    
    isDrawing.value = true;
    drawError.value = '';
    
    try {
        // 检查是否有足够的抽卡券
        const hasEnoughTickets = activeGachaType.value === 'anime' 
            ? userStore.playerState.animeGachaTickets >= count
            : userStore.playerState.characterGachaTickets >= count;
            
        if (!hasEnoughTickets) {
            drawError.value = `没有足够的${activeGachaType.value === 'anime' ? '动画券' : '角色券'}！`;
            return;
        }
        
        const drawnCards = await userStore.drawCards(activeGachaType.value, count);
        if (drawnCards) {
            drawnCardsResult.value = drawnCards;
            isResultModalOpen.value = true;
        } else {
            drawError.value = '抽卡失败，请稍后重试';
        }
    } catch (error) {
        console.error('抽卡错误:', error);
        drawError.value = '抽卡过程中发生错误，请稍后重试';
    } finally {
        isDrawing.value = false;
    }
}

function clearError() {
    drawError.value = '';
}

function closeResultModal() {
    isResultModalOpen.value = false;
}

function openRatesModal() {
    isRatesModalOpen.value = true;
}

function closeRatesModal() {
    isRatesModalOpen.value = false;
}
</script>

<template>
  <div>
    <div class="bg-white rounded-lg shadow-lg text-gray-800">
      <!-- Header with Gacha Type Selector -->
      <div class="border-b border-gray-200">
        <div class="px-6 pt-4 pb-2">
          <h2 class="text-lg font-bold text-center mb-3">抽卡系统</h2>
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

      <!-- Tabs Navigation -->
      <div class="border-b border-gray-200">
        <nav class="flex justify-center -mb-px text-lg">
          <button @click="activeTab = 'pool'" :class="['tab-btn', { 'active': activeTab === 'pool' }]">
            卡池
          </button>
          <button @click="activeTab = 'shop'" :class="['tab-btn', { 'active': activeTab === 'shop' }]">
            商店
          </button>
          <button @click="activeTab = 'history'" :class="['tab-btn', { 'active': activeTab === 'history' }]">
            历史
          </button>
        </nav>
      </div>

      <!-- Content Area -->
      <div class="p-6 min-h-[60vh] flex flex-col justify-center">
        <!-- Pool Content -->
        <div v-if="activeTab === 'pool'">
          <!-- UP Banner -->
          <UpBanner :gacha-type="activeGachaType" />
          
          <!-- 错误提示 -->
          <div v-if="drawError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div class="flex justify-between items-center">
              <p class="text-red-600 text-sm">{{ drawError }}</p>
              <button @click="clearError" class="text-red-400 hover:text-red-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
          
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
              <button 
                @click="handleDraw(1)" 
                :disabled="isDrawing || userStore.playerState.animeGachaTickets < 1"
                :class="[
                  'font-semibold py-2 px-6 rounded-lg text-sm transition-all duration-200',
                  isDrawing || userStore.playerState.animeGachaTickets < 1
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                ]"
              >
                <span v-if="isDrawing" class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  抽卡中...
                </span>
                <span v-else>单次抽卡</span>
              </button>
              <button 
                @click="handleDraw(10)" 
                :disabled="isDrawing || userStore.playerState.animeGachaTickets < 10"
                :class="[
                  'font-semibold py-2 px-6 rounded-lg text-sm ml-3 transition-all duration-200',
                  isDrawing || userStore.playerState.animeGachaTickets < 10
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-amber-500 text-white hover:bg-amber-600'
                ]"
              >
                <span v-if="isDrawing" class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  抽卡中...
                </span>
                <span v-else>十次抽卡</span>
              </button>
            </div>
            <div class="text-center">
              <a href="#" @click.prevent="openRatesModal" class="text-xs text-gray-500 hover:underline">概率一览</a>
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
              <button 
                @click="handleDraw(1)" 
                :disabled="isDrawing || userStore.playerState.characterGachaTickets < 1"
                :class="[
                  'font-semibold py-2 px-6 rounded-lg text-sm transition-all duration-200',
                  isDrawing || userStore.playerState.characterGachaTickets < 1
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-pink-600 text-white hover:bg-pink-700'
                ]"
              >
                <span v-if="isDrawing" class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  抽卡中...
                </span>
                <span v-else>单次抽卡</span>
              </button>
              <button 
                @click="handleDraw(10)" 
                :disabled="isDrawing || userStore.playerState.characterGachaTickets < 10"
                :class="[
                  'font-semibold py-2 px-6 rounded-lg text-sm ml-3 transition-all duration-200',
                  isDrawing || userStore.playerState.characterGachaTickets < 10
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                ]"
              >
                <span v-if="isDrawing" class="flex items-center gap-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  抽卡中...
                </span>
                <span v-else>十次抽卡</span>
              </button>
            </div>
            <div class="text-center">
              <a href="#" @click.prevent="openRatesModal" class="text-xs text-gray-500 hover:underline">概率一览</a>
            </div>
          </div>
        </div>

        <!-- Shop Content -->
        <div v-if="activeTab === 'shop'" class="w-full">
          <GachaShop :gacha-type="activeGachaType" />
        </div>

        <!-- History Content -->
        <div v-if="activeTab === 'history'" class="w-full">
          <GachaHistory :gacha-type="activeGachaType" />
        </div>
      </div>
    </div>

    <!-- Gacha Result Modal -->
    <GachaResultModal
      :is-open="isResultModalOpen"
      :cards="drawnCardsResult"
      :gacha-type="activeGachaType"
      @close="closeResultModal"
    />
    
    <!-- Gacha Rates Modal -->
    <GachaRatesModal
      :show="isRatesModalOpen"
      :gacha-type="activeGachaType"
      @close="closeRatesModal"
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
.tab-btn {
    @apply py-4 px-6 block hover:text-indigo-500 focus:outline-none text-gray-600 font-medium;
    border-bottom: 2px solid transparent;
}
.tab-btn.active {
    @apply text-indigo-600;
    border-bottom-color: theme('colors.indigo.500');
}
</style>
