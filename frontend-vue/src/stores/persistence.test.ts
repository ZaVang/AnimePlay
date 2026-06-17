/**
 * 存档装配器测试（S5）：buildPayload ⇄ applyPayload 往返保真 + resetAllDomains。
 * 这是「刷新不丢任何东西」的结构性保证：每个领域 store 的状态都必须经得起一轮序列化往返。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/infra/persistence/api', () => ({
  // pushUserSave 现在返回后端给的权威新版本号（S10-T3）；mock 给个递增计数即可。
  pushUserSave: vi.fn(
    () => new Promise<{ saveVersion: number }>(resolve => setTimeout(() => resolve({ saveVersion: 1 }), 5)),
  ),
  fetchUserSave: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  loginRequest: vi.fn(),
}));

import { buildPayload, applyPayload, resetAllDomains, saveToServer, loadFromServer, getCurrentSaveVersion } from './persistence';
import { pushUserSave, fetchUserSave } from '@/infra/persistence/api';
import { useProfileStore } from './profile';
import { useCollectionStore } from './collection';
import { useDeckStore } from './deck';
import { useViewingStore } from './viewing';
import { useNurtureStore } from './nurture';
import { usePveStore } from './pve';
import { useGachaStore } from './gachaStore';
import { useShopStore } from './shop';
import { useGuessStore } from './guess';
import { useMiniGamesStore } from './minigames/higherLower';
import { useThemeStore } from './theme';
import { useDailyStore } from './daily';
import { useCodexStore } from './codex';
import { useAchievementsStore } from './achievements';
import { createDefaultNurtureData } from '@/engine';
import { SAVE_VERSION } from '@/infra/persistence';

beforeEach(() => {
  setActivePinia(createPinia());
});

/** 给每个领域塞上可辨识的状态。 */
function populateAllDomains() {
  const profile = useProfileStore();
  profile.currentUser = 'tester';
  profile.core.level = 9;
  profile.core.exp = 55;
  profile.core.knowledgePoints = 1234;
  profile.core.animeGachaTickets = 7;
  profile.core.characterGachaTickets = 3;

  useDeckStore().saveDeck({ name: '主力', anime: [1, 2, 3], character: [4], cover: null, createdAt: 'x', version: 1 });

  const viewing = useViewingStore();
  viewing.viewingQueue[0] = { animeId: 326, startTime: 1700000000000 };
  viewing.watchedAnime.add(876);
  viewing.viewingStats.consecutiveDays = 5;

  const collection = useCollectionStore();
  collection.addCard(326, 'anime');
  collection.addCard(326, 'anime');
  collection.addCard(12393, 'character');
  collection.favoriteAnime.add(326);

  const gacha = useGachaStore();
  gacha.animePity = { totalPulls: 70, pullsSinceLastHR: 5 };
  gacha.pushHistory('anime', [{ id: 326, rarity: 'UR', timestamp: 1 }]);

  const nurture = useNurtureStore();
  const data = createDefaultNurtureData();
  data.affection = 99;
  nurture.characterNurtureData.set(12393, data);

  const pve = usePveStore();
  pve.updateSquadMember(1, 0, 12393);
  pve.updateSquadName(1, '推塔队');
  pve.towerProgress.currentFloor = 8;
  pve.towerProgress.maxFloor = 7;

  useShopStore().recordPurchase('anime_ticket_1');
  useGuessStore().highScore = 85;
  data.trainingCooldowns = { charm_training: 1893456000000 };
  useThemeStore().setSkin('neon'); // S7：皮肤随账号入档

  // evolution-1：每日任务 / 图鉴里程碑 / 成就
  // 用「今天」的本地日期键，使 deserialize 的 ensureToday 不会判为跨天而清零进度。
  const daily = useDailyStore();
  daily.date = TODAY_KEY;
  daily.progress = { daily_gacha: 1 };
  daily.claimed = ['daily_gacha'];
  daily.lastLoginDate = TODAY_KEY;
  // B1：周任务 / 连签（用「本周」周键，使 deserialize 的 ensureThisWeek 不判为跨周清零）
  daily.weekDate = WEEK_KEY;
  daily.weeklyProgress = { weekly_gacha: 5 };
  daily.weeklyClaimed = ['weekly_battle'];
  daily.loginStreak = 4;
  useCodexStore().claimedMilestones = ['char_owned_50'];
  useAchievementsStore().unlocked = ['ach_first_ur'];
  // evolution-5：小游戏域（高低牌战绩 + 每日封顶记账）
  const mg = useMiniGamesStore();
  mg.highScore = 45;
  mg.bestStreak = 12;
  mg.playCount = 3;
  mg.quizHighScore = 60;
  mg.quizBestStreak = 8;
  mg.quizPlayCount = 5;
  mg.dcLastDate = TODAY_KEY;
  mg.dcLastScore = 4;
  mg.dcBestScore = 5;
  mg.awardDate = TODAY_KEY;
  mg.awardedToday = 30;
}

/** 与 daily store 同款本地日期键（YYYY-M-D）。 */
const TODAY_KEY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
})();

