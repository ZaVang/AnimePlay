/**
 * userStore —— 兼容门面（S5 拆分后）。状态与逻辑在领域 store（profile/collection/deck/
 * viewing/nurture/pve/gachaStore），持久化装配在 stores/persistence.ts。本文件只做：
 * ① 维持既有组件调用面（新代码请直接用领域 store）；② 跨域编排（抽卡/商店/会话）；
 * ③ 动作完成后统一触发 saveToServer（领域 store 自身不保存）。
 */
import { defineStore } from 'pinia';
import { computed, reactive } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';
import { getCodexUnlockPrice } from '@/config/codexUnlock';
import { computeIdleYield, type IdleYield } from '@/config/homestead';
import { MAX_CHARACTER_LEVEL } from '@/engine';
import { type ShopItem } from '@/utils/gachaRotation';
import type { CurrencyKey, Deck } from '@/types/player';
import type { Rarity } from '@/types/card';
import { useGachaStore, type DrawnCard } from './gachaStore';
import { useGameDataStore } from './gameDataStore';
import { useProfileStore } from './profile';
import { useCollectionStore, type CardDomain } from './collection';
import { useDeckStore } from './deck';
import { useViewingStore } from './viewing';
import { useNurtureStore } from './nurture';
import { usePveStore } from './pve';
import { useShopStore } from './shop';
import { useGuessStore } from './guess';
import { useMiniGamesStore } from './minigames/higherLower';
import { useHomesteadStore } from './homestead';
import { useThemeStore } from './theme';
import { useDailyStore } from './daily';
import { useCodexStore } from './codex';
import { useAchievementsStore } from './achievements';
import { saveToServer, loadFromServer, resetAllDomains } from './persistence';
import { loginRequest, setAuthToken, clearAuthToken } from '@/infra/persistence';

// 类型转发（历史 import 路径兼容）
export type { Deck, ViewingQueueSlot, LogEntry, GachaHistoryItem, PresetSquad, TowerProgress } from '@/types/player';
export type { CharacterNurtureData } from '@/types/nurture';
export type { DrawnCard } from './gachaStore';

