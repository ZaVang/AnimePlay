/**
 * Economy & Shop Store
 * Handles knowledge points, tickets, shop purchases, and card dismantling
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './authStore';
import { useCollectionStore } from './collectionStore';
import { useGameDataStore } from '../gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { type ShopItem } from '@/utils/gachaRotation';

export const useEconomyStore = defineStore('economy', () => {
  // --- STATE ---
  const animeGachaTickets = ref(GAME_CONFIG.playerInitialState.animeGachaTickets);
  const characterGachaTickets = ref(GAME_CONFIG.playerInitialState.characterGachaTickets);
  const knowledgePoints = ref(GAME_CONFIG.playerInitialState.knowledgePoints);
  const dailyPurchases = ref<{ date: string; purchases: Record<string, number> }>({
    date: new Date().toISOString().split('T')[0],
    purchases: {},
  });

  // --- ACTIONS ---
  function resetState() {
    animeGachaTickets.value = GAME_CONFIG.playerInitialState.animeGachaTickets;
    characterGachaTickets.value = GAME_CONFIG.playerInitialState.characterGachaTickets;
    knowledgePoints.value = GAME_CONFIG.playerInitialState.knowledgePoints;
    dailyPurchases.value = {
      date: new Date().toISOString().split('T')[0],
      purchases: {},
    };
  }

  function addRewards(rewards: { animeTickets?: number; characterTickets?: number; knowledge?: number }) {
    if (rewards.animeTickets) animeGachaTickets.value += rewards.animeTickets;
    if (rewards.characterTickets) characterGachaTickets.value += rewards.characterTickets;
    if (rewards.knowledge) knowledgePoints.value += rewards.knowledge;
  }

  function spendTickets(type: 'anime' | 'character', count: number) {
    if (type === 'anime') {
      animeGachaTickets.value -= count;
    } else {
      characterGachaTickets.value -= count;
    }
  }

  function purchaseFromShop(item: { Id: number; cost: number }, itemType: 'anime' | 'character') {
    const authStore = useAuthStore();
    const collectionStore = useCollectionStore();

    if (!authStore.isLoggedIn) {
      alert('请先登录！');
      return;
    }

    if (knowledgePoints.value < item.cost) {
      authStore.addLog('知识点不足，无法购买！', 'warning');
      return;
    }

    const gameDataStore = useGameDataStore();
    const card = itemType === 'anime'
      ? gameDataStore.getAnimeCardById(item.Id)
      : gameDataStore.getCharacterCardById(item.Id);

    if (!card) {
      authStore.addLog('购买失败，物品不存在。', 'warning');
      return;
    }

    knowledgePoints.value -= item.cost;

    const collection = itemType === 'anime' ? collectionStore.animeCollection : collectionStore.characterCollection;
    const existing = collection.get(item.Id);
    if (existing) {
      existing.count++;
    } else {
      collection.set(item.Id, { count: 1 });
    }

    authStore.addLog(`成功购买 [${card.rarity}] ${card.name}！`, 'success');
  }

  function purchaseShopItem(item: ShopItem) {
    const authStore = useAuthStore();

    if (!authStore.isLoggedIn) {
      alert('请先登录！');
      return Promise.reject(new Error('未登录'));
    }

    if (knowledgePoints.value < item.cost) {
      authStore.addLog('知识点不足，无法购买！', 'warning');
      return Promise.reject(new Error('知识点不足'));
    }

    // Check daily purchase limit
    if (item.dailyLimit) {
      const today = new Date().toISOString().split('T')[0];
      if (dailyPurchases.value.date !== today) {
        dailyPurchases.value = {
          date: today,
          purchases: {},
        };
      }

      const currentPurchases = dailyPurchases.value.purchases[item.id] || 0;
      if (currentPurchases >= item.dailyLimit) {
        authStore.addLog(`该商品每日限购${item.dailyLimit}个，今日已达上限！`, 'warning');
        return Promise.reject(new Error('已达每日购买限制'));
      }

      dailyPurchases.value.purchases[item.id] = currentPurchases + 1;
    }

    knowledgePoints.value -= item.cost;

    switch (item.type) {
      case 'ticket':
        if (item.id.includes('anime')) {
          animeGachaTickets.value += item.quantity || 1;
          authStore.addLog(`成功购买 ${item.name}！获得 ${item.quantity || 1} 张动画抽卡券`, 'success');
        } else if (item.id.includes('character')) {
          characterGachaTickets.value += item.quantity || 1;
          authStore.addLog(`成功购买 ${item.name}！获得 ${item.quantity || 1} 张角色抽卡券`, 'success');
        }
        break;

      case 'currency':
        knowledgePoints.value += item.quantity || 0;
        authStore.addLog(`成功购买 ${item.name}！获得 ${item.quantity || 0} 知识点`, 'success');
        break;

      case 'booster':
        const expAmount = item.quantity || 0;
        authStore.addExp(expAmount);
        authStore.addLog(`成功购买 ${item.name}！获得 ${expAmount} 经验值`, 'success');
        break;

      default:
        authStore.addLog(`成功购买 ${item.name}！`, 'success');
        break;
    }

    return Promise.resolve();
  }

  function getTodayPurchaseCount(itemId: string): number {
    try {
      if (!dailyPurchases.value) {
        dailyPurchases.value = {
          date: new Date().toISOString().split('T')[0],
          purchases: {},
        };
      }

      const today = new Date().toISOString().split('T')[0];
      if (dailyPurchases.value.date !== today) {
        return 0;
      }
      return dailyPurchases.value.purchases[itemId] || 0;
    } catch (error) {
      console.warn('Error getting today purchase count:', error);
      return 0;
    }
  }

  function canPurchaseItem(item: { id: string; cost: number; dailyLimit?: number }): { canPurchase: boolean; reason?: string } {
    try {
      if (knowledgePoints.value < item.cost) {
        return { canPurchase: false, reason: '知识点不足' };
      }

      if (item.dailyLimit) {
        const purchased = getTodayPurchaseCount(item.id);
        if (purchased >= item.dailyLimit) {
          return { canPurchase: false, reason: '今日已达购买上限' };
        }
      }

      return { canPurchase: true };
    } catch (error) {
      console.warn('Error checking purchase eligibility:', error);
      return { canPurchase: false, reason: '无法检查购买条件' };
    }
  }

  function dismantleCard(cardId: number, cardType: 'anime' | 'character') {
    const authStore = useAuthStore();
    const collectionStore = useCollectionStore();
    const collection = cardType === 'anime' ? collectionStore.animeCollection : collectionStore.characterCollection;
    const cardData = collection.get(cardId);

    if (!cardData || cardData.count <= 1) {
      authStore.addLog('分解失败：卡片不存在或只有一张。', 'warning');
      return;
    }

    const gameDataStore = useGameDataStore();
    const cardDetails = cardType === 'anime'
      ? gameDataStore.getAnimeCardById(cardId)
      : gameDataStore.getCharacterCardById(cardId);

    if (!cardDetails) return;

    const config = cardType === 'anime' ? GAME_CONFIG.animeSystem : GAME_CONFIG.characterSystem;
    const dismantleValue = config.rarityConfig[cardDetails.rarity]?.dismantleValue || 0;

    cardData.count--;
    knowledgePoints.value += dismantleValue;
    authStore.addLog(`成功分解 [${cardDetails.rarity}] ${cardDetails.name}，获得 ${dismantleValue} 知识点。`, 'success');
  }

  function dismantleAllDuplicates(cardType: 'anime' | 'character') {
    const authStore = useAuthStore();
    const collectionStore = useCollectionStore();
    const collection = cardType === 'anime' ? collectionStore.animeCollection : collectionStore.characterCollection;
    const gameDataStore = useGameDataStore();
    const config = cardType === 'anime' ? GAME_CONFIG.animeSystem : GAME_CONFIG.characterSystem;
    const getCardById = cardType === 'anime' ? gameDataStore.getAnimeCardById : gameDataStore.getCharacterCardById;

    let totalValue = 0;
    let dismantledCount = 0;

    for (const [cardId, cardData] of collection.entries()) {
      if (cardData.count > 1) {
        const cardDetails = getCardById(cardId);
        if (cardDetails) {
          const duplicates = cardData.count - 1;
          const valuePerCard = config.rarityConfig[cardDetails.rarity]?.dismantleValue || 0;
          totalValue += valuePerCard * duplicates;
          dismantledCount += duplicates;
          cardData.count = 1;
        }
      }
    }

    if (dismantledCount > 0) {
      knowledgePoints.value += totalValue;
      const typeText = cardType === 'anime' ? '动画' : '角色';
      authStore.addLog(`一键分解了 ${dismantledCount} 张重复${typeText}卡，获得 ${totalValue} 知识点。`, 'success');
    } else {
      authStore.addLog('没有可分解的重复卡片。', 'info');
    }
  }

  function loadFromPayload(payload: any) {
    animeGachaTickets.value = payload.animeGachaTickets || GAME_CONFIG.playerInitialState.animeGachaTickets;
    characterGachaTickets.value = payload.characterGachaTickets || GAME_CONFIG.playerInitialState.characterGachaTickets;
    knowledgePoints.value = payload.knowledgePoints || GAME_CONFIG.playerInitialState.knowledgePoints;

    const today = new Date().toISOString().split('T')[0];
    if (!payload.dailyPurchases || payload.dailyPurchases.date !== today) {
      dailyPurchases.value = {
        date: today,
        purchases: {},
      };
    } else {
      dailyPurchases.value = payload.dailyPurchases;
    }
  }

  function serializeForSave() {
    return {
      animeGachaTickets: animeGachaTickets.value,
      characterGachaTickets: characterGachaTickets.value,
      knowledgePoints: knowledgePoints.value,
      dailyPurchases: dailyPurchases.value,
    };
  }

  return {
    animeGachaTickets,
    characterGachaTickets,
    knowledgePoints,
    dailyPurchases,
    resetState,
    addRewards,
    spendTickets,
    purchaseFromShop,
    purchaseShopItem,
    getTodayPurchaseCount,
    canPurchaseItem,
    dismantleCard,
    dismantleAllDuplicates,
    loadFromPayload,
    serializeForSave,
  };
});
