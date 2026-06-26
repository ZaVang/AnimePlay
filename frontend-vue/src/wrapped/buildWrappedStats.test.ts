/**
 * buildWrappedStats 特征测试（E3-T2）：成绩卡数据聚合纯函数。
 * 覆盖：完成度合并百分比、UR 拆分、欧气（UR 总数/近月数/高稀有率）、空历史兜底。
 */
import { describe, it, expect } from 'vitest';
import { buildWrappedStats, type WrappedInput, type CompletionSnapshot } from './buildWrappedStats';
import type { Rarity } from '@/types/card';

function emptyByRarity(): CompletionSnapshot['byRarity'] {
  const r = {} as CompletionSnapshot['byRarity'];
  (['UR', 'HR', 'SSR', 'SR', 'R', 'N'] as Rarity[]).forEach(k => (r[k] = { owned: 0, total: 0 }));
  return r;
}

function completion(owned: number, total: number, ur = { owned: 0, total: 0 }): CompletionSnapshot {
  const byRarity = emptyByRarity();
  byRarity.UR = ur;
  return { owned, total, byRarity };
}

function baseInput(over: Partial<WrappedInput> = {}): WrappedInput {
  return {
    username: 'tester',
    level: 5,
    knowledgePoints: 1000,
    animeCompletion: completion(0, 0),
    characterCompletion: completion(0, 0),
    achievementsUnlocked: 0,
    achievementsTotal: 20,
    milestonesClaimed: 0,
    towerMaxFloor: 0,
    uniqueCardsOwned: 0,
    history: [],
    now: 1_000_000_000_000,
    ...over,
  };
}

describe('完成度合并百分比', () => {
  it('动画+角色 owned/total 合并后四舍五入为整数百分比', () => {
    const s = buildWrappedStats(
      baseInput({
        animeCompletion: completion(30, 100),
        characterCompletion: completion(20, 100),
      }),
    );
    expect(s.codexOwned).toBe(50);
    expect(s.codexTotal).toBe(200);
    expect(s.codexPercent).toBe(25);
  });

  it('total 为 0 时百分比兜底为 0（不除零）', () => {
    const s = buildWrappedStats(baseInput());
    expect(s.codexPercent).toBe(0);
  });
});

describe('UR 拆分', () => {
  it('动画/角色 UR owned/total 从各自 byRarity.UR 取', () => {
    const s = buildWrappedStats(
      baseInput({
        animeCompletion: completion(5, 50, { owned: 2, total: 8 }),
        characterCompletion: completion(3, 40, { owned: 1, total: 6 }),
      }),
    );
    expect(s.animeUr).toEqual({ owned: 2, total: 8 });
    expect(s.characterUr).toEqual({ owned: 1, total: 6 });
  });
});

describe('欧气：UR 总数 / 近月数 / 高稀有率', () => {
  const now = 1_000_000_000_000;
  const day = 24 * 60 * 60 * 1000;

  it('统计 UR 总数与近 30 天内的 UR 数', () => {
    const s = buildWrappedStats(
      baseInput({
        now,
        history: [
          { rarity: 'UR', timestamp: now - 5 * day }, // 近月内
          { rarity: 'UR', timestamp: now - 40 * day }, // 月外
          { rarity: 'SSR', timestamp: now - 1 * day },
          { rarity: 'N', timestamp: now },
        ],
      }),
    );
    expect(s.totalPulls).toBe(4);
    expect(s.urPulls).toBe(2);
    expect(s.urThisMonth).toBe(1);
  });

  it('高稀有率 = (UR+HR+SSR)/总抽数，四舍五入百分比', () => {
    const s = buildWrappedStats(
      baseInput({
        now,
        history: [
          { rarity: 'UR', timestamp: now },
          { rarity: 'HR', timestamp: now },
          { rarity: 'SSR', timestamp: now },
          { rarity: 'R', timestamp: now },
        ],
      }),
    );
    expect(s.luckyPercent).toBe(75);
  });

  it('空历史时欧气全为 0，不除零', () => {
    const s = buildWrappedStats(baseInput({ history: [] }));
    expect(s.totalPulls).toBe(0);
    expect(s.urPulls).toBe(0);
    expect(s.urThisMonth).toBe(0);
    expect(s.luckyPercent).toBe(0);
  });
});

describe('品味身份注入（I2-T4）', () => {
  const taste = {
    personaEmoji: '🔍',
    personaTitle: '小众考古学家',
    topTags: ['百合', '校园', '治愈'],
    nicheScore: 82,
    watchedCount: 24,
  };

  it('有看过数据时原样注入 taste', () => {
    const s = buildWrappedStats(baseInput({ taste }));
    expect(s.taste).toEqual(taste);
  });

  it('未传 taste 时为 null（缺数据守卫不显示）', () => {
    const s = buildWrappedStats(baseInput());
    expect(s.taste).toBeNull();
  });

  it('watchedCount 为 0 时不注入（视为缺数据）', () => {
    const s = buildWrappedStats(baseInput({ taste: { ...taste, watchedCount: 0 } }));
    expect(s.taste).toBeNull();
  });
});

describe('透传字段', () => {
  it('等级/知识点/成就/里程碑/塔/卡种原样透传', () => {
    const s = buildWrappedStats(
      baseInput({
        level: 12,
        knowledgePoints: 4200,
        achievementsUnlocked: 7,
        achievementsTotal: 20,
        milestonesClaimed: 3,
        towerMaxFloor: 15,
        uniqueCardsOwned: 88,
      }),
    );
    expect(s.level).toBe(12);
    expect(s.knowledgePoints).toBe(4200);
    expect(s.achievementsUnlocked).toBe(7);
    expect(s.achievementsTotal).toBe(20);
    expect(s.milestonesClaimed).toBe(3);
    expect(s.towerMaxFloor).toBe(15);
    expect(s.uniqueCardsOwned).toBe(88);
  });
});
