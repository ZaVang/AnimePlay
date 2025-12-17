/**
 * EconomyStore Unit Tests
 * Tests for tickets, knowledge points, shop purchases, and card dismantling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useEconomyStore } from '../economyStore';
import { useAuthStore } from '../authStore';
import { useCollectionStore } from '../collectionStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';

describe('EconomyStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    // Mock alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  describe('Initial State', () => {
    it('should initialize with config values', () => {
      const store = useEconomyStore();

      expect(store.animeGachaTickets).toBe(GAME_CONFIG.playerInitialState.animeGachaTickets);
      expect(store.characterGachaTickets).toBe(GAME_CONFIG.playerInitialState.characterGachaTickets);
      expect(store.knowledgePoints).toBe(GAME_CONFIG.playerInitialState.knowledgePoints);
    });

    it('should initialize dailyPurchases with today', () => {
      const store = useEconomyStore();
      const today = new Date().toISOString().split('T')[0];

      expect(store.dailyPurchases.date).toBe(today);
      expect(store.dailyPurchases.purchases).toEqual({});
    });
  });

  describe('addRewards', () => {
    it('should add anime tickets', () => {
      const store = useEconomyStore();
      const initial = store.animeGachaTickets;

      store.addRewards({ animeTickets: 5 });

      expect(store.animeGachaTickets).toBe(initial + 5);
    });

    it('should add character tickets', () => {
      const store = useEconomyStore();
      const initial = store.characterGachaTickets;

      store.addRewards({ characterTickets: 3 });

      expect(store.characterGachaTickets).toBe(initial + 3);
    });

    it('should add knowledge points', () => {
      const store = useEconomyStore();
      const initial = store.knowledgePoints;

      store.addRewards({ knowledge: 100 });

      expect(store.knowledgePoints).toBe(initial + 100);
    });

    it('should add multiple rewards at once', () => {
      const store = useEconomyStore();
      const initialAnime = store.animeGachaTickets;
      const initialCharacter = store.characterGachaTickets;
      const initialKnowledge = store.knowledgePoints;

      store.addRewards({
        animeTickets: 5,
        characterTickets: 3,
        knowledge: 100,
      });

      expect(store.animeGachaTickets).toBe(initialAnime + 5);
      expect(store.characterGachaTickets).toBe(initialCharacter + 3);
      expect(store.knowledgePoints).toBe(initialKnowledge + 100);
    });
  });

  describe('spendTickets', () => {
    it('should spend anime tickets', () => {
      const store = useEconomyStore();
      const initial = store.animeGachaTickets;

      store.spendTickets('anime', 3);

      expect(store.animeGachaTickets).toBe(initial - 3);
    });

    it('should spend character tickets', () => {
      const store = useEconomyStore();
      const initial = store.characterGachaTickets;

      store.spendTickets('character', 2);

      expect(store.characterGachaTickets).toBe(initial - 2);
    });
  });

  describe('purchaseShopItem', () => {
    it('should reject when not logged in', async () => {
      const store = useEconomyStore();
      const mockItem = {
        id: 'test-item',
        name: 'Test Item',
        cost: 100,
        type: 'ticket' as const,
        quantity: 1,
      };

      await expect(store.purchaseShopItem(mockItem)).rejects.toThrow('未登录');
    });

    it('should reject when insufficient knowledge points', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useEconomyStore();
      store.knowledgePoints = 50;

      const mockItem = {
        id: 'test-item',
        name: 'Test Item',
        cost: 100,
        type: 'ticket' as const,
        quantity: 1,
      };

      await expect(store.purchaseShopItem(mockItem)).rejects.toThrow('知识点不足');
    });

    it('should successfully purchase ticket item', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useEconomyStore();
      store.knowledgePoints = 200;
      const initialTickets = store.animeGachaTickets;

      const mockItem = {
        id: 'anime-ticket-1',
        name: 'Anime Ticket',
        cost: 100,
        type: 'ticket' as const,
        quantity: 5,
      };

      await store.purchaseShopItem(mockItem);

      expect(store.knowledgePoints).toBe(100);
      expect(store.animeGachaTickets).toBe(initialTickets + 5);
    });

    it('should successfully purchase currency item', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useEconomyStore();
      store.knowledgePoints = 200;

      const mockItem = {
        id: 'knowledge-pack',
        name: 'Knowledge Pack',
        cost: 50,
        type: 'currency' as const,
        quantity: 100,
      };

      await store.purchaseShopItem(mockItem);

      expect(store.knowledgePoints).toBe(250); // 200 - 50 + 100
    });

    it('should successfully purchase booster item', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useEconomyStore();
      store.knowledgePoints = 200;

      const mockItem = {
        id: 'exp-booster',
        name: 'EXP Booster',
        cost: 50,
        type: 'booster' as const,
        quantity: 500,
      };

      await store.purchaseShopItem(mockItem);

      expect(store.knowledgePoints).toBe(150);
      // AuthStore addExp is called with 500, which should add to the exp
      expect(authStore.logs.some(log => log.message.includes('500'))).toBe(true);
    });

    it('should respect daily purchase limit', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useEconomyStore();
      store.knowledgePoints = 1000;

      const mockItem = {
        id: 'limited-item',
        name: 'Limited Item',
        cost: 50,
        type: 'ticket' as const,
        quantity: 1,
        dailyLimit: 2,
      };

      // First purchase should succeed
      await store.purchaseShopItem(mockItem);
      expect(store.getTodayPurchaseCount('limited-item')).toBe(1);

      // Second purchase should succeed
      await store.purchaseShopItem(mockItem);
      expect(store.getTodayPurchaseCount('limited-item')).toBe(2);

      // Third purchase should fail
      await expect(store.purchaseShopItem(mockItem)).rejects.toThrow('已达每日购买限制');
    });

    it('should reset daily purchases on new day', () => {
      const store = useEconomyStore();

      // Set purchases for yesterday
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      store.dailyPurchases = {
        date: yesterday,
        purchases: { 'item-1': 5 },
      };

      // Check count for today (should be 0)
      expect(store.getTodayPurchaseCount('item-1')).toBe(0);
    });
  });

  describe('canPurchaseItem', () => {
    it('should return false when insufficient knowledge points', () => {
      const store = useEconomyStore();
      store.knowledgePoints = 50;

      const result = store.canPurchaseItem({
        id: 'item-1',
        cost: 100,
      });

      expect(result.canPurchase).toBe(false);
      expect(result.reason).toBe('知识点不足');
    });

    it('should return false when daily limit reached', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useEconomyStore();
      store.knowledgePoints = 1000;

      const mockItem = {
        id: 'limited-item',
        name: 'Limited',
        cost: 50,
        type: 'ticket' as const,
        quantity: 1,
        dailyLimit: 1,
      };

      // Purchase once
      await store.purchaseShopItem(mockItem);

      // Check if can purchase again
      const result = store.canPurchaseItem(mockItem);

      expect(result.canPurchase).toBe(false);
      expect(result.reason).toBe('今日已达购买上限');
    });

    it('should return true when eligible to purchase', () => {
      const store = useEconomyStore();
      store.knowledgePoints = 200;

      const result = store.canPurchaseItem({
        id: 'item-1',
        cost: 100,
      });

      expect(result.canPurchase).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('dismantleCard', () => {
    it('should not dismantle when card does not exist', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useEconomyStore();
      const initialKnowledge = store.knowledgePoints;

      store.dismantleCard(999, 'anime');

      expect(store.knowledgePoints).toBe(initialKnowledge);
    });

    it('should not dismantle when only one copy exists', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const collectionStore = useCollectionStore();
      const gameDataStore = useGameDataStore();

      // Add card to game data
      gameDataStore.allAnimeCards = [{ id: 1, name: 'Test Anime', rarity: 'SSR', points: 5 }];
      collectionStore.animeCollection.set(1, { count: 1 });

      const store = useEconomyStore();
      const initialKnowledge = store.knowledgePoints;

      store.dismantleCard(1, 'anime');

      expect(store.knowledgePoints).toBe(initialKnowledge);
      expect(collectionStore.getAnimeCardCount(1)).toBe(1);
    });

    it('should successfully dismantle duplicate card', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const collectionStore = useCollectionStore();
      const gameDataStore = useGameDataStore();

      // Add card to game data
      gameDataStore.allAnimeCards = [{ id: 1, name: 'Test Anime', rarity: 'SSR', points: 5 }];
      collectionStore.animeCollection.set(1, { count: 3 });

      const store = useEconomyStore();
      const initialKnowledge = store.knowledgePoints;

      store.dismantleCard(1, 'anime');

      expect(collectionStore.getAnimeCardCount(1)).toBe(2);
      expect(store.knowledgePoints).toBeGreaterThan(initialKnowledge);
    });
  });

  describe('dismantleAllDuplicates', () => {
    it('should dismantle all duplicates at once', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const collectionStore = useCollectionStore();
      const gameDataStore = useGameDataStore();

      // Add cards to game data
      gameDataStore.allAnimeCards = [
        { id: 1, name: 'Test Anime 1', rarity: 'SSR', points: 5 },
        { id: 2, name: 'Test Anime 2', rarity: 'SR', points: 3 },
        { id: 3, name: 'Test Anime 3', rarity: 'R', points: 1 },
      ];
      collectionStore.animeCollection.set(1, { count: 5 });
      collectionStore.animeCollection.set(2, { count: 3 });
      collectionStore.animeCollection.set(3, { count: 1 }); // No duplicate

      const store = useEconomyStore();
      const initialKnowledge = store.knowledgePoints;

      store.dismantleAllDuplicates('anime');

      // Should keep 1 copy of each
      expect(collectionStore.getAnimeCardCount(1)).toBe(1);
      expect(collectionStore.getAnimeCardCount(2)).toBe(1);
      expect(collectionStore.getAnimeCardCount(3)).toBe(1);

      // Should gain knowledge points
      expect(store.knowledgePoints).toBeGreaterThan(initialKnowledge);
    });

    it('should do nothing when no duplicates exist', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const collectionStore = useCollectionStore();
      collectionStore.animeCollection.set(1, { count: 1 });
      collectionStore.animeCollection.set(2, { count: 1 });

      const store = useEconomyStore();
      const initialKnowledge = store.knowledgePoints;

      store.dismantleAllDuplicates('anime');

      expect(store.knowledgePoints).toBe(initialKnowledge);
    });
  });

  describe('resetState', () => {
    it('should reset all values to initial state', () => {
      const store = useEconomyStore();

      store.animeGachaTickets = 100;
      store.characterGachaTickets = 200;
      store.knowledgePoints = 5000;

      store.resetState();

      expect(store.animeGachaTickets).toBe(GAME_CONFIG.playerInitialState.animeGachaTickets);
      expect(store.characterGachaTickets).toBe(GAME_CONFIG.playerInitialState.characterGachaTickets);
      expect(store.knowledgePoints).toBe(GAME_CONFIG.playerInitialState.knowledgePoints);
    });

    it('should reset daily purchases', () => {
      const store = useEconomyStore();
      const today = new Date().toISOString().split('T')[0];

      store.dailyPurchases = {
        date: '2020-01-01',
        purchases: { 'item-1': 5 },
      };

      store.resetState();

      expect(store.dailyPurchases.date).toBe(today);
      expect(store.dailyPurchases.purchases).toEqual({});
    });
  });

  describe('serializeForSave & loadFromPayload', () => {
    it('should serialize all state correctly', () => {
      const store = useEconomyStore();

      store.animeGachaTickets = 50;
      store.characterGachaTickets = 30;
      store.knowledgePoints = 2000;
      store.dailyPurchases = {
        date: '2025-01-01',
        purchases: { 'item-1': 2 },
      };

      const serialized = store.serializeForSave();

      expect(serialized).toEqual({
        animeGachaTickets: 50,
        characterGachaTickets: 30,
        knowledgePoints: 2000,
        dailyPurchases: {
          date: '2025-01-01',
          purchases: { 'item-1': 2 },
        },
      });
    });

    it('should load state from payload correctly', () => {
      const store = useEconomyStore();
      const today = new Date().toISOString().split('T')[0];

      const payload = {
        animeGachaTickets: 75,
        characterGachaTickets: 45,
        knowledgePoints: 3500,
        dailyPurchases: {
          date: today,
          purchases: { 'item-1': 3 },
        },
      };

      store.loadFromPayload(payload);

      expect(store.animeGachaTickets).toBe(75);
      expect(store.characterGachaTickets).toBe(45);
      expect(store.knowledgePoints).toBe(3500);
      expect(store.dailyPurchases).toEqual(payload.dailyPurchases);
    });

    it('should reset daily purchases when loading old date', () => {
      const store = useEconomyStore();
      const today = new Date().toISOString().split('T')[0];

      const payload = {
        dailyPurchases: {
          date: '2020-01-01', // Old date
          purchases: { 'item-1': 5 },
        },
      };

      store.loadFromPayload(payload);

      expect(store.dailyPurchases.date).toBe(today);
      expect(store.dailyPurchases.purchases).toEqual({});
    });

    it('should use default values for missing fields', () => {
      const store = useEconomyStore();

      store.loadFromPayload({});

      expect(store.animeGachaTickets).toBe(GAME_CONFIG.playerInitialState.animeGachaTickets);
      expect(store.characterGachaTickets).toBe(GAME_CONFIG.playerInitialState.characterGachaTickets);
      expect(store.knowledgePoints).toBe(GAME_CONFIG.playerInitialState.knowledgePoints);
    });
  });
});
