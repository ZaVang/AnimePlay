/**
 * 养成规则特征测试（S4）。
 */
import { describe, it, expect } from 'vitest';
import {
  getRequiredExpForLevel,
  getLevelFromExp,
  getLevelProgress,
  levelUpAttributePoints,
  distributeRandomAttributes,
  createDefaultNurtureData,
  applyBattleEnhancements,
  generateTrainingOpponent,
  trainingOutcome,
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

  it('升级属性点 = 等级 × 10；满级 100', () => {
    expect(levelUpAttributePoints(2)).toBe(20);
    expect(levelUpAttributePoints(50)).toBe(500);
    expect(MAX_CHARACTER_LEVEL).toBe(100);
  });
});

describe('distributeRandomAttributes', () => {
  it('分配总和恒等于输入点数，且各项非负', () => {
    for (let seed = 1; seed <= 20; seed++) {
      const d = distributeRandomAttributes(100, createSeededRng(seed));
      expect(d.charm + d.intelligence + d.strength).toBe(100);
      expect(d.charm).toBeGreaterThanOrEqual(0);
      expect(d.intelligence).toBeGreaterThanOrEqual(0);
      expect(d.strength).toBeGreaterThanOrEqual(0);
    }
  });

  it('同种子可复现', () => {
    const a = distributeRandomAttributes(50, createSeededRng(7));
    const b = distributeRandomAttributes(50, createSeededRng(7));
    expect(a).toEqual(b);
  });
});

describe('createDefaultNurtureData', () => {
  it('默认值与原 userStore 工厂一致', () => {
    const d = createDefaultNurtureData();
    expect(d.level).toBe(1);
    expect(d.attributes).toEqual({ charm: 50, intelligence: 50, strength: 50, mood: 80 });
    expect(d.battleEnhancements).toEqual({ hp: 0, atk: 0, def: 0, sp: 0, spd: 0 });
    expect(d.affection).toBe(0);
  });
});

describe('applyBattleEnhancements', () => {
  it('原始 × (1 + 强化%/100) 向下取整', () => {
    const base = { hp: 100, atk: 60, def: 40, sp: 50, spd: 70 };
    expect(applyBattleEnhancements(base, { hp: 50, atk: 0, def: 25, sp: 10, spd: 100 })).toEqual({
      hp: 150,
      atk: 60,
      def: 50,
      sp: 55,
      spd: 140,
    });
  });
});

describe('训练', () => {
  const player = { hp: 100, atk: 100, def: 100, sp: 100, spd: 100 };

  it('对手基底打折（hp/def/sp ×0.8，atk/spd ×0.9），训练项给克制强化', () => {
    // 练攻击 → 防御型对手：def = 100×0.8×1.2 = 96
    expect(generateTrainingOpponent('atk', player)).toEqual({ hp: 80, atk: 90, def: 96, sp: 80, spd: 90 });
    // 练生命 → 耐久对手：hp = 100×0.8×1.4 = 112
    expect(generateTrainingOpponent('hp', player)).toEqual({ hp: 112, atk: 90, def: 80, sp: 80, spd: 90 });
    expect(generateTrainingOpponent('sp', player).sp).toBe(104); // 80×1.3
  });

  it('结算表：胜 100%/25 经验，负 40% 向上取整/10，平 70%/18', () => {
    expect(trainingOutcome('attacker', 3)).toEqual({ gain: 3, exp: 25 });
    expect(trainingOutcome('defender', 3)).toEqual({ gain: 2, exp: 10 }); // ceil(1.2)
    expect(trainingOutcome(null, 3)).toEqual({ gain: 3, exp: 18 }); // ceil(2.1)
  });
});
