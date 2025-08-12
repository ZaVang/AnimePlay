import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useGachaStore, type DrawnCard } from './gachaStore';
import { useGameDataStore } from './gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { type Card, type Rarity } from '@/types/card';

// --- Type Definitions ---

export interface Deck {
  name: string;
  anime: number[]; // Store only anime card IDs
  character: number[]; // Store only character card IDs
  cover: {
    id: number;
    type: 'anime' | 'character';
  } | null;
  createdAt: string;
  version: number;
}

export interface ViewingQueueSlot {
  animeId: number;
  startTime: number; // ISO timestamp
}

interface PlayerState {
  level: number;
  exp: number;
  animeGachaTickets: number;
  characterGachaTickets: number;
  knowledgePoints: number;
  savedDecks: Record<string, Deck>;
  viewingQueue: (ViewingQueueSlot | null)[];
}

interface PityState {
  totalPulls: number;
  pullsSinceLastHR: number;
}

export interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'warning' | 'gacha';
  timestamp: number;
}

export const useUserStore = defineStore('user', () => {
  // --- STATE ---
  const currentUser = ref<string>('');
  const playerState = ref<PlayerState>({
    ...GAME_CONFIG.playerInitialState,
    exp: 0,
    savedDecks: {},
    viewingQueue: Array(GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
  });
  const logs = ref<LogEntry[]>([]);
  const animeCollection = ref<Map<number, { count: number }>>(new Map());
  const characterCollection = ref<Map<number, { count: number }>>(new Map());
  const favoriteAnime = ref<Set<number>>(new Set());
  const favoriteCharacters = ref<Set<number>>(new Set());
  const animeGachaHistory = ref<any[]>([]);
  const characterGachaHistory = ref<any[]>([]);
  const animePityState = ref<PityState>({ totalPulls: 0, pullsSinceLastHR: 0 });
  const characterPityState = ref<PityState>({ totalPulls: 0, pullsSinceLastHR: 0 });

  // --- GETTERS ---
  const isLoggedIn = computed(() => !!currentUser.value);
  const getAnimeCardCount = computed(() => (id: number) => animeCollection.value.get(id)?.count || 0);
  const getCharacterCardCount = computed(() => (id: number) => characterCollection.value.get(id)?.count || 0);
  const isFavorite = computed(() => (id: number, type: 'anime' | 'character') =>
    type === 'anime' ? favoriteAnime.value.has(id) : favoriteCharacters.value.has(id)
  );
  const savedDecks = computed(() => playerState.value.savedDecks);
  const expToNextLevel = computed(() => {
    const levelXP = GAME_CONFIG.gameplay.levelXP;
    const currentLevel = playerState.value.level;
    if (currentLevel >= levelXP.length) {
      return Infinity; // Max level reached
    }
    return levelXP[currentLevel];
  });

  // --- ACTIONS ---

  function addLog(message: string, type: LogEntry['type'] = 'info') {
    logs.value.unshift({ message, type, timestamp: Date.now() });
    if (logs.value.length > 50) { // Keep only the last 50 logs
      logs.value.pop();
    }
  }

  function resetState() {
    playerState.value = {
        ...GAME_CONFIG.playerInitialState,
        exp: 0,
        savedDecks: {},
        viewingQueue: Array(GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
    };
    logs.value = [];
    animeCollection.value.clear();
    characterCollection.value.clear();
    favoriteAnime.value.clear();
    favoriteCharacters.value.clear();
    animeGachaHistory.value = [];
    characterGachaHistory.value = [];
    animePityState.value = { totalPulls: 0, pullsSinceLastHR: 0 };
    characterPityState.value = { totalPulls: 0, pullsSinceLastHR: 0 };
  }

  async function loadStateFromServer() {
    if (!currentUser.value) return;
    try {
      const response = await fetch(`/api/user/data?username=${currentUser.value}`);
      if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
      const data = await response.json();
      if (data.isNewUser) {
        resetState();
        addLog('欢迎新玩家！已为您初始化默认存档。', 'success');
      } else {
        const payload = data;
        const initialState = { viewingQueue: Array(GAME_CONFIG.gameplay.viewingQueue.slots).fill(null) };
        playerState.value = { ...initialState, ...playerState.value, ...payload.state };

        animePityState.value = payload.animePity || animePityState.value;
        characterPityState.value = payload.characterPity || characterPityState.value;
        const savedAnimeCollection = payload.animeCollection || [];
        const migratedAnimeCollection = savedAnimeCollection.map(([id, data]: [number, any]) => [id, typeof data === 'number' ? { count: data } : data]);
        animeCollection.value = new Map(migratedAnimeCollection);
        const savedCharacterCollection = payload.characterCollection || [];
        const migratedCharacterCollection = savedCharacterCollection.map(([id, data]: [number, any]) => [id, typeof data === 'number' ? { count: data } : data]);
        characterCollection.value = new Map(migratedCharacterCollection);
        animeGachaHistory.value = payload.animeHistory || [];
        characterGachaHistory.value = payload.characterHistory || [];
        favoriteAnime.value = new Set(payload.favoriteAnime || []);
        favoriteCharacters.value = new Set(payload.favoriteCharacters || []);
        addLog('成功从服务器加载存档。', 'info');
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      alert('加载存档失败，将使用初始设置。');
      resetState();
    }
  }

  async function saveStateToServer(showAlert = false) {
    if (!currentUser.value) return;
    const payload = {
        state: playerState.value,
        animeCollection: Array.from(animeCollection.value.entries()),
        characterCollection: Array.from(characterCollection.value.entries()),
        animePity: animePityState.value,
        characterPity: characterPityState.value,
        animeHistory: animeGachaHistory.value,
        characterHistory: characterGachaHistory.value,
        favoriteAnime: Array.from(favoriteAnime.value),
        favoriteCharacters: Array.from(favoriteCharacters.value),
    };
    try {
        const response = await fetch('/api/user/data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: currentUser.value, payload }),
        });
        if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
        if (showAlert) addLog('存档已手动保存到服务器！', 'success');
    } catch (error) {
        console.error('Failed to save user data:', error);
        if (showAlert) addLog('存档失败，请检查浏览器控制台日志。', 'warning');
    }
  }

  async function saveDeck(deck: Deck) {
    if (!isLoggedIn.value) return;
    addLog(`卡组 [${deck.name}] 已保存。`, 'info');
    playerState.value.savedDecks[deck.name] = deck;
    playerState.value = { ...playerState.value };
    await saveStateToServer();
  }

  async function deleteDeck(deckName: string) {
    if (!isLoggedIn.value) return;
    if (playerState.value.savedDecks[deckName]) {
      addLog(`卡组 [${deckName}] 已删除。`, 'warning');
      delete playerState.value.savedDecks[deckName];
      playerState.value = { ...playerState.value };
      await saveStateToServer();
    }
  }

  async function login(username: string) {
    if (!username || !username.match(/^[a-zA-Z0-9]+$/)) {
      alert('用户名只能包含字母和数字。');
      return;
    }
    currentUser.value = username;
    await loadStateFromServer();
  }

  async function logout() {
    addLog('已登出，再见！', 'info');
    await saveStateToServer(false);
    currentUser.value = '';
    resetState();
  }

  function addExp(amount: number) {
    if (!isLoggedIn.value || amount === 0) return;
    addLog(`获得 ${amount} 点经验。`, 'info');
    playerState.value.exp += amount;
    let requiredExp = expToNextLevel.value;
    while (playerState.value.exp >= requiredExp) {
        playerState.value.exp -= requiredExp;
        const currentLevel = playerState.value.level;
        const rewards = GAME_CONFIG.gameplay.levelUpRewards[currentLevel + 1];

        playerState.value.level++;

        if (rewards) {
            playerState.value.animeGachaTickets += rewards.animeTickets;
            playerState.value.characterGachaTickets += rewards.characterTickets;
            playerState.value.knowledgePoints += rewards.knowledge;
            addLog(`恭喜！你已达到 ${playerState.value.level} 级！获得动画券 ${rewards.animeTickets} 张，角色券 ${rewards.characterTickets} 张，知识点 ${rewards.knowledge} 点。`, 'success');
        } else {
            addLog(`恭喜！你已达到 ${playerState.value.level} 级！`, 'success');
        }

        requiredExp = expToNextLevel.value;
        if (requiredExp === Infinity) break;
    }
    saveStateToServer();
  }

  async function drawCards(gachaType: 'anime' | 'character', count: number): Promise<DrawnCard[] | null> {
    if (!isLoggedIn.value) {
      alert('请先登录！');
      return null;
    }
    const ticketType = gachaType === 'anime' ? 'animeGachaTickets' : 'characterGachaTickets';
    if (playerState.value[ticketType] < count) {
        const ticketName = gachaType === 'anime' ? '动画券' : '角色券';
        alert(`${ticketName}不足！`);
        return null;
    }
    const gachaStore = useGachaStore();
    const gameDataStore = useGameDataStore();
    const drawnCards = gachaStore.performGachaLogic(gachaType, count);

    playerState.value[ticketType] -= count;
    addLog(`进行了 ${count} 次${gachaType === 'anime' ? '动画' : '角色'}抽卡。`, 'info');

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
            addLog(`首次获得新卡: [${card.rarity}] ${cardData?.name}`, 'success');
        }

        if (['SSR', 'HR', 'UR'].includes(card.rarity)) {
           addLog(`🎉 恭喜！抽到了稀有卡: [${card.rarity}] ${cardData?.name}`, 'gacha');
        }
    });

    addExp(expToAdd); // Add exp after logging gacha results

    const history = gachaType === 'anime' ? animeGachaHistory.value : characterGachaHistory.value;
    const historyItems = drawnCards.map(card => ({
        id: card.id,
        rarity: card.rarity,
        timestamp: Date.now(),
    }));
    history.push(...historyItems);

    gachaStore.lastResult = drawnCards;
    return drawnCards;
  }

  // --- Viewing Queue Actions ---
  function addToViewingQueue(animeId: number, slotIndex: number) {
    if (!isLoggedIn.value || playerState.value.viewingQueue[slotIndex]) return;

    const gameDataStore = useGameDataStore();
    const anime = gameDataStore.getAnimeCardById(animeId);
    if (!anime) return;

    playerState.value.viewingQueue[slotIndex] = {
      animeId: animeId,
      startTime: Date.now(),
    };
    addLog(`开始观看 [${anime.rarity}] ${anime.name}。`, 'info');
    saveStateToServer();
  }

  function collectFromViewingQueue(slotIndex: number) {
    if (!isLoggedIn.value) return;
    const slot = playerState.value.viewingQueue[slotIndex];
    if (!slot) return;

    const gameDataStore = useGameDataStore();
    const anime = gameDataStore.getAnimeCardById(slot.animeId);
    if (!anime) return;

    const rewards = GAME_CONFIG.gameplay.viewingQueue.rewards[anime.rarity];
    if (!rewards) {
        addLog(`未找到稀有度为 ${anime.rarity} 的观看奖励配置。`, 'warning');
        return;
    }
    const endTime = slot.startTime + rewards.time * 60 * 1000;

    if (Date.now() >= endTime) {
      addExp(rewards.exp);
      playerState.value.knowledgePoints += rewards.knowledge;
      addLog(`看完了 ${anime.name}！获得了 ${rewards.exp} 经验和 ${rewards.knowledge} 知识点。`, 'success');

      playerState.value.viewingQueue[slotIndex] = null;
      saveStateToServer();
    } else {
      addLog('观看时间还没结束！', 'warning');
    }
  }

  function purchaseFromShop(item: { Id: number; cost: number }, itemType: 'anime' | 'character') {
    if (!isLoggedIn.value) {
      alert('请先登录！');
      return;
    }

    if (playerState.value.knowledgePoints < item.cost) {
      addLog('知识点不足，无法购买！', 'warning');
      return;
    }

    const gameDataStore = useGameDataStore();
    const card = itemType === 'anime'
        ? gameDataStore.getAnimeCardById(item.Id)
        : gameDataStore.getCharacterCardById(item.Id);

    if (!card) {
      addLog('购买失败，物品不存在。', 'warning');
      return;
    }

    playerState.value.knowledgePoints -= item.cost;

    const collection = itemType === 'anime' ? animeCollection.value : characterCollection.value;
    const existing = collection.get(item.Id);
    if (existing) {
      existing.count++;
    } else {
      collection.set(item.Id, { count: 1 });
    }

    addLog(`成功购买 [${card.rarity}] ${card.name}！`, 'success');
    saveStateToServer();
  }

  function dismantleCard(cardId: number, cardType: 'anime' | 'character') {
    const collection = cardType === 'anime' ? animeCollection.value : characterCollection.value;
    const cardData = collection.get(cardId);

    if (!cardData || cardData.count <= 1) {
        addLog('分解失败：卡片不存在或只有一张。', 'warning');
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
    playerState.value.knowledgePoints += dismantleValue;
    addLog(`成功分解 [${cardDetails.rarity}] ${cardDetails.name}，获得 ${dismantleValue} 知识点。`, 'success');
    saveStateToServer();
  }

  function dismantleAllDuplicates(cardType: 'anime' | 'character') {
    const collection = cardType === 'anime' ? animeCollection.value : characterCollection.value;
    const gameDataStore = useGameDataStore();
    const config = cardType === 'anime' ? GAME_CONFIG.animeSystem : GAME_CONFIG.characterSystem;
    const getCardById = cardType === 'anime' ? gameDataStore.getAnimeCardById : gameDataStore.getCharacterCardById;

    let totalValue = 0;
    let dismantledCount = 0;

    for (const [cardId, cardData] of collection.entries()) {
        if (cardData.count > 1) {
            const cardDetails = getCardById(cardId);
            if(cardDetails) {
                const duplicates = cardData.count - 1;
                const valuePerCard = config.rarityConfig[cardDetails.rarity]?.dismantleValue || 0;
                totalValue += valuePerCard * duplicates;
                dismantledCount += duplicates;
                cardData.count = 1;
            }
        }
    }

    if (dismantledCount > 0) {
        playerState.value.knowledgePoints += totalValue;
        const typeText = cardType === 'anime' ? '动画' : '角色';
        addLog(`一键分解了 ${dismantledCount} 张重复${typeText}卡，获得 ${totalValue} 知识点。`, 'success');
        saveStateToServer();
    } else {
        addLog('没有可分解的重复卡片。', 'info');
    }
  }

  function toggleFavorite(cardId: number, cardType: 'anime' | 'character') {
    const favorites = cardType === 'anime' ? favoriteAnime.value : favoriteCharacters.value;
    const typeName = cardType === 'anime' ? '动画' : '角色';

    if (favorites.has(cardId)) {
        favorites.delete(cardId);
        addLog(`已取消喜爱${typeName} #${cardId}。`, 'info');
    } else {
        if (favorites.size >= 10) {
            addLog(`喜爱${typeName}列表已满（最多10张），无法添加。`, 'warning');
            alert(`您的喜爱${typeName}列表已满（最多10张），请先移除一些再添加。`);
            return;
        }
        favorites.add(cardId);
        addLog(`已将${typeName} #${cardId} 添加到喜爱列表。`, 'success');
    }
    saveStateToServer();
  }

  return {
    currentUser,
    playerState,
    logs,
    animeCollection,
    characterCollection,
    animeGachaHistory,
    characterGachaHistory,
    animePityState,
    characterPityState,
    favoriteAnime,
    favoriteCharacters,
    isLoggedIn,
    getAnimeCardCount,
    getCharacterCardCount,
    isFavorite,
    savedDecks,
    expToNextLevel,
    VIEWING_REWARDS: GAME_CONFIG.gameplay.viewingQueue.rewards, // Expose for UI
    login,
    logout,
    saveStateToServer,
    addExp,
    drawCards,
    saveDeck,
    deleteDeck,
    addLog,
    addToViewingQueue,
    collectFromViewingQueue,
    purchaseFromShop,
    dismantleCard,
    dismantleAllDuplicates,
    toggleFavorite,
  };
});
