/**
 * daily store 特征测试（evolution-1）：跨天重置 / markProgress / claim / 每日登录。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDailyStore } from './daily';
import { useProfileStore } from './profile';
import { DAILY_LOGIN_REWARDS } from '@/config/dailyTasks';

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
    const animeReward = DAILY_LOGIN_REWARDS.find(r => r.currency === 'animeGachaTickets')!.amount;
    const charReward = DAILY_LOGIN_REWARDS.find(r => r.currency === 'characterGachaTickets')!.amount;
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

describe('序列化往返', () => {
  it('serialize/deserialize 保真（未跨天）', () => {
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
  });

  it('deserialize 旧日期存档后读取归零（跨天）', () => {
    freezeDate(2026, 6, 17);
    const daily = useDailyStore();
    daily.deserialize({ date: '2026-6-16', progress: { daily_gacha: 1 }, claimed: ['daily_gacha'], lastLoginDate: '2026-6-16' });
    // ensureToday 在 deserialize 内触发，旧进度清零
    expect(daily.progressOf('daily_gacha')).toBe(0);
    expect(daily.isClaimed('daily_gacha')).toBe(false);
    // 登录日期不清零（用于跨天判定）
    expect(daily.lastLoginDate).toBe('2026-6-16');
  });
});
