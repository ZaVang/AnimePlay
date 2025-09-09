<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useUserStore } from '@/stores/userStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { getCurrentUpShopItems, getHistoricalUpShopItems, isAnimeCard, isCharacterCard, type ShopItem } from '@/utils/gachaRotation';
import type { Card } from '@/types/card';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';

const props = defineProps<{
  gachaType: 'anime' | 'character';
}>();

const gameDataStore = useGameDataStore();
const userStore = useUserStore();

// 商店标签页状态
const activeShopTab = ref<'current' | 'historical' | 'regular'>('current');

const shopConfig = computed(() => {
  return props.gachaType === 'anime' ? GAME_CONFIG.animeSystem.shop : GAME_CONFIG.characterSystem.shop;
});

// 当前UP池商店物品
const currentShopItems = computed(() => {
  return getShopItemsWithCards(getCurrentUpShopItems(props.gachaType));
});

// 历史UP池商店物品
const historicalShopItems = computed(() => {
  return getShopItemsWithCards(getHistoricalUpShopItems(props.gachaType));
});

// 常规商店物品（非卡牌类）
const regularShopItems = computed(() => {
  const allItems = getCurrentUpShopItems(props.gachaType);
  return allItems.filter(item => item.type !== 'card');
});

// 处理商店物品，为卡牌类型物品添加卡牌数据
function getShopItemsWithCards(items: ShopItem[]): (ShopItem & { card?: Card })[] {
  const cardSource = props.gachaType === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
  
  // 如果没有加载卡片数据，返回空数组
  if (cardSource.length === 0) return [];
  
  try {
    return items.map(item => {
      if (item.type === 'card' && item.cardId) {
        const card = cardSource.find(c => c.id === item.cardId);
        return {
          ...item,
          card: card,
        };
      }
      return item;
    }).filter(item => item.type !== 'card' || item.card);
  } catch (error) {
    console.warn('Failed to get shop items:', error);
    return [];
  }
}

// 购买状态和错误处理
const isPurchasing = ref<string | null>(null); // 记录正在购买的物品ID
const purchaseError = ref<string>('');

async function handlePurchase(item: ShopItem & { card?: Card }) {
    if (isPurchasing.value !== null) return;
    
    let confirmMessage = '';
    if (item.type === 'card' && item.card) {
        confirmMessage = `确定要花费 ${item.cost.toLocaleString()} 知识点购买 [${item.card.rarity}] ${item.card.name} 吗？`;
    } else {
        confirmMessage = `确定要花费 ${item.cost.toLocaleString()} 知识点购买 ${item.name} 吗？`;
        if (item.description) {
            confirmMessage += `\n${item.description}`;
        }
    }
    
    const confirmPurchase = confirm(confirmMessage);
    if (!confirmPurchase) return;
    
    // 检查知识点是否足够
    if (userStore.playerState.knowledgePoints < item.cost) {
        purchaseError.value = '知识点不足，无法购买此物品';
        setTimeout(() => { purchaseError.value = ''; }, 3000);
        return;
    }
    
    isPurchasing.value = item.id;
    purchaseError.value = '';
    
    try {
        if (item.type === 'card') {
            // 卡牌类物品，使用原有购买逻辑
            await userStore.purchaseFromShop({
                Id: item.cardId || 0,
                cost: item.cost
            }, props.gachaType);
        } else {
            // 其他类型物品，调用新的购买方法
            await userStore.purchaseShopItem(item);
        }
        // 购买成功提示
        purchaseError.value = '';
    } catch (error) {
        console.error('购买错误:', error);
        purchaseError.value = '购买过程中发生错误，请稍后重试';
    } finally {
        isPurchasing.value = null;
        if (purchaseError.value) {
            setTimeout(() => { purchaseError.value = ''; }, 3000);
        }
    }
}

// 获取物品图标
function getItemIcon(item: ShopItem): string {
    switch (item.type) {
        case 'ticket':
            return '🎫';
        case 'currency':
            return '💰';
        case 'booster':
            return '⚡';
        default:
            return '📦';
    }
}

// 获取活动的商店物品列表
const activeShopItems = computed((): (ShopItem & { card?: any })[] => {
    switch (activeShopTab.value) {
        case 'current':
            return currentShopItems.value;
        case 'historical':
            return historicalShopItems.value;
        case 'regular':
            return regularShopItems.value;
        default:
            return [];
    }
});

