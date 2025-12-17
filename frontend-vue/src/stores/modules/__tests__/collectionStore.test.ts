/**
 * CollectionStore Unit Tests
 * Tests for card collections, gacha system, and pity mechanics
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCollectionStore } from '../collectionStore';
import { useAuthStore } from '../authStore';
import { useEconomyStore } from '../economyStore';
import { useGachaStore } from '../../gachaStore';

describe('CollectionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());

    // Mock alert
    vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  describe('Initial State', () => {
    it('should initialize with empty collections', () => {
      const store = useCollectionStore();

      expect(store.animeCollection.size).toBe(0);
      expect(store.characterCollection.size).toBe(0);
      expect(store.favoriteAnime.size).toBe(0);
      expect(store.favoriteCharacters.size).toBe(0);
    });

    it('should initialize with empty gacha history', () => {
      const store = useCollectionStore();

      expect(store.animeGachaHistory).toEqual([]);
      expect(store.characterGachaHistory).toEqual([]);
    });

    it('should initialize pity states at zero', () => {
      const store = useCollectionStore();

      expect(store.animePityState).toEqual({
        totalPulls: 0,
        pullsSinceLastHR: 0,
        pullsSinceLastUR: 0,
      });
      expect(store.characterPityState).toEqual({
        totalPulls: 0,
        pullsSinceLastHR: 0,
        pullsSinceLastUR: 0,
      });
    });
  });

  describe('getAnimeCardCount & getCharacterCardCount', () => {
    it('should return 0 for cards not in collection', () => {
      const store = useCollectionStore();

      expect(store.getAnimeCardCount(1)).toBe(0);
      expect(store.getCharacterCardCount(1)).toBe(0);
    });

    it('should return correct count for cards in collection', () => {
      const store = useCollectionStore();

      store.animeCollection.set(1, { count: 5 });
      store.characterCollection.set(2, { count: 3 });

      expect(store.getAnimeCardCount(1)).toBe(5);
      expect(store.getCharacterCardCount(2)).toBe(3);
    });
  });

  describe('isFavorite', () => {
    it('should return false for non-favorite cards', () => {
      const store = useCollectionStore();

      expect(store.isFavorite(1, 'anime')).toBe(false);
      expect(store.isFavorite(1, 'character')).toBe(false);
    });

    it('should return true for favorite cards', () => {
      const store = useCollectionStore();

      store.favoriteAnime.add(1);
      store.favoriteCharacters.add(2);

      expect(store.isFavorite(1, 'anime')).toBe(true);
      expect(store.isFavorite(2, 'character')).toBe(true);
    });
  });

  describe('toggleFavorite', () => {
    it('should add card to favorites when not favorited', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useCollectionStore();
      store.toggleFavorite(1, 'anime');

      expect(store.favoriteAnime.has(1)).toBe(true);
    });

    it('should remove card from favorites when already favorited', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useCollectionStore();
      store.favoriteAnime.add(1);

      store.toggleFavorite(1, 'anime');

      expect(store.favoriteAnime.has(1)).toBe(false);
    });

    it('should not exceed 10 favorites limit', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useCollectionStore();

      // Add 10 favorites
      for (let i = 1; i <= 10; i++) {
        store.favoriteAnime.add(i);
      }

      // Try to add 11th favorite
      store.toggleFavorite(11, 'anime');

      expect(store.favoriteAnime.size).toBe(10);
      expect(store.favoriteAnime.has(11)).toBe(false);
    });

    it('should add log when toggling favorite', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useCollectionStore();
      store.toggleFavorite(1, 'anime');

      expect(authStore.logs.some(log => log.message.includes('喜爱'))).toBe(true);
    });
  });

  describe('drawCards', () => {
    it('should return null when not logged in', async () => {
      const store = useCollectionStore();
      const result = await store.drawCards('anime', 1);

      expect(result).toBeNull();
    });

    it('should return null when insufficient tickets', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const economyStore = useEconomyStore();
      economyStore.animeGachaTickets = 0;

      const store = useCollectionStore();
      const result = await store.drawCards('anime', 1);

      expect(result).toBeNull();
    });

    it('should successfully draw cards when logged in with tickets', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const economyStore = useEconomyStore();
      economyStore.animeGachaTickets = 10;

      const gachaStore = useGachaStore();
      vi.spyOn(gachaStore, 'performGachaLogic').mockReturnValue([
        { id: 1, name: 'Test Anime', rarity: 'SSR', points: 5 }
      ]);

      const store = useCollectionStore();
      const result = await store.drawCards('anime', 1);

      expect(result).toBeTruthy();
      expect(result).toHaveLength(1);
    });

    it('should spend tickets when drawing', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const economyStore = useEconomyStore();
      economyStore.animeGachaTickets = 10;
      const initialTickets = economyStore.animeGachaTickets;

      const gachaStore = useGachaStore();
      vi.spyOn(gachaStore, 'performGachaLogic').mockReturnValue([
        { id: 1, name: 'Test', rarity: 'R', points: 1 }
      ]);

      const store = useCollectionStore();
      await store.drawCards('anime', 3);

      expect(economyStore.animeGachaTickets).toBe(initialTickets - 3);
    });

    it('should mark new cards correctly', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const economyStore = useEconomyStore();
      economyStore.animeGachaTickets = 10;

      const gachaStore = useGachaStore();
      const mockCard = { id: 1, name: 'Test', rarity: 'SSR', points: 5 };
      vi.spyOn(gachaStore, 'performGachaLogic').mockReturnValue([mockCard]);

      const store = useCollectionStore();
      const result = await store.drawCards('anime', 1);

      expect(result![0].isNew).toBe(true);
      expect(result![0].isDuplicate).toBeUndefined();
    });

    it('should mark duplicate cards correctly', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const economyStore = useEconomyStore();
      economyStore.animeGachaTickets = 10;

      const store = useCollectionStore();
      store.animeCollection.set(1, { count: 1 });

      const gachaStore = useGachaStore();
      const mockCard = { id: 1, name: 'Test', rarity: 'R', points: 1 };
      vi.spyOn(gachaStore, 'performGachaLogic').mockReturnValue([mockCard]);

      const result = await store.drawCards('anime', 1);

      expect(result![0].isDuplicate).toBe(true);
      expect(result![0].isNew).toBeUndefined();
    });

    it('should update collection count for new cards', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const economyStore = useEconomyStore();
      economyStore.animeGachaTickets = 10;

      const gachaStore = useGachaStore();
      vi.spyOn(gachaStore, 'performGachaLogic').mockReturnValue([
        { id: 1, name: 'Test', rarity: 'R', points: 1 }
      ]);

      const store = useCollectionStore();
      await store.drawCards('anime', 1);

      expect(store.getAnimeCardCount(1)).toBe(1);
    });

    it('should increment count for duplicate cards', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const economyStore = useEconomyStore();
      economyStore.animeGachaTickets = 10;

      const store = useCollectionStore();
      store.animeCollection.set(1, { count: 2 });

      const gachaStore = useGachaStore();
      vi.spyOn(gachaStore, 'performGachaLogic').mockReturnValue([
        { id: 1, name: 'Test', rarity: 'R', points: 1 }
      ]);

      await store.drawCards('anime', 1);

      expect(store.getAnimeCardCount(1)).toBe(3);
    });

    it('should add gacha history', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const economyStore = useEconomyStore();
      economyStore.animeGachaTickets = 10;

      const gachaStore = useGachaStore();
      vi.spyOn(gachaStore, 'performGachaLogic').mockReturnValue([
        { id: 1, name: 'Test', rarity: 'SSR', points: 5 }
      ]);

      const store = useCollectionStore();
      await store.drawCards('anime', 1);

      expect(store.animeGachaHistory).toHaveLength(1);
      expect(store.animeGachaHistory[0]).toMatchObject({
        id: 1,
        rarity: 'SSR',
      });
      expect(store.animeGachaHistory[0].timestamp).toBeDefined();
    });

    it('should limit gacha history to 500 records', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const economyStore = useEconomyStore();
      economyStore.characterGachaTickets = 1000;

      const store = useCollectionStore();

      // Fill history with 500 records
      for (let i = 0; i < 500; i++) {
        store.characterGachaHistory.push({
          id: i,
          rarity: 'R',
          timestamp: Date.now(),
        });
      }

      const gachaStore = useGachaStore();
      vi.spyOn(gachaStore, 'performGachaLogic').mockReturnValue([
        { id: 501, name: 'New', rarity: 'R', points: 1 }
      ]);

      await store.drawCards('character', 1);

      expect(store.characterGachaHistory).toHaveLength(500);
      expect(store.characterGachaHistory[0].id).not.toBe(0); // First item should be removed
    });

    it('should award experience for drawing', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');
      const initialExp = authStore.exp;

      const economyStore = useEconomyStore();
      economyStore.animeGachaTickets = 10;

      const gachaStore = useGachaStore();
      vi.spyOn(gachaStore, 'performGachaLogic').mockReturnValue([
        { id: 1, name: 'Test', rarity: 'R', points: 1 }
      ]);

      const store = useCollectionStore();
      await store.drawCards('anime', 1);

      expect(authStore.exp).toBeGreaterThan(initialExp);
    });
  });

  describe('resetState', () => {
    it('should reset all collections', async () => {
      const store = useCollectionStore();

      store.animeCollection.set(1, { count: 5 });
      store.characterCollection.set(2, { count: 3 });
      store.favoriteAnime.add(1);
      store.favoriteCharacters.add(2);

      store.resetState();

      expect(store.animeCollection.size).toBe(0);
      expect(store.characterCollection.size).toBe(0);
      expect(store.favoriteAnime.size).toBe(0);
      expect(store.favoriteCharacters.size).toBe(0);
    });

    it('should reset gacha history', () => {
      const store = useCollectionStore();

      store.animeGachaHistory.push({ id: 1, rarity: 'R', timestamp: Date.now() });
      store.characterGachaHistory.push({ id: 2, rarity: 'SR', timestamp: Date.now() });

      store.resetState();

      expect(store.animeGachaHistory).toEqual([]);
      expect(store.characterGachaHistory).toEqual([]);
    });

    it('should reset pity states', () => {
      const store = useCollectionStore();

      store.animePityState = { totalPulls: 50, pullsSinceLastHR: 10, pullsSinceLastUR: 25 };
      store.characterPityState = { totalPulls: 30, pullsSinceLastHR: 5, pullsSinceLastUR: 15 };

      store.resetState();

      expect(store.animePityState).toEqual({
        totalPulls: 0,
        pullsSinceLastHR: 0,
        pullsSinceLastUR: 0,
      });
      expect(store.characterPityState).toEqual({
        totalPulls: 0,
        pullsSinceLastHR: 0,
        pullsSinceLastUR: 0,
      });
    });
  });

  describe('serializeForSave & loadFromPayload', () => {
    it('should serialize all state correctly', () => {
      const store = useCollectionStore();

      store.animeCollection.set(1, { count: 5 });
      store.characterCollection.set(2, { count: 3 });
      store.favoriteAnime.add(1);
      store.favoriteCharacters.add(2);
      store.animePityState = { totalPulls: 10, pullsSinceLastHR: 5, pullsSinceLastUR: 8 };
      store.animeGachaHistory.push({ id: 1, rarity: 'SSR', timestamp: 123456 });

      const serialized = store.serializeForSave();

      expect(serialized.animeCollection).toEqual([[1, { count: 5 }]]);
      expect(serialized.characterCollection).toEqual([[2, { count: 3 }]]);
      expect(serialized.favoriteAnime).toEqual([1]);
      expect(serialized.favoriteCharacters).toEqual([2]);
      expect(serialized.animePity).toEqual({ totalPulls: 10, pullsSinceLastHR: 5, pullsSinceLastUR: 8 });
      expect(serialized.animeHistory).toHaveLength(1);
    });

    it('should load state from payload correctly', () => {
      const store = useCollectionStore();

      const payload = {
        animeCollection: [[1, { count: 5 }]],
        characterCollection: [[2, { count: 3 }]],
        favoriteAnime: [1],
        favoriteCharacters: [2],
        animePity: { totalPulls: 10, pullsSinceLastHR: 5, pullsSinceLastUR: 8 },
        characterPity: { totalPulls: 20, pullsSinceLastHR: 3, pullsSinceLastUR: 10 },
        animeHistory: [{ id: 1, rarity: 'SSR', timestamp: 123456 }],
        characterHistory: [{ id: 2, rarity: 'HR', timestamp: 789012 }],
      };

      store.loadFromPayload(payload);

      expect(store.getAnimeCardCount(1)).toBe(5);
      expect(store.getCharacterCardCount(2)).toBe(3);
      expect(store.favoriteAnime.has(1)).toBe(true);
      expect(store.favoriteCharacters.has(2)).toBe(true);
      expect(store.animePityState).toEqual(payload.animePity);
      expect(store.characterPityState).toEqual(payload.characterPity);
      expect(store.animeGachaHistory).toHaveLength(1);
      expect(store.characterGachaHistory).toHaveLength(1);
    });

    it('should handle legacy collection format (number instead of object)', () => {
      const store = useCollectionStore();

      const legacyPayload = {
        animeCollection: [[1, 5]], // Old format: just number
        characterCollection: [[2, 3]],
      };

      store.loadFromPayload(legacyPayload);

      expect(store.getAnimeCardCount(1)).toBe(5);
      expect(store.getCharacterCardCount(2)).toBe(3);
    });

    it('should handle missing UR pity fields in legacy data', () => {
      const store = useCollectionStore();

      const legacyPayload = {
        animePity: { totalPulls: 10, pullsSinceLastHR: 5 }, // Missing pullsSinceLastUR
        characterPity: { totalPulls: 20, pullsSinceLastHR: 3 },
      };

      store.loadFromPayload(legacyPayload);

      expect(store.animePityState.pullsSinceLastUR).toBe(0);
      expect(store.characterPityState.pullsSinceLastUR).toBe(0);
    });

    it('should limit loaded history to 500 records', () => {
      const store = useCollectionStore();

      const largeHistory = Array.from({ length: 600 }, (_, i) => ({
        id: i,
        rarity: 'R',
        timestamp: Date.now(),
      }));

      const payload = {
        animeHistory: largeHistory,
      };

      store.loadFromPayload(payload);

      expect(store.animeGachaHistory).toHaveLength(500);
      expect(store.animeGachaHistory[0].id).toBe(100); // First 100 should be trimmed
    });
  });
});
