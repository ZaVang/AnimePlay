/**
 * 小队战公式特征测试（S1 建立，S3 随公式迁入 engine/squad/combat）。
 * S3 起随机源注入：用 createSequenceRng 替代 Math.random spy，断言数值不变。
 */
import { describe, it, expect } from 'vitest';
import {
  calculateDamageReduction,
  calculateDamageBonus,
  calculateCriticalRate,
  calculateAttackDamage,
  simulateBattle,
  calculateBattlePower,
  generateBattleStats,
  type BattleStats,
} from './combat';
import { createSequenceRng } from '../rng';

const stats = (over: Partial<BattleStats> = {}): BattleStats => ({
  hp: 100, atk: 100, def: 0, sp: 0, spd: 0, ...over,
});

const noCrit = () => createSequenceRng([0.99]); // 连击率上限 0.5 → 0.99 永不连击
const alwaysCrit = () => createSequenceRng([0]);

describe('基础曲线', () => {
  it('减伤率 = DEF/(1000+DEF)', () => {
    expect(calculateDamageReduction(0)).toBe(0);
    expect(calculateDamageReduction(1000)).toBe(0.5);
    expect(calculateDamageReduction(500)).toBeCloseTo(1 / 3, 10);
  });

  it('增伤率 = SP/(1000+SP)', () => {
    expect(calculateDamageBonus(0)).toBe(0);
    expect(calculateDamageBonus(1000)).toBe(0.5);
    expect(calculateDamageBonus(3000)).toBe(0.75);
  });

  it('连击率 = min(SPD/10, 50)%，500 速即触顶', () => {
    expect(calculateCriticalRate(0)).toBe(0);
    expect(calculateCriticalRate(100)).toBeCloseTo(0.1, 10);
    expect(calculateCriticalRate(500)).toBe(0.5); // 恰好到顶
    expect(calculateCriticalRate(99999)).toBe(0.5); // 封顶
  });
});

describe('单次伤害 calculateAttackDamage', () => {
  it('无连击：ATK × (1+增伤) × (1−减伤)，向下取整', () => {
    const r = calculateAttackDamage(stats({ atk: 200, sp: 1000 }), stats({ def: 1000 }), noCrit());
    // 200 × 1.5 × 0.5 = 150
    expect(r).toEqual({ damage: 150, isCriticalHit: false });
  });

  it('连击时 ×1.3', () => {
    const r = calculateAttackDamage(stats({ atk: 200, sp: 1000, spd: 100 }), stats({ def: 1000 }), alwaysCrit());
    // 150 × 1.3 = 195
    expect(r).toEqual({ damage: 195, isCriticalHit: true });
  });

  it('伤害下限为 1（防御再高也掉 1 滴血）', () => {
    const r = calculateAttackDamage(stats({ atk: 1 }), stats({ def: 1_000_000 }), noCrit());
    expect(r.damage).toBe(1);
  });
});

describe('完整战斗 simulateBattle', () => {
  it('碾压局：玩家先手一刀清场，敌方 HP 归零', () => {
    const result = simulateBattle(
      stats({ hp: 100, atk: 100 }),
      stats({ hp: 10, atk: 1 }),
      noCrit(),
    );
    expect(result.winner).toBe('attacker');
    expect(result.defenderRemainHP).toBe(0);
    expect(result.attackerRemainHP).toBe(100); // 敌人没出手
    expect(result.damage).toBe(100); // 只统计玩家输出
  });

  it('对称局也能分出结果且 HP 不为负', () => {
    const result = simulateBattle(
      stats({ hp: 50, atk: 10 }),
      stats({ hp: 50, atk: 10 }),
      noCrit(),
    );
    // 同攻同血玩家先手必胜
    expect(result.winner).toBe('attacker');
    expect(result.attackerRemainHP).toBeGreaterThanOrEqual(0);
    expect(result.defenderRemainHP).toBe(0);
  });
});

describe('战力评分 calculateBattlePower', () => {
  it('floor((攻击力×(1+增伤) + HP×(1−减伤)×0.5) × (1+连击率×0.3))', () => {
    // atk=100(无增伤)=100；hp=1000(无减伤)×0.5=500；速度加成=1
    expect(calculateBattlePower(stats({ hp: 1000, atk: 100 }))).toBe(600);
    // 满连击率：(100+500)×1.15=690
    expect(calculateBattlePower(stats({ hp: 1000, atk: 100, spd: 500 }))).toBe(690);
  });
});

describe('养成联动 generateBattleStats', () => {
  it('零养成零强化时返回基础属性', () => {
    const base = stats({ hp: 100, atk: 50, def: 30, sp: 40, spd: 60 });
    const r = generateBattleStats(base, { charm: 0, intelligence: 0, strength: 0 }, { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 });
    expect(r).toEqual(base);
  });

  it('养成属性按系数注入：体力→攻/防、智力→SP、魅力→速、(体+魅)→HP', () => {
    const base = stats({ hp: 100, atk: 50, def: 30, sp: 40, spd: 60 });
    const r = generateBattleStats(
      base,
      { charm: 80, intelligence: 70, strength: 90 },
      { hp: 50, atk: 50, def: 50, sp: 50, spd: 50 }, // ×1.5（二进制精确，避免浮点边界）
    );
    expect(r).toEqual({
      hp: Math.floor(100 * 1.5 + Math.floor((90 + 80) * 0.2)), // 150+34=184
      atk: Math.floor(50 * 1.5 + Math.floor(90 * 0.5)),        // 75+45=120
      def: Math.floor(30 * 1.5 + Math.floor(90 * 0.3)),        // 45+27=72
      sp: Math.floor(40 * 1.5 + Math.floor(70 * 0.4)),         // 60+28=88
      spd: Math.floor(60 * 1.5 + Math.floor(80 * 0.3)),        // 90+24=114
    });
    expect(r).toEqual({ hp: 184, atk: 120, def: 72, sp: 88, spd: 114 });
  });
});
