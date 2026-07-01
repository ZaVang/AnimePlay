/**
 * 养成规则特征测试（S4 建立；S13-C1 改加点制；S14-A SA-T3 改确定成长）。
 */
import { describe, it, expect } from 'vitest';
import {
  getRequiredExpForLevel,
  getLevelFromExp,
  getLevelProgress,
  createEmptyStatPoints,
  distributeRandomStatPoints,
  distributeStatPointsByBase,
  rollLevelUpStatPoints,
  createDefaultNurtureData,
  POINTS_PER_LEVEL,
  MAX_CHARACTER_LEVEL,
} from './rules';
import { createSeededRng } from '../rng';
import type { StatPoints } from '@/types/nurture';

const sum = (s: StatPoints) => s.hp + s.atk + s.def + s.sp + s.spd;

describe('等级曲线 (level-1)² × 1000', () => {
  it('关键节点', () => {
    expect(getRequiredExpForLevel(1)).toBe(0);
    expect(getRequiredExpForLevel(2)).toBe(1000);
    expect(getRequiredExpForLevel(3)).toBe(4000);
    expect(getRequiredExpForLevel(10)).toBe(81000);
    expect(getRequiredExpForLevel(100)).toBe(9801000);
  });

  it('getLevelFromExp 边界：恰到阈值即升级', () => {
    expect(getLevelFromExp(0)).toBe(1);
    expect(getLevelFromExp(999)).toBe(1);
    expect(getLevelFromExp(1000)).toBe(2);
    expect(getLevelFromExp(4000)).toBe(3);
    expect(getLevelFromExp(80999)).toBe(9);
    expect(getLevelFromExp(81000)).toBe(10);
  });

  it('getLevelProgress：等级内经验与百分比', () => {
    // Lv2 起点 1000，Lv3 起点 4000 → 区间 3000
    expect(getLevelProgress(2, 2500)).toEqual({ current: 1500, required: 3000, percentage: 50 });
    expect(getLevelProgress(1, 0)).toEqual({ current: 0, required: 1000, percentage: 0 });
  });

  it('满级常量与每级加点常量', () => {
    expect(MAX_CHARACTER_LEVEL).toBe(100);
    expect(POINTS_PER_LEVEL).toBeGreaterThan(0);
  });
});

