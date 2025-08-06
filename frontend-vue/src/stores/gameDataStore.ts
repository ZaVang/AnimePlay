import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'HR' | 'UR';

// 定义卡牌的数据结构 (可以根据 all_cards.json 补充更详细的字段)
export interface Card {
  id: number;
  name: string;
  rarity: Rarity;
  image_path: string;
  [key: string]: any; // 其他可能的属性
}

export const useGameDataStore = defineStore('gameData', () => {
  // --- STATE ---
  const allAnimeCards = ref<Card[]>([]);
  const allCharacterCards = ref<Card[]>([]);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  // --- GETTERS ---
  const getAnimeCardById = computed(() => {
    // 创建一个 Map 以便快速查找，这比每次都用 find() 高效得多
    const map = new Map(allAnimeCards.value.map(card => [card.id, card]));
    return (id: number) => map.get(id);
  });

  const getCharacterCardById = computed(() => {
    const map = new Map(allCharacterCards.value.map(card => [card.id, card]));
    return (id: number) => map.get(id);
  });

  // --- ACTIONS ---
  async function fetchGameData() {
    if (isLoading.value) return; // 防止重复加载
    isLoading.value = true;
    error.value = null;

    try {
      // 使用 Promise.all 并行获取数据，速度更快
      const [animeResponse, characterResponse] = await Promise.all([
        fetch('/api/all_animes?limit=1000'),
        fetch('/api/all_characters?limit=1000') // 使用已有的角色 API
      ]);

      if (!animeResponse.ok) throw new Error('Failed to fetch anime cards');
      if (!characterResponse.ok) throw new Error('Failed to fetch character cards');
      
      const animeData = await animeResponse.json();
      const characterData = await characterResponse.json();

      const processCardImagePath = (card: Card, type: 'anime' | 'character'): Card => {
        // 根据卡片ID和类型构建图片路径
        const imagePath = `/data/images/${type}/${card.id}.jpg`;
        return {
            ...card,
            image_path: imagePath,
            rarity: (card as any).rarity || 'N' // 默认稀有度
        };
      };

      allAnimeCards.value = animeData.map((card: Card) => processCardImagePath(card, 'anime'));

      if (characterData.characters) {
          allCharacterCards.value = characterData.characters.map((card: Card) => processCardImagePath(card, 'character'));
      } else {
          allCharacterCards.value = [];
      }


      console.log(`Loaded ${allAnimeCards.value.length} anime cards.`);
      console.log(`Loaded ${allCharacterCards.value.length} character cards.`);

    } catch (e: any) {
      error.value = e.message;
      console.error('Failed to fetch game data:', e);
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    allAnimeCards,
    allCharacterCards,
    isLoading,
    error,
    // Getters
    getAnimeCardById,
    getCharacterCardById,
    // Actions
    fetchGameData,
  };
});
