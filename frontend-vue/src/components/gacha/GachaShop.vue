<script setup lang="ts">
/**
 * Gacha Shop - Resource Acquisition Terminal Standard
 */
import { computed, ref } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useEconomyStore } from '@/stores/modules/economyStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { getCurrentUpShopItems, getHistoricalUpShopItems, isAnimeCard, isCharacterCard, type ShopItem } from '@/utils/gachaRotation';
import type { Card } from '@/types/card';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';

// Atomic Components
import GlassPanel from '@/components/ui/GlassPanel.vue';
import TacticalButton from '@/components/ui/TacticalButton.vue';

const props = defineProps<{
  gachaType: 'anime' | 'character';
}>();

const gameDataStore = useGameDataStore();
const economyStore = useEconomyStore();

const activeShopTab = ref<'current' | 'historical' | 'regular'>('current');

function getShopItemsWithCards(items: ShopItem[]): (ShopItem & { card?: Card })[] {
  const cardSource = props.gachaType === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
  if (cardSource.length === 0) return [];
  
  try {
    return items.map(item => {
      if (item.type === 'card' && item.cardId) {
        const card = cardSource.find(c => c.id === item.cardId);
        return { ...item, card };
      }
      return item;
    }).filter(item => item.type !== 'card' || item.card);
  } catch (error) {
    return [];
  }
}

const currentShopItems = computed(() => getShopItemsWithCards(getCurrentUpShopItems(props.gachaType)));
const historicalShopItems = computed(() => getShopItemsWithCards(getHistoricalUpShopItems(props.gachaType)));
const regularShopItems = computed(() => getCurrentUpShopItems(props.gachaType).filter(item => item.type !== 'card'));

const activeShopItems = computed(() => {
  if (activeShopTab.value === 'current') return currentShopItems.value;
  if (activeShopTab.value === 'historical') return historicalShopItems.value;
  return regularShopItems.value;
});

const isPurchasing = ref<string | null>(null);
const purchaseError = ref<string>('');
const purchaseQuantities = ref<Record<string, number>>({});

function getItemPurchaseInfo(item: ShopItem & { card?: Card }) {
    const purchased = economyStore.getTodayPurchaseCount(item.id);
    const { canPurchase, reason } = economyStore.canPurchaseItem(item);
    return {
        purchased,
        remaining: item.dailyLimit ? Math.max(0, item.dailyLimit - purchased) : null,
        canPurchase,
        disableReason: reason || '',
    };
}

function getMaxPurchaseQuantity(item: ShopItem & { card?: Card }): number {
    const { remaining } = getItemPurchaseInfo(item);
    const affordableQuantity = Math.floor(economyStore.knowledgePoints / item.cost);
    return remaining !== null ? Math.min(remaining, affordableQuantity) : affordableQuantity;
}

function setPurchaseQuantity(itemId: string, quantity: number) {
    purchaseQuantities.value[itemId] = Math.max(1, quantity);
}

function getPurchaseQuantity(itemId: string): number {
    return purchaseQuantities.value[itemId] || 1;
}

async function handlePurchase(item: ShopItem & { card?: Card }) {
    if (isPurchasing.value !== null) return;
    const qty = item.type === 'card' ? 1 : getPurchaseQuantity(item.id);
    const cost = item.cost * qty;
    if (economyStore.knowledgePoints < cost) {
        purchaseError.value = 'INSUFFICIENT_KNOWLEDGE_QUANTUM';
        return;
    }

    isPurchasing.value = item.id;
    try {
        if (item.type === 'card') {
            await economyStore.purchaseFromShop({ Id: item.cardId || 0, cost: item.cost }, props.gachaType);
        } else {
            for (let i = 0; i < qty; i++) await economyStore.purchaseShopItem(item);
            setPurchaseQuantity(item.id, 1);
        }
    } catch (error) {
        purchaseError.value = 'UPLINK_CRITICAL_FAILURE';
    } finally {
        isPurchasing.value = null;
    }
}

function getItemIcon(item: ShopItem): string {
    const icons = { 'ticket': '💿', 'currency': '💎', 'booster': '🔋' };
    return icons[item.type as keyof typeof icons] || '📦';
}
</script>

