import { describe, expect, it } from 'vitest';
import { createSequenceRng } from '../rng';
import type { BattleStats } from './combat';
import {
  applyStatus,
  executeSkill,
  getEffectiveModifiers,
  getEffectiveStats,
  getSpeedModifier,
} from './effects';
import {
  calculateActionIntervalMs,
  calculateDefenseMultiplier,
  calculateTimedDamage,
  calculateTimedHeal,
  calculateTimedShield,
} from './formulas';
import { calculateTowerBattleReward } from './rewards';
import { createTimedBattleState, simulateTimedBattle } from './timedBattle';
import { selectTargets } from './targeting';
import type { SquadSkillDef, SquadUnitSetup } from './types';

const baseStats = (over: Partial<BattleStats> = {}): BattleStats => ({
  hp: 100,
  atk: 100,
  def: 0,
  sp: 100,
  spd: 100,
  ...over,
});

const unit = (
  id: string,
  side: 'player' | 'enemy',
  over: Partial<SquadUnitSetup> = {},
): SquadUnitSetup => ({
  id,
  name: id,
  side,
  position: side === 'player' ? 'front' : 'front',
  stats: baseStats(),
  ...over,
});

const damageSkill = (id: string, slot: 'normal' | 'skill1' | 'skill2' | 'ultimate', power: number): SquadSkillDef => ({
  id,
  name: id,
  slot,
  target: 'frontEnemy',
  effects: [{ type: 'damage', atkRatio: 0, spRatio: 0, flatPower: power, canCrit: true }],
  initialCooldownMs: 0,
  cooldownMs: 8000,
});

describe('D1 timed battle formulas', () => {
  it('keeps the DEF/(1000+DEF) curve through defense multiplier', () => {
    expect(calculateDefenseMultiplier(0)).toBe(1);
    expect(calculateDefenseMultiplier(1000)).toBe(0.5);
    expect(calculateDefenseMultiplier(500)).toBeCloseTo(2 / 3, 10);
  });

  it('damage uses variance, default crit rate 0, and 150% crit damage when granted', () => {
    const noCrit = calculateTimedDamage({
      attacker: baseStats({ atk: 100, sp: 0 }),
      defender: baseStats({ def: 0 }),
      modifiers: { critRate: 0, critDamage: 1.5, damageUp: 0 },
      defenderModifiers: { damageTakenUp: 0 },
      rng: createSequenceRng([0.5, 0]),
    });
    expect(noCrit).toMatchObject({ amount: 100, isCritical: false, variance: 1 });

    const crit = calculateTimedDamage({
      attacker: baseStats({ atk: 100, sp: 0 }),
      defender: baseStats({ def: 0 }),
      modifiers: { critRate: 1, critDamage: 1.5, damageUp: 0 },
      defenderModifiers: { damageTakenUp: 0 },
      rng: createSequenceRng([0.5, 0]),
    });
    expect(crit).toMatchObject({ amount: 150, isCritical: true, variance: 1 });
  });

  it('skill damage can mix ATK/SP and healing/shield ignore enemy DEF', () => {
    const damage = calculateTimedDamage({
      attacker: baseStats({ atk: 100, sp: 200 }),
      defender: baseStats({ def: 1000 }),
      modifiers: { critRate: 0, critDamage: 1.5, damageUp: 0 },
      defenderModifiers: { damageTakenUp: 0 },
      rng: createSequenceRng([0.5, 0.99]),
      atkRatio: 0.5,
      spRatio: 1,
    });
    expect(damage.amount).toBe(125);

    expect(calculateTimedHeal({
      caster: baseStats({ atk: 100, sp: 200, def: 9999 }),
      modifiers: { healUp: 0 },
      atkRatio: 0.2,
      spRatio: 1,
    })).toBe(220);
    expect(calculateTimedShield({
      caster: baseStats({ sp: 200, def: 100 }),
      modifiers: { shieldUp: 0 },
      spRatio: 1,
      defRatio: 0.5,
    })).toBe(250);
  });

  it('SPD only changes action interval', () => {
    expect(calculateActionIntervalMs(100)).toBe(2500);
    expect(calculateActionIntervalMs(150)).toBe(2308);
    expect(calculateActionIntervalMs(200)).toBe(2143);
    expect(calculateActionIntervalMs(300)).toBe(1875);
  });
});