/** 与 daily store 同款 ISO 周键（YYYY-Www）。 */
const WEEK_KEY = (() => {
  const date = new Date();
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + 3);
  const isoYear = d.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const weekNo = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
})();

describe('buildPayload ⇄ applyPayload 往返', () => {
  it('全部领域状态经一轮序列化后逐项保真（含 ★ presetSquads / towerProgress）', () => {
    populateAllDomains();
    const payload = JSON.parse(JSON.stringify(buildPayload())); // 模拟网络传输

    // 清空一切再回放（皮肤按设计不随 reset 回滚，手动切回默认以验证 applyPayload 恢复）
    resetAllDomains();
    useThemeStore().setSkin('warm');
    expect(useProfileStore().core.knowledgePoints).not.toBe(1234);
    applyPayload(payload);

    const profile = useProfileStore();
    expect(profile.core).toMatchObject({ level: 9, exp: 55, knowledgePoints: 1234, animeGachaTickets: 7, characterGachaTickets: 3 });

    expect(useDeckStore().savedDecks['主力'].anime).toEqual([1, 2, 3]);

    const viewing = useViewingStore();
    expect(viewing.viewingQueue[0]).toEqual({ animeId: 326, startTime: 1700000000000 });
    expect(viewing.watchedAnime.has(876)).toBe(true);
    expect(viewing.viewingStats.consecutiveDays).toBe(5);

    const collection = useCollectionStore();
    expect(collection.animeCollection.get(326)).toEqual({ count: 2 });
    expect(collection.characterCollection.get(12393)).toEqual({ count: 1 });
    expect(collection.favoriteAnime.has(326)).toBe(true);

    const gacha = useGachaStore();
    expect(gacha.animePity).toEqual({ totalPulls: 70, pullsSinceLastHR: 5 });
    expect(gacha.animeHistory).toHaveLength(1);

    expect(useNurtureStore().characterNurtureData.get(12393)?.affection).toBe(99);

    // ★ S5 修复目标：小队与塔进度经存档往返不丢
    const pve = usePveStore();
    expect(pve.presetSquads[0].name).toBe('推塔队');
    expect(pve.presetSquads[0].members).toEqual([12393, null, null, null]);
    expect(pve.towerProgress).toMatchObject({ currentFloor: 8, maxFloor: 7 });

    // S6 新增域：商店限购 / 猜角色最高分 / 训练冷却（随养成数据）
    expect(useShopStore().purchasedToday('anime_ticket_1')).toBe(1);
    expect(useGuessStore().highScore).toBe(85);
    expect(useNurtureStore().characterNurtureData.get(12393)?.trainingCooldowns).toEqual({ charm_training: 1893456000000 });

    // S7 新增域：皮肤装扮（中途手动切回默认，验证 applyPayload 恢复账号皮肤）
    expect(useThemeStore().currentSkinId).toBe('neon');

    // evolution-1 新增域：每日任务 / 图鉴里程碑 / 成就
    const daily = useDailyStore();
    expect(daily.date).toBe(TODAY_KEY);
    expect(daily.progress).toEqual({ daily_gacha: 1 });
    expect(daily.claimed).toEqual(['daily_gacha']);
    expect(daily.lastLoginDate).toBe(TODAY_KEY);
    // B1：周任务 / 连签经一轮往返保真
    expect(daily.weekDate).toBe(WEEK_KEY);
    expect(daily.weeklyProgress).toEqual({ weekly_gacha: 5 });
    expect(daily.weeklyClaimed).toEqual(['weekly_battle']);
    expect(daily.loginStreak).toBe(4);
    expect(useCodexStore().claimedMilestones).toEqual(['char_owned_50']);
    expect(useAchievementsStore().unlocked).toEqual(['ach_first_ur']);

    // evolution-5 新增域：小游戏（高低牌战绩 + 封顶记账）经一轮往返保真
    const mg = useMiniGamesStore();
    expect(mg.highScore).toBe(45);
    expect(mg.bestStreak).toBe(12);
    expect(mg.playCount).toBe(3);
    expect(mg.quizHighScore).toBe(60);
    expect(mg.quizBestStreak).toBe(8);
    expect(mg.quizPlayCount).toBe(5);
    expect(mg.dcBestScore).toBe(5);
    expect(mg.dcLastScore).toBe(4);
    expect(mg.dcCompletedToday).toBe(true);
    expect(mg.remainingDailyKp).toBe(120 - 30);
  });

  it('payload 带版本号与全部 schema 键', () => {
    populateAllDomains();
    const payload = buildPayload();
    expect(payload.version).toBe(SAVE_VERSION);
    for (const key of [
      'saveVersion',
      'state', 'animeCollection', 'characterCollection', 'animePity', 'characterPity',
      'animeHistory', 'characterHistory', 'favoriteAnime', 'favoriteCharacters',
      'characterNurtureData', 'presetSquads', 'towerProgress',
      'shopPurchases', 'guess', 'appearance',
      'daily', 'codexMilestones', 'achievements', 'minigames',
    ]) {
      expect(payload).toHaveProperty(key);
    }
  });
});

