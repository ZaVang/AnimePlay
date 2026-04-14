/**
 * Collection & Gacha Store
 * Handles card collections, gacha history, and pity system
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useGachaStore, type DrawnCard } from '../gachaStore';
import { useGameDataStore } from '../gameDataStore';
import { useAuthStore } from './authStore';
import { useEconomyStore } from './economyStore';
import { GAME_CONFIG } from '@/config/gameConfig';

interface PityState {
  totalPulls: number;
  pullsSinceLastHR: number;
  pullsSinceLastUR: number;
}

const MAX_GACHA_HISTORY_RECORDS = 500;

export const useCollectionStore = defineStore('collection', () => {
  // --- STATE ---
  const animeCollection = ref<Map<number, { count: number }>>(new Map());
  const characterCollection = ref<Map<number, { count: number }>>(new Map());
  const favoriteAnime = ref<Set<number>>(new Set());
  const favoriteCharacters = ref<Set<number>>(new Set());
  const animeGachaHistory = ref<any[]>([]);
  const characterGachaHistory = ref<any[]>([]);
  const animePityState = ref<PityState>({ totalPulls: 0, pullsSinceLastHR: 0, pullsSinceLastUR: 0 });
  const characterPityState = ref<PityState>({ totalPulls: 0, pullsSinceLastHR: 0, pullsSinceLastUR: 0 });

  // --- GETTERS ---
  const getAnimeCardCount = computed(() => (id: number) => animeCollection.value.get(id)?.count || 0);
  const getCharacterCardCount = computed(() => (id: number) => characterCollection.value.get(id)?.count || 0);
  const isFavorite = computed(() => (id: number, type: 'anime' | 'character') =>
    type === 'anime' ? favoriteAnime.value.has(id) : favoriteCharacters.value.has(id)
  );

  const ownedAnimeCards = computed(() => {
    const gameDataStore = useGameDataStore();
    return Array.from(animeCollection.value.entries()).map(([id, data]) => {
      const card = gameDataStore.getAnimeCardById(id);
      return card ? { ...card, count: data.count } : null;
    }).filter((c): c is any => c !== null);
  });

  const ownedCharacterCards = computed(() => {
    const gameDataStore = useGameDataStore();
    return Array.from(characterCollection.value.entries()).map(([id, data]) => {
      const card = gameDataStore.getCharacterCardById(id);
      return card ? { ...card, count: data.count } : null;
    }).filter((c): c is any => c !== null);
  });

  // --- ACTIONS ---
  function resetState() {
    animeCollection.value.clear();
    characterCollection.value.clear();
    favoriteAnime.value.clear();
    favoriteCharacters.value.clear();
    animeGachaHistory.value = [];
    characterGachaHistory.value = [];
    animePityState.value = { totalPulls: 0, pullsSinceLastHR: 0, pullsSinceLastUR: 0 };
    characterPityState.value = { totalPulls: 0, pullsSinceLastHR: 0, pullsSinceLastUR: 0 };
  }

  async function drawCards(gachaType: 'anime' | 'character', count: number): Promise<DrawnCard[] | null> {
    const authStore = useAuthStore();
    const economyStore = useEconomyStore();

    if (!authStore.isLoggedIn) {
      alert('请先登录！');
      return null;
    }

    const ticketType = gachaType === 'anime' ? 'animeGachaTickets' : 'characterGachaTickets';
    const hasEnoughTickets = gachaType === 'anime'
      ? economyStore.animeGachaTickets >= count
      : economyStore.characterGachaTickets >= count;

    if (!hasEnoughTickets) {
      const ticketName = gachaType === 'anime' ? '动画券' : '角色券';
      alert(`${ticketName}不足！`);
      return null;
    }

    const gachaStore = useGachaStore();
    const gameDataStore = useGameDataStore();
    const drawnCards = gachaStore.performGachaLogic(gachaType, count);

    economyStore.spendTickets(gachaType, count);
    authStore.addLog(`进行了 ${count} 次${gachaType === 'anime' ? '动画' : '角色'}抽卡。`, 'info');

    const expConfig = gachaType === 'anime' ? GAME_CONFIG.gameplay.animeGachaEXP : GAME_CONFIG.gameplay.characterGachaEXP;
    const expToAdd = count > 1 ? expConfig.multi : expConfig.single;

    const collection = gachaType === 'anime' ? animeCollection.value : characterCollection.value;
    drawnCards.forEach((card: DrawnCard) => {
      const cardData = gachaType === 'anime'
        ? gameDataStore.getAnimeCardById(card.id)
        : gameDataStore.getCharacterCardById(card.id);

      if (collection.has(card.id)) {
        const existing = collection.get(card.id)!;
        existing.count++;
        card.isDuplicate = true;
      } else {
        collection.set(card.id, { count: 1 });
        card.isNew = true;
        authStore.addLog(`首次获得新卡: [${card.rarity}] ${cardData?.name}`, 'success');
      }

      if (['SSR', 'HR', 'UR'].includes(card.rarity)) {
        authStore.addLog(`🎉 恭喜！抽到了稀有卡: [${card.rarity}] ${cardData?.name}`, 'gacha');
      }
    });

    authStore.addExp(expToAdd);

    const history = gachaType === 'anime' ? animeGachaHistory.value : characterGachaHistory.value;
    const historyItems = drawnCards.map(card => ({
      id: card.id,
      rarity: card.rarity,
      timestamp: Date.now(),
    }));

    history.push(...historyItems);

    if (history.length > MAX_GACHA_HISTORY_RECORDS) {
      history.splice(0, history.length - MAX_GACHA_HISTORY_RECORDS);
    }

    gachaStore.lastResult = drawnCards;
    return drawnCards;
  }

  function toggleFavorite(cardId: number, cardType: 'anime' | 'character') {
    const authStore = useAuthStore();
    const favorites = cardType === 'anime' ? favoriteAnime.value : favoriteCharacters.value;
    const typeName = cardType === 'anime' ? '动画' : '角色';

    if (favorites.has(cardId)) {
      favorites.delete(cardId);
      authStore.addLog(`已取消喜爱${typeName} #${cardId}。`, 'info');
    } else {
      if (favorites.size >= 10) {
        authStore.addLog(`喜爱${typeName}列表已满（最多10张），无法添加。`, 'warning');
        alert(`您的喜爱${typeName}列表已满（最多10张），请先移除一些再添加。`);
        return;
      }
      favorites.add(cardId);
      authStore.addLog(`已将${typeName} #${cardId} 添加到喜爱列表。`, 'success');
    }
  }

  function loadFromPayload(payload: any) {
    // Load pity states
    const loadedAnimePity = payload.animePity || { totalPulls: 0, pullsSinceLastHR: 0, pullsSinceLastUR: 0 };
    const loadedCharacterPity = payload.characterPity || { totalPulls: 0, pullsSinceLastHR: 0, pullsSinceLastUR: 0 };

    if (loadedAnimePity.pullsSinceLastUR === undefined) {
      loadedAnimePity.pullsSinceLastUR = 0;
    }
    if (loadedCharacterPity.pullsSinceLastUR === undefined) {
      loadedCharacterPity.pullsSinceLastUR = 0;
    }

    animePityState.value = loadedAnimePity;
    characterPityState.value = loadedCharacterPity;

    // Load collections
    const savedAnimeCollection = payload.animeCollection || [];
    const migratedAnimeCollection = savedAnimeCollection.map(([id, data]: [number, any]) =>
      [id, typeof data === 'number' ? { count: data } : data]
    );
    animeCollection.value = new Map(migratedAnimeCollection);

    const savedCharacterCollection = payload.characterCollection || [];
    const migratedCharacterCollection = savedCharacterCollection.map(([id, data]: [number, any]) =>
      [id, typeof data === 'number' ? { count: data } : data]
    );
    characterCollection.value = new Map(migratedCharacterCollection);

    // Load histories
    const animeHistory = payload.animeHistory || [];
    const characterHistory = payload.characterHistory || [];

    animeGachaHistory.value = animeHistory.length > MAX_GACHA_HISTORY_RECORDS
      ? animeHistory.slice(-MAX_GACHA_HISTORY_RECORDS)
      : animeHistory;
    characterGachaHistory.value = characterHistory.length > MAX_GACHA_HISTORY_RECORDS
      ? characterHistory.slice(-MAX_GACHA_HISTORY_RECORDS)
      : characterHistory;

    favoriteAnime.value = new Set(payload.favoriteAnime || []);
    favoriteCharacters.value = new Set(payload.favoriteCharacters || []);
  }

  function serializeForSave() {
    return {
      animeCollection: Array.from(animeCollection.value.entries()),
      characterCollection: Array.from(characterCollection.value.entries()),
      animePity: animePityState.value,
      characterPity: characterPityState.value,
      animeHistory: animeGachaHistory.value,
      characterHistory: characterGachaHistory.value,
      favoriteAnime: Array.from(favoriteAnime.value),
      favoriteCharacters: Array.from(favoriteCharacters.value),
    };
  }

  return {
    animeCollection,
    characterCollection,
    favoriteAnime,
    favoriteCharacters,
    animeGachaHistory,
    characterGachaHistory,
    animePityState,
    characterPityState,
    ownedAnimeCards,
    ownedCharacterCards,
    getAnimeCardCount,
    getCharacterCardCount,
    isFavorite,
    resetState,
    drawCards,
    toggleFavorite,
    loadFromPayload,
    serializeForSave,
  };
});
