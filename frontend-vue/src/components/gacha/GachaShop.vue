<script setup lang="ts">
import { computed } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useUserStore } from '@/stores/userStore';
import { GAME_CONFIG } from '@/config/gameConfig';
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

const shopItems = computed(() => {
  if (!shopConfig.value || shopConfig.value.items.length === 0) return [];
  
  const cardSource = props.gachaType === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
  
  return shopConfig.value.items.map(item => {
    const card = cardSource.find(c => c.id === item.Id);
    return {
      ...item,
      card: card,
    };
  }).filter(item => item.card);
});

function handlePurchase(item: any) {
    if(!item.card) return;
    const confirmPurchase = confirm(`确定要花费 ${item.cost.toLocaleString()} 知识点购买 [${item.card.rarity}] ${item.card.name} 吗？`);
    if (confirmPurchase) {
        userStore.purchaseFromShop(item, props.gachaType);
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

    <div v-if="shopItems.length > 0" class="shop-grid-container overflow-x-auto pb-4">
      <div v-for="item in shopItems" :key="item.Id" class="border rounded-lg p-2 flex flex-col items-center shadow-sm w-40">
        <div class="w-full mb-2">
            <AnimeCard v-if="gachaType === 'anime' && item.card" :anime="item.card" />
            <CharacterCard v-if="gachaType === 'character' && item.card" :character="item.card" />
        </div>
        <div class="text-center w-full">
            <p class="font-semibold text-sm">{{ item.cost.toLocaleString() }} 知识点</p>
            <button 
                @click="handlePurchase(item)"
                class="mt-2 w-full bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 text-sm"
            >
                购买
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