describe('resetAllDomains', () => {
  it('各领域回到初始态', () => {
    populateAllDomains();
    resetAllDomains();

    expect(useProfileStore().core.level).toBe(1);
    expect(Object.keys(useDeckStore().savedDecks)).toHaveLength(0);
    expect(useViewingStore().watchedAnime.size).toBe(0);
    expect(useCollectionStore().animeCollection.size).toBe(0);
    expect(useGachaStore().animePity.totalPulls).toBe(0);
    expect(useNurtureStore().characterNurtureData.size).toBe(0);
    expect(usePveStore().towerProgress.currentFloor).toBe(1);
    expect(usePveStore().presetSquads[0].members).toEqual([null, null, null, null]);
  });
});

describe('saveToServer 串行合并（防后端非原子写被并发截断）', () => {
  it('同步连发 6 次保存只产生 1 个网络请求，且带上全部最新状态', async () => {
    vi.mocked(pushUserSave).mockClear();
    const profile = useProfileStore();
    profile.currentUser = 'tester';

    const pve = usePveStore();
    const calls: Promise<void>[] = [];
    for (let i = 0; i < 4; i++) {
      pve.updateSquadMember(1, i, 100 + i);
      calls.push(saveToServer());
    }
    pve.updateSquadName(1, '合并测试队');
    calls.push(saveToServer());
    pve.completeFloor(1);
    calls.push(saveToServer());

    await Promise.all(calls);
    expect(pushUserSave).toHaveBeenCalledTimes(1);

    // 发送的 payload 含全部 6 次变更
    const sent = vi.mocked(pushUserSave).mock.calls[0][1];
    expect(sent.presetSquads[0].members).toEqual([100, 101, 102, 103]);
    expect(sent.presetSquads[0].name).toBe('合并测试队');
    expect(sent.towerProgress.currentFloor).toBe(2);
  });

  it('前一个请求在飞行中时的新保存会追加第二次请求（最终状态落盘）', async () => {
    vi.mocked(pushUserSave).mockClear();
    const profile = useProfileStore();
    profile.currentUser = 'tester';

    const first = saveToServer();
    await first; // 第一发完成
    usePveStore().completeFloor(1);
    await saveToServer(); // 新变更 → 第二发
    expect(pushUserSave).toHaveBeenCalledTimes(2);
  });

  it('未登录直接跳过，不发请求', async () => {
    vi.mocked(pushUserSave).mockClear();
    useProfileStore().currentUser = '';
    await saveToServer();
    expect(pushUserSave).not.toHaveBeenCalled();
  });
});

describe('saveVersion 乐观并发基线（S10-T3）', () => {
  // currentSaveVersion 是模块级状态、跨用例存活；每个用例先用 new-user load 归零基线。
  async function resetBaseline() {
    vi.mocked(fetchUserSave).mockResolvedValueOnce({ isNewUser: true, raw: null });
    useProfileStore().currentUser = 'baselinereset';
    await loadFromServer();
    useProfileStore().currentUser = '';
  }

  it('新用户 load 后基线为 0，buildPayload 带上 0', async () => {
    await resetBaseline();
    expect(getCurrentSaveVersion()).toBe(0);
    populateAllDomains();
    expect(buildPayload().saveVersion).toBe(0);
  });

  it('loadFromServer 后基线取服务端 saveVersion，buildPayload 带上它', async () => {
    vi.mocked(fetchUserSave).mockResolvedValueOnce({
      isNewUser: false,
      raw: { version: 5, saveVersion: 7 },
    });
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    await loadFromServer();
    expect(getCurrentSaveVersion()).toBe(7);
    expect(buildPayload().saveVersion).toBe(7);
  });

  it('保存成功后基线更新为后端返回的权威新版本号', async () => {
    vi.mocked(pushUserSave).mockResolvedValueOnce({ saveVersion: 42 });
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    await saveToServer();
    expect(getCurrentSaveVersion()).toBe(42);
    expect(buildPayload().saveVersion).toBe(42);
  });
});

describe('profile.spend / earn（货币唯一入口）', () => {
  it('余额不足：返回 false 且不变更', () => {
    const profile = useProfileStore();
    profile.core.knowledgePoints = 10;
    expect(profile.spend('knowledgePoints', 11)).toBe(false);
    expect(profile.core.knowledgePoints).toBe(10);
  });

  it('余额充足：扣减并返回 true；earn 增加', () => {
    const profile = useProfileStore();
    profile.core.knowledgePoints = 10;
    expect(profile.spend('knowledgePoints', 4)).toBe(true);
    expect(profile.core.knowledgePoints).toBe(6);
    profile.earn('knowledgePoints', 100);
    expect(profile.core.knowledgePoints).toBe(106);
  });

  it('负数花费被拒绝；非正数收入被忽略', () => {
    const profile = useProfileStore();
    profile.core.knowledgePoints = 10;
    expect(profile.spend('knowledgePoints', -5)).toBe(false);
    profile.earn('knowledgePoints', -5);
    profile.earn('knowledgePoints', 0);
    expect(profile.core.knowledgePoints).toBe(10);
  });
});