describe('distributeRandomStatPoints（保留的随机分配；不再用于升级路径）', () => {
  it('分配总和恒等于输入点数，且各项非负', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const d = distributeRandomStatPoints(POINTS_PER_LEVEL, createSeededRng(seed));
      expect(sum(d)).toBe(POINTS_PER_LEVEL);
      for (const v of [d.hp, d.atk, d.def, d.sp, d.spd]) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('零点 / 负数点 → 空加点', () => {
    expect(distributeRandomStatPoints(0, createSeededRng(1))).toEqual(createEmptyStatPoints());
    expect(distributeRandomStatPoints(-5, createSeededRng(1))).toEqual(createEmptyStatPoints());
  });
});

describe('distributeStatPointsByBase（SA-T3 确定分配：按 base 五维比例）', () => {
  // 均衡 base（五维相等）：30% 均分 + 70% 均分 = 完全均分（10 点 → 2/2/2/2/2）
  it('均衡 base → 均分，总和 = 输入点数', () => {
    const d = distributeStatPointsByBase(POINTS_PER_LEVEL, { hp: 100, atk: 100, def: 100, sp: 100, spd: 100 });
    expect(d).toEqual({ hp: 2, atk: 2, def: 2, sp: 2, spd: 2 });
    expect(sum(d)).toBe(POINTS_PER_LEVEL);
  });

  // 确定性：同 base、同点数 → 逐值可复现（不依赖任何随机源）
  it('确定可复现：同输入逐值相同', () => {
    const base = { hp: 400, atk: 120, def: 90, sp: 60, spd: 80 };
    expect(distributeStatPointsByBase(POINTS_PER_LEVEL, base)).toEqual(distributeStatPointsByBase(POINTS_PER_LEVEL, base));
  });

  // 定位倾斜：base 高的维分到更多点（守护型 hp/def 高 → hp/def 加点更多）
  it('按定位倾斜：base 高维分点更多', () => {
    const tank = distributeStatPointsByBase(POINTS_PER_LEVEL, { hp: 500, atk: 40, def: 200, sp: 30, spd: 30 });
    expect(sum(tank)).toBe(POINTS_PER_LEVEL);
    expect(tank.hp).toBeGreaterThan(tank.atk);
    expect(tank.hp).toBeGreaterThan(tank.sp);
    expect(tank.def).toBeGreaterThan(tank.atk);
    // 混合分配保底：即使某维 base 很低也不至于恒为 0（30% 均分兜底）
    for (const v of [tank.hp, tank.atk, tank.def, tank.sp, tank.spd]) expect(v).toBeGreaterThanOrEqual(0);
  });

  // 大点数下比例更贴近 base 分布（striker atk 高）
  it('大点数：atk 高的角色 atk 加点最多', () => {
    const striker = distributeStatPointsByBase(100, { hp: 120, atk: 400, def: 60, sp: 80, spd: 140 });
    expect(sum(striker)).toBe(100);
    const max = Math.max(striker.hp, striker.atk, striker.def, striker.sp, striker.spd);
    expect(striker.atk).toBe(max);
  });

  it('零点 / 负数点 → 空加点；base 全 0 → 均分', () => {
    expect(distributeStatPointsByBase(0, { hp: 1, atk: 1, def: 1, sp: 1, spd: 1 })).toEqual(createEmptyStatPoints());
    expect(distributeStatPointsByBase(-5, { hp: 1, atk: 1, def: 1, sp: 1, spd: 1 })).toEqual(createEmptyStatPoints());
    const allZero = distributeStatPointsByBase(POINTS_PER_LEVEL, { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 });
    expect(allZero).toEqual({ hp: 2, atk: 2, def: 2, sp: 2, spd: 2 });
  });
});

describe('rollLevelUpStatPoints（SA-T3 确定多级结算：按 base 比例）', () => {
  const base = { hp: 400, atk: 120, def: 90, sp: 60, spd: 80 };

  it('升 N 级总点数 = N × POINTS_PER_LEVEL', () => {
    expect(sum(rollLevelUpStatPoints(1, 4, base))).toBe(3 * POINTS_PER_LEVEL); // 升 3 级
  });

  it('确定可复现；oldLevel == newLevel 不加点', () => {
    expect(rollLevelUpStatPoints(5, 8, base)).toEqual(rollLevelUpStatPoints(5, 8, base));
    expect(rollLevelUpStatPoints(5, 5, base)).toEqual(createEmptyStatPoints());
  });

  it('多级 = 单级 × 级数（逐级一致）', () => {
    const one = distributeStatPointsByBase(POINTS_PER_LEVEL, base);
    const three = rollLevelUpStatPoints(2, 5, base); // 升 3 级
    expect(three).toEqual({ hp: one.hp * 3, atk: one.atk * 3, def: one.def * 3, sp: one.sp * 3, spd: one.spd * 3 });
  });
});

describe('createDefaultNurtureData（瘦身两轴）', () => {
  it('默认值：等级 1 / 好感 0 / 空加点 / 空里程碑，且不含已删字段', () => {
    const d = createDefaultNurtureData();
    expect(d.level).toBe(1);
    expect(d.affection).toBe(0);
    expect(d.experience).toBe(0);
    expect(d.totalExperience).toBe(0);
    expect(d.statPoints).toEqual({ hp: 0, atk: 0, def: 0, sp: 0, spd: 0 });
    expect(d.claimedBondMilestones).toEqual([]);
    // 瘦身：删掉的旧字段不应出现
    expect(d).not.toHaveProperty('attributes');
    expect(d).not.toHaveProperty('battleEnhancements');
    expect(d).not.toHaveProperty('intimacy');
    expect(d).not.toHaveProperty('gifts');
  });
});
