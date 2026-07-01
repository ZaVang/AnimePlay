import { describe, expect, it } from 'vitest';
import {
  activeStatusesAt,
  applyStatus,
  calculateEffectiveStats,
  getCritRateBonus,
  getSpeedMultiplier,
  hasStatus,
  type RuntimeStatus,
} from './effects';
import type { BattleStats } from './combat';

const stats = (over: Partial<BattleStats> = {}): BattleStats => ({
  hp: 1000,
  atk: 100,
  def: 100,
  sp: 100,
  spd: 100,
  ...over,
});

const status = (over: Partial<RuntimeStatus>): RuntimeStatus => ({
  id: 's',
  type: 'atkUp',
  value: 0.5,
  appliedAtMs: 0,
  expiresAtMs: 3000,
  ...over,
});

describe('D1 status effects', () => {
  it('applies atkUp, defUp, and spUp until their expiry time', () => {
    const statuses = [
      status({ id: 'atk', type: 'atkUp', value: 0.5 }),
      status({ id: 'def', type: 'defUp', value: 0.25 }),
      status({ id: 'sp', type: 'spUp', value: 0.2 }),
    ];

    expect(calculateEffectiveStats(stats(), statuses, 1000)).toEqual({
      hp: 1000,
      atk: 150,
      def: 125,
      sp: 120,
      spd: 100,
    });
    expect(calculateEffectiveStats(stats(), statuses, 3000)).toEqual(stats());
  });

  it('combines haste and slow into a speed multiplier without changing raw SPD', () => {
    const statuses = [
      status({ id: 'haste', type: 'haste', value: 0.5 }),
      status({ id: 'slow', type: 'slow', value: 0.25 }),
    ];

    expect(getSpeedMultiplier(statuses, 1000)).toBe(1.25);
    expect(calculateEffectiveStats(stats(), statuses, 1000).spd).toBe(100);
  });

  it('keeps critRate as a modifier-only stat', () => {
    expect(getCritRateBonus([], 1000)).toBe(0);
    expect(getCritRateBonus([status({ type: 'critRateUp', value: 0.3 })], 1000)).toBe(0.3);
  });

  it('tracks control statuses and removes expired statuses', () => {
    const statuses = [
      status({ id: 'stun', type: 'stun', value: 1, expiresAtMs: 2000 }),
      status({ id: 'silence', type: 'silence', value: 1, expiresAtMs: 4000 }),
    ];

    expect(hasStatus(statuses, 'stun', 1999)).toBe(true);
    expect(hasStatus(statuses, 'stun', 2000)).toBe(false);
    expect(hasStatus(statuses, 'silence', 3000)).toBe(true);
    expect(activeStatusesAt(statuses, 4000)).toEqual([]);
  });

  it('adds statuses immutably with generated expiry and tick metadata', () => {
    const statuses: RuntimeStatus[] = [];
    const next = applyStatus(statuses, {
      id: 'dot-1',
      type: 'dot',
      value: 10,
      durationMs: 3000,
      tickIntervalMs: 1000,
    }, 500);

    expect(statuses).toHaveLength(0);
    expect(next).toEqual([
      {
        id: 'dot-1',
        type: 'dot',
        value: 10,
        appliedAtMs: 500,
        expiresAtMs: 3500,
        tickIntervalMs: 1000,
        nextTickAtMs: 1500,
      },
    ]);
  });
});
