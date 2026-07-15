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
import { computeIdleYield, facilityUpgradeCost, getFurnitureDef, type FacilityKey, type IdleYield } from '@/config/homestead';
import {
  dropRarityForFloor,
  getEquipmentDef,
  getEquipmentDefsBySlotRarity,
  sumHomeEffects,
  getEquipmentPrice,
  SLOT_PITY_THRESHOLD,
  DROP_CHANCE,
  type EquipmentDef,
} from '@/config/equipment';
import { MAX_CHARACTER_LEVEL, rollTowerDropWithPity, defaultRng } from '@/engine';
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
import { streakReward, useMiniGamesStore } from './minigames/higherLower';
import { useHomesteadStore } from './homestead';
import { useEquipmentStore } from './equipment';
import { useFacilityStore } from './facility';
import { useFurnitureStore } from './furniture';
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
      // 家园挂机收益按 lastSettleAt 虚拟累积，结算时机在「进家园」（HomesteadView onMounted，
      // 带离线收益弹窗）——登录不静默结算，免得把收益悄悄收了、进家园弹窗显示 0。
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

  // --- 装备来源（S13-C2）：塔通层掉落 + 知识点定向兑换 ---

  /**
   * 塔通层掉落（在 completeFloor 推进进度为真的分支内调用，天然防刷低层）。
   * 掉落判定走 engine 纯函数 rollTowerDropWithPity（RNG 注入 + 槽位保底计数注入，engine 纯净、计数留 store）：
   * 连续 SLOT_PITY_THRESHOLD 次判定未出某槽 → 本次强制命中该槽（稀有度仍走层段）。命中槽计数归零、其余 +1。
   * 计数写回 pve.towerProgress.slotPity（v20 持久化，随 completeFloor 同事务 saveToServer）；命中则入库 + 通知。
   * 不自身存档——由 completeFloor 统一在同一事务里 saveToServer。
   */
  function rollFloorDrop(floor: number, rng = defaultRng): EquipmentDef | null {
    const current = pve.towerProgress.slotPity;
    const { drop, pity } = rollTowerDropWithPity(
      floor,
      rng,
      dropRarityForFloor,
      { weapon: current.weapon, armor: current.armor, supporter: current.supporter },
      SLOT_PITY_THRESHOLD,
      DROP_CHANCE,
    );
    // 计数无条件写回（含「判定发生但未掉落 → 各槽 +1」的推进），确保保底逼近可持久化。
    pve.towerProgress.slotPity = pity;
    if (!drop) return null;
    const candidates = getEquipmentDefsBySlotRarity(drop.slot, drop.rarity);
    const def = rng.pick(candidates);
    if (!def) return null; // 该槽位无此稀有度（防御，起始目录全覆盖故正常不触发）
    useEquipmentStore().addItem(def.id);
    profile.addLog(`🎁 通层掉落：[${def.rarity}] ${def.name}！`, 'success');
    return def; // 回传给结算面板展示（见 SquadBattleView endBattle）
  }

  /**
   * 知识点定向兑换一件装备（背包商店点购发起）。照图鉴解锁范式：
   * 登录校验 → spend('knowledgePoints', 价) 失败不发货 → 成功 addItem + 日志 + saveToServer。
   * 返回 { ok, error? } 供 UI/测试断言（不在此弹 alert）。
   */
  function purchaseEquipment(defId: string): { ok: boolean; error?: string } {
    if (!profile.isLoggedIn) {
      return { ok: false, error: '请先登录！' };
    }
    const def = getEquipmentDef(defId);
    if (!def) {
      profile.addLog('兑换失败，装备不存在。', 'warning');
      return { ok: false, error: '装备不存在。' };
    }
    const price = getEquipmentPrice(def.rarity);
    if (price <= 0) {
      return { ok: false, error: '该装备不可兑换。' };
    }
    if (!profile.spend('knowledgePoints', price)) {
      profile.addLog(`知识点不足，兑换 [${def.rarity}] ${def.name} 需 ${price} 知识点。`, 'warning');
      return { ok: false, error: '知识点不足。' };
    }
    useEquipmentStore().addItem(defId);
    profile.addLog(`花费 ${price} 知识点，兑换 [${def.rarity}] ${def.name}！`, 'success');
    saveToServer();
    return { ok: true };
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
    const wasActive = guessStore.isGameActive && !guessStore.isGameOver;
    const result = guessStore.guessCharacter(guess);
    const completedNow = wasActive && guessStore.isGameOver;
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
        // 猜角色专属成就仍只在答对时推进；统一小游戏任务以首次终局为口径。
      }
    } else if (profile.isLoggedIn && wasActive) {
      // 猜错打断连对计数（不存档：streak 是会话态）
      useAchievementsStore().resetGuessStreak();
    }

    if (profile.isLoggedIn && completedNow) {
      useDailyStore().markProgress('minigame', 1);
      saveToServer(); // 最高分、知识点与日/周任务同一次落盘
    } else if (profile.isLoggedIn && result.correct) {
      saveToServer(); // 防御：保持既有答对存档语义
    }

    return { ...result, knowledgeAwarded };
  }

  // --- 高低牌：游戏逻辑在 minigames store，这里编排经济（每日封顶在 store）与存档 ---

  function settleHigherLower(): { score: number; streak: number; knowledgeAwarded: number } {
    const minigames = useMiniGamesStore();
    const isFirstSettlement = minigames.isPlaying;
    if (!isFirstSettlement) {
      return { score: streakReward(minigames.streak), streak: minigames.streak, knowledgeAwarded: 0 };
    }
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
    const isFirstSettlement = minigames.quizPlaying;
    if (!isFirstSettlement) {
      return { score: streakReward(minigames.quizStreak), streak: minigames.quizStreak, knowledgeAwarded: 0 };
    }
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
  function settleHomestead(nowOverride?: number): IdleYield {
    const homestead = useHomesteadStore();
    const placed = homestead.placedCharacterIds;
    const empty: IdleYield = { hours: 0, expEach: 0, affectionEach: 0, knowledge: 0, characterCount: placed.length, comfort: 0, bondHits: [], bondBonusPct: 0 };
    if (!profile.isLoggedIn) return empty;

    // ★ S15-T1 注入时钟接缝：与 engine「RNG 注入」原则对称，把「时钟」降级为可注入依赖。
    // 测试传固定 now，不碰真时钟、不受邻居文件 fake timers 污染；亦为 S12 权威后端时间预留唯一入口。
    // 生产默认读 Date.now()（唯一真实时钟读点）。仅接受有限正数覆盖，脏值回退真时钟。
    const now = typeof nowOverride === 'number' && Number.isFinite(nowOverride) ? nowOverride : Date.now();
    if (homestead.lastSettleAt === 0) {
      homestead.setLastSettleAt(now); // 首次建立基线，不补发
      return empty;
    }

    // ★ SF-T6 墙钟回拨钳位（放首次基线判定之后）：改系统时间/lastSettleAt 停在未来时，
    // now < lastSettleAt → 本次记 0 收益 + 把 lastSettleAt 夹到 now，避免负时长喂进 computeIdleYield，
    // 也避免「未来基线」吞掉后续正常时间。廉价卫生级（单机向），不做权威时间/每日封顶。
    if (now < homestead.lastSettleAt) {
      homestead.setLastSettleAt(now);
      return empty;
    }

    const gameData = useGameDataStore();
    // 只保留「卡片存在」的入住角色，稀有度与作品名逐角色对齐（同一顺序喂进 computeIdleYield）。
    const cards = placed
      .map(id => gameData.getCharacterCardById(id))
      .filter((c): c is NonNullable<typeof c> => !!c);
    const rarities = cards.map(c => c.rarity).filter((r): r is Rarity => !!r);
    // ★ S15-T3 羁绊派生源：逐角色 anime_names（可缺可空，engine 侧容忍）。稳定键，不派生正则 archetype。
    const placedAnimeNames = cards.map(c => c.anime_names);
    const equipment = useEquipmentStore();
    const homeEffect = sumHomeEffects(placed.map(id => equipment.resolveHomeEffect(id)));
    // ★ S15-T2 家具 comfort 并入既有 comfort 软加成轴（拍板-A：零新口径）。
    // 口径同源命脉：settle 与 UI homeEffect computed 两处必须同源把家具 comfort 加进 effect.comfort，
    // 否则「预览≠实战」（C-2 半迁移陷阱）。家具与装备 comfort 相加后共用同一 +20% 硬顶（有意，守挂机基线）。
    homeEffect.comfort += useFurnitureStore().getComfort();
    // 口径同源命脉：设施乘区/封顶从 facility store 同一 getter 喂进（与 UI hourlyYield 同源，防「预览≠实战」）。
    const facilityLevels = useFacilityStore().getLevels();
    // 羁绊乘子经既有 computeIdleYield 口径汇入（严禁在 settle 里另拼）。
    const result = computeIdleYield(rarities, now - homestead.lastSettleAt, homeEffect, facilityLevels, placedAnimeNames);
    homestead.setLastSettleAt(now);

    if (result.expEach <= 0 && result.affectionEach <= 0 && result.knowledge <= 0) return result;

    for (const id of placed) {
      if (result.expEach > 0) nurture.addCharacterExp(id, result.expEach);
      if (result.affectionEach > 0) nurture.addIdleAffection(id, result.affectionEach);
    }
    if (result.knowledge > 0) profile.earn('knowledgePoints', result.knowledge);
    const bondNote = result.bondBonusPct > 0 ? `（羁绊 +${Math.round(result.bondBonusPct * 100)}%）` : '';
    profile.addLog(
      `家园挂机 ${result.hours.toFixed(1)}h：全员 +${result.expEach} 经验 / +${result.affectionEach} 好感，合计 +${result.knowledge} 知识点${bondNote}`,
      'success',
    );
    // SF-T8 委托守卫①：只有真发放收益（越过全 0 早退）才推进 idle 委托——
    // 绝不用 hours>0（首次基线 / 回拨钳位 / 0 入住空结算都可能 hours 存在但产出 0，会反复刷委托）。
    useDailyStore().markCommission('idle', 1);
    saveToServer();
    return result;
  }

  /**
   * 入住一个角色：先结清现有入住者收益（lastSettleAt 推到现在，新角色不吃历史时间，
   * 杜绝"放角色前先攒时间"刷收益）→ place → 存档。返回是否成功（满/重复/未登录 = false）。
   */
  function placeInHomestead(characterId: number): boolean {
    if (!profile.isLoggedIn) return false;
    // 校验角色存在且已拥有（UI 只列已拥有，门面自洽：杜绝脏调用入住不存在/未拥有角色）
    if (!useGameDataStore().getCharacterCardById(characterId)) return false;
    if (collection.getCharacterCardCount(characterId) <= 0) return false;
    settleHomestead();
    const ok = useHomesteadStore().place(characterId);
    if (ok) saveToServer();
    return ok;
  }

  /** 移出一个角色：先结清收益 → unplace → 存档。 */
  function unplaceFromHomestead(characterId: number): boolean {
    if (!profile.isLoggedIn) return false;
    settleHomestead();
    const ok = useHomesteadStore().unplace(characterId);
    if (ok) saveToServer();
    return ok;
  }

  /** ★ v21 偶遇图鉴：记录看过一场同作品偶遇（纯展示收集，无数值发放）；新增才触发存档。 */
  function markHomesteadEncounterSeen(pairKey: string): void {
    if (!profile.isLoggedIn) return;
    if (useHomesteadStore().markEncounterSeen(pairKey)) saveToServer();
  }

  /**
   * 升级一个设施（S14-D SD-T1/SD-T5）：先结清现有挂机收益（避免升级瞬间抬升封顶回溯放大已挂时间）
   * → profile.spend('knowledgePoints', cost) 成功才 facility.levelUp → 存档。
   * 余额不足 / 已满级 / 未登录 → 返回 false 不变更。货币只走 profile.spend（架构铁律）。
   */
  function upgradeFacility(key: FacilityKey): boolean {
    if (!profile.isLoggedIn) return false;
    const facility = useFacilityStore();
    if (facility.isMaxLevel(key)) return false;
    const cost = facilityUpgradeCost(facility.getLevel(key));
    if (!Number.isFinite(cost)) return false;
    // 先结清：把封顶抬升前的挂机时间按旧封顶落地，lastSettleAt 推到现在。
    settleHomestead();
    if (!profile.spend('knowledgePoints', cost)) return false;
    const ok = facility.levelUp(key);
    if (ok) {
      profile.addLog(`设施升级成功：花费 ${cost} 知识点，${key} → Lv.${facility.getLevel(key)}`, 'success');
      saveToServer();
    } else {
      // 理论不达（isMaxLevel 已挡），保险回补避免吞 KP。
      profile.earn('knowledgePoints', cost);
    }
    return ok;
  }

  // --- 家具编排（S15-T2）：KP 买断家具 + 摆放/收纳（家具 comfort → 挂机收益，仿 upgradeFacility） ---

  /**
   * 用知识点买一件家具（一次性买断，走 profile.spend）。
   * 编排：登录校验 → 查目录取 cost（Number.isFinite 守卫）→ 已拥有则拒 →
   * **先 settleHomestead() 结清**（买家具本身不改 comfort，但保持与设施同一「先结清再变更」纪律，
   * 且 UI 常紧接摆放；防后续摆放瞬间回溯放大已挂时间）→ profile.spend 成功才 furniture.buy → saveToServer。
   * 失败回补 KP。货币只走 profile.spend（架构铁律）。返回是否成功。
   */
  function buyFurniture(defId: string): boolean {
    if (!profile.isLoggedIn) return false;
    const def = getFurnitureDef(defId);
    if (!def) return false;
    const cost = def.cost;
    if (!Number.isFinite(cost) || cost < 0) return false;
    const furniture = useFurnitureStore();
    if (furniture.owns(defId)) return false;
    // 先结清：把变更前的挂机时间按旧 comfort 落地，lastSettleAt 推到现在。
    settleHomestead();
    if (!profile.spend('knowledgePoints', cost)) {
      profile.addLog(`知识点不足，购买「${def.name}」需 ${cost} 知识点。`, 'warning');
      return false;
    }
    const ok = furniture.buy(defId);
    if (ok) {
      profile.addLog(`花费 ${cost} 知识点，购入家具「${def.name}」（+${def.comfort} 舒适度）！`, 'success');
      saveToServer();
    } else {
      // 理论不达（owns/def 已挡），保险回补避免吞 KP。
      profile.earn('knowledgePoints', cost);
    }
    return ok;
  }

  /** 摆放一件已拥有家具：先结清收益（家具改 comfort→改产出，防回溯放大）→ place → 存档。 */
  function placeFurniture(defId: string): boolean {
    if (!profile.isLoggedIn) return false;
    settleHomestead();
    const ok = useFurnitureStore().place(defId);
    if (ok) saveToServer();
    return ok;
  }

  /** 收纳一件已摆放家具：先结清收益 → unplace → 存档。 */
  function unplaceFurniture(defId: string): boolean {
    if (!profile.isLoggedIn) return false;
    settleHomestead();
    const ok = useFurnitureStore().unplace(defId);
    if (ok) saveToServer();
    return ok;
  }

  /** ★ v21 自定义摆位：拖拽家具落点持久化（纯位置、不碰 comfort/收益）；成功才存档。 */
  function moveFurniture(defId: string, x: number, y: number): boolean {
    if (!profile.isLoggedIn) return false;
    const ok = useFurnitureStore().setPosition(defId, x, y);
    if (ok) saveToServer();
    return ok;
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

    // homestead（S13-B）：家园离线结算（登录时自动调；UI 进家园也会调）+ 入住/移出（含结算+存档）
    settleHomestead,
    placeInHomestead,
    unplaceFromHomestead,
    markHomesteadEncounterSeen,
    // facility（S14-D SD-T1/SD-T5）：设施升级（扣 KP 成功才提级 + 存档）
    upgradeFacility,
    // furniture（S15-T2）：KP 买断家具 + 摆放/收纳（成功才存档；先结清再变更）
    buyFurniture,
    placeFurniture,
    unplaceFurniture,
    moveFurniture,

    // daily（evolution-1）：领取每日任务奖励（领域 store 自己不存档）
    claimDailyTask: (taskId: string) => {
      if (useDailyStore().claim(taskId)) saveToServer();
    },

    // daily（B1）：领取周任务奖励（领域 store 自己不存档）
    claimWeeklyTask: (taskId: string) => {
      if (useDailyStore().claimWeekly(taskId)) saveToServer();
    },

    // daily（SF-T8）：领取家园委托奖励 / 今日全清 bonus（成功才存档；仿 claimDailyTask）
    claimCommission: (id: string) => {
      if (useDailyStore().claimCommission(id)) saveToServer();
    },
    claimCommissionBonus: () => {
      if (useDailyStore().claimCommissionBonus()) saveToServer();
    },

    // equipment（S13-C2）：知识点定向兑换装备（成功才入库 + 存档）
    purchaseEquipment,
    // equipment（S13-C2）：配装/卸下（成功才存档；查询直通 store）
    equipItem: (charId: number, slot: 'weapon' | 'armor' | 'supporter', uid: string) => {
      if (!profile.isLoggedIn) return false;
      const ok = useEquipmentStore().equip(charId, slot, uid);
      if (ok) saveToServer();
      return ok;
    },
    unequipItem: (charId: number, slot: 'weapon' | 'armor' | 'supporter') => {
      if (!profile.isLoggedIn) return false;
      const ok = useEquipmentStore().unequip(charId, slot);
      if (ok) saveToServer();
      return ok;
    },
    // equipment（SD-T3）：分解游离装备为 KP（已装备件被 store 守卫拒绝；成功才存档）
    dismantleEquipment: (uid: string) => {
      if (!profile.isLoggedIn) return false;
      const ok = useEquipmentStore().dismantleItem(uid);
      if (ok) saveToServer();
      return ok;
    },
    // equipment（SE-T1）：强化装备一级（花 KP + 1 件同款燃料；满级/不足被 store 守卫拒绝；成功才存档）
    enhanceEquipment: (uid: string) => {
      if (!profile.isLoggedIn) return false;
      const ok = useEquipmentStore().enhanceItem(uid);
      if (ok) {
        // SF-T8：强化成功才推进 enhance 委托（用返回值守卫，满级/不足不记）。
        useDailyStore().markCommission('enhance', 1);
        saveToServer();
      }
      return ok;
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

    // nurture（S13-C1：瘦身为加点制两轴）
    characterNurtureData: computed(() => nurture.characterNurtureData),
    getNurtureData: nurture.getNurtureData,
    increaseAffection: withNurtureProgress(nurture.increaseAffection),
    getRequiredExpForLevel: nurture.getRequiredExpForLevel,
    getLevelFromExp: nurture.getLevelFromExp,
    getLevelProgress: nurture.getLevelProgress,
    addCharacterExp: withSave(nurture.addCharacterExp),
    addBattleAffection: withSave(nurture.addBattleAffection),
    // 补习（KP → 经验）/ 好感里程碑领取（成功才存档）
    tutorCharacter: (characterId: number) => {
      if (nurture.tutorCharacter(characterId)) {
        useDailyStore().markProgress('nurture', 1);
        const isMaxLevel = (nurture.getNurtureData(characterId)?.level ?? 0) >= MAX_CHARACTER_LEVEL;
        useAchievementsStore().check('nurture', { characterMaxLevel: isMaxLevel });
        saveToServer();
        return true;
      }
      return false;
    },
    // ★ SF-T2 批量补习门面：整批只存一次档，daily 传批量份数（逐份扣费在 store 内完成）。
    tutorCharacterBatch: (characterId: number, mode: 'times' | 'toNextLevel', maxTimes?: number) => {
      const result = nurture.tutorCharacterBatch(characterId, mode, maxTimes);
      if (result.times > 0) {
        useDailyStore().markProgress('nurture', result.times);
        const isMaxLevel = (nurture.getNurtureData(characterId)?.level ?? 0) >= MAX_CHARACTER_LEVEL;
        useAchievementsStore().check('nurture', { characterMaxLevel: isMaxLevel });
        saveToServer();
      }
      return result;
    },
    claimBondMilestone: (characterId: number, milestoneId: string) => {
      if (nurture.claimBondMilestone(characterId, milestoneId)) {
        saveToServer();
        return true;
      }
      return false;
    },
    // SC-T3 星级/突破（消化重复角色卡）：成功才存档
    breakthroughCharacter: (characterId: number) => {
      if (nurture.breakthroughCharacter(characterId)) {
        saveToServer();
        return true;
      }
      return false;
    },
    // SC-T4 每日好感互动 / 好感溢出转 KP：成功才存档
    dailyBondInteraction: (characterId: number) => {
      if (nurture.dailyBondInteraction(characterId)) {
        useDailyStore().markProgress('nurture', 1);
        saveToServer();
        return true;
      }
      return false;
    },
    canDailyBondInteract: nurture.canDailyBondInteract,
    claimBondOverflow: (characterId: number) => {
      const kp = nurture.claimBondOverflow(characterId);
      if (kp > 0) saveToServer();
      return kp;
    },

    // pve ★ S5 起入存档：小队/塔进度的每次变更都会保存
    presetSquads: computed(() => pve.presetSquads),
    towerProgress: computed(() => pve.towerProgress),
    updateSquadMember: withSave(pve.updateSquadMember),
    updateSquadName: withSave(pve.updateSquadName),
    getSquadMembers: pve.getSquadMembers,
    getCurrentChallengeFloor: pve.getCurrentChallengeFloor,
    completeFloor: (floor: number, rng = defaultRng): { completed: boolean; drop: EquipmentDef | null } => {
      // pve.completeFloor 仅在「推进到新层」时返回 true（重复挑战已过低层 / 已达 999 顶层返回 false）。
      // 返回 { completed, drop }：区分「没通层」与「通了层但没掉落」——调用方据 completed 决定是否发奖励/推进，
      // 避免把两种语义都压成 null 后无条件发奖（顶层/篡改场景的刷取来源）。
      if (pve.completeFloor(floor)) {
        // 留存埋点（evolution-1）：爬塔通层成就（用返回值守卫，floor 不匹配不记）
        useAchievementsStore().check('tower', { floor });
        // SF-T8 委托守卫②-a：通层推进 tower 委托（绝不复用 battleWin，那是宅理论战计数语义污染）。
        useDailyStore().markCommission('tower', 1);
        // S13-C2：通层装备掉落（50% + 层段稀有度 + 随机槽，命中入库），回传掉落件供结算面板展示
        const drop = rollFloorDrop(floor, rng);
        saveToServer();
        return { completed: true, drop };
      }
      return { completed: false, drop: null };
    },
    hasCompletedFloor: pve.hasCompletedFloor,
    canAttemptToday: pve.canAttemptToday,
    recordTowerAttempt: pve.recordTowerAttempt,
    // SA-T5：扫荡已通层——独立路径（不推进 currentFloor / 不触发成就 / 不掉装备），发缩水奖励并存档。
    getSweepUsedThisWeek: pve.getSweepUsedThisWeek,
    getSweepRemaining: pve.getSweepRemaining,
    canSweep: pve.canSweep,
    // S15-T4：槽位保底显形（距下次保底 N 次判定 + 最接近的槽）
    getSlotPityStatus: pve.getSlotPityStatus,
    sweepFloor: (floor: number, squadId: number) => {
      const outcome = pve.sweepFloor(floor);
      if (outcome.ok && outcome.reward) {
        profile.earn('knowledgePoints', outcome.reward.sweepKnowledge);
        // 经验发给该小队里的有效成员（去重后的实成员，空位跳过）。
        for (const memberId of pve.getSquadMembers(squadId)) {
          if (memberId != null) nurture.addCharacterExp(memberId, outcome.reward.sweepCharacterExp);
        }
        // SF-T8 委托守卫②-b：扫荡也推进 tower 委托——毕业玩家（塔顶 completeFloor 返 false）靠扫荡完成，
        // 否则全清 bonus 卡死。与 completeFloor 同埋一类 kind='tower'。
        useDailyStore().markCommission('tower', 1);
        saveToServer();
      }
      return outcome;
    },
  };
});
