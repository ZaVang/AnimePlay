import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDeckEditor } from '../../../composables/useDeckEditor';

// Mock the deckStore to avoid complexity during logic tests
vi.mock('@/stores/modules/deckStore', () => ({
  useDeckStore: vi.fn(() => ({
    savedDecks: {},
    saveDeck: vi.fn(),
    deleteDeck: vi.fn()
  }))
}));

// Mock authStore to pass login check
vi.mock('@/stores/modules/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    isLoggedIn: true,
    addLog: vi.fn()
  }))
}));

describe('DeckEditor Core Logic (TDD)', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should respect anime card limits (30)', () => {
    const { currentDeck, addToDeck } = useDeckEditor();
    
    for (let i = 1; i <= 30; i++) {
        expect(addToDeck(i, 'anime')).toBe(true);
    }
    
    expect(currentDeck.value.anime.length).toBe(30);
    expect(addToDeck(31, 'anime')).toBe(false);
    expect(currentDeck.value.anime.length).toBe(30);
  });

  it('should respect character card limits (4)', () => {
    const { currentDeck, addToDeck } = useDeckEditor();
    
    for (let i = 1; i <= 4; i++) {
        expect(addToDeck(i, 'character')).toBe(true);
    }
    
    expect(currentDeck.value.character.length).toBe(4);
    expect(addToDeck(5, 'character')).toBe(false);
    expect(currentDeck.value.character.length).toBe(4);
  });

  it('should auto-set cover when first card is added', () => {
    const { currentDeck, addToDeck } = useDeckEditor();
    
    addToDeck(101, 'anime');
    expect(currentDeck.value.cover).toEqual({ id: 101, type: 'anime' });
  });

  it('should override anime cover when first character is added', () => {
    const { currentDeck, addToDeck } = useDeckEditor();
    
    addToDeck(101, 'anime');
    expect(currentDeck.value.cover?.type).toBe('anime');
    
    addToDeck(201, 'character');
    expect(currentDeck.value.cover).toEqual({ id: 201, type: 'character' });
  });

  it('should fallback cover correctly when cover card is removed', () => {
    const { currentDeck, addToDeck, removeFromDeck } = useDeckEditor();
    
    addToDeck(101, 'anime');
    addToDeck(102, 'anime');
    addToDeck(201, 'character');
    addToDeck(202, 'character');

    // Current cover is 201 (first character)
    expect(currentDeck.value.cover).toEqual({ id: 201, type: 'character' });

    // Remove 201, cover should be 202
    removeFromDeck(201, 'character');
    expect(currentDeck.value.cover).toEqual({ id: 202, type: 'character' });

    // Remove 202, cover should fallback to first anime (101)
    removeFromDeck(202, 'character');
    expect(currentDeck.value.cover).toEqual({ id: 101, type: 'anime' });

    // Remove 101, cover should be 102
    removeFromDeck(101, 'anime');
    expect(currentDeck.value.cover).toEqual({ id: 102, type: 'anime' });

    // Remove 102, cover should be null
    removeFromDeck(102, 'anime');
    expect(currentDeck.value.cover).toBeNull();
  });
});
