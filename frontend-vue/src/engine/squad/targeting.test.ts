import { describe, expect, it } from 'vitest';
import { selectTargets, type TargetableUnit } from './targeting';

const unit = (over: Partial<TargetableUnit>): TargetableUnit => ({
  id: 'u',
  side: 'player',
  position: 0,
  hp: 100,
  maxHp: 100,
  atk: 10,
  statuses: [],
  ...over,
});

describe('D1 targeting', () => {
  it('selects the front living enemy by position', () => {
    const source = unit({ id: 'p1', side: 'player' });
    const units = [
      source,
      unit({ id: 'e-back', side: 'enemy', position: 2 }),
      unit({ id: 'e-front', side: 'enemy', position: 0 }),
      unit({ id: 'e-dead', side: 'enemy', position: -1, hp: 0 }),
    ];

    expect(selectTargets(units, source, { type: 'frontEnemy' }).map(t => t.id)).toEqual(['e-front']);
  });

  it('lets taunt override single-target enemy rules', () => {
    const source = unit({ id: 'p1', side: 'player' });
    const units = [
      source,
      unit({ id: 'e-low', side: 'enemy', position: 2, hp: 10 }),
      unit({
        id: 'e-taunt',
        side: 'enemy',
        position: 1,
        statuses: [{ id: 'taunt', type: 'taunt', value: 1, appliedAtMs: 0, expiresAtMs: 5000 }],
      }),
    ];

    expect(selectTargets(units, source, { type: 'lowestHpEnemy' }, 1000).map(t => t.id)).toEqual(['e-taunt']);
  });

  it('does not collapse all-enemy targeting to a taunter', () => {
    const source = unit({ id: 'p1', side: 'player' });
    const units = [
      source,
      unit({ id: 'e-a', side: 'enemy', position: 0 }),
      unit({
        id: 'e-b',
        side: 'enemy',
        position: 1,
        statuses: [{ id: 'taunt', type: 'taunt', value: 1, appliedAtMs: 0, expiresAtMs: 5000 }],
      }),
    ];

    expect(selectTargets(units, source, { type: 'allEnemies' }, 1000).map(t => t.id)).toEqual(['e-a', 'e-b']);
  });
});