describe('D1 status and targeting helpers', () => {
  it('stat, speed, and crit statuses affect derived combat values', () => {
    const state = createTimedBattleState({
      rng: createSequenceRng([0.5]),
      units: [unit('p1', 'player'), unit('e1', 'enemy')],
    });
    const actor = state.units[0];
    applyStatus(state, actor, actor, { kind: 'atkUp', amount: 0.5, durationMs: 5000 });
    applyStatus(state, actor, actor, { kind: 'defUp', amount: 0.25, durationMs: 5000 });
    applyStatus(state, actor, actor, { kind: 'spUp', amount: 0.2, durationMs: 5000 });
    applyStatus(state, actor, actor, { kind: 'haste', amount: 0.3, durationMs: 5000 });
    applyStatus(state, actor, actor, { kind: 'slow', amount: 0.1, durationMs: 5000 });
    applyStatus(state, actor, actor, { kind: 'critRateUp', amount: 0.4, durationMs: 5000 });

    expect(getEffectiveStats(actor, 0)).toEqual({ hp: 100, atk: 150, def: 0, sp: 120, spd: 100 });
    expect(getSpeedModifier(actor, 0)).toEqual({ haste: 0.3, slow: 0.1 });
    expect(getEffectiveModifiers(actor, 0).critRate).toBe(0.4);
  });

  it('taunt redirects single-target enemy selectors', () => {
    const state = createTimedBattleState({
      rng: createSequenceRng([0.5]),
      units: [
        unit('p1', 'player'),
        unit('e-front', 'enemy', { position: 'front' }),
        unit('e-back', 'enemy', { position: 'back', stats: baseStats({ atk: 999 }) }),
      ],
    });
    const actor = state.units[0];
    const front = state.units[1];
    applyStatus(state, actor, front, { kind: 'taunt', durationMs: 5000 });

    expect(selectTargets(state.units, actor, 'backEnemy', 0).map(target => target.id)).toEqual(['e-front']);
    expect(selectTargets(state.units, actor, 'allEnemies', 0).map(target => target.id)).toEqual(['e-front', 'e-back']);
  });
});