<template>
  <div class="gacha-shop-terminal space-y-8 quantic-reveal">
    <!-- Balance Strip -->
    <div class="flex justify-between items-end border-b border-white/5 pb-4">
      <div class="space-y-1">
        <h3 class="text-[10px] font-display font-bold text-gold tracking-[0.3em] uppercase opacity-70">Logistics Uplink</h3>
        <div class="text-xl font-display font-black text-white uppercase tracking-tighter">{{ gachaType === 'anime' ? 'Core Hub' : 'Personnel Dept' }}</div>
      </div>
      <div class="flex items-center gap-4">
        <div class="text-right">
          <div class="text-[8px] font-display text-industrial-500 uppercase">Available Knowledge</div>
          <div class="text-lg font-mono font-bold text-gold">{{ economyStore.knowledgePoints.toLocaleString() }}</div>
        </div>
      </div>
    </div>

    <!-- Tab Nav -->
    <nav class="flex justify-center gap-8 bg-white/[0.02] border-y border-white/5">
      <button 
        v-for="tab in (['current', 'historical', 'regular'] as const)" 
        :key="tab"
        @click="activeShopTab = tab"
        class="py-4 text-[9px] font-display font-bold tracking-[0.3em] uppercase transition-all relative"
        :class="activeShopTab === tab ? 'text-white' : 'text-industrial-500 hover:text-white/60'"
      >
        <div v-if="activeShopTab === tab" class="absolute inset-x-0 bottom-0 h-0.5 bg-gold"></div>
        {{ tab === 'current' ? 'UP_PROTOCOL' : tab === 'historical' ? 'LEGACY_LOG' : 'UTILITY' }}
      </button>
    </nav>

    <!-- Error HUD -->
    <div v-if="purchaseError" class="bg-clinical-danger/10 border border-clinical-danger/30 p-3 text-center animate-pulse">
        <span class="text-[9px] font-display font-black text-clinical-danger tracking-widest uppercase">ALERT: {{ purchaseError }}</span>
    </div>

    <!-- Shop Grid -->
    <div v-if="activeShopItems.length > 0" class="shop-flow-container overflow-x-auto pb-8 scrollbar-none">
      <div class="flex gap-6 min-w-max">
        <div v-for="item in activeShopItems" :key="item.id" class="shop-module w-44 space-y-4">
          <!-- Visual Context -->
          <div class="relative bg-black/40 border border-white/5 p-2 transition-all hover:border-gold/30">
            <template v-if="item.type === 'card'">
              <AnimeCard v-if="gachaType === 'anime' && item.card && isAnimeCard(item.card)" :anime="item.card" />
              <CharacterCard v-if="gachaType === 'character' && item.card && isCharacterCard(item.card)" :character="item.card" />
            </template>
            <div v-else class="h-[210px] flex flex-col items-center justify-center gap-4 bg-white/[0.01]">
               <div class="text-4xl filter grayscale group-hover:grayscale-0 transition-all">{{ getItemIcon(item) }}</div>
               <div class="text-center space-y-1">
                  <div class="text-[10px] font-display font-black text-white uppercase tabular-nums tracking-tighter">{{ item.name }}</div>
                  <div class="text-[8px] text-industrial-500 uppercase px-2 line-clamp-2 max-w-[120px]">{{ item.description }}</div>
               </div>
            </div>
            
            <!-- Type Tag -->
            <div class="absolute top-0 left-0 bg-gold text-black text-[7px] font-display font-black px-2 py-0.5 uppercase tracking-widest">
              {{ item.type }}
            </div>
          </div>

          <!-- Interaction Console -->
          <div class="space-y-3 px-1">
             <div class="flex justify-between items-end border-b border-white/5 pb-2">
                <span class="text-[8px] font-display text-industrial-500 uppercase">Cost Unit</span>
                <span class="text-xs font-mono font-bold text-gold">{{ (item.cost * (item.type === 'card' ? 1 : getPurchaseQuantity(item.id))).toLocaleString() }}</span>
             </div>

             <!-- Bulk Control -->
             <div v-if="item.type !== 'card' && item.dailyLimit" class="flex items-center justify-between gap-2 bg-white/5 p-1 border border-white/5">
                <button @click="setPurchaseQuantity(item.id, getPurchaseQuantity(item.id)-1)" class="w-6 h-6 flex items-center justify-center text-gold hover:bg-white/5 transition-colors group">
                   <span class="text-xs opacity-40 group-hover:opacity-100">−</span>
                </button>
                <div class="text-[10px] font-mono text-white text-center flex-1">{{ String(getPurchaseQuantity(item.id)).padStart(2, '0') }}</div>
                <button @click="setPurchaseQuantity(item.id, getPurchaseQuantity(item.id)+1)" class="w-6 h-6 flex items-center justify-center text-gold hover:bg-white/5 transition-colors group">
                   <span class="text-xs opacity-40 group-hover:opacity-100">+</span>
                </button>
             </div>

             <TacticalButton 
               variant="primary" 
               size="sm" 
               class="w-full" 
               :disabled="isPurchasing === item.id || !getItemPurchaseInfo(item).canPurchase"
               @click="handlePurchase(item)"
             >
               {{ isPurchasing === item.id ? 'UPLINKING...' : getItemPurchaseInfo(item).canPurchase ? 'ACQUIRE' : 'LOCKED' }}
             </TacticalButton>
             
             <div v-if="item.dailyLimit" class="text-[7px] font-mono text-industrial-600 uppercase text-center">
                Allocation Remaining: {{ getItemPurchaseInfo(item).remaining }} / {{ item.dailyLimit }}
             </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty Signal -->
    <div v-else class="py-24 text-center border border-dashed border-white/5">
       <div class="text-4xl opacity-10 mb-4">📦</div>
       <p class="text-[10px] font-display font-bold text-industrial-600 uppercase tracking-widest">Supply registers are currently clear.</p>
    </div>
  </div>
</template>

<style scoped>
.shop-flow-container::-webkit-scrollbar { display: none; }
.shop-flow-container { -ms-overflow-style: none; scrollbar-width: none; }
.shop-module {
  animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes slideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
