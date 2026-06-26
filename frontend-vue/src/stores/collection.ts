/**
 * collection 领域 store（S5 自 userStore 拆出）：
 * 动画/角色收藏、喜爱列表、入库、分解。
 * 不触发存档（由门面统一控制）。
 */
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';
import { useGameDataStore } from './gameDataStore';
import { useProfileStore } from './profile';

export type CardDomain = 'anime' | 'character';

export const useCollectionStore = defineStore('collection', () => {
  const animeCollection = ref<Map<number, { count: number }>>(new Map());
  const characterCollection = ref<Map<number, { count: number }>>(new Map());
  const favoriteAnime = ref<Set<number>>(new Set());
  const favoriteCharacters = ref<Set<number>>(new Set());

  const getAnimeCardCount = computed(() => (id: number) => animeCollection.value.get(id)?.count || 0);
  const getCharacterCardCount = computed(() => (id: number) => characterCollection.value.get(id)?.count || 0);
  const isFavorite = computed(
    () => (id: number, type: CardDomain) =>
      type === 'anime' ? favoriteAnime.value.has(id) : favoriteCharacters.value.has(id),
  );

  function collectionOf(type: CardDomain) {
    return type === 'anime' ? animeCollection.value : characterCollection.value;
  }

  /** 入库一张卡，返回是否首次获得。 */
  function addCard(cardId: number, type: CardDomain): { isNew: boolean } {
    const collection = collectionOf(type);
    const existing = collection.get(cardId);
    if (existing) {
      existing.count++;
      return { isNew: false };
    }
    collection.set(cardId, { count: 1 });
    return { isNew: true };
  }

  function dismantleCard(cardId: number, cardType: CardDomain) {
    const profile = useProfileStore();
    const collection = collectionOf(cardType);
    const cardData = collection.get(cardId);

    if (!cardData || cardData.count <= 1) {
      profile.addLog('分解失败：卡片不存在或只有一张。', 'warning');
      return;
    }

    const gameDataStore = useGameDataStore();
    const cardDetails =
      cardType === 'anime' ? gameDataStore.getAnimeCardById(cardId) : gameDataStore.getCharacterCardById(cardId);
    if (!cardDetails) return;

    const config = cardType === 'anime' ? GAME_CONFIG.animeSystem : GAME_CONFIG.characterSystem;
    const dismantleValue = config.rarityConfig[cardDetails.rarity]?.dismantleValue || 0;

    cardData.count--;
    profile.earn('knowledgePoints', dismantleValue);
    profile.addLog(`成功分解 [${cardDetails.rarity}] ${cardDetails.name}，获得 ${dismantleValue} 知识点。`, 'success');
  }

  /** 一键分解所有重复卡。返回是否有实际分解（决定调用方是否需要存档）。 */
  function dismantleAllDuplicates(cardType: CardDomain): boolean {
    const profile = useProfileStore();
    const collection = collectionOf(cardType);
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
      profile.earn('knowledgePoints', totalValue);
      const typeText = cardType === 'anime' ? '动画' : '角色';
      profile.addLog(`一键分解了 ${dismantledCount} 张重复${typeText}卡，获得 ${totalValue} 知识点。`, 'success');
      return true;
    }
    profile.addLog('没有可分解的重复卡片。', 'info');
    return false;
  }

  /** 切换喜爱。返回是否发生变更（列表满时不变更）。 */
  function toggleFavorite(cardId: number, cardType: CardDomain): boolean {
    const profile = useProfileStore();
    const favorites = cardType === 'anime' ? favoriteAnime.value : favoriteCharacters.value;
    const typeName = cardType === 'anime' ? '动画' : '角色';

    if (favorites.has(cardId)) {
      favorites.delete(cardId);
      profile.addLog(`已取消喜爱${typeName} #${cardId}。`, 'info');
      return true;
    }
    if (favorites.size >= 10) {
      // 脱离组件上下文：非阻塞 toast 已足够提示，去掉原生 alert（避免浏览器灰框）。
      profile.addLog(`喜爱${typeName}列表已满（最多10张），请先移除一些再添加。`, 'warning');
      return false;
    }
    favorites.add(cardId);
    profile.addLog(`已将${typeName} #${cardId} 添加到喜爱列表。`, 'success');
    return true;
  }

  // --- 持久化装配 ---

  function serialize() {
    return {
      animeCollection: Array.from(animeCollection.value.entries()),
      characterCollection: Array.from(characterCollection.value.entries()),
      favoriteAnime: Array.from(favoriteAnime.value),
      favoriteCharacters: Array.from(favoriteCharacters.value),
    };
  }

  function deserialize(data: {
    animeCollection: [number, { count: number }][];
    characterCollection: [number, { count: number }][];
    favoriteAnime: number[];
    favoriteCharacters: number[];
  }) {
    animeCollection.value = new Map(data.animeCollection);
    characterCollection.value = new Map(data.characterCollection);
    favoriteAnime.value = new Set(data.favoriteAnime);
    favoriteCharacters.value = new Set(data.favoriteCharacters);
  }

  function reset() {
    animeCollection.value.clear();
    characterCollection.value.clear();
    favoriteAnime.value.clear();
    favoriteCharacters.value.clear();
  }

  return {
    animeCollection,
    characterCollection,
    favoriteAnime,
    favoriteCharacters,
    getAnimeCardCount,
    getCharacterCardCount,
    isFavorite,
    addCard,
    dismantleCard,
    dismantleAllDuplicates,
    toggleFavorite,
    serialize,
    deserialize,
    reset,
  };
});