export const useUserStore = defineStore('user', () => {
  const profile = useProfileStore();
  const collection = useCollectionStore();
  const deck = useDeckStore();
  const viewing = useViewingStore();
  const nurture = useNurtureStore();
  const pve = usePveStore();

  // --- playerState 兼容桥：字段读写直通各领域 store（货币写入请走 spend/earn） ---
  const playerState = reactive({
    get level() { return profile.core.level; }, set level(v: number) { profile.core.level = v; },
    get exp() { return profile.core.exp; }, set exp(v: number) { profile.core.exp = v; },
    get animeGachaTickets() { return profile.core.animeGachaTickets; }, set animeGachaTickets(v: number) { profile.core.animeGachaTickets = v; },
    get characterGachaTickets() { return profile.core.characterGachaTickets; }, set characterGachaTickets(v: number) { profile.core.characterGachaTickets = v; },
    get knowledgePoints() { return profile.core.knowledgePoints; }, set knowledgePoints(v: number) { profile.core.knowledgePoints = v; },
    get savedDecks() { return deck.savedDecks; },
    get viewingQueue() { return viewing.viewingQueue; },
    get watchedAnime() { return viewing.watchedAnime; },
    get viewingStats() { return viewing.viewingStats; },
  });

  // --- 会话 ---

  /**
   * 登录/首次注册（claim-on-first-login）。
   * 返回 { ok, error }：失败时不进入登录态（不设 currentUser、不挂 token）。
   */
  async function login(username: string, password: string, invite?: string): Promise<{ ok: boolean; error?: string }> {
    if (!username || !username.match(/^[a-zA-Z0-9]+$/)) {
      return { ok: false, error: '用户名只能包含字母和数字。' };
    }
    if (!password) {
      return { ok: false, error: '请输入密码。' };
    }
    try {
      const { token } = await loginRequest(username, password, invite);
      setAuthToken(token); // token 先挂上，后续 loadFromServer 才能带鉴权头
      profile.currentUser = username;
      await loadFromServer();
      // 家园离线结算（S13-B）：登录拉档后结算一次挂机收益（首次只建基线、不补发）
      settleHomestead();
      // 每日登录奖励（evolution-1）：跨天首次登录发放一次，发了就落盘
      if (useDailyStore().claimLoginReward()) {
        saveToServer();
      }
      return { ok: true };
    } catch (error) {
      // 401/网络失败：清理任何半登录态
      clearAuthToken();
      profile.currentUser = '';
      const message = error instanceof Error ? error.message : '登录失败，请重试。';
      return { ok: false, error: message };
    }
  }

  async function logout() {
    profile.addLog('已登出，再见！', 'info');
    await saveToServer(false);
    profile.currentUser = '';
    clearAuthToken();
    resetAllDomains();
  }

  // --- 抽卡编排：券 → 抽取 → 入库 → 经验 → 历史 ---

  async function drawCards(gachaType: 'anime' | 'character', count: number): Promise<DrawnCard[] | null> {
    if (!profile.isLoggedIn) {
      // 脱离组件上下文：降级为非阻塞 toast（复用 addLog 通知通道），不弹原生 alert。
      profile.addLog('请先登录！', 'warning');
      return null;
    }
    const ticketType: CurrencyKey = gachaType === 'anime' ? 'animeGachaTickets' : 'characterGachaTickets';
    if (profile.core[ticketType] < count) {
      profile.addLog(`${gachaType === 'anime' ? '动画券' : '角色券'}不足！`, 'warning');
      return null;
    }

    const gachaStore = useGachaStore();
    const gameDataStore = useGameDataStore();
    const drawnCards = gachaStore.performGachaLogic(gachaType, count);

    profile.spend(ticketType, count);
    profile.addLog(`进行了 ${count} 次${gachaType === 'anime' ? '动画' : '角色'}抽卡。`, 'info');

    drawnCards.forEach((card: DrawnCard) => {
      const cardData = gachaType === 'anime'
        ? gameDataStore.getAnimeCardById(card.id)
        : gameDataStore.getCharacterCardById(card.id);

      const { isNew } = collection.addCard(card.id, gachaType);
      if (isNew) {
        card.isNew = true;
        profile.addLog(`首次获得新卡: [${card.rarity}] ${cardData?.name}`, 'success');
      } else {
        card.isDuplicate = true;
      }
      if (['SSR', 'HR', 'UR'].includes(card.rarity)) {
        profile.addLog(`🎉 恭喜！抽到了稀有卡: [${card.rarity}] ${cardData?.name}`, 'gacha');
      }
    });

    const expConfig = gachaType === 'anime' ? GAME_CONFIG.gameplay.animeGachaEXP : GAME_CONFIG.gameplay.characterGachaEXP;
    profile.addExp(count > 1 ? expConfig.multi : expConfig.single);

    gachaStore.pushHistory(
      gachaType,
      drawnCards.map(card => ({ id: card.id, rarity: card.rarity, timestamp: Date.now() })),
    );
    gachaStore.lastResult = drawnCards;

    // 留存埋点（evolution-1）：每日任务进度 + 成就检测（一次抽卡算 1 次任务进度）
    useDailyStore().markProgress('gacha', 1);
    useAchievementsStore().check('gacha', { rarities: drawnCards.map(c => c.rarity) });

    saveToServer();
    return drawnCards;
  }

  // --- 商店编排 ---
  // 注：知识点→卡牌的购买路径已删除，统一收口到「图鉴定向解锁」（unlockCodexCard）。
  // 商店只售非卡牌道具（券/药水/知识点包）。

  function purchaseShopItem(item: ShopItem) {
    if (!profile.isLoggedIn) {
      // 脱离组件上下文：降级为非阻塞 toast。
      profile.addLog('请先登录！', 'warning');
      return Promise.reject(new Error('未登录'));
    }
    // S6: 每日限购真实计数
    const shop = useShopStore();
    if (!shop.canPurchase(item.id, item.dailyLimit)) {
      profile.addLog(`「${item.name}」今日限购 ${item.dailyLimit} 次已用完，明天再来吧！`, 'warning');
      return Promise.reject(new Error('今日限购已用完'));
    }
    if (!profile.spend('knowledgePoints', item.cost)) {
      profile.addLog('知识点不足，无法购买！', 'warning');
      return Promise.reject(new Error('知识点不足'));
    }
    shop.recordPurchase(item.id);

    switch (item.type) {
      case 'ticket':
        if (item.id.includes('anime')) {
          profile.earn('animeGachaTickets', item.quantity || 1);
          profile.addLog(`成功购买 ${item.name}！获得 ${item.quantity || 1} 张动画抽卡券`, 'success');
        } else if (item.id.includes('character')) {
          profile.earn('characterGachaTickets', item.quantity || 1);
          profile.addLog(`成功购买 ${item.name}！获得 ${item.quantity || 1} 张角色抽卡券`, 'success');
        }
        break;

      case 'currency':
        profile.earn('knowledgePoints', item.quantity || 0);
        profile.addLog(`成功购买 ${item.name}！获得 ${item.quantity || 0} 知识点`, 'success');
        break;

      case 'booster': {
        // 经验药水：沿用原有的直加经验 + 等级走表逻辑（与 addExp 的扣减式升级并存是历史行为，S6 商店重构时统一）
        profile.core.exp += item.quantity || 0;
        let targetLevel = profile.core.level;
        const levelXP = GAME_CONFIG.gameplay.levelXP;
        while (targetLevel < levelXP.length && profile.core.exp >= levelXP[targetLevel]) {
          targetLevel++;
        }
        if (targetLevel > profile.core.level) {
          const oldLevel = profile.core.level;
          profile.core.level = targetLevel;
          profile.addLog(`恭喜！等级提升至 Lv.${targetLevel}！`, 'success');
          for (let level = oldLevel + 1; level <= targetLevel; level++) {
            const reward = GAME_CONFIG.gameplay.levelUpRewards[level.toString()];
            if (reward) {
              profile.earn('animeGachaTickets', reward.animeTickets);
              profile.earn('characterGachaTickets', reward.characterTickets);
              profile.earn('knowledgePoints', reward.knowledge);
              profile.addLog(`升级奖励：${reward.animeTickets}动画券 + ${reward.characterTickets}角色券 + ${reward.knowledge}知识点`, 'success');
            }
          }
        }
        profile.addLog(`成功购买 ${item.name}！获得 ${item.quantity || 0} 经验值`, 'success');
        break;
      }

      default:
        profile.addLog(`成功购买 ${item.name}！`, 'success');
        break;
    }

    saveToServer();
    return Promise.resolve();
  }

  // --- 图鉴定向解锁编排（evolution-2 / E2-T1）：花知识点直接入库一张心仪卡 ---

  /**
   * 用知识点定向解锁一张图鉴卡（CodexPanel 灰位未拥有卡可点击发起）。
   * 编排：登录校验 → 已拥有则拒（不重复购买）→ spend('knowledgePoints', 定价)
   * 失败给提示不发货 → collection.addCard 入库 → 日志 → codex 收藏家成就联动 → saveToServer。
   * 完成度是纯派生（codex.ts），addCard 后自动 +1，无需新存档字段。
   * 返回 { ok, error? } 供 UI/测试断言（不在此弹 alert，文案由调用方决定）。
   */
  function unlockCodexCard(cardId: number, domain: CardDomain): { ok: boolean; error?: string } {
    if (!profile.isLoggedIn) {
      return { ok: false, error: '请先登录！' };
    }
    const card = domain === 'anime'
      ? useGameDataStore().getAnimeCardById(cardId)
      : useGameDataStore().getCharacterCardById(cardId);
    if (!card) {
      profile.addLog('解锁失败，卡片不存在。', 'warning');
      return { ok: false, error: '卡片不存在。' };
    }
    // 已拥有则拒（避免把定向解锁当成刷重复卡的入口）
    const owned = domain === 'anime'
      ? collection.getAnimeCardCount(cardId)
      : collection.getCharacterCardCount(cardId);
    if (owned > 0) {
      profile.addLog(`已拥有 [${card.rarity}] ${card.name}，无需解锁。`, 'info');
      return { ok: false, error: '已拥有该卡。' };
    }
    const price = getCodexUnlockPrice(card.rarity);
    if (!profile.spend('knowledgePoints', price)) {
      profile.addLog(`知识点不足，解锁 [${card.rarity}] ${card.name} 需 ${price} 知识点。`, 'warning');
      return { ok: false, error: '知识点不足。' };
    }
    collection.addCard(cardId, domain);
    profile.addLog(`花费 ${price} 知识点，定向解锁 [${card.rarity}] ${card.name}！`, 'success');
    // 完成度纯派生（codex.ts）：addCard 后图鉴完成度 / 里程碑达成态自动 +1，无需在此手动联动。
    saveToServer();
    return { ok: true };
  }

  // --- 猜角色：游戏逻辑在 guess store，这里编排经济奖励与存档（S6 接入主经济） ---

  function submitGuess(guess: string): { correct: boolean; message: string; knowledgeAwarded: number } {
    const guessStore = useGuessStore();
    const result = guessStore.guessCharacter(guess);
    let knowledgeAwarded = 0;

    if (result.correct) {
      if (profile.isLoggedIn) {
        // 得分换知识点：score / 2 向下取整（与单张卡分解值同量级）
        knowledgeAwarded = Math.floor(guessStore.currentScore / 2);
        if (knowledgeAwarded > 0) {
          profile.earn('knowledgePoints', knowledgeAwarded);
          profile.addLog(`猜角色得分 ${guessStore.currentScore}，兑换 ${knowledgeAwarded} 知识点！`, 'success');
        }
        // 留存埋点（evolution-1）：猜对成就（连对/累计）
        useAchievementsStore().check('guess');
        saveToServer(); // 最高分/知识点可能更新
      }
    } else if (profile.isLoggedIn) {
      // 猜错打断连对计数（不存档：streak 是会话态）
      useAchievementsStore().resetGuessStreak();
    }

    return { ...result, knowledgeAwarded };
  }

  // --- 高低牌：游戏逻辑在 minigames store，这里编排经济（每日封顶在 store）与存档 ---

  function settleHigherLower(): { score: number; streak: number; knowledgeAwarded: number } {
    const minigames = useMiniGamesStore();
    const { score, streak, kpToAward } = minigames.settle();
    if (profile.isLoggedIn) {
      if (kpToAward > 0) {
        profile.earn('knowledgePoints', kpToAward);
        profile.addLog(`高低牌 ${streak} 连胜，兑换 ${kpToAward} 知识点！`, 'success');
      }
      // 留存埋点（evolution-7）：小游戏每日/周任务 + 成就（焊接小游戏进留存引擎）
      useDailyStore().markProgress('minigame', 1);
      useAchievementsStore().check('minigame', { streak });
      saveToServer(); // 最高分/连胜/局数/封顶记账更新
    }
    return { score, streak, knowledgeAwarded: kpToAward };
  }

  function settleQuiz(): { score: number; streak: number; knowledgeAwarded: number } {
    const minigames = useMiniGamesStore();
    const { score, streak, kpToAward } = minigames.settleQuiz();
    if (profile.isLoggedIn) {
      if (kpToAward > 0) {
        profile.earn('knowledgePoints', kpToAward);
        profile.addLog(`番剧问答答对 ${streak} 题，兑换 ${kpToAward} 知识点！`, 'success');
      }
      useDailyStore().markProgress('minigame', 1);
      useAchievementsStore().check('minigame', { streak });
      saveToServer();
    }
    return { score, streak, knowledgeAwarded: kpToAward };
  }

  /** 每日挑战结算：每日首通发奖（不占小游戏共享封顶）+ 推进小游戏任务/成就 + 存档。 */
  function settleDailyChallenge(): { score: number; knowledgeAwarded: number; alreadyDone: boolean } {
    const minigames = useMiniGamesStore();
    const { score, kpToAward, alreadyDone } = minigames.settleDailyChallenge();
    if (profile.isLoggedIn && !alreadyDone) {
      if (kpToAward > 0) {
        profile.earn('knowledgePoints', kpToAward);
        profile.addLog(`每日挑战完成，答对 ${score} 题，兑换 ${kpToAward} 知识点！`, 'success');
      }
      useDailyStore().markProgress('minigame', 1);
      useAchievementsStore().check('minigame', { streak: score });
      saveToServer();
    }
    return { score, knowledgeAwarded: kpToAward, alreadyDone };
  }

  // 品味画像（evolution-10）：勾选/清空「看过」的番剧，持久化（未登录时 saveToServer 静默跳过，仅会话内有效）。
  function toggleTasteWatched(animeId: number) {
    useMiniGamesStore().toggleTasteWatched(animeId);
    saveToServer();
  }

  function clearTasteWatched() {
    useMiniGamesStore().clearTasteWatched();
    saveToServer();
  }

  // --- 家园挂机离线结算（S13-B）：跨域编排（homestead 入住 + gameData 稀有度 + nurture 成长 + profile 货币） ---

  /**
   * 把上次结算到现在的挂机收益落地，返回收益摘要供 UI（离线收益弹窗）。
   * 经验走 nurture.addCharacterExp（含升级播报）、好感走静默 nurture.addIdleAffection、
   * 知识点经唯一货币入口 profile.earn。首次（lastSettleAt=0）只建立基线、不补发历史；
   * 未登录直接返回零。无论是否有产出都推进 lastSettleAt，避免已结算时间被重复计入。
   */
  function settleHomestead(): IdleYield {
    const homestead = useHomesteadStore();
    const placed = homestead.placedCharacterIds;
    const empty: IdleYield = { hours: 0, expEach: 0, affectionEach: 0, knowledge: 0, characterCount: placed.length };
    if (!profile.isLoggedIn) return empty;

    const now = Date.now();
    if (homestead.lastSettleAt === 0) {
      homestead.setLastSettleAt(now); // 首次建立基线，不补发
      return empty;
    }

    const gameData = useGameDataStore();
    const rarities = placed
      .map(id => gameData.getCharacterCardById(id)?.rarity)
      .filter((r): r is Rarity => !!r);
    const result = computeIdleYield(rarities, now - homestead.lastSettleAt);
    homestead.setLastSettleAt(now);

    if (result.expEach <= 0 && result.affectionEach <= 0 && result.knowledge <= 0) return result;

    for (const id of placed) {
      if (result.expEach > 0) nurture.addCharacterExp(id, result.expEach);
      if (result.affectionEach > 0) nurture.addIdleAffection(id, result.affectionEach);
    }
    if (result.knowledge > 0) profile.earn('knowledgePoints', result.knowledge);
    profile.addLog(
      `家园挂机 ${result.hours.toFixed(1)}h：全员 +${result.expEach} 经验 / +${result.affectionEach} 好感，合计 +${result.knowledge} 知识点`,
      'success',
    );
    saveToServer();
    return result;
  }

  // --- 各领域委托（动作完成后统一触发存档） ---

  const withSave = <A extends unknown[]>(fn: (...args: A) => unknown) => (...args: A) => {
    fn(...args);
    saveToServer();
  };

  /**
   * 养成互动包装（evolution-1）：执行底层养成动作 + 留存埋点 + 存档。
   * 第一参数约定为 characterId（三个互动入口同签名），用于满级成就判定。
   */
  const withNurtureProgress =
    <A extends [number, ...unknown[]]>(fn: (...args: A) => unknown) =>
    (...args: A) => {
      if (!profile.isLoggedIn) {
        fn(...args);
        return;
      }
      fn(...args);
      const characterId = args[0];
      useDailyStore().markProgress('nurture', 1);
      const isMaxLevel = (nurture.getNurtureData(characterId)?.level ?? 0) >= MAX_CHARACTER_LEVEL;
      useAchievementsStore().check('nurture', { characterMaxLevel: isMaxLevel });
      saveToServer();
    };

  return {
    // profile
    currentUser: computed(() => profile.currentUser),
    playerState,
    logs: computed(() => profile.logs),
    isLoggedIn: computed(() => profile.isLoggedIn),
    expToNextLevel: computed(() => profile.expToNextLevel),
    addLog: profile.addLog,
    // 货币唯一入口（委托 profile）
    spend: (currency: CurrencyKey, amount: number) => profile.spend(currency, amount),
    earn: (currency: CurrencyKey, amount: number) => profile.earn(currency, amount),
    addExp: (amount: number) => {
      profile.addExp(amount);
      saveToServer();
    },
    login,
    logout,
    saveStateToServer: saveToServer,

    // gacha
    drawCards,
    animeGachaHistory: computed(() => useGachaStore().animeHistory),
    characterGachaHistory: computed(() => useGachaStore().characterHistory),

    // collection
    animeCollection: computed(() => collection.animeCollection),
    characterCollection: computed(() => collection.characterCollection),
    favoriteAnime: computed(() => collection.favoriteAnime),
    favoriteCharacters: computed(() => collection.favoriteCharacters),
    getAnimeCardCount: computed(() => collection.getAnimeCardCount),
    getCharacterCardCount: computed(() => collection.getCharacterCardCount),
    isFavorite: computed(() => collection.isFavorite),
    dismantleCard: withSave(collection.dismantleCard),
    dismantleAllDuplicates: (cardType: CardDomain) => {
      if (collection.dismantleAllDuplicates(cardType)) saveToServer();
    },
    toggleFavorite: (cardId: number, cardType: CardDomain) => {
      if (collection.toggleFavorite(cardId, cardType)) saveToServer();
    },

    // deck
    savedDecks: computed(() => deck.savedDecks),
    saveDeck: async (d: Deck) => {
      if (!profile.isLoggedIn) return;
      deck.saveDeck(d);
      await saveToServer();
    },
    deleteDeck: async (deckName: string) => {
      if (!profile.isLoggedIn) return;
      if (deck.deleteDeck(deckName)) await saveToServer();
    },

    // viewing
    VIEWING_REWARDS: GAME_CONFIG.gameplay.viewingQueue.rewards,
    addToViewingQueue: (animeId: number, slotIndex: number) => {
      if (viewing.addToViewingQueue(animeId, slotIndex)) saveToServer();
    },
    collectFromViewingQueue: (slotIndex: number) => {
      if (viewing.collectFromViewingQueue(slotIndex)) {
        // 留存埋点（evolution-1）：每日任务 + 成就（用返回值守卫，未到时间不记）
        useDailyStore().markProgress('watch', 1);
        useAchievementsStore().check('watch');
        saveToServer();
      }
    },

    // shop（S6 限购）
    purchaseShopItem,
    shopRemainingToday: (itemId: string, dailyLimit?: number) => useShopStore().remainingToday(itemId, dailyLimit),

    // guess（S6 接入经济）
    submitGuess,
    settleHigherLower,
    settleQuiz,
    settleDailyChallenge,
    toggleTasteWatched,
    clearTasteWatched,

    // homestead（S13-B）：家园离线结算（登录时自动调；UI 进家园也会调，见 slice 3）
    settleHomestead,

    // daily（evolution-1）：领取每日任务奖励（领域 store 自己不存档）
    claimDailyTask: (taskId: string) => {
      if (useDailyStore().claim(taskId)) saveToServer();
    },

    // daily（B1）：领取周任务奖励（领域 store 自己不存档）
    claimWeeklyTask: (taskId: string) => {
      if (useDailyStore().claimWeekly(taskId)) saveToServer();
    },

    // codex（evolution-2）：图鉴定向解锁（花知识点入库一张心仪卡）
    unlockCodexCard,
    // codex（evolution-1）：领取图鉴里程碑奖励 + 联动「收藏家」成就
    claimCodexMilestone: (milestoneId: string) => {
      if (useCodexStore().claim(milestoneId)) {
        useAchievementsStore().check('codex', { milestoneId });
        saveToServer();
      }
    },

    // appearance（S7 皮肤随账号走；未登录时设置页直接用 theme store）
    setSkin: (skinId: string) => { useThemeStore().setSkin(skinId); saveToServer(); },

    // nurture
    characterNurtureData: computed(() => nurture.characterNurtureData),
    getNurtureData: nurture.getNurtureData,
    increaseAffection: withNurtureProgress(nurture.increaseAffection),
    interactWithCharacter: withNurtureProgress(nurture.interactWithCharacter),
    giveGift: withNurtureProgress(nurture.giveGift),
    enhanceAttribute: withSave(nurture.enhanceAttribute),
    enhanceBattleStat: withSave(nurture.enhanceBattleStat),
    getEnhancedBattleStats: nurture.getEnhancedBattleStats,
    getRequiredExpForLevel: nurture.getRequiredExpForLevel,
    getLevelFromExp: nurture.getLevelFromExp,
    getLevelProgress: nurture.getLevelProgress,
    addCharacterExp: withSave(nurture.addCharacterExp),
    // 训练冷却（S6 持久化）
    setTrainingCooldown: withSave(nurture.setTrainingCooldown),
    getTrainingCooldownRemaining: nurture.getTrainingCooldownRemaining,
    isTrainingOnCooldown: nurture.isTrainingOnCooldown,

    // pve ★ S5 起入存档：小队/塔进度的每次变更都会保存
    presetSquads: computed(() => pve.presetSquads),
    towerProgress: computed(() => pve.towerProgress),
    updateSquadMember: withSave(pve.updateSquadMember),
    updateSquadName: withSave(pve.updateSquadName),
    getSquadMembers: pve.getSquadMembers,
    getCurrentChallengeFloor: pve.getCurrentChallengeFloor,
    completeFloor: (floor: number) => {
      if (pve.completeFloor(floor)) {
        // 留存埋点（evolution-1）：爬塔通层成就（用返回值守卫，floor 不匹配不记）
        useAchievementsStore().check('tower', { floor });
        saveToServer();
      }
    },
    hasCompletedFloor: pve.hasCompletedFloor,
    canAttemptToday: pve.canAttemptToday,
    recordTowerAttempt: pve.recordTowerAttempt,
  };
});
