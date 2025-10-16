/**
 * DeckStore Unit Tests
 * Tests for deck saving, loading, and deletion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDeckStore, type Deck } from '../deckStore';
import { useAuthStore } from '../authStore';

describe('DeckStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('Initial State', () => {
    it('should initialize with empty decks', () => {
      const store = useDeckStore();

      expect(store.savedDecks).toEqual({});
    });
  });

  describe('saveDeck', () => {
    it('should not save deck when not logged in', async () => {
      const store = useDeckStore();
      const mockDeck: Deck = {
        name: 'Test Deck',
        anime: [1, 2, 3],
        character: [10, 11],
        cover: { id: 1, type: 'anime' },
        createdAt: new Date().toISOString(),
        version: 1,
      };

      await store.saveDeck(mockDeck);

      expect(store.savedDecks).toEqual({});
    });

    it('should save deck when logged in', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useDeckStore();
      const mockDeck: Deck = {
        name: 'Test Deck',
        anime: [1, 2, 3],
        character: [10, 11],
        cover: { id: 1, type: 'anime' },
        createdAt: new Date().toISOString(),
        version: 1,
      };

      await store.saveDeck(mockDeck);

      expect(store.savedDecks['Test Deck']).toEqual(mockDeck);
      expect(authStore.logs.some(log => log.message.includes('Test Deck'))).toBe(true);
    });

    it('should overwrite existing deck with same name', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useDeckStore();
      const firstDeck: Deck = {
        name: 'My Deck',
        anime: [1, 2],
        character: [10],
        cover: null,
        createdAt: '2025-01-01',
        version: 1,
      };

      const updatedDeck: Deck = {
        name: 'My Deck',
        anime: [3, 4, 5],
        character: [11, 12],
        cover: { id: 3, type: 'anime' },
        createdAt: '2025-01-02',
        version: 2,
      };

      await store.saveDeck(firstDeck);
      expect(store.savedDecks['My Deck'].anime).toEqual([1, 2]);

      await store.saveDeck(updatedDeck);
      expect(store.savedDecks['My Deck'].anime).toEqual([3, 4, 5]);
      expect(store.savedDecks['My Deck'].version).toBe(2);
    });

    it('should save multiple decks with different names', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useDeckStore();
      const deck1: Deck = {
        name: 'Deck 1',
        anime: [1],
        character: [10],
        cover: null,
        createdAt: new Date().toISOString(),
        version: 1,
      };

      const deck2: Deck = {
        name: 'Deck 2',
        anime: [2],
        character: [11],
        cover: null,
        createdAt: new Date().toISOString(),
        version: 1,
      };

      await store.saveDeck(deck1);
      await store.saveDeck(deck2);

      expect(Object.keys(store.savedDecks)).toHaveLength(2);
      expect(store.savedDecks['Deck 1']).toEqual(deck1);
      expect(store.savedDecks['Deck 2']).toEqual(deck2);
    });
  });

  describe('deleteDeck', () => {
    it('should not delete when not logged in', async () => {
      const store = useDeckStore();

      // Manually add a deck to test deletion
      store.savedDecks['Test'] = {
        name: 'Test',
        anime: [1],
        character: [10],
        cover: null,
        createdAt: new Date().toISOString(),
        version: 1,
      };

      await store.deleteDeck('Test');

      // Should still exist since not logged in
      expect(store.savedDecks['Test']).toBeDefined();
    });

    it('should delete existing deck when logged in', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useDeckStore();
      const mockDeck: Deck = {
        name: 'To Delete',
        anime: [1, 2],
        character: [10],
        cover: null,
        createdAt: new Date().toISOString(),
        version: 1,
      };

      await store.saveDeck(mockDeck);
      expect(store.savedDecks['To Delete']).toBeDefined();

      await store.deleteDeck('To Delete');
      expect(store.savedDecks['To Delete']).toBeUndefined();
      expect(authStore.logs.some(log => log.message.includes('To Delete') && log.message.includes('删除'))).toBe(true);
    });

    it('should do nothing when deleting non-existent deck', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useDeckStore();
      const initialLogsCount = authStore.logs.length;

      await store.deleteDeck('Non Existent');

      // Should not crash or add log
      expect(authStore.logs.length).toBe(initialLogsCount);
    });
  });

  describe('resetState', () => {
    it('should reset all decks to empty', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useDeckStore();
      const deck1: Deck = {
        name: 'Deck 1',
        anime: [1],
        character: [10],
        cover: null,
        createdAt: new Date().toISOString(),
        version: 1,
      };

      const deck2: Deck = {
        name: 'Deck 2',
        anime: [2],
        character: [11],
        cover: null,
        createdAt: new Date().toISOString(),
        version: 1,
      };

      await store.saveDeck(deck1);
      await store.saveDeck(deck2);
      expect(Object.keys(store.savedDecks)).toHaveLength(2);

      store.resetState();

      expect(store.savedDecks).toEqual({});
    });
  });

  describe('serializeForSave & loadFromPayload', () => {
    it('should serialize all decks correctly', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useDeckStore();
      const mockDeck: Deck = {
        name: 'Save Test',
        anime: [1, 2, 3],
        character: [10, 11],
        cover: { id: 2, type: 'character' },
        createdAt: '2025-01-01',
        version: 1,
      };

      await store.saveDeck(mockDeck);

      const serialized = store.serializeForSave();

      expect(serialized).toEqual({
        savedDecks: {
          'Save Test': mockDeck,
        },
      });
    });

    it('should load decks from payload correctly', () => {
      const store = useDeckStore();
      const payload = {
        savedDecks: {
          'Deck A': {
            name: 'Deck A',
            anime: [1, 2],
            character: [10],
            cover: null,
            createdAt: '2025-01-01',
            version: 1,
          },
          'Deck B': {
            name: 'Deck B',
            anime: [3],
            character: [11, 12],
            cover: { id: 3, type: 'anime' },
            createdAt: '2025-01-02',
            version: 1,
          },
        },
      };

      store.loadFromPayload(payload);

      expect(store.savedDecks).toEqual(payload.savedDecks);
      expect(Object.keys(store.savedDecks)).toHaveLength(2);
    });

    it('should use empty object when loading empty payload', () => {
      const store = useDeckStore();

      store.loadFromPayload({});

      expect(store.savedDecks).toEqual({});
    });

    it('should handle payload with undefined savedDecks', () => {
      const store = useDeckStore();

      store.loadFromPayload({ savedDecks: undefined });

      expect(store.savedDecks).toEqual({});
    });
  });

  describe('Deck Structure', () => {
    it('should preserve all deck properties', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useDeckStore();
      const completeDeck: Deck = {
        name: 'Complete Deck',
        anime: [1, 2, 3, 4, 5],
        character: [10, 11, 12, 13, 14],
        cover: { id: 3, type: 'character' },
        createdAt: '2025-10-11T12:00:00.000Z',
        version: 5,
      };

      await store.saveDeck(completeDeck);

      const saved = store.savedDecks['Complete Deck'];
      expect(saved.name).toBe('Complete Deck');
      expect(saved.anime).toEqual([1, 2, 3, 4, 5]);
      expect(saved.character).toEqual([10, 11, 12, 13, 14]);
      expect(saved.cover).toEqual({ id: 3, type: 'character' });
      expect(saved.createdAt).toBe('2025-10-11T12:00:00.000Z');
      expect(saved.version).toBe(5);
    });

    it('should handle deck with null cover', async () => {
      const authStore = useAuthStore();
      await authStore.login('testuser');

      const store = useDeckStore();
      const deckNoCover: Deck = {
        name: 'No Cover',
        anime: [1],
        character: [10],
        cover: null,
        createdAt: new Date().toISOString(),
        version: 1,
      };

      await store.saveDeck(deckNoCover);

      expect(store.savedDecks['No Cover'].cover).toBeNull();
    });
  });
});
