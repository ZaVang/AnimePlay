/**
 * ★ SF-T6 userStore.settleHomestead 墙钟回拨钳位测试（此前全仓零 settle 单测）。
 * 用 vi.spyOn(Date,'now') 控时：改系统时间回拨 → 收益 0 且 lastSettleAt 夹到 now（不停在旧的更大值），
 * 正常前进结算不受影响。saveToServer 被 mock（不打网络）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('./persistence', () => ({
  saveToServer: vi.fn(() => Promise.resolve()),
  loadFromServer: vi.fn(() => Promise.resolve()),
  resetAllDomains: vi.fn(),
}));

import { useUserStore } from './userStore';
import { useProfileStore } from './profile';
import { useHomesteadStore } from './homestead';
import { useGuessStore } from './guess';
import { useMiniGamesStore } from './minigames/higherLower';
import { useDailyStore } from './daily';
import { useAchievementsStore } from './achievements';
import { saveToServer } from './persistence';
import type { CharacterCard } from '@/types/card';

beforeEach(() => {
  setActivePinia(createPinia());
  useProfileStore().currentUser = 'tester';
  vi.mocked(saveToServer).mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SF-T6 settleHomestead 墙钟回拨钳位', () => {
  it('首次（lastSettleAt=0）只建基线：夹到 now、收益 0', () => {
    const user = useUserStore();
    const homestead = useHomesteadStore();
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    expect(homestead.lastSettleAt).toBe(0);
    const y = user.settleHomestead();
    expect(y.expEach).toBe(0);
    expect(homestead.lastSettleAt).toBe(1_000_000); // 基线建立
  });

  it('回拨（now < lastSettleAt）：收益 0 且 lastSettleAt 夹到 now（不停在旧的更大值）', () => {
    const user = useUserStore();
    const homestead = useHomesteadStore();
    // 基线停在未来（例如玩家先把系统时间调到很晚结算过一次）
    homestead.setLastSettleAt(5_000_000);
    // 现在系统时间被回拨到更早
    vi.spyOn(Date, 'now').mockReturnValue(2_000_000);
    const y = user.settleHomestead();
    expect(y.expEach).toBe(0);
    expect(y.affectionEach).toBe(0);
    expect(y.knowledge).toBe(0);
    // 关键：基线被夹到 now，不再是旧的更大值 5_000_000 → 后续正常时间不被吞
    expect(homestead.lastSettleAt).toBe(2_000_000);
  });

  it('回拨钳位后正常前进不受影响：lastSettleAt 随 now 推进', () => {
    const user = useUserStore();
    const homestead = useHomesteadStore();
    homestead.setLastSettleAt(5_000_000);
    // 回拨一次夹到 2_000_000
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(2_000_000);
    user.settleHomestead();
    expect(homestead.lastSettleAt).toBe(2_000_000);
    // 之后时间正常前进：结算推进基线到新 now（无入住角色 → 收益 0，但基线推进）
    nowSpy.mockReturnValue(2_000_000 + 3600_000);
    user.settleHomestead();
    expect(homestead.lastSettleAt).toBe(2_000_000 + 3600_000);
  });

  it('未登录：返回 empty，不动 lastSettleAt', () => {
    const user = useUserStore();
    const profile = useProfileStore();
    const homestead = useHomesteadStore();
    profile.currentUser = '';
    homestead.setLastSettleAt(5_000_000);
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const y = user.settleHomestead();
    expect(y.expEach).toBe(0);
    expect(homestead.lastSettleAt).toBe(5_000_000); // 未登录不改基线
  });
});

function prepareGuessRound() {
  const guess = useGuessStore();
  guess.currentCharacter = {
    id: 1,
    name: '目标角色',
    original_name: 'Target Character',
    rarity: 'R',
  } as unknown as CharacterCard;
  guess.isGameActive = true;
  guess.isGameOver = false;
  guess.currentStage = 1;
  guess.attempts = 0;
  guess.currentScore = 0;
  return guess;
}

describe('小游戏门面首次完成与完整结算幂等', () => {
  it('猜角色答对终局只推进一次日/周小游戏任务，重复提交不重复奖励或成就', () => {
    const user = useUserStore();
    const guess = prepareGuessRound();
    const daily = useDailyStore();
    const achievements = useAchievementsStore();

    const first = user.submitGuess('目标角色');
    expect(first.correct).toBe(true);
    expect(first.knowledgeAwarded).toBeGreaterThan(0);
    expect(guess.isGameOver).toBe(true);
    expect(daily.progressOf('daily_minigame')).toBe(1);
    expect(daily.weeklyProgressOf('weekly_minigame')).toBe(1);
    expect(achievements.stats.guessTotal).toBe(1);
    expect(achievements.stats.guessStreak).toBe(1);

    const knowledgeAfterFirst = useProfileStore().core.knowledgePoints;
    const repeated = user.submitGuess('目标角色');
    expect(repeated.correct).toBe(false);
    expect(repeated.knowledgeAwarded).toBe(0);
    expect(useProfileStore().core.knowledgePoints).toBe(knowledgeAfterFirst);
    expect(daily.progressOf('daily_minigame')).toBe(1);
    expect(daily.weeklyProgressOf('weekly_minigame')).toBe(1);
    expect(achievements.stats.guessTotal).toBe(1);
    expect(achievements.stats.guessStreak).toBe(1);
  });

  it('猜角色四次失败只在第四次终局推进任务；中途、未开始与终局后均不推进', () => {
    const user = useUserStore();
    const daily = useDailyStore();
    const achievements = useAchievementsStore();

    expect(user.submitGuess('未开始')).toMatchObject({ correct: false, knowledgeAwarded: 0 });
    expect(daily.progressOf('daily_minigame')).toBe(0);

    prepareGuessRound();
    for (let attempt = 1; attempt <= 3; attempt++) {
      user.submitGuess(`错误答案${attempt}`);
      expect(daily.progressOf('daily_minigame')).toBe(0);
    }
    user.submitGuess('最后仍错误');
    expect(daily.progressOf('daily_minigame')).toBe(1);
    expect(daily.weeklyProgressOf('weekly_minigame')).toBe(1);
    expect(achievements.stats.guessTotal).toBe(0);

    user.submitGuess('终局后重复');
    expect(daily.progressOf('daily_minigame')).toBe(1);
    expect(daily.weeklyProgressOf('weekly_minigame')).toBe(1);
  });

  it('高低牌零奖励首次结算仍推进全链一次，重复结算无任务/成就/保存副作用', () => {
    const user = useUserStore();
    const minigames = useMiniGamesStore();
    const daily = useDailyStore();
    const achievements = useAchievementsStore();
    minigames.isPlaying = true;
    minigames.isGameOver = false;
    minigames.streak = 0;

    expect(user.settleHigherLower()).toEqual({ score: 0, streak: 0, knowledgeAwarded: 0 });
    expect(minigames.isPlaying).toBe(false);
    expect(minigames.isGameOver).toBe(true);
    expect(minigames.playCount).toBe(1);
    expect(daily.progressOf('daily_minigame')).toBe(1);
    expect(achievements.stats.minigameTotal).toBe(1);
    expect(vi.mocked(saveToServer)).toHaveBeenCalledTimes(1);

    user.settleHigherLower();
    expect(minigames.playCount).toBe(1);
    expect(daily.progressOf('daily_minigame')).toBe(1);
    expect(achievements.stats.minigameTotal).toBe(1);
    expect(vi.mocked(saveToServer)).toHaveBeenCalledTimes(1);
  });

  it('番剧问答零奖励首次结算仍推进全链一次，重复结算无副作用', () => {
    const user = useUserStore();
    const minigames = useMiniGamesStore();
    const daily = useDailyStore();
    const achievements = useAchievementsStore();
    minigames.quizPlaying = true;
    minigames.quizOver = false;
    minigames.quizStreak = 0;

    expect(user.settleQuiz()).toEqual({ score: 0, streak: 0, knowledgeAwarded: 0 });
    expect(minigames.quizPlaying).toBe(false);
    expect(minigames.quizOver).toBe(true);
    expect(minigames.quizPlayCount).toBe(1);
    expect(daily.progressOf('daily_minigame')).toBe(1);
    expect(achievements.stats.minigameTotal).toBe(1);
    expect(vi.mocked(saveToServer)).toHaveBeenCalledTimes(1);

    user.settleQuiz();
    expect(minigames.quizPlayCount).toBe(1);
    expect(daily.progressOf('daily_minigame')).toBe(1);
    expect(achievements.stats.minigameTotal).toBe(1);
    expect(vi.mocked(saveToServer)).toHaveBeenCalledTimes(1);
  });

  it('每日挑战同日回看不产生经济、任务、成就或保存副作用', () => {
    const user = useUserStore();
    const minigames = useMiniGamesStore();
    const profile = useProfileStore();
    const daily = useDailyStore();
    const achievements = useAchievementsStore();
    const now = new Date();
    minigames.dcLastDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    minigames.dcLastScore = 4;
    minigames.dcBestScore = 5;
    minigames.dcStreakDays = 3;
    minigames.dcBestStreakDays = 6;
    minigames.startDailyChallenge();
    minigames.dcScore = 2;
    minigames.dcDone = true;
    const knowledgeBefore = profile.core.knowledgePoints;

    expect(user.settleDailyChallenge()).toEqual({ score: 2, knowledgeAwarded: 0, alreadyDone: true });
    expect(minigames.dcIsReview).toBe(true);
    expect(minigames.dcLastScore).toBe(4);
    expect(minigames.dcBestScore).toBe(5);
    expect(minigames.dcStreakDays).toBe(3);
    expect(minigames.dcBestStreakDays).toBe(6);
    expect(profile.core.knowledgePoints).toBe(knowledgeBefore);
    expect(daily.progressOf('daily_minigame')).toBe(0);
    expect(achievements.stats.minigameTotal).toBe(0);
    expect(vi.mocked(saveToServer)).not.toHaveBeenCalled();
  });
});
