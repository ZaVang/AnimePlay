import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { useGachaStore, type DrawnCard } from './gachaStore';
import { useGameDataStore } from './gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';
import { type ShopItem } from '@/utils/gachaRotation';

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
  watchedAnime: Set<number>; // 已观看过的动画ID列表
  viewingStats: {
    totalWatchTime: number; // 总观看时间（分钟）
    genreProgress: Record<string, number>; // 各类型观看数量
    consecutiveDays: number; // 连续观看天数
    lastWatchDate: string; // 最后观看日期
  };
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

// 角色养成数据接口
export interface CharacterNurtureData {
  affection: number; // 好感度 (0-1000+, 可以超过1000)
  intimacy: number; // 亲密度 (0-100)
  lastInteraction: string; // 最后互动时间
  totalInteractions: number; // 总互动次数
  dialogueHistory: string[]; // 对话历史ID
  gifts: string[]; // 收到的礼物ID列表 (简化数据结构)
  specialEvents: string[]; // 已解锁的特殊事件
  // 角色等级系统
  level: number; // 角色等级 (1+, 无上限)
  experience: number; // 当前经验值
  totalExperience: number; // 总经验值 (用于计算等级)
  attributes: {
    charm: number; // 魅力值
    intelligence: number; // 智力值
    strength: number; // 体力值
    mood: number; // 心情值 (0-100)
  };
  // 升级获得的随机属性加成
  levelBonusAttributes: {
    charm: number; // 升级获得的魅力加成
    intelligence: number; // 升级获得的智力加成
    strength: number; // 升级获得的体力加成
  };
  // 战斗属性增强 (基于原始battle_stats的百分比加成)
  battleEnhancements: {
    hp: number; // HP加成 (0-100%)
    atk: number; // 攻击力加成 (0-100%)
    def: number; // 防御力加成 (0-100%)
    sp: number; // SP加成 (0-100%)
    spd: number; // 速度加成 (0-100%)
  };
  preferences: {
    favoriteTopics: string[]; // 喜欢的话题
    dislikedTopics: string[]; // 不喜欢的话题
    favoriteGifts: string[]; // 喜欢的礼物
  };
}


export interface PresetSquad {
  id: number;
  name: string;
  members: (number | null)[]; // 4个位置，null表示空位
  lastUsed?: string;
}

export interface TowerProgress {
  currentFloor: number; // 当前最高到达层数
  maxFloor: number; // 历史最高层数
  floorRewards: { [floor: number]: boolean }; // 已领取的层数奖励
  todayAttempts: number; // 今日尝试次数
  lastAttemptDate: string; // 上次尝试日期
}

