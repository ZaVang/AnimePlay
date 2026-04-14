<script setup lang="ts">
/**
 * Gacha View - Personnel Recruitment Standard
 */
import { ref } from 'vue';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { useCollectionStore } from '@/stores/modules/collectionStore';
import GachaResultModal from '@/components/GachaResultModal.vue';
import GachaRatesModal from '@/components/gacha/GachaRatesModal.vue';
import UpBanner from '@/components/gacha/UpBanner.vue';
import GachaShop from '@/components/gacha/GachaShop.vue';
import GachaHistory from '@/components/gacha/GachaHistory.vue';
import type { DrawnCard } from '@/stores/gachaStore';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const economyStore = useEconomyStore();
const collectionStore = useCollectionStore();
const activeGachaType = ref<'anime' | 'character'>('anime');
const activeTab = ref<'pool' | 'shop' | 'history'>('pool');

const isResultModalOpen = ref(false);
const drawnCardsResult = ref<DrawnCard[]>([]);
const isRatesModalOpen = ref(false);
const isDrawing = ref(false);
const drawError = ref<string>('');

async function handleDraw(count: number) {
    if (isDrawing.value) return;
    isDrawing.value = true;
    drawError.value = '';
    
    try {
        const hasEnoughTickets = activeGachaType.value === 'anime'
            ? economyStore.animeGachaTickets >= count
            : economyStore.characterGachaTickets >= count;
            
        if (!hasEnoughTickets) {
            drawError.value = `INSUFFICIENT_${activeGachaType.value === 'anime' ? 'CORE' : 'PERSONNEL'}_TICKETS`;
            return;
        }
        
        const drawnCards = await collectionStore.drawCards(activeGachaType.value, count);
        if (drawnCards) {
            drawnCardsResult.value = drawnCards;
            isResultModalOpen.value = true;
        } else {
            drawError.value = 'CONNECTION_INTERRUPTED';
        }
    } catch (error) {
        drawError.value = 'SYSTEM_CRITICAL_FAILURE';
    } finally {
        isDrawing.value = false;
    }
}

function clearError() { drawError.value = ''; }
function closeResultModal() { isResultModalOpen.value = false; }
function openRatesModal() { isRatesModalOpen.value = true; }
function closeRatesModal() { isRatesModalOpen.value = false; }
</script>

