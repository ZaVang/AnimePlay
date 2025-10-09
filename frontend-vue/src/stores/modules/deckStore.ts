/**
 * Deck Management Store
 * Handles saving, loading, and deleting custom decks
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useAuthStore } from './authStore';

export interface Deck {
  name: string;
  anime: number[];
  character: number[];
  cover: {
    id: number;
    type: 'anime' | 'character';
  } | null;
  createdAt: string;
  version: number;
}

export const useDeckStore = defineStore('deck', () => {
  // --- STATE ---
  const savedDecks = ref<Record<string, Deck>>({});

  // --- GETTERS ---
  const decks = computed(() => savedDecks.value);

  // --- ACTIONS ---
  function resetState() {
    savedDecks.value = {};
  }

  async function saveDeck(deck: Deck) {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn) return;

    authStore.addLog(`卡组 [${deck.name}] 已保存。`, 'info');
    savedDecks.value[deck.name] = deck;
    savedDecks.value = { ...savedDecks.value };
  }

  async function deleteDeck(deckName: string) {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn) return;

    if (savedDecks.value[deckName]) {
      authStore.addLog(`卡组 [${deckName}] 已删除。`, 'warning');
      delete savedDecks.value[deckName];
      savedDecks.value = { ...savedDecks.value };
    }
  }

  function loadFromPayload(payload: any) {
    savedDecks.value = payload.savedDecks || {};
  }

  function serializeForSave() {
    return {
      savedDecks: savedDecks.value,
    };
  }

  return {
    savedDecks: decks,
    resetState,
    saveDeck,
    deleteDeck,
    loadFromPayload,
    serializeForSave,
  };
});