export const useUserStore = defineStore('user', () => {
  // --- STATE ---
  const currentUser = ref<string>('');
  const playerState = ref<PlayerState>({
    ...GAME_CONFIG.playerInitialState,
    exp: 0,
    savedDecks: {},
    viewingQueue: Array(GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
    watchedAnime: new Set<number>(),
    viewingStats: {
      totalWatchTime: 0,
      genreProgress: {},
      consecutiveDays: 0,
      lastWatchDate: '',
    },
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
  
  // 角色养成数据
  const characterNurtureData = ref<Map<number, CharacterNurtureData>>(new Map());
  
  // 预设小队数据
  
  const presetSquads = ref<PresetSquad[]>([
    { id: 1, name: '小队 A', members: [null, null, null, null] },
    { id: 2, name: '小队 B', members: [null, null, null, null] },
    { id: 3, name: '小队 C', members: [null, null, null, null] }
  ]);

  // 爬塔进度数据

  const towerProgress = ref<TowerProgress>({
    currentFloor: 1,
    maxFloor: 1,
    floorRewards: {},
    todayAttempts: 0,
    lastAttemptDate: ''
  });

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
        watchedAnime: new Set<number>(),
        viewingStats: {
          totalWatchTime: 0,
          genreProgress: {},
          consecutiveDays: 0,
          lastWatchDate: '',
        },
    };
    logs.value = [];
    animeCollection.value.clear();
    characterCollection.value.clear();
    favoriteAnime.value.clear();
    favoriteCharacters.value.clear();
    characterNurtureData.value.clear();
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
        const initialState = { 
          viewingQueue: Array(GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
          watchedAnime: new Set<number>(),
          viewingStats: {
            totalWatchTime: 0,
            genreProgress: {},
            consecutiveDays: 0,
            lastWatchDate: '',
          },
        };
        
        // 反序列化playerState，处理Set类型和新字段
        const loadedState = { ...initialState, ...playerState.value, ...payload.state };
        if (payload.state?.watchedAnime && Array.isArray(payload.state.watchedAnime)) {
          loadedState.watchedAnime = new Set(payload.state.watchedAnime);
        }
        playerState.value = loadedState;

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
        
        // 加载角色养成数据
        const savedNurtureData = payload.characterNurtureData || [];
        characterNurtureData.value = new Map(savedNurtureData);
        
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
    
    // 序列化playerState，处理Set类型
    const serializedState = {
      ...playerState.value,
      watchedAnime: Array.from(playerState.value.watchedAnime),
    };
    
    const payload = {
        state: serializedState,
        animeCollection: Array.from(animeCollection.value.entries()),
        characterCollection: Array.from(characterCollection.value.entries()),
        animePity: animePityState.value,
        characterPity: characterPityState.value,
        animeHistory: animeGachaHistory.value,
        characterHistory: characterGachaHistory.value,
        favoriteAnime: Array.from(favoriteAnime.value),
        favoriteCharacters: Array.from(favoriteCharacters.value),
        characterNurtureData: Array.from(characterNurtureData.value.entries()),
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
      
      // 添加到已观看历史
      playerState.value.watchedAnime.add(slot.animeId);
      
      // 更新观看统计
      const stats = playerState.value.viewingStats;
      stats.totalWatchTime += rewards.time;
      
      // 更新类型观看进度
      if (anime.synergy_tags) {
        anime.synergy_tags.forEach(genre => {
          stats.genreProgress[genre] = (stats.genreProgress[genre] || 0) + 1;
        });
      }
      
      // 更新连续观看天数
      const today = new Date().toDateString();
      const lastDate = new Date(stats.lastWatchDate).toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
      
      if (stats.lastWatchDate === '') {
        // 首次观看
        stats.consecutiveDays = 1;
      } else if (lastDate === yesterday) {
        // 连续观看
        stats.consecutiveDays += 1;
      } else if (lastDate !== today) {
        // 断链，重新开始
        stats.consecutiveDays = 1;
      }
      // 如果是同一天，不改变连续天数
      
      stats.lastWatchDate = new Date().toISOString();
      
      // 连续观看奖励
      if (stats.consecutiveDays >= 7 && stats.consecutiveDays % 7 === 0) {
        const bonusTickets = Math.min(5, Math.floor(stats.consecutiveDays / 7));
        playerState.value.animeGachaTickets += bonusTickets;
        addLog(`🎉 连续观看${stats.consecutiveDays}天！获得额外${bonusTickets}张动画券！`, 'success');
      }

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

  function purchaseShopItem(item: ShopItem) {
    if (!isLoggedIn.value) {
      alert('请先登录！');
      return Promise.reject(new Error('未登录'));
    }

    if (playerState.value.knowledgePoints < item.cost) {
      addLog('知识点不足，无法购买！', 'warning');
      return Promise.reject(new Error('知识点不足'));
    }

    // 扣除知识点
    playerState.value.knowledgePoints -= item.cost;

    // 根据物品类型进行处理
    switch (item.type) {
      case 'ticket':
        // 增加抽卡券
        if (item.id.includes('anime')) {
          playerState.value.animeGachaTickets += item.quantity || 1;
          addLog(`成功购买 ${item.name}！获得 ${item.quantity || 1} 张动画抽卡券`, 'success');
        } else if (item.id.includes('character')) {
          playerState.value.characterGachaTickets += item.quantity || 1;
          addLog(`成功购买 ${item.name}！获得 ${item.quantity || 1} 张角色抽卡券`, 'success');
        }
        break;

      case 'currency':
        // 增加知识点（相当于返还）
        playerState.value.knowledgePoints += item.quantity || 0;
        addLog(`成功购买 ${item.name}！获得 ${item.quantity || 0} 知识点`, 'success');
        break;

      case 'booster':
        // 增加经验值
        playerState.value.exp += item.quantity || 0;
        
        // 检查是否升级
        let targetLevel = playerState.value.level;
        const levelXP = GAME_CONFIG.gameplay.levelXP;
        
        while (targetLevel < levelXP.length && playerState.value.exp >= levelXP[targetLevel]) {
          targetLevel++;
        }
        
        if (targetLevel > playerState.value.level) {
          const oldLevel = playerState.value.level;
          playerState.value.level = targetLevel;
          addLog(`恭喜！等级提升至 Lv.${targetLevel}！`, 'success');
          
          // 给予升级奖励
          for (let level = oldLevel + 1; level <= targetLevel; level++) {
            const reward = GAME_CONFIG.gameplay.levelUpRewards[level.toString()];
            if (reward) {
              playerState.value.animeGachaTickets += reward.animeTickets;
              playerState.value.characterGachaTickets += reward.characterTickets;
              playerState.value.knowledgePoints += reward.knowledge;
              addLog(`升级奖励：${reward.animeTickets}动画券 + ${reward.characterTickets}角色券 + ${reward.knowledge}知识点`, 'success');
            }
          }
        }
        
        addLog(`成功购买 ${item.name}！获得 ${item.quantity || 0} 经验值`, 'success');
        break;

      default:
        addLog(`成功购买 ${item.name}！`, 'success');
        break;
    }

    saveStateToServer();
    return Promise.resolve();
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

  // --- 角色养成系统方法 ---
  
  // 随机分配属性点的辅助函数
  function distributeRandomAttributes(totalPoints: number): { charm: number; intelligence: number; strength: number } {
    const attributes = ['charm', 'intelligence', 'strength'] as const;
    const distribution = { charm: 0, intelligence: 0, strength: 0 };
    
    let remainingPoints = totalPoints;
    
    // 确保每个属性至少分配到一些点数
    for (const attr of attributes) {
      const minPoints = Math.floor(totalPoints * 0.1); // 至少10%
      const maxPoints = Math.floor(totalPoints * 0.6); // 最多60%
      const points = Math.min(
        Math.max(minPoints, Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints),
        remainingPoints - (attributes.length - attributes.indexOf(attr) - 1)
      );
      distribution[attr] = points;
      remainingPoints -= points;
    }
    
    // 将剩余点数随机分配
    while (remainingPoints > 0) {
      const randomAttr = attributes[Math.floor(Math.random() * attributes.length)];
      distribution[randomAttr]++;
      remainingPoints--;
    }
    
    return distribution;
  }
  
  // 获取角色养成数据，如果不存在则创建默认数据
  function getNurtureData(characterId: number): CharacterNurtureData {
    if (!characterNurtureData.value.has(characterId)) {
      const defaultData: CharacterNurtureData = {
        affection: 0,
        intimacy: 0,
        lastInteraction: '',
        totalInteractions: 0,
        dialogueHistory: [],
        gifts: [],
        specialEvents: [],
        // 角色等级系统默认值
        level: 1,
        experience: 0,
        totalExperience: 0,
        attributes: {
          charm: 50,
          intelligence: 50,
          strength: 50,
          mood: 80
        },
        levelBonusAttributes: {
          charm: 0,
          intelligence: 0,
          strength: 0
        },
        battleEnhancements: {
          hp: 0,
          atk: 0,
          def: 0,
          sp: 0,
          spd: 0
        },
        preferences: {
          favoriteTopics: [],
          dislikedTopics: [],
          favoriteGifts: []
        }
      };
      characterNurtureData.value.set(characterId, defaultData);
    }
    
    const data = characterNurtureData.value.get(characterId)!;
    
    // 确保levelBonusAttributes字段存在（兼容旧数据）
    if (!data.levelBonusAttributes) {
      data.levelBonusAttributes = {
        charm: 0,
        intelligence: 0,
        strength: 0
      };
    }
    
    // 确保等级与总经验值同步（修复旧数据）
    if (data.totalExperience !== undefined) {
      const maxLevel = 100;
      const correctLevel = Math.min(getLevelFromExp(data.totalExperience), maxLevel);
      if ((data.level || 1) !== correctLevel) {
        const oldLevel = data.level || 1;
        data.level = correctLevel;
        
        // 如果等级发生了变化，需要重新分配属性
        if (correctLevel > oldLevel && correctLevel <= maxLevel) {
          let totalCharmGain = 0;
          let totalIntGain = 0;
          let totalStrGain = 0;
          
          // 为错过的等级补发属性
          for (let level = oldLevel + 1; level <= correctLevel; level++) {
            const totalPoints = level * 10;
            const randomBonus = distributeRandomAttributes(totalPoints);
            
            data.levelBonusAttributes.charm += randomBonus.charm;
            data.levelBonusAttributes.intelligence += randomBonus.intelligence;
            data.levelBonusAttributes.strength += randomBonus.strength;
            
            totalCharmGain += randomBonus.charm;
            totalIntGain += randomBonus.intelligence;
            totalStrGain += randomBonus.strength;
          }
          
          // 如需要可以在这里添加升级日志
          if (correctLevel > oldLevel + 1) {
            addLog(`角色等级自动同步：Lv.${oldLevel} → Lv.${correctLevel}，获得随机属性加成！`, 'success');
          }
        }
      }
    }
    
    return data;
  }

  // 增加好感度 (无上限)
  function increaseAffection(characterId: number, amount: number) {
    if (!isLoggedIn.value) return;
    
    const nurtureData = getNurtureData(characterId);
    const oldAffection = nurtureData.affection;
    nurtureData.affection = nurtureData.affection + amount; // 移除上限限制
    nurtureData.lastInteraction = new Date().toISOString();
    nurtureData.totalInteractions++;
    
    // 给予经验值奖励 (互动给予少量经验)
    const expReward = amount * 5; // 每点好感度给5经验
    addCharacterExp(characterId, expReward);

    const gameDataStore = useGameDataStore();
    const character = gameDataStore.getCharacterCardById(characterId);
    
    if (character) {
      addLog(`与 ${character.name} 的好感度增加了 ${amount} 点！`, 'success');
      
      // 检查是否达到了新的好感度等级
      // TODO: 实现等级提升奖励和事件解锁
    }
    
    saveStateToServer();
  }

  // 进行对话互动
  function interactWithCharacter(characterId: number, dialogueId: string) {
    if (!isLoggedIn.value) return;
    
    const nurtureData = getNurtureData(characterId);
    nurtureData.dialogueHistory.push(dialogueId);
    nurtureData.lastInteraction = new Date().toISOString();
    nurtureData.totalInteractions++;
    
    // TODO: 根据对话内容调整好感度和心情
    // TODO: 解锁新的对话选项
    
    saveStateToServer();
  }

  // 送礼物
  function giveGift(characterId: number, giftId: string) {
    if (!isLoggedIn.value) return;
    
    const nurtureData = getNurtureData(characterId);
    nurtureData.gifts.push(giftId);
    
    // TODO: 根据角色偏好计算礼物效果
    // TODO: 实现礼物系统和效果计算
    
    const gameDataStore = useGameDataStore();
    const character = gameDataStore.getCharacterCardById(characterId);
    
    if (character) {
      addLog(`向 ${character.name} 送出了礼物！`, 'success');
    }
    
    saveStateToServer();
  }

  // 提升角色属性
  function enhanceAttribute(characterId: number, attribute: keyof CharacterNurtureData['attributes'], amount: number) {
    if (!isLoggedIn.value) return;
    
    const nurtureData = getNurtureData(characterId);
    const oldValue = nurtureData.attributes[attribute];
    nurtureData.attributes[attribute] = Math.min(100, oldValue + amount);
    
    // 给予经验值奖励 (基础训练给予中等经验)
    const expReward = amount * 15; // 每点属性给15经验
    addCharacterExp(characterId, expReward);
    
    const gameDataStore = useGameDataStore();
    const character = gameDataStore.getCharacterCardById(characterId);
    
    if (character) {
      const attrName = {
        charm: '魅力',
        intelligence: '智力',
        strength: '体力',
        mood: '心情'
      }[attribute] || attribute;
      addLog(`${character.name} 的${attrName}提升了 ${amount} 点！`, 'success');
    }
    
    saveStateToServer();
  }

  // 提升角色战斗属性
  function enhanceBattleStat(characterId: number, stat: keyof CharacterNurtureData['battleEnhancements'], amount: number) {
    console.log('enhanceBattleStat called with FIXED VERSION:', { characterId, stat, amount });
    if (!isLoggedIn.value) return;
    
    try {
      const nurtureData = getNurtureData(characterId);
      
      // 确保 battleEnhancements 属性完整初始化
      if (!nurtureData.battleEnhancements) {
        nurtureData.battleEnhancements = {
          hp: 0,
          atk: 0,
          def: 0,
          sp: 0,
          spd: 0
        };
      }
      
      // 确保所有属性都存在
      const validStats = ['hp', 'atk', 'def', 'sp', 'spd'] as const;
      for (const validStat of validStats) {
        if (nurtureData.battleEnhancements[validStat] === undefined) {
          nurtureData.battleEnhancements[validStat] = 0;
        }
      }
      
      const oldValue = nurtureData.battleEnhancements[stat] || 0;
      nurtureData.battleEnhancements[stat] = Math.min(100, oldValue + amount);
    } catch (error) {
      console.error('Error in enhanceBattleStat:', error, { characterId, stat, amount });
      const errorMessage = error instanceof Error ? error.message : String(error);
      addLog(`战斗属性提升失败：${errorMessage}`, 'warning');
      return;
    }
    
    // 给予经验值奖励 (战斗训练给予更高经验)
    const expReward = amount * 25; // 每点战斗属性给25经验
    addCharacterExp(characterId, expReward);
    
    const gameDataStore = useGameDataStore();
    const character = gameDataStore.getCharacterCardById(characterId);
    
    if (character) {
      const statName = {
        hp: '生命值',
        atk: '攻击力',
        def: '防御力',
        sp: 'SP值',
        spd: '速度'
      }[stat] || stat;
      addLog(`${character.name} 的${statName}加成提升了 ${amount}%！`, 'success');
    }
    
    saveStateToServer();
  }

  // 获取角色最终战斗属性 (原始属性 + 百分比加成)
  function getEnhancedBattleStats(characterId: number) {
    const gameDataStore = useGameDataStore();
    const character = gameDataStore.getCharacterCardById(characterId);
    if (!character?.battle_stats) return null;

    const nurtureData = getNurtureData(characterId);
    const baseStats = character.battle_stats;
    const enhancements = nurtureData.battleEnhancements;

    return {
      hp: Math.floor(baseStats.hp * (1 + enhancements.hp / 100)),
      atk: Math.floor(baseStats.atk * (1 + enhancements.atk / 100)),
      def: Math.floor(baseStats.def * (1 + enhancements.def / 100)),
      sp: Math.floor(baseStats.sp * (1 + enhancements.sp / 100)),
      spd: Math.floor(baseStats.spd * (1 + enhancements.spd / 100))
    };
  }

  // === 角色等级系统 ===

  // 计算等级所需的经验值 (使用 level^2 * 1000 公式)
  function getRequiredExpForLevel(level: number): number {
    if (level <= 1) return 0;
    return (level - 1) * (level - 1) * 1000;
  }

  // 根据总经验值计算当前等级
  function getLevelFromExp(totalExp: number): number {
    let level = 1;
    while (getRequiredExpForLevel(level + 1) <= totalExp) {
      level++;
    }
    return level;
  }

  // 获取当前等级的经验值进度 (当前等级内的经验 / 升下一级需要的经验)
  function getLevelProgress(nurtureData: CharacterNurtureData): { current: number; required: number; percentage: number } {
    // 确保数据有效性
    const currentLevel = nurtureData.level || 1;
    const totalExp = nurtureData.totalExperience || 0;
    
    const currentLevelExpStart = getRequiredExpForLevel(currentLevel);
    const nextLevelExpStart = getRequiredExpForLevel(currentLevel + 1);
    
    const currentLevelExp = Math.max(0, totalExp - currentLevelExpStart);
    const requiredForNext = nextLevelExpStart - currentLevelExpStart;
    
    // 防止除零错误
    const percentage = requiredForNext > 0 ? (currentLevelExp / requiredForNext) * 100 : 0;
    
    return {
      current: currentLevelExp,
      required: requiredForNext,
      percentage: Math.min(100, Math.max(0, percentage))
    };
  }

  // 增加经验值并处理等级提升
  function addCharacterExp(characterId: number, expAmount: number) {
    if (!isLoggedIn.value || expAmount <= 0) return;
    
    const nurtureData = getNurtureData(characterId);
    const oldLevel = nurtureData.level;
    
    // 增加经验值
    nurtureData.experience += expAmount;
    nurtureData.totalExperience += expAmount;
    
    // 计算新等级 (最大等级100)
    const maxLevel = 100;
    const newLevel = Math.min(getLevelFromExp(nurtureData.totalExperience), maxLevel);
    
    if (newLevel > oldLevel && newLevel <= maxLevel) {
      // 等级提升
      nurtureData.level = newLevel;
      const levelGain = newLevel - oldLevel;
      
      const gameDataStore = useGameDataStore();
      const character = gameDataStore.getCharacterCardById(characterId);
      
      if (character) {
        let totalCharmGain = 0;
        let totalIntGain = 0;
        let totalStrGain = 0;
        
        // 为每一级分配随机属性点 (等级 * 10)
        for (let level = oldLevel + 1; level <= newLevel; level++) {
          const totalPoints = level * 10;
          const randomBonus = distributeRandomAttributes(totalPoints);
          
          nurtureData.levelBonusAttributes.charm += randomBonus.charm;
          nurtureData.levelBonusAttributes.intelligence += randomBonus.intelligence;
          nurtureData.levelBonusAttributes.strength += randomBonus.strength;
          
          totalCharmGain += randomBonus.charm;
          totalIntGain += randomBonus.intelligence;
          totalStrGain += randomBonus.strength;
        }
        
        const totalGainMsg = `魅力+${totalCharmGain}, 智力+${totalIntGain}, 体力+${totalStrGain}`;
        
        addLog(`🎉 ${character.name} 等级提升！Lv.${oldLevel} → Lv.${newLevel}`, 'success');
        addLog(`随机属性分配：${totalGainMsg}`, 'info');
        
        if (newLevel >= maxLevel) {
          addLog(`🏆 ${character.name} 已达到满级！(Lv.${maxLevel})`, 'success');
        }
      }
    }
    
    // 重置当前等级的经验值显示
    const levelProgress = getLevelProgress(nurtureData);
    nurtureData.experience = levelProgress.current;
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
    purchaseShopItem,
    dismantleCard,
    dismantleAllDuplicates,
    toggleFavorite,
    // 养成系统
    characterNurtureData,
    getNurtureData,
    increaseAffection,
    interactWithCharacter,
    giveGift,
    enhanceAttribute,
    enhanceBattleStat,
    getEnhancedBattleStats,
    // 角色等级系统
    getRequiredExpForLevel,
    getLevelFromExp,
    getLevelProgress,
    addCharacterExp,
    
    // 预设小队系统
    presetSquads: presetSquads,
    
    // 预设小队操作函数
    updateSquadMember(squadId: number, position: number, characterId: number | null) {
      const squad = presetSquads.value.find((s: PresetSquad) => s.id === squadId);
      if (squad && position >= 0 && position < 4) {
        squad.members[position] = characterId;
        squad.lastUsed = new Date().toISOString();
      }
    },
    
    updateSquadName(squadId: number, newName: string) {
      const squad = presetSquads.value.find((s: PresetSquad) => s.id === squadId);
      if (squad) {
        squad.name = newName;
      }
    },
    
    getSquadMembers(squadId: number): (number | null)[] {
      const squad = presetSquads.value.find((s: PresetSquad) => s.id === squadId);
      return squad ? [...squad.members] : [null, null, null, null];
    },

    // 爬塔系统
    towerProgress: towerProgress,
    
    // 获取当前可挑战的层数
    getCurrentChallengeFloor(): number {
      return towerProgress.value.currentFloor;
    },
    
    // 完成某层挑战
    completeFloor(floor: number) {
      if (floor === towerProgress.value.currentFloor) {
        towerProgress.value.currentFloor = Math.min(floor + 1, 999); // 最高999层
        towerProgress.value.maxFloor = Math.max(towerProgress.value.maxFloor, floor);
        addLog(`成功通过第${floor}层！`, 'success');
      }
    },
    
    // 检查某层是否已完成
    hasCompletedFloor(floor: number): boolean {
      return floor < towerProgress.value.currentFloor;
    },
    
    // 检查今日挑战次数（已移除限制）
    canAttemptToday(): boolean {
      return true; // 移除每日挑战次数限制
    },
    
    // 记录挑战尝试
    recordTowerAttempt() {
      // 移除每日挑战次数记录，无限挑战
      return;
    }
  };
});
