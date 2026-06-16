/**
 * daily store 特征测试（evolution-1）：跨天重置 / markProgress / claim / 每日登录。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDailyStore } from './daily';
import { useProfileStore } from './profile';
import { DAILY_LOGIN_REWARDS, loginStreakRewardFor } from '@/config/dailyTasks';

beforeEach(() => {
  setActivePinia(createPinia());
  // 登录态：奖励发放需要（earn 本身不看登录，但 currencyName 等无副作用）
  useProfileStore().currentUser = 'tester';
});

afterEach(() => {
  vi.useRealTimers();
});

/** 把系统时间钉到指定本地日期（避免真实跨天导致 flaky）。 */
function freezeDate(y: number, m: number, d: number) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(y, m - 1, d, 12, 0, 0));
}

describe('markProgress / 完成判定', () => {
  it('推进进度后任务完成', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    expect(daily.isComplete('daily_gacha')).toBe(false);
    daily.markProgress('gacha', 1);
    expect(daily.progressOf('daily_gacha')).toBe(1);
    expect(daily.isComplete('daily_gacha')).toBe(true);
  });

  it('进度钳到 target 上限，不无限累加', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    daily.markProgress('gacha', 5);
    expect(daily.progressOf('daily_gacha')).toBe(1); // target=1
  });

  it('不同类型互不串扰', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    daily.markProgress('watch', 1);
    expect(daily.isComplete('daily_watch')).toBe(true);
    expect(daily.isComplete('daily_gacha')).toBe(false);
  });
});

describe('claim 领奖', () => {
  it('未完成不可领', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    expect(daily.claim('daily_gacha')).toBe(false);
  });

  it('完成后可领，货币入账，重复领无效', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    const profile = useProfileStore();
    const before = profile.core.knowledgePoints;
    daily.markProgress('gacha', 1);
    expect(daily.claim('daily_gacha')).toBe(true);
    expect(profile.core.knowledgePoints).toBe(before + 30); // daily_gacha 奖 30 知识点
    expect(daily.isClaimed('daily_gacha')).toBe(true);
    // 重复领取被拒，余额不变
    expect(daily.claim('daily_gacha')).toBe(false);
    expect(profile.core.knowledgePoints).toBe(before + 30);
  });
});

describe('跨天重置', () => {
  it('换天后进度与领取状态归零', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    daily.markProgress('gacha', 1);
    daily.claim('daily_gacha');
    expect(daily.isClaimed('daily_gacha')).toBe(true);

    // 跨到第二天
    freezeDate(2026, 6, 17);
    expect(daily.progressOf('daily_gacha')).toBe(0);
    expect(daily.isClaimed('daily_gacha')).toBe(false);
    expect(daily.isComplete('daily_gacha')).toBe(false);
  });
});

describe('每日登录奖励', () => {
  it('今日首次发放，重复调用不再发', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    const profile = useProfileStore();
    const beforeAnime = profile.core.animeGachaTickets;
    const beforeChar = profile.core.characterGachaTickets;

    expect(daily.claimLoginReward()).toBe(true);
    // B1：登录奖励 = 每日固定 DAILY_LOGIN_REWARDS + 连签第1档（首登 streak=1）
    const tier1 = loginStreakRewardFor(1);
    const sumOf = (list: { currency: string; amount: number }[], cur: string) =>
      list.filter(r => r.currency === cur).reduce((s, r) => s + r.amount, 0);
    const animeReward = sumOf(DAILY_LOGIN_REWARDS, 'animeGachaTickets') + sumOf(tier1, 'animeGachaTickets');
    const charReward = sumOf(DAILY_LOGIN_REWARDS, 'characterGachaTickets') + sumOf(tier1, 'characterGachaTickets');
    expect(profile.core.animeGachaTickets).toBe(beforeAnime + animeReward);
    expect(profile.core.characterGachaTickets).toBe(beforeChar + charReward);

    // 同日再调不发
    expect(daily.claimLoginReward()).toBe(false);
    expect(profile.core.animeGachaTickets).toBe(beforeAnime + animeReward);
  });

  it('跨天再次发放', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    expect(daily.claimLoginReward()).toBe(true);
    freezeDate(2026, 6, 17);
    expect(daily.claimLoginReward()).toBe(true);
  });
});

describe('周任务（B1）', () => {
  it('markProgress 同时推进日任务与周任务', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    daily.markProgress('gacha', 1);
    expect(daily.progressOf('daily_gacha')).toBe(1);
    expect(daily.weeklyProgressOf('weekly_gacha')).toBe(1);
  });

  it('周任务做满可领，重复领无效，货币入账', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    const profile = useProfileStore();
    const before = profile.core.animeGachaTickets;
    expect(daily.isWeeklyComplete('weekly_gacha')).toBe(false);
    daily.markProgress('gacha', 20); // target=20
    expect(daily.weeklyProgressOf('weekly_gacha')).toBe(20);
    expect(daily.isWeeklyComplete('weekly_gacha')).toBe(true);
    expect(daily.claimWeekly('weekly_gacha')).toBe(true);
    expect(profile.core.animeGachaTickets).toBe(before + 3); // weekly_gacha 奖 3 动画券
    expect(daily.isWeeklyClaimed('weekly_gacha')).toBe(true);
    // 重复领被拒
    expect(daily.claimWeekly('weekly_gacha')).toBe(false);
    expect(profile.core.animeGachaTickets).toBe(before + 3);
  });

  it('换周后周任务进度与领取状态归零（日任务跨天独立）', () => {
    freezeDate(2026, 6, 16); // 周一（2026-W25）
    const daily = useDailyStore();
    daily.markProgress('gacha', 20);
    daily.claimWeekly('weekly_gacha');
    expect(daily.isWeeklyClaimed('weekly_gacha')).toBe(true);

    // 跨到下一周（+7 天 → 2026-6-23，进入 2026-W26）
    freezeDate(2026, 6, 23);
    expect(daily.weeklyProgressOf('weekly_gacha')).toBe(0);
    expect(daily.isWeeklyClaimed('weekly_gacha')).toBe(false);
    expect(daily.isWeeklyComplete('weekly_gacha')).toBe(false);
  });

  it('同周内跨天不重置周任务', () => {
    freezeDate(2026, 6, 16); // 周一
    const daily = useDailyStore();
    daily.markProgress('gacha', 10);
    expect(daily.weeklyProgressOf('weekly_gacha')).toBe(10);
    // 同周内换一天（周二）
    freezeDate(2026, 6, 17);
    expect(daily.weeklyProgressOf('weekly_gacha')).toBe(10); // 周进度保留
    expect(daily.progressOf('daily_gacha')).toBe(0); // 日进度已跨天归零
  });
});

