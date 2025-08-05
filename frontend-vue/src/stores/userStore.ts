import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useGachaStore, type DrawnCard } from './gachaStore';
import { useGameDataStore, type Card, type Rarity } from './gameDataStore';

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

// --- Game Configuration ---
const QUEUE_SIZE = 3;
const VIEWING_REWARDS: Record<Rarity, { time: number; exp: number; knowledge: number }> = {
    N: { time: 5, exp: 10, knowledge: 1 },
    R: { time: 15, exp: 25, knowledge: 3 },
    SR: { time: 60, exp: 100, knowledge: 10 },
    SSR: { time: 180, exp: 350, knowledge: 30 },
    HR: { time: 360, exp: 800, knowledge: 60 },
    UR: { time: 720, exp: 2000, knowledge: 150 },
};


export const useUserStore = defineStore('user', () => {
  // --- STATE ---
  const currentUser = ref<string>('');
  const playerState = ref<PlayerState>({
    level: 1,
    exp: 0,
    animeGachaTickets: 50,
    characterGachaTickets: 50,
    knowledgePoints: 0,
    savedDecks: {},
    viewingQueue: Array(QUEUE_SIZE).fill(null),
  });
  const logs = ref<LogEntry[]>([]);
  const animeCollection = ref<Map<number, { count: number }>>(new Map());
  const characterCollection = ref<Map<number, { count: number }>>(new Map());
  const animeGachaHistory = ref<any[]>([]);
  const characterGachaHistory = ref<any[]>([]);
  const animePityState = ref<PityState>({ totalPulls: 0, pullsSinceLastHR: 0 });
  const characterPityState = ref<PityState>({ totalPulls: 0, pullsSinceLastHR: 0 });

  // --- GETTERS ---
  const isLoggedIn = computed(() => !!currentUser.value);
  const getAnimeCardCount = computed(() => (id: number) => animeCollection.value.get(id)?.count || 0);
  const getCharacterCardCount = computed(() => (id: number) => characterCollection.value.get(id)?.count || 0);
  const savedDecks = computed(() => playerState.value.savedDecks);
  const expToNextLevel = computed(() => playerState.value.level * 100);

  // --- ACTIONS ---
  
  function addLog(message: string, type: LogEntry['type'] = 'info') {
    logs.value.unshift({ message, type, timestamp: Date.now() });
    if (logs.value.length > 50) { // Keep only the last 50 logs
      logs.value.pop();
    }
  }

  function resetState() {
    playerState.value = {
        level: 1,
        exp: 0,
        animeGachaTickets: 50,
        characterGachaTickets: 50,
        knowledgePoints: 0,
        savedDecks: {},
        viewingQueue: Array(QUEUE_SIZE).fill(null),
    };
    logs.value = [];
    animeCollection.value.clear();
    characterCollection.value.clear();
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
        const initialState = { viewingQueue: Array(QUEUE_SIZE).fill(null) };
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
      playerState.value.level++;
      playerState.value.exp -= requiredExp;
      playerState.value.animeGachaTickets += playerState.value.level * 10;
      playerState.value.characterGachaTickets += playerState.value.level * 10;
      addLog(`恭喜！你已达到 ${playerState.value.level} 级！获得动画券和角色券各${playerState.value.level * 10}张。`, 'success');
      requiredExp = expToNextLevel.value * playerState.value.level;
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
    
    const expToAdd = count === 1 ? 10 : 110;
    
    const collection = gachaType === 'anime' ? animeCollection.value : characterCollection.value;
    drawnCards.forEach(card => {
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

    const rewards = VIEWING_REWARDS[anime.rarity];
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
    isLoggedIn,
    getAnimeCardCount,
    getCharacterCardCount,
    savedDecks,
    expToNextLevel,
    VIEWING_REWARDS, // Expose for UI
    login,
    logout,
    saveStateToServer,
    addExp,
    drawCards,
    saveDeck,
    deleteDeck,
    addLog,
    addToViewingQueue,
    collectFromViewingQueue
  };
});
