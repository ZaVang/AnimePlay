/**
 * 养成规则特征测试（S4 建立；S13-C1 改为加点制）。
 */
import { describe, it, expect } from 'vitest';
import {
  getRequiredExpForLevel,
  getLevelFromExp,
  getLevelProgress,
  createEmptyStatPoints,
  distributeRandomStatPoints,
  rollLevelUpStatPoints,
  createDefaultNurtureData,
  POINTS_PER_LEVEL,
  MAX_CHARACTER_LEVEL,
} from './rules';
import { createSeededRng } from '../rng';

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

describe('distributeRandomStatPoints（升级随机加点 → 5 战斗维）', () => {
  it('分配总和恒等于输入点数，且各项非负', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const d = distributeRandomStatPoints(POINTS_PER_LEVEL, createSeededRng(seed));
      expect(d.hp + d.atk + d.def + d.sp + d.spd).toBe(POINTS_PER_LEVEL);
      for (const v of [d.hp, d.atk, d.def, d.sp, d.spd]) expect(v).toBeGreaterThanOrEqual(0);
    }
  });

  it('注入 RNG 可复现（同种子同结果）', () => {
    const a = distributeRandomStatPoints(50, createSeededRng(7));
    const b = distributeRandomStatPoints(50, createSeededRng(7));
    expect(a).toEqual(b);
  });

  it('零点 / 负数点 → 空加点', () => {
    expect(distributeRandomStatPoints(0, createSeededRng(1))).toEqual(createEmptyStatPoints());
    expect(distributeRandomStatPoints(-5, createSeededRng(1))).toEqual(createEmptyStatPoints());
  });
});

describe('rollLevelUpStatPoints（多级跳跃一次结算）', () => {
  it('升 N 级总点数 = N × POINTS_PER_LEVEL', () => {
    const gain = rollLevelUpStatPoints(1, 4, createSeededRng(3)); // 升 3 级
    expect(gain.hp + gain.atk + gain.def + gain.sp + gain.spd).toBe(3 * POINTS_PER_LEVEL);
  });

  it('同种子可复现；oldLevel == newLevel 不加点', () => {
    expect(rollLevelUpStatPoints(5, 8, createSeededRng(9))).toEqual(rollLevelUpStatPoints(5, 8, createSeededRng(9)));
    expect(rollLevelUpStatPoints(5, 5, createSeededRng(9))).toEqual(createEmptyStatPoints());
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