describe('连续登录递增（B1）', () => {
  it('首次登录 streak=1，发每日奖励 + 第1档连签奖励', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    const profile = useProfileStore();
    const beforeAnime = profile.core.animeGachaTickets;
    expect(daily.claimLoginReward()).toBe(true);
    expect(daily.loginStreak).toBe(1);
    // 每日固定 1 动画券 + 第1档连签 1 动画券 = +2
    const dailyAnime = DAILY_LOGIN_REWARDS.find(r => r.currency === 'animeGachaTickets')?.amount ?? 0;
    const tier1Anime = loginStreakRewardFor(1).filter(r => r.currency === 'animeGachaTickets').reduce((s, r) => s + r.amount, 0);
    expect(profile.core.animeGachaTickets).toBe(beforeAnime + dailyAnime + tier1Anime);
  });

  it('连续两天登录 streak 递增到 2', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    expect(daily.claimLoginReward()).toBe(true);
    expect(daily.loginStreak).toBe(1);
    freezeDate(2026, 6, 17); // 次日
    expect(daily.claimLoginReward()).toBe(true);
    expect(daily.loginStreak).toBe(2);
  });

  it('断签（隔一天以上）后 streak 归 1', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    daily.claimLoginReward();
    freezeDate(2026, 6, 17);
    daily.claimLoginReward();
    expect(daily.loginStreak).toBe(2);
    // 隔两天再登（6/19，跳过 6/18）→ 断签归 1
    freezeDate(2026, 6, 19);
    expect(daily.claimLoginReward()).toBe(true);
    expect(daily.loginStreak).toBe(1);
  });

  it('同日重复领不改 streak、不发奖', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    const profile = useProfileStore();
    expect(daily.claimLoginReward()).toBe(true);
    expect(daily.loginStreak).toBe(1);
    const after = profile.core.animeGachaTickets;
    expect(daily.claimLoginReward()).toBe(false);
    expect(daily.loginStreak).toBe(1);
    expect(profile.core.animeGachaTickets).toBe(after);
  });

  it('连签到里程碑档发更厚奖励（第7天档 > 第1天档）', () => {
    const tier1 = loginStreakRewardFor(1).reduce((s, r) => s + r.amount, 0);
    const tier7 = loginStreakRewardFor(7).reduce((s, r) => s + r.amount, 0);
    expect(tier7).toBeGreaterThan(tier1);
    // 取档逻辑：6 天落在第3档，7 天升到第7档
    expect(loginStreakRewardFor(6)).toEqual(loginStreakRewardFor(3));
    expect(loginStreakRewardFor(7)).not.toEqual(loginStreakRewardFor(6));
  });
});

describe('序列化往返', () => {
  it('serialize/deserialize 保真（未跨天/未跨周）', () => {
    freezeDate(2026, 6, 16);
    const daily = useDailyStore();
    daily.markProgress('gacha', 1);
    daily.claim('daily_gacha');
    daily.claimLoginReward();
    const snapshot = JSON.parse(JSON.stringify(daily.serialize()));

    const fresh = (() => {
      setActivePinia(createPinia());
      useProfileStore().currentUser = 'tester';
      return useDailyStore();
    })();
    fresh.deserialize(snapshot);
    expect(fresh.progressOf('daily_gacha')).toBe(1);
    expect(fresh.isClaimed('daily_gacha')).toBe(true);
    expect(fresh.lastLoginDate).toBe('2026-6-16');
    expect(fresh.weeklyProgressOf('weekly_gacha')).toBe(1);
    expect(fresh.loginStreak).toBe(1);
  });

  it('deserialize 旧 v6 形态存档（无周/连签字段）后读取归零（跨天）', () => {
    freezeDate(2026, 6, 17);
    const daily = useDailyStore();
    // 旧 v6 档没有 weekDate/weeklyProgress/weeklyClaimed/loginStreak —— deserialize 须容忍并补缺省。
    daily.deserialize({
      date: '2026-6-16',
      progress: { daily_gacha: 1 },
      claimed: ['daily_gacha'],
      lastLoginDate: '2026-6-16',
    } as unknown as Parameters<typeof daily.deserialize>[0]);
    // ensureToday 在 deserialize 内触发，旧进度清零
    expect(daily.progressOf('daily_gacha')).toBe(0);
    expect(daily.isClaimed('daily_gacha')).toBe(false);
    // 登录日期不清零（用于跨天判定）
    expect(daily.lastLoginDate).toBe('2026-6-16');
    // 缺省的周/连签字段补默认
    expect(daily.weeklyProgressOf('weekly_gacha')).toBe(0);
    expect(daily.loginStreak).toBe(0);
  });
});
