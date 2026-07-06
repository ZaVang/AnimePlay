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

// 问题③：分排（前/中/后）选择器 + 空排回落。
describe('zone row selectors', () => {
  const p = unit({ id: 'p', side: 'player', position: 'front' });
  const enemies = [
    unit({ id: 'ef1', side: 'enemy', position: 'front' }),
    unit({ id: 'ef2', side: 'enemy', position: 'front' }),
    unit({ id: 'em', side: 'enemy', position: 'middle' }),
    unit({ id: 'eb', side: 'enemy', position: 'back' }),
  ];

  it('frontRowEnemies 命中全部前排敌人', () => {
    expect(selectTargets([p, ...enemies], p, 'frontRowEnemies').map(u => u.id).sort()).toEqual(['ef1', 'ef2']);
  });
  it('backRowEnemies 命中后排敌人', () => {
    expect(selectTargets([p, ...enemies], p, 'backRowEnemies').map(u => u.id)).toEqual(['eb']);
  });
  it('空排回落到最近有人排（back 空 → middle）', () => {
    const noBack = [unit({ id: 'ef', side: 'enemy', position: 'front' }), unit({ id: 'em', side: 'enemy', position: 'middle' })];
    expect(selectTargets([p, ...noBack], p, 'backRowEnemies').map(u => u.id)).toEqual(['em']);
  });
});