<template>
  <div class="gacha-view-slate space-y-8 font-ui">
    <GlassPanel :reveal="true" class="border-white/5 bg-black/20 overflow-hidden">
      <!-- Header / Type Selection -->
      <template #header>
        <div class="px-6 pt-6 pb-4 border-b border-white/5">
          <h2 class="text-[10px] font-display font-bold text-center mb-8 tracking-[0.5em] text-gold uppercase opacity-70">具现协议</h2>
          <div class="flex justify-center gap-4">
            <button 
              v-for="type in (['anime', 'character'] as const)" 
              :key="type"
              @click="activeGachaType = type"
              class="relative overflow-hidden group py-3 px-14 font-display text-xs font-black tracking-[0.2em] uppercase border transition-all duration-500"
              :class="activeGachaType === type ? 'border-gold text-gold bg-gold/5' : 'border-white/10 text-industrial-100 opacity-60 hover:opacity-100 hover:border-gold/30'"
            >
              <div v-if="activeGachaType === type" class="absolute inset-x-0 bottom-0 h-0.5 bg-gold shadow-[0_0_8px_#D4A574]"></div>
              {{ type === 'anime' ? '动漫核心' : '人员单元' }}
            </button>
          </div>
        </div>
      </template>

      <!-- Internal Navigation -->
      <nav class="flex justify-center gap-12 border-b border-white/5 bg-white/[0.02]">
        <button 
          v-for="tab in (['pool', 'shop', 'history'] as const)" 
          :key="tab"
          @click="activeTab = tab" 
          class="py-5 text-xs font-display font-black tracking-[0.3em] uppercase transition-all relative"
          :class="activeTab === tab ? 'text-white' : 'text-industrial-300 hover:text-white/60'"
        >
          <div v-if="activeTab === tab" class="absolute inset-x-0 bottom-0 h-1 bg-gold shadow-[0_0_8px_#D4A574]"></div>
          {{ tab === 'pool' ? '神经网络' : tab === 'shop' ? '原质交换' : '具现档案' }}
        </button>
      </nav>

      <!-- Main Interaction Area -->
      <div class="p-8 min-h-[50vh]">
        <div v-if="activeTab === 'pool'" class="quantic-reveal space-y-12">
          <!-- UP Banner Component -->
          <UpBanner :gacha-type="activeGachaType" />
          
          <!-- Alert System -->
          <div v-if="drawError" class="bg-clinical-danger/10 border border-clinical-danger/30 p-4 flex justify-between items-center group">
            <span class="text-[10px] font-display font-black text-clinical-danger tracking-widest uppercase">Protocol Error // {{ drawError }}</span>
            <button @click="clearError" class="text-clinical-danger hover:text-white transition-colors">✕</button>
          </div>
          
          <!-- Pool Execution -->
          <div class="space-y-12">
             <div class="flex justify-between items-end border-l border-white/10 pl-6 h-12">
                <div class="space-y-1">
                  <h2 class="text-[10px] font-display font-bold text-gold tracking-[0.6em] uppercase opacity-70">具现终端</h2>
                  <h1 class="text-5xl font-display font-black tracking-tighter uppercase text-white leading-none">身份链路</h1>
                  <div class="text-[8px] font-mono text-industrial-300 uppercase tracking-widest mt-2">坐标: TOKYO_DISTRICT_09 // 模式: 资产具现</div>
                </div>
                <div class="flex items-center gap-4">
                  <div class="text-[10px] font-display text-gold/80 uppercase font-bold tracking-widest">持有凭证</div>
                  <div class="bg-black/60 px-6 py-2 text-base font-mono font-bold text-gold border border-gold/20 shadow-[0_0_10px_rgba(212,165,116,0.1)]">
                    {{ activeGachaType === 'anime' ? economyStore.animeGachaTickets : economyStore.characterGachaTickets }}
                  </div>
                </div>
             </div>

             <div class="flex justify-center gap-8 py-4">
                <TacticalButton 
                  variant="primary" 
                  size="lg" 
                  class="flex-1 py-6"
                  :disabled="isDrawing"
                  @click="handleDraw(1)"
                >
                  {{ isDrawing ? '身份链路构建中...' : '单次资产具现' }}
                </TacticalButton>
                
                <TacticalButton 
                  variant="secondary" 
                  size="lg" 
                  class="flex-1 py-6"
                  :disabled="isDrawing"
                  @click="handleDraw(10)"
                >
                  {{ isDrawing ? '同步链路连接中...' : '十连资产具现' }}
                </TacticalButton>
             </div>

             <div class="text-center">
                <button @click="openRatesModal" class="text-[10px] font-display font-black text-industrial-100 hover:text-gold uppercase tracking-[0.3em] transition-all border-b border-transparent hover:border-gold pb-1 opacity-60 hover:opacity-100">
                  查看具现概率详情
                </button>
             </div>
          </div>
        </div>

        <!-- Sub-Views -->
        <GachaShop v-else-if="activeTab === 'shop'" :gacha-type="activeGachaType" class="quantic-reveal" />
        <GachaHistory v-else-if="activeTab === 'history'" :gacha-type="activeGachaType" class="quantic-reveal" />
      </div>
    </GlassPanel>

    <!-- Modals -->
    <GachaResultModal :is-open="isResultModalOpen" :cards="drawnCardsResult" :gacha-type="activeGachaType" @close="closeResultModal" />
    <GachaRatesModal :show="isRatesModalOpen" :gacha-type="activeGachaType" @close="closeRatesModal" />
  </div>
</template>

<style scoped>
.gacha-view-slate {
  min-height: calc(100vh - 120px);
}
.text-clinical-danger { color: #FF4D4D; }
</style>
