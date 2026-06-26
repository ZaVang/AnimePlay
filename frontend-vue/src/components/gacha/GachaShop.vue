<script setup lang="ts">
import { computed, ref } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { getRegularShopItems, type ShopItem } from '@/utils/gachaRotation';
import { useDialog } from '@/composables/useDialog';

const props = defineProps<{
  gachaType: 'anime' | 'character';
}>();

const userStore = useUserStore();
const { confirm } = useDialog();

// 商店物品（非卡牌：抽卡券 / 经验药水 / 知识点包）。
// 知识点→卡牌已统一收口到「图鉴定向解锁」，商店不再直购卡牌。
const shopItems = computed(() => getRegularShopItems(props.gachaType));

// 购买状态和错误处理
const isPurchasing = ref<string | null>(null);
const purchaseError = ref<string>('');

async function handlePurchase(item: ShopItem) {
    if (isPurchasing.value !== null) return;

    let confirmMessage = `确定要花费 ${item.cost.toLocaleString()} 知识点购买 ${item.name} 吗？`;
    if (item.description) {
        confirmMessage += `\n${item.description}`;
    }
    if (!await confirm(confirmMessage, { confirmText: '购买' })) return;

    // 检查知识点是否足够
    if (userStore.playerState.knowledgePoints < item.cost) {
        purchaseError.value = '知识点不足，无法购买此物品';
        setTimeout(() => { purchaseError.value = ''; }, 3000);
        return;
    }

    isPurchasing.value = item.id;
    purchaseError.value = '';

    try {
        await userStore.purchaseShopItem(item);
        purchaseError.value = '';
    } catch {
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
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-2">
        <h3 class="text-lg font-semibold">{{ gachaType === 'anime' ? '动画商店' : '角色商店' }}</h3>
        <div class="flex items-center gap-2">
            <span class="text-sm text-ink-2">知识点：</span>
            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                {{ userStore.playerState.knowledgePoints.toLocaleString() }}
            </span>
        </div>
    </div>

    <!-- 知识点换卡指引：统一走图鉴定向解锁 -->
    <p class="text-xs text-ink-2 mb-4">
        💡 想用知识点直接获得某张卡？前往「卡牌收藏 → 图鉴」，点击灰位卡即可定向解锁。
    </p>

    <!-- 错误提示 -->
    <div v-if="purchaseError" class="mb-4 p-3 bg-danger/10 border border-danger/30 rounded-lg">
        <p class="text-danger text-sm">{{ purchaseError }}</p>
    </div>

    <div v-if="shopItems.length > 0" class="shop-grid-container overflow-x-auto pb-4">
      <div v-for="item in shopItems" :key="item.id" class="border rounded-lg p-3 flex flex-col items-center shadow-sm w-40">
        <div class="w-full mb-3 flex justify-center">
            <div class="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center text-2xl">
                {{ getItemIcon(item) }}
            </div>
        </div>
        <div class="text-center w-full">
            <h4 class="font-semibold text-sm mb-1">{{ item.name }}</h4>
            <p class="text-xs text-ink-2 mb-2">{{ item.description }}</p>
            <p v-if="item.quantity" class="text-xs text-blue-600 mb-1">数量: {{ item.quantity }}</p>
            <p v-if="item.dailyLimit" class="text-xs text-warning mb-2">
              每日限购 {{ item.dailyLimit }} · 今日剩余 {{ userStore.shopRemainingToday(item.id, item.dailyLimit) }}
            </p>
            <p class="font-semibold text-sm mb-2">{{ item.cost.toLocaleString() }} 知识点</p>
            <button
                @click="handlePurchase(item)"
                :disabled="isPurchasing === item.id || userStore.playerState.knowledgePoints < item.cost || userStore.shopRemainingToday(item.id, item.dailyLimit) <= 0"
                :class="[
                  'w-full font-semibold py-2 px-3 rounded-lg text-sm transition-all duration-200',
                  isPurchasing === item.id || userStore.playerState.knowledgePoints < item.cost || userStore.shopRemainingToday(item.id, item.dailyLimit) <= 0
                    ? 'bg-surface-2 text-ink-2 cursor-not-allowed'
                    : item.type === 'ticket' ? 'bg-accent text-on-accent hover:bg-accent-strong'
                    : item.type === 'currency' ? 'bg-amber-600 text-white hover:bg-amber-700'
                    : item.type === 'booster' ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-accent text-on-accent hover:bg-accent-strong'
                ]"
            >
                <span v-if="isPurchasing === item.id" class="flex items-center justify-center gap-2">
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  购买中...
                </span>
                <span v-else-if="userStore.shopRemainingToday(item.id, item.dailyLimit) <= 0">
                  今日已售罄
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
    <div v-else class="text-center text-ink-2 py-8">
      <p>当前没有可兑换的商品。</p>
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
  background: rgb(var(--c-surface-2));
  border-radius: 10px;
}
.shop-grid-container::-webkit-scrollbar-thumb {
  background: rgb(var(--c-line-2));
  border-radius: 10px;
}
.shop-grid-container::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--c-ink-3));
}
</style>
