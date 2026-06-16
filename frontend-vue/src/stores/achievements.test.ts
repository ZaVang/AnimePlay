/**
 * achievements store 特征测试（evolution-1）：解锁判定 / 幂等 / 连对计数 / 持久化。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useAchievementsStore } from './achievements';
import { useProfileStore } from './profile';

beforeEach(() => {
  setActivePinia(createPinia());
  useProfileStore().currentUser = 'tester';
});

describe('事件驱动解锁', () => {
  it('抽到 UR 解锁「欧皇降临」并发奖（UR 同时满足 SSR 档成就）', () => {
    const ach = useAchievementsStore();
    const profile = useProfileStore();
    const before = profile.core.knowledgePoints;
    const unlocked = ach.check('gacha', { rarities: ['N', 'UR'] });
    expect(unlocked).toContain('ach_first_ur');
    expect(ach.isUnlocked('ach_first_ur')).toBe(true);
    // UR 同时命中 ach_first_ssr（SSR/HR/UR 档），故 200 + 50 = 250
    expect(unlocked).toContain('ach_first_ssr');
    expect(profile.core.knowledgePoints).toBe(before + 250);
  });

  it('已解锁不重复发奖（幂等）', () => {
    const ach = useAchievementsStore();
    const profile = useProfileStore();
    ach.check('gacha', { rarities: ['UR'] });
    const after = profile.core.knowledgePoints;
    const second = ach.check('gacha', { rarities: ['UR'] });
    expect(second).not.toContain('ach_first_ur');
    expect(profile.core.knowledgePoints).toBe(after); // 不再加钱
  });

  it('累计计数类成就在达阈值时解锁', () => {
    const ach = useAchievementsStore();
    // 第一次胜利解锁 first_win，但未到 10
    expect(ach.check('battleWin')).toContain('ach_first_win');
    for (let i = 0; i < 8; i++) ach.check('battleWin'); // 共 9 次
    expect(ach.isUnlocked('ach_win_10')).toBe(false);
    expect(ach.check('battleWin')).toContain('ach_win_10'); // 第 10 次
  });
});

describe('猜角色连对计数', () => {
  it('连对 5 次解锁，中途猜错打断连对', () => {
    const ach = useAchievementsStore();
    for (let i = 0; i < 4; i++) ach.check('guess');
    expect(ach.isUnlocked('ach_guess_streak_5')).toBe(false);
    ach.resetGuessStreak(); // 模拟猜错
    ach.check('guess'); // 重新开始连对：streak=1
    expect(ach.isUnlocked('ach_guess_streak_5')).toBe(false);
    for (let i = 0; i < 4; i++) ach.check('guess'); // streak 到 5
    expect(ach.isUnlocked('ach_guess_streak_5')).toBe(true);
    // guessTotal 累计也在增长
    expect(ach.stats.guessTotal).toBe(9);
  });
});

describe('爬塔楼层成就', () => {
  it('通过第 5 层解锁登塔者', () => {
    const ach = useAchievementsStore();
    expect(ach.check('tower', { floor: 5 })).toContain('ach_tower_5');
    expect(ach.stats.maxTowerFloor).toBe(5);
  });
});

describe('养成满级成就', () => {
  it('characterMaxLevel payload 解锁羁绊圆满', () => {
    const ach = useAchievementsStore();
    expect(ach.check('nurture', { characterMaxLevel: false })).not.toContain('ach_nurture_maxlevel');
    expect(ach.check('nurture', { characterMaxLevel: true })).toContain('ach_nurture_maxlevel');
  });
});

describe('序列化往返', () => {
  it('serialize/deserialize 保真已解锁 id', () => {
    const ach = useAchievementsStore();
    ach.deserialize(['ach_first_ur', 'ach_first_win']);
    expect(ach.serialize()).toEqual(['ach_first_ur', 'ach_first_win']);
    expect(ach.isUnlocked('ach_first_ur')).toBe(true);
    // 已解锁的不再重复触发
    expect(ach.check('gacha', { rarities: ['UR'] })).not.toContain('ach_first_ur');
  });
});
