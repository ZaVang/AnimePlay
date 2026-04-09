
import { ref, computed } from 'vue';
import type { Deck } from '@/types/store';
import { useDeckStore } from '@/stores/modules/deckStore';
import { GAME_CONFIG } from '@/config/gameConfig';

/**
 * SHARED STATE (Local Singleton Pattern)
 * These refs are defined outside the function so they are shared across all components.
 */
const isEditing = ref(false);
const initialEditorName = ref<string | null>(null);
const currentDeckName = ref('新卡组');
const currentDeck = ref<Omit<Deck, 'name'>>({
  anime: [],
  character: [],
  cover: null,
  createdAt: new Date().toISOString(),
  version: 2,
});

export function useDeckEditor() {
  const deckStore = useDeckStore();

  // --- COMPUTED ---
  const animeIdInDeck = computed(() => new Set(currentDeck.value.anime));
  const characterIdInDeck = computed(() => new Set(currentDeck.value.character));

  // --- ACTIONS ---
  
  function startEditing(name: string | null = null) {
    isEditing.value = true;
    initialEditorName.value = name;
    
    if (name) {
      const existing = deckStore.savedDecks[name];
      if (existing) {
        currentDeckName.value = name;
        currentDeck.value = JSON.parse(JSON.stringify(existing));
        return;
      }
    }
    
    // Reset for new deck
    currentDeckName.value = '新卡组';
    currentDeck.value = {
      anime: [],
      character: [],
      cover: null,
      createdAt: new Date().toISOString(),
      version: 2,
    };
  }

  function stopEditing() {
    isEditing.value = false;
    initialEditorName.value = null;
  }

  function addToDeck(cardId: number, type: 'anime' | 'character') {
    if (!isEditing.value) return false;
    
    const deckCards = currentDeck.value[type];
    const maxSize = type === 'anime' ? GAME_CONFIG.deckBuilding.AnimeMaxNum : GAME_CONFIG.deckBuilding.CharacterMaxNum;
    
    if (deckCards.includes(cardId)) return false;
    if (deckCards.length >= maxSize) return false;
    
    deckCards.push(cardId);
    
    // Cover logic
    if (type === 'character') {
      if (currentDeck.value.cover?.type !== 'character') {
        currentDeck.value.cover = { id: cardId, type: 'character' };
      }
    } else if (!currentDeck.value.cover) {
      currentDeck.value.cover = { id: cardId, type: 'anime' };
    }
    return true;
  }

  function removeFromDeck(cardId: number, type: 'anime' | 'character') {
    const deckCards = currentDeck.value[type];
    const index = deckCards.indexOf(cardId);
    if (index > -1) {
      deckCards.splice(index, 1);

      // Handle cover fallback
      if (currentDeck.value.cover?.id === cardId) {
        if (currentDeck.value.character.length > 0) {
          currentDeck.value.cover = { id: currentDeck.value.character[0], type: 'character' };
        } else if (currentDeck.value.anime.length > 0) {
          currentDeck.value.cover = { id: currentDeck.value.anime[0], type: 'anime' };
        } else {
          currentDeck.value.cover = null;
        }
      }
      return true;
    }
    return false;
  }

  async function saveDeck() {
    if (!currentDeckName.value.trim()) {
      throw new Error('请输入卡组名称！');
    }

    const deckToSave: Deck = {
      ...currentDeck.value,
      name: currentDeckName.value.trim(),
      createdAt: new Date().toISOString(),
    };

    // Handle renaming
    if (initialEditorName.value && initialEditorName.value !== deckToSave.name) {
      await deckStore.deleteDeck(initialEditorName.value);
    }

    await deckStore.saveDeck(deckToSave);
    stopEditing(); // Save completes session
    return true;
  }

  return {
    isEditing,
    currentDeckName,
    currentDeck,
    animeIdInDeck,
    characterIdInDeck,
    startEditing,
    stopEditing,
    addToDeck,
    removeFromDeck,
    saveDeck
  };
}
