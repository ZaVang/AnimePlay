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

  it('SB-T5: sums same-kind stackable buffs by source and clamps at the per-kind cap', () => {
    // 三条 atkUp 分别来自不同来源（id 唯一）→ 按来源累加 0.2+0.25+0.3 = 0.75，触顶 atkUp cap 0.6。
    const statuses = [
      status({ id: 'atk-a', type: 'atkUp', value: 0.2 }),
      status({ id: 'atk-b', type: 'atkUp', value: 0.25 }),
      status({ id: 'atk-c', type: 'atkUp', value: 0.3 }),
    ];
    // 未触顶：0.2+0.15 = 0.35 → atk 135（双辅助不再被 Math.max 压平）。
    const twoSources = [
      status({ id: 'atk-a', type: 'atkUp', value: 0.2 }),
      status({ id: 'atk-b', type: 'atkUp', value: 0.15 }),
    ];

    expect(calculateEffectiveStats(stats(), twoSources, 1000).atk).toBe(135);
    // 累加求和触顶 0.6：atk = floor(100 * (1 + 0.6)) = 160（若仍取 Math.max 则会是 130）。
    expect(calculateEffectiveStats(stats(), statuses, 1000).atk).toBe(160);
  });

  it('SB-T5: sums multiple critRateUp sources up to the critRateUp cap', () => {
    // 单来源不变（回归安全）。
    expect(getCritRateBonus([status({ type: 'critRateUp', value: 0.3 })], 1000)).toBe(0.3);
    // 多来源累加：0.25 + 0.25 = 0.5 —— 恰好在 critRateUp cap 0.5。
    expect(getCritRateBonus([
      status({ id: 'crit-a', type: 'critRateUp', value: 0.25 }),
      status({ id: 'crit-b', type: 'critRateUp', value: 0.25 }),
    ], 1000)).toBe(0.5);
    // 超出 cap 被 clamp：0.4 + 0.4 = 0.8 → 0.5。
    expect(getCritRateBonus([
      status({ id: 'crit-a', type: 'critRateUp', value: 0.4 }),
      status({ id: 'crit-b', type: 'critRateUp', value: 0.4 }),
    ], 1000)).toBe(0.5);
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