describe('D1 timed battle simulation', () => {
  it('can simulate a complete 5v5 battle', () => {
    const players = Array.from({ length: 5 }, (_, i) => unit(`p${i}`, 'player', {
      stats: baseStats({ hp: 200, atk: 300, spd: 100 }),
    }));
    const enemies = Array.from({ length: 5 }, (_, i) => unit(`z${i}`, 'enemy', {
      stats: baseStats({ hp: 80, atk: 1, spd: 100 }),
    }));

    const result = simulateTimedBattle({
      rng: createSequenceRng([0.5, 0.99]),
      units: [...players, ...enemies],
    });

    expect(result.winner).toBe('player');
    expect(result.reason).toBe('victory');
    expect(result.events.some(event => event.type === 'action')).toBe(true);
    expect(result.units.filter(u => u.side === 'enemy' && u.currentHp === 0)).toHaveLength(5);
  });

  it('tracks normal action energy, damage energy, and kill energy', () => {
    const result = simulateTimedBattle({
      rng: createSequenceRng([0.5, 0.99]),
      units: [
        unit('p1', 'player', { stats: baseStats({ atk: 50 }) }),
        unit('e1', 'enemy', { stats: baseStats({ hp: 200, atk: 1 }) }),
      ],
      maxTimeMs: 2600,
    });

    expect(result.events).toContainEqual(expect.objectContaining({ type: 'energy', targetId: 'p1', amount: 90, reason: 'action' }));
    expect(result.events.some(event => event.type === 'energy' && event.targetId === 'e1' && event.reason === 'damage')).toBe(true);
  });

  it('uses automatic ultimate when enabled and manual ultimate when ordered', () => {
    const ultimate = damageSkill('ultimate', 'ultimate', 200);
    const auto = simulateTimedBattle({
      rng: createSequenceRng([0.5, 0.99]),
      autoUltimates: true,
      units: [
        unit('p1', 'player', { energy: 1000, skills: { ultimate }, stats: baseStats({ atk: 1 }) }),
        unit('e1', 'enemy', { stats: baseStats({ hp: 500, atk: 1 }) }),
      ],
      maxTimeMs: 2600,
    });
    expect(auto.events).toContainEqual(expect.objectContaining({ type: 'action', actorId: 'p1', slot: 'ultimate' }));

    const manual = simulateTimedBattle({
      rng: createSequenceRng([0.5, 0.99]),
      autoUltimates: false,
      manualUltimateOrders: [{ atMs: 3000, unitId: 'p1' }],
      units: [
        unit('p1', 'player', {
          energy: 1000,
          skills: { skill1: damageSkill('skill1', 'skill1', 20), ultimate },
          stats: baseStats({ atk: 1 }),
        }),
        unit('e1', 'enemy', { stats: baseStats({ hp: 500, atk: 1 }) }),
      ],
      maxTimeMs: 3200,
    });
    const p1Actions = manual.events.filter(event => event.type === 'action' && event.actorId === 'p1');
    expect(p1Actions[0]).toMatchObject({ slot: 'skill1' });
    expect(p1Actions).toContainEqual(expect.objectContaining({ at: 3000, slot: 'ultimate' }));
  });

  it('activates passives at battle start and can revive defeated allies', () => {
    const supportPassive: SquadSkillDef = {
      id: 'support-passive',
      name: 'support passive',
      slot: 'passive',
      target: 'allAllies',
      effects: [{ type: 'applyStatus', status: { kind: 'spUp', amount: 0.2, durationMs: 90_000 } }],
    };
    const revive: SquadSkillDef = {
      id: 'revive',
      name: 'revive',
      slot: 'ultimate',
      target: 'firstDefeatedAlly',
      effects: [{ type: 'revive', hpRatio: 0.4 }],
    };
    const state = createTimedBattleState({
      rng: createSequenceRng([0.5, 0.99]),
      units: [
        unit('p1', 'player', { skills: { passive: supportPassive, ultimate: revive } }),
        unit('p2', 'player', { currentHp: 0, stats: baseStats({ hp: 200 }) }),
        unit('e1', 'enemy'),
      ],
    });

    expect(state.events).toContainEqual(expect.objectContaining({ type: 'passiveActivated', actorId: 'p1', skillId: 'support-passive' }));
    expect(state.units[0].statuses).toContainEqual(expect.objectContaining({ kind: 'spUp', amount: 0.2 }));

    const actor = state.units[0];
    expect(executeSkill(state, actor, revive)).toBe(true);
    expect(state.units[1].currentHp).toBe(80);
    expect(state.events).toContainEqual(expect.objectContaining({ type: 'revive', actorId: 'p1', targetId: 'p2', amount: 80 }));
  });

  it('shield absorbs damage and silence forces normal attacks', () => {
    const guard: SquadSkillDef = {
      id: 'guard',
      name: 'guard',
      slot: 'skill1',
      target: 'self',
      effects: [
        { type: 'shield', target: 'self', spRatio: 1, durationMs: 5000 },
        { type: 'applyStatus', target: 'frontEnemy', status: { kind: 'silence', durationMs: 5000 } },
      ],
      initialCooldownMs: 0,
    };
    const result = simulateTimedBattle({
      rng: createSequenceRng([0.5, 0.99]),
      units: [
        unit('a-player', 'player', { skills: { skill1: guard }, stats: baseStats({ sp: 100, atk: 1 }) }),
        unit('b-enemy', 'enemy', { skills: { skill1: damageSkill('big-hit', 'skill1', 500) }, stats: baseStats({ atk: 50, sp: 0 }) }),
      ],
      maxTimeMs: 2600,
    });

    expect(result.events).toContainEqual(expect.objectContaining({ type: 'shield', actorId: 'a-player', targetId: 'a-player', amount: 100 }));
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'damage', actorId: 'b-enemy', targetId: 'a-player', amount: 0, absorbed: 50 }));
    expect(result.events).not.toContainEqual(expect.objectContaining({ type: 'action', actorId: 'b-enemy', skillId: 'big-hit' }));
  });

  it('stun skips actions, while dot and hot tick until expiry', () => {
    const stun: SquadSkillDef = {
      id: 'stun',
      name: 'stun',
      slot: 'skill1',
      target: 'frontEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'stun', durationMs: 1500 } },
        { type: 'applyStatus', target: 'self', status: { kind: 'hot', amount: 10, durationMs: 1000, tickIntervalMs: 1000 } },
      ],
      initialCooldownMs: 0,
    };
    const result = simulateTimedBattle({
      rng: createSequenceRng([0.5, 0.99]),
      units: [
        unit('a-player', 'player', { skills: { skill1: stun }, stats: baseStats({ atk: 1 }) }),
        unit('z-enemy', 'enemy', { currentHp: 50, stats: baseStats({ hp: 100, atk: 1 }) }),
      ],
      maxTimeMs: 4000,
    });

    expect(result.events).toContainEqual(expect.objectContaining({ type: 'actionSkipped', actorId: 'z-enemy', reason: 'stun' }));
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'statusTick', targetId: 'a-player', status: 'hot', amount: 10 }));
  });

  it('same-frame mutual defeat is treated as tower victory for player', () => {
    const dotSkill = (id: string): SquadSkillDef => ({
      id,
      name: id,
      slot: 'skill1',
      target: 'frontEnemy',
      effects: [{ type: 'applyStatus', status: { kind: 'dot', amount: 10, durationMs: 1000, tickIntervalMs: 1000 } }],
      initialCooldownMs: 0,
    });

    const result = simulateTimedBattle({
      rng: createSequenceRng([0.5, 0.99]),
      units: [
        unit('p1', 'player', { skills: { skill1: dotSkill('p-dot') }, stats: baseStats({ hp: 10, atk: 1 }) }),
        unit('e1', 'enemy', { skills: { skill1: dotSkill('e-dot') }, stats: baseStats({ hp: 10, atk: 1 }) }),
      ],
      maxTimeMs: 5000,
    });

    expect(result.winner).toBe('player');
    expect(result.reason).toBe('victory');
    expect(result.events.filter(event => event.type === 'statusTick' && event.status === 'dot')).toHaveLength(2);
  });

  it('times out at 90 seconds by default when neither side can win', () => {
    const result = simulateTimedBattle({
      rng: createSequenceRng([0.5, 0.99]),
      units: [
        unit('p1', 'player', { stats: baseStats({ hp: 9999, atk: 1, def: 9999 }) }),
        unit('e1', 'enemy', { stats: baseStats({ hp: 9999, atk: 1, def: 9999 }) }),
      ],
    });

    expect(result.winner).toBe('timeout');
    expect(result.reason).toBe('timeout');
    expect(result.elapsedMs).toBe(90_000);
  });
});

describe('D1 tower rewards', () => {
  it('victory only grants character exp, knowledge, and equipment roll eligibility', () => {
    expect(calculateTowerBattleReward({ floor: 10, winner: 'player', reason: 'victory', progressed: true })).toEqual({
      knowledge: 75,
      characterExpEach: 200,
      survivorBonus: 20,
      shouldRollEquipment: true,
    });
  });

  it('defeat, timeout, and non-progressing victories grant no tower rewards', () => {
    expect(calculateTowerBattleReward({ floor: 10, winner: 'enemy', reason: 'defeat', progressed: true })).toEqual({
      knowledge: 0,
      characterExpEach: 0,
      survivorBonus: 0,
      shouldRollEquipment: false,
    });
    expect(calculateTowerBattleReward({ floor: 10, winner: 'timeout', reason: 'timeout', progressed: true }).shouldRollEquipment).toBe(false);
    expect(calculateTowerBattleReward({ floor: 10, winner: 'player', reason: 'victory', progressed: false })).toEqual({
      knowledge: 0,
      characterExpEach: 0,
      survivorBonus: 0,
      shouldRollEquipment: false,
    });
  });
});
