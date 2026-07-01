import { describe, expect, it } from 'vitest';
import { createSequenceRng } from '../rng';
import {
  calculateActionIntervalMs,
  calculateBasicAttackDamage,
  calculateDefenseReduction,
  calculateHealing,
  calculateShield,
  calculateSkillDamage,
  DEFAULT_CRIT_DAMAGE,
  DEFAULT_CRIT_RATE,
  rollDamageVariance,
  type DamageContext,
} from './formulas';
import type { BattleStats } from './combat';

const stats = (over: Partial<BattleStats> = {}): BattleStats => ({
  hp: 1000,
  atk: 100,
  def: 0,
  sp: 100,
  spd: 0,
  ...over,
});

describe('D1 formulas', () => {
  it('uses DEF/(1000+DEF) as the mitigation curve', () => {
    expect(calculateDefenseReduction(0)).toBe(0);
    expect(calculateDefenseReduction(1000)).toBe(0.5);
    expect(calculateDefenseReduction(500)).toBeCloseTo(1 / 3, 10);
  });

  it('rolls damage variance in the 0.95-1.05 band through injected RNG', () => {
    expect(rollDamageVariance(createSequenceRng([0]))).toBe(0.95);
    expect(rollDamageVariance(createSequenceRng([0.5]))).toBe(1);
    expect(rollDamageVariance(createSequenceRng([0.999]))).toBeCloseTo(1.0499, 10);
  });

  it('calculates basic attack damage with variance, DEF mitigation, and default 0 crit rate', () => {
    const result = calculateBasicAttackDamage(
      stats({ atk: 200 }),
      stats({ def: 1000 }),
      createSequenceRng([0.5, 0]),
    );

    expect(result).toEqual({ damage: 100, isCritical: false });
  });

  it('uses 150% crit damage only when critRate comes from modifiers', () => {
    expect(DEFAULT_CRIT_RATE).toBe(0);
    expect(DEFAULT_CRIT_DAMAGE).toBe(1.5);

    const ctx: DamageContext = { critRate: 1, critDamage: DEFAULT_CRIT_DAMAGE };
    const result = calculateBasicAttackDamage(
      stats({ atk: 200 }),
      stats({ def: 0 }),
      createSequenceRng([0.5, 0]),
      ctx,
    );

    expect(result).toEqual({ damage: 300, isCritical: true });
  });

  it('calculates skill damage with the same variance and defense rules', () => {
    const result = calculateSkillDamage(
      stats({ atk: 200, sp: 100 }),
      stats({ def: 1000 }),
      { coefficient: 2, scaling: 'atk' },
      createSequenceRng([0.5]),
    );

    expect(result.damage).toBe(200);
  });

  it('healing and shield values do not read enemy DEF', () => {
    const caster = stats({ atk: 50, sp: 200 });
    const lowDefTarget = stats({ def: 0 });
    const highDefTarget = stats({ def: 9999 });

    expect(calculateHealing(caster, lowDefTarget, { spCoefficient: 1, atkCoefficient: 0.5 })).toBe(225);
    expect(calculateHealing(caster, highDefTarget, { spCoefficient: 1, atkCoefficient: 0.5 })).toBe(225);
    expect(calculateShield(caster, lowDefTarget, { spCoefficient: 1, defCoefficient: 0.25 })).toBe(200);
    expect(calculateShield(caster, highDefTarget, { spCoefficient: 1, defCoefficient: 0.25 })).toBe(200);
  });

  it('SPD only drives actionIntervalMs through the D1 clamp formula', () => {
    expect(calculateActionIntervalMs(0)).toBe(3000);
    expect(calculateActionIntervalMs(500)).toBe(1500);
    expect(calculateActionIntervalMs(1000)).toBe(1200);
    expect(calculateActionIntervalMs(-250)).toBe(4500);
  });
});
