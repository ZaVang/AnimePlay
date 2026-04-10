<script setup lang="ts">
import { ref } from 'vue';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import GachaResultModal from '@/components/GachaResultModal.vue';
import GachaRatesModal from '@/components/gacha/GachaRatesModal.vue';
import UpBanner from '@/components/gacha/UpBanner.vue';
import GachaShop from '@/components/gacha/GachaShop.vue';
import GachaHistory from '@/components/gacha/GachaHistory.vue';
import type { DrawnCard } from '@/stores/gachaStore';

const economyStore = useEconomyStore();
const collectionStore = useCollectionStore();
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
            ? economyStore.animeGachaTickets >= count
            : economyStore.characterGachaTickets >= count;
            
        if (!hasEnoughTickets) {
            drawError.value = `没有足够的${activeGachaType.value === 'anime' ? '动画券' : '角色券'}！`;
            return;
        }
        
        const drawnCards = await collectionStore.drawCards(activeGachaType.value, count);
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
  <div class="quantic-reveal">
    <div class="glass-substrate rounded-2xl overflow-hidden text-industrial-100">
      <!-- Header with Gacha Type Selector -->
      <div class="border-b border-white/5 bg-substrate/20">
        <div class="px-6 pt-6 pb-4">
          <h2 class="text-xl font-display font-bold text-center mb-6 tracking-widest text-gold uppercase">Personnel Recruitment</h2>
          <div class="flex justify-center gap-3 mb-2">
            <button 
              @click="activeGachaType = 'anime'"
              :class="['gacha-type-btn', { 'active': activeGachaType === 'anime' }]"
              class="relative overflow-hidden group py-2.5 px-8 font-display text-[10px] tracking-[0.2em] uppercase border border-white/10 hover:border-gold/50 transition-all duration-500"
            >
              <div class="absolute inset-0 bg-gold/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              Anime Core
            </button>
            <button 
              @click="activeGachaType = 'character'"
              :class="['gacha-type-btn', { 'active': activeGachaType === 'character' }]"
              class="relative overflow-hidden group py-2.5 px-8 font-display text-[10px] tracking-[0.2em] uppercase border border-white/10 hover:border-gold/50 transition-all duration-500"
            >
              <div class="absolute inset-0 bg-gold/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              Character
            </button>
          </div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div class="border-b border-white/5 bg-substrate/40">
        <nav class="flex justify-center -mb-px">
          <button @click="activeTab = 'pool'" :class="['tab-btn', { 'active': activeTab === 'pool' }]">
            Pool
          </button>
          <button @click="activeTab = 'shop'" :class="['tab-btn', { 'active': activeTab === 'shop' }]">
            Energy Exchange
          </button>
          <button @click="activeTab = 'history'" :class="['tab-btn', { 'active': activeTab === 'history' }]">
            Records
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
          <div v-if="drawError" class="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg quantic-reveal">
            <div class="flex justify-between items-center">
              <p class="text-clinical-danger text-xs font-bold tracking-wider uppercase">System Alert // {{ drawError }}</p>
              <button @click="clearError" class="text-red-400 hover:text-white transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
          </div>
          
          <!-- Anime Gacha Content -->
          <div v-if="activeGachaType === 'anime'">
            <div class="flex justify-between items-end mb-6 border-l-4 border-gold pl-4 bg-gold/5 py-2">
              <div>
                <h3 class="text-xs font-display font-bold tracking-widest text-white uppercase">Standard Core Acquisition</h3>
                <p class="text-[10px] text-industrial-500 mt-1 uppercase tracking-tighter">Authorized access granted // Abyss protocol active</p>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-[9px] text-industrial-500 uppercase font-bold">Reserves:</span>
                <span class="bg-surface border border-white/5 text-gold px-3 py-1 text-[10px] font-display font-bold">
                  {{ economyStore.animeGachaTickets }} CORE
                </span>
              </div>
            </div>
            <div class="flex justify-center gap-6 mb-8 mt-4">
              <button
                @click="handleDraw(1)"
                :disabled="isDrawing || economyStore.animeGachaTickets < 1"
                :class="[
                  'relative group overflow-hidden py-3 px-10 font-display text-[11px] tracking-[0.2em] transition-all duration-500 border border-white/10 uppercase',
                  isDrawing || economyStore.animeGachaTickets < 1
                    ? 'opacity-30 grayscale cursor-not-allowed'
                    : 'hover:border-gold/50 hover:text-gold'
                ]"
              >
                <div class="absolute inset-0 bg-white/5 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <span v-if="isDrawing" class="flex items-center gap-2">
                  <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
                <span v-else class="relative z-10">Single Execute</span>
              </button>

              <button
                @click="handleDraw(10)"
                :disabled="isDrawing || economyStore.animeGachaTickets < 10"
                :class="[
                  'relative group overflow-hidden py-3 px-10 font-display text-[11px] tracking-[0.2em] transition-all duration-500 border border-gold/40 text-gold uppercase',
                  isDrawing || economyStore.animeGachaTickets < 10
                    ? 'opacity-30 grayscale cursor-not-allowed'
                    : 'hover:bg-gold hover:text-black'
                ]"
              >
                <div class="absolute inset-0 bg-gold translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                <span v-if="isDrawing" class="flex items-center gap-2">
                  <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Link Active...
                </span>
                <span v-else class="relative z-10">Decuple Link</span>
              </button>
            </div>
            <div class="text-center">
              <a href="#" @click.prevent="openRatesModal" class="text-[9px] text-industrial-500 hover:text-gold uppercase tracking-[0.2em] transition-colors border-b border-transparent hover:border-gold pb-0.5">Manifest Database</a>
            </div>
          </div>

          <!-- Character Gacha Content -->
          <div v-if="activeGachaType === 'character'">
            <div class="flex justify-between items-center mb-4">
              <h3 class="text-lg font-semibold">角色标准卡池</h3>
              <div class="flex items-center gap-2">
                <span class="text-sm text-gray-600">拥有：</span>
                <span class="bg-pink-100 text-pink-800 px-2 py-1 rounded-full text-xs font-semibold">
                  {{ economyStore.characterGachaTickets }} 张角色券
                </span>
              </div>
            </div>
            <div class="text-center mb-4">
              <button
                @click="handleDraw(1)"
                :disabled="isDrawing || economyStore.characterGachaTickets < 1"
                :class="[
                  'font-semibold py-2 px-6 rounded-lg text-sm transition-all duration-200',
                  isDrawing || economyStore.characterGachaTickets < 1
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
                :disabled="isDrawing || economyStore.characterGachaTickets < 10"
                :class="[
                  'font-semibold py-2 px-6 rounded-lg text-sm ml-3 transition-all duration-200',
                  isDrawing || economyStore.characterGachaTickets < 10
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
  @apply border-gold text-gold bg-gold/10;
  box-shadow: inset 0 0 20px rgba(212, 165, 116, 0.1);
}
.gacha-type-btn:not(.active) {
  @apply text-industrial-500 bg-transparent;
}
.tab-btn {
    @apply py-5 px-8 block hover:text-gold focus:outline-none text-industrial-500 font-display text-[10px] tracking-[0.2em] uppercase transition-all duration-300;
    border-bottom: 2px solid transparent;
}
.tab-btn.active {
    @apply text-gold;
    border-bottom-color: theme('colors.gold.DEFAULT');
}
</style>