</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold">{{ gachaType === 'anime' ? '动画商店' : '角色商店' }}</h3>
        <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">知识点：</span>
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                {{ userStore.playerState.knowledgePoints.toLocaleString() }}
            </span>
        </div>
    </div>

    <!-- 商店标签导航 -->
    <div class="border-b border-gray-200 mb-4">
        <nav class="flex justify-center -mb-px">
            <button 
                @click="activeShopTab = 'current'" 
                :class="['shop-tab-btn', { 'active': activeShopTab === 'current' }]"
            >
                今日UP ({{ currentShopItems.length }})
            </button>
            <button 
                @click="activeShopTab = 'historical'" 
                :class="['shop-tab-btn', { 'active': activeShopTab === 'historical' }]"
            >
                历史UP ({{ historicalShopItems.length }})
            </button>
            <button 
                @click="activeShopTab = 'regular'" 
                :class="['shop-tab-btn', { 'active': activeShopTab === 'regular' }]"
            >
                常规商品 ({{ regularShopItems.length }})
            </button>
        </nav>
    </div>

    <!-- 错误提示 -->
    <div v-if="purchaseError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-red-600 text-sm">{{ purchaseError }}</p>
    </div>

    <div v-if="activeShopItems.length > 0" class="shop-grid-container overflow-x-auto pb-4">
      <!-- 卡牌类物品 -->
      <div v-for="item in activeShopItems.filter(i => i.type === 'card')" :key="item.id" class="border rounded-lg p-2 flex flex-col items-center shadow-sm w-40">
        <div class="w-full mb-2">
            <AnimeCard v-if="gachaType === 'anime' && item.card && isAnimeCard(item.card)" :anime="item.card" />
            <CharacterCard v-if="gachaType === 'character' && item.card && isCharacterCard(item.card)" :character="item.card" />
        </div>
        <div class="text-center w-full">
            <p class="font-semibold text-sm">{{ item.cost.toLocaleString() }} 知识点</p>
            <p v-if="item.description" class="text-xs text-gray-500 mb-1">{{ item.description }}</p>
            <button 
                @click="handlePurchase(item)"
                :disabled="isPurchasing === item.id || userStore.playerState.knowledgePoints < item.cost"
                :class="[
                  'mt-2 w-full font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-200',
                  isPurchasing === item.id || userStore.playerState.knowledgePoints < item.cost
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                ]"
            >
                <span v-if="isPurchasing === item.id" class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  购买中...
                </span>
                <span v-else-if="userStore.playerState.knowledgePoints < item.cost">
                  知识点不足
                </span>
                <span v-else>
                  购买
                </span>
            </button>
        </div>
      </div>

      <!-- 非卡牌类物品 -->
      <div v-for="item in activeShopItems.filter(i => i.type !== 'card')" :key="item.id" class="border rounded-lg p-3 flex flex-col items-center shadow-sm w-40">
        <div class="w-full mb-3 flex justify-center">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center text-2xl">
                {{ getItemIcon(item) }}
            </div>
        </div>
        <div class="text-center w-full">
            <h4 class="font-semibold text-sm mb-1">{{ item.name }}</h4>
            <p class="text-xs text-gray-500 mb-2">{{ item.description }}</p>
            <p v-if="item.quantity" class="text-xs text-blue-600 mb-1">数量: {{ item.quantity }}</p>
            <p v-if="item.dailyLimit" class="text-xs text-orange-600 mb-2">每日限购: {{ item.dailyLimit }}</p>
            <p class="font-semibold text-sm mb-2">{{ item.cost.toLocaleString() }} 知识点</p>
            <button 
                @click="handlePurchase(item)"
                :disabled="isPurchasing === item.id || userStore.playerState.knowledgePoints < item.cost"
                :class="[
                  'w-full font-semibold py-2 px-3 rounded-lg text-sm transition-all duration-200',
                  isPurchasing === item.id || userStore.playerState.knowledgePoints < item.cost
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : item.type === 'ticket' ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : item.type === 'currency' ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : item.type === 'booster' ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                ]"
            >
                <span v-if="isPurchasing === item.id" class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  购买中...
                </span>
                <span v-else-if="userStore.playerState.knowledgePoints < item.cost">
                  知识点不足
                </span>
                <span v-else>
                  购买
                </span>
            </button>
        </div>
      </div>
    </div>
    <div v-else class="text-center text-gray-500 py-8">
      <p>当前类别没有可兑换的物品。</p>
    </div>
  </div>
</template>

<style scoped>
.shop-grid-container {
  display: grid;
  grid-template-rows: repeat(2, 1fr);
  grid-auto-flow: column;
  gap: 1rem;
}

/* Custom scrollbar for webkit browsers */
.shop-grid-container::-webkit-scrollbar {
  height: 8px;
}
.shop-grid-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}
.shop-grid-container::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 10px;
}
.shop-grid-container::-webkit-scrollbar-thumb:hover {
  background: #475569;
}

/* 商店标签页样式 */
.shop-tab-btn {
    @apply py-3 px-4 block hover:text-blue-500 focus:outline-none text-gray-600 font-medium text-sm border-b-2 transition-colors duration-200;
    border-bottom-color: transparent;
}
.shop-tab-btn.active {
    @apply text-blue-600 border-b-blue-500;
}
.shop-tab-btn:hover:not(.active) {
    @apply text-blue-400;
}
</style>
