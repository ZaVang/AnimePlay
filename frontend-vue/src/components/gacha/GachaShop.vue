<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useUserStore } from '@/stores/userStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { getCurrentUpShopItems, isAnimeCard, isCharacterCard } from '@/utils/gachaRotation';
import AnimeCard from '@/components/AnimeCard.vue';
import CharacterCard from '@/components/CharacterCard.vue';

const props = defineProps<{
  gachaType: 'anime' | 'character';
}>();

const gameDataStore = useGameDataStore();
const userStore = useUserStore();

const shopConfig = computed(() => {
  return props.gachaType === 'anime' ? GAME_CONFIG.animeSystem.shop : GAME_CONFIG.characterSystem.shop;
});

// 使用动态轮换的商店物品
const shopItems = computed(() => {
  const cardSource = props.gachaType === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
  
  // 如果没有加载卡片数据，返回空数组
  if (cardSource.length === 0) return [];
  
  try {
    const dynamicItems = getCurrentUpShopItems(props.gachaType);
    
    return dynamicItems.map(item => {
      const card = cardSource.find(c => c.id === item.Id);
      return {
        ...item,
        card: card,
      };
    }).filter(item => item.card);
  } catch (error) {
    console.warn('Failed to get shop items:', error);
    return [];
  }
});

// 购买状态和错误处理
const isPurchasing = ref<number | null>(null); // 记录正在购买的物品ID
const purchaseError = ref<string>('');

async function handlePurchase(item: any) {
    if (!item.card || isPurchasing.value !== null) return;
    
    const confirmPurchase = confirm(`确定要花费 ${item.cost.toLocaleString()} 知识点购买 [${item.card.rarity}] ${item.card.name} 吗？`);
    if (!confirmPurchase) return;
    
    // 检查知识点是否足够
    if (userStore.playerState.knowledgePoints < item.cost) {
        purchaseError.value = '知识点不足，无法购买此物品';
        setTimeout(() => { purchaseError.value = ''; }, 3000);
        return;
    }
    
    isPurchasing.value = item.Id;
    purchaseError.value = '';
    
    try {
        await userStore.purchaseFromShop(item, props.gachaType);
        // 如果没有错误抛出，说明购买成功
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

    <!-- 错误提示 -->
    <div v-if="purchaseError" class="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
        <p class="text-red-600 text-sm">{{ purchaseError }}</p>
    </div>

    <div v-if="shopItems.length > 0" class="shop-grid-container overflow-x-auto pb-4">
      <div v-for="item in shopItems" :key="item.Id" class="border rounded-lg p-2 flex flex-col items-center shadow-sm w-40">
        <div class="w-full mb-2">
            <AnimeCard v-if="gachaType === 'anime' && item.card && isAnimeCard(item.card)" :anime="item.card" />
            <CharacterCard v-if="gachaType === 'character' && item.card && isCharacterCard(item.card)" :character="item.card" />
        </div>
        <div class="text-center w-full">
            <p class="font-semibold text-sm">{{ item.cost.toLocaleString() }} 知识点</p>
            <button 
                @click="handlePurchase(item)"
                :disabled="isPurchasing === item.Id || userStore.playerState.knowledgePoints < item.cost"
                :class="[
                  'mt-2 w-full font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-200',
                  isPurchasing === item.Id || userStore.playerState.knowledgePoints < item.cost
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                ]"
            >
                <span v-if="isPurchasing === item.Id" class="flex items-center justify-center gap-2">
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
      <p>当前商店没有可兑换的物品。</p>
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
</style>
