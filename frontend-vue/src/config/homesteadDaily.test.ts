/**
 * ★ S16-T9/T10/T11 家园「收藏陈列 + 回访新鲜」纯派生逻辑测试。
 * 锁死：today-special date-seed 确定性（同天恒定 / 跨天换人）、空态优雅（0 入住 → null）、
 * 收藏陈列稀有度降级（0 UR → 次高档 / 全空 → null / 引导态）、季节由月份派生。
 * 全部纯函数、零存档、零副作用。
 */
import { describe, it, expect } from 'vitest';
import {
  todayKey,
  pickTodaySpecialId,
  pickShowcaseRarity,
  showcaseIsEmpty,
  seasonForMonth,
  currentSeason,
  SHOWCASE_RARITY_ORDER,
} from './homesteadDaily';
import { pickTodaySpecialDialogue, TODAY_SPECIAL_LINE_COUNT } from './homesteadDialogues';
import type { Rarity } from '@/types/card';

describe('todayKey（本地 YYYY-M-D，与 daily.ts/nurture.ts 同格式）', () => {
  it('格式化到年-月-日（月从 1 起，非补零）', () => {
    expect(todayKey(new Date(2026, 6, 7))).toBe('2026-7-7'); // month 6 = 7 月
    expect(todayKey(new Date(2025, 0, 1))).toBe('2025-1-1');
    expect(todayKey(new Date(2024, 11, 31))).toBe('2024-12-31');
  });
  it('同一自然日恒定、跨天即变', () => {
    const a = todayKey(new Date(2026, 6, 7, 9, 30));
    const b = todayKey(new Date(2026, 6, 7, 23, 59));
    const c = todayKey(new Date(2026, 6, 8, 0, 1));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe('★ S16-T10 pickTodaySpecialId（date-seeded 今日特殊角色，零存档）', () => {
  const placed = [101, 202, 303, 404];

  it('同一天 + 同入住名单 → 恒定（同 seed 同结果）', () => {
    const key = '2026-7-7';
    const first = pickTodaySpecialId(placed, key);
    for (let i = 0; i < 50; i++) {
      expect(pickTodaySpecialId(placed, key)).toBe(first);
    }
    // 选出的一定是入住名单里的成员
    expect(placed).toContain(first);
  });

  it('入住名单顺序不影响结果（按值稳定，非按序）', () => {
    const key = '2026-7-7';
    const a = pickTodaySpecialId([101, 202, 303, 404], key);
    const b = pickTodaySpecialId([404, 303, 202, 101], key);
    expect(a).toBe(b);
  });

  it('跨天（dayKey 变）→ 会自动换人（至少某一天与今日不同）', () => {
    const base = pickTodaySpecialId(placed, '2026-7-7');
    // 连续多天里必然出现与今日不同的选择（否则 date-seed 形同虚设）。
    const days = ['2026-7-8', '2026-7-9', '2026-7-10', '2026-7-11', '2026-7-12', '2026-7-13', '2026-7-14'];
    const anyDifferent = days.some(d => pickTodaySpecialId(placed, d) !== base);
    expect(anyDifferent).toBe(true);
  });

  it('多天分布覆盖多个角色（不是永远同一个）', () => {
    const seen = new Set<number | null>();
    for (let d = 1; d <= 60; d++) {
      seen.add(pickTodaySpecialId(placed, `2026-7-${d}`));
    }
    // 60 天里至少选中过 2 个不同角色（避免退化为常量）。
    expect(seen.size).toBeGreaterThanOrEqual(2);
  });

  it('空态：0 入住 → null（不硬造今日特殊，广场标识分支不显示）', () => {
    expect(pickTodaySpecialId([], '2026-7-7')).toBeNull();
  });

  it('单入住 → 恒返回唯一那个（不炸）', () => {
    expect(pickTodaySpecialId([777], '2026-7-7')).toBe(777);
    expect(pickTodaySpecialId([777], '2026-8-1')).toBe(777);
  });

  it('改入住名单当天也可能换（不同名单允许不同结果，纳入 seed）', () => {
    // 只要两组不同名单在同一天能得到「至少某种可分辨」的行为即可（选中的都在各自名单内）。
    const s1 = pickTodaySpecialId([1, 2, 3], '2026-7-7');
    const s2 = pickTodaySpecialId([1, 2, 3, 4, 5], '2026-7-7');
    expect([1, 2, 3]).toContain(s1);
    expect([1, 2, 3, 4, 5]).toContain(s2);
  });
});

describe('★ S16-T9 pickShowcaseRarity / showcaseIsEmpty（收藏陈列稀有度降级，0 UR 不空墙）', () => {
  it('有 UR → 选 UR', () => {
    expect(pickShowcaseRarity({ UR: 3, HR: 5, SSR: 10 })).toBe('UR');
  });
  it('0 UR → 降级到已拥有的最高稀有度（次高档）', () => {
    expect(pickShowcaseRarity({ UR: 0, HR: 2, SSR: 8 })).toBe('HR');
    expect(pickShowcaseRarity({ HR: 0, SSR: 0, SR: 4 })).toBe('SR');
  });
  it('只有最低档 N 拥有 → 选 N（仍是「拥有的脸」，不空墙）', () => {
    expect(pickShowcaseRarity({ N: 1 })).toBe('N');
  });
  it('一张都没拥有 → null（走引导态，绝不空墙 / 缺口条）', () => {
    expect(pickShowcaseRarity({})).toBeNull();
    expect(pickShowcaseRarity({ UR: 0, HR: 0, SSR: 0, SR: 0, R: 0, N: 0 })).toBeNull();
    expect(showcaseIsEmpty({})).toBe(true);
    expect(showcaseIsEmpty({ UR: 0, N: 0 })).toBe(true);
  });
  it('showcaseIsEmpty：有任一拥有 → 非空', () => {
    expect(showcaseIsEmpty({ N: 1 })).toBe(false);
    expect(showcaseIsEmpty({ UR: 5 })).toBe(false);
  });
  it('降级严格按稀有度高→低次序（SHOWCASE_RARITY_ORDER）', () => {
    expect(SHOWCASE_RARITY_ORDER[0]).toBe('UR');
    expect(SHOWCASE_RARITY_ORDER[SHOWCASE_RARITY_ORDER.length - 1]).toBe('N');
    // 同时拥有多档 → 取最高
    const owned: Partial<Record<Rarity, number>> = { UR: 0, HR: 0, SSR: 1, SR: 1, R: 1, N: 1 };
    expect(pickShowcaseRarity(owned)).toBe('SSR');
  });
});

describe('★ S16-T11 seasonForMonth / currentSeason（月份 → 季节，纯派生）', () => {
  it('北半球四季分档', () => {
    expect(seasonForMonth(2)).toBe('spring'); // 3 月
    expect(seasonForMonth(4)).toBe('spring'); // 5 月
    expect(seasonForMonth(5)).toBe('summer'); // 6 月
    expect(seasonForMonth(6)).toBe('summer'); // 7 月（今天 2026-07 盛夏）
    expect(seasonForMonth(8)).toBe('autumn'); // 9 月
    expect(seasonForMonth(11)).toBe('winter'); // 12 月
    expect(seasonForMonth(0)).toBe('winter'); // 1 月
    expect(seasonForMonth(1)).toBe('winter'); // 2 月
  });
  it('容错任意整数（环绕取模）', () => {
    expect(seasonForMonth(12)).toBe(seasonForMonth(0));
    expect(seasonForMonth(-1)).toBe(seasonForMonth(11));
  });
  it('currentSeason 返回主题（非空 particles + label）', () => {
    const s = currentSeason(new Date(2026, 6, 7)); // 盛夏
    expect(s.season).toBe('summer');
    expect(s.particles.length).toBeGreaterThan(0);
    expect(typeof s.label).toBe('string');
  });
});

describe('★ S16-T10 pickTodaySpecialDialogue（今日专属台词，纯 config 零数值）', () => {
  it('台词池非空', () => {
    expect(TODAY_SPECIAL_LINE_COUNT).toBeGreaterThan(0);
  });
  it('按 index 环绕取句，永不空白', () => {
    for (let i = 0; i < TODAY_SPECIAL_LINE_COUNT * 2 + 3; i++) {
      const line = pickTodaySpecialDialogue(i);
      expect(typeof line).toBe('string');
      expect(line.length).toBeGreaterThan(0);
    }
  });
  it('同 index 恒定（确定性）', () => {
    expect(pickTodaySpecialDialogue(3)).toBe(pickTodaySpecialDialogue(3));
  });
});
