import { describe, expect, it } from 'vitest';
import { createSequenceRng, createStatefulSeededRng } from '../rng';
import type { BattleStats } from './combat';
import {
  applyStatus,
  canOverrideTarget,
  executeSkill,
  getEffectiveModifiers,
  getEffectiveStats,
  getSpeedModifier,
  hasActiveStatus,
} from './effects';
import {
  calculateActionIntervalMs,
  calculateDefenseMultiplier,
  calculateTimedDamage,
  calculateTimedHeal,
  calculateTimedShield,
} from './formulas';
import { calculateTowerBattleReward } from './rewards';
import { createTimedBattleState, resumeTimedBattle, simulateTimedBattle } from './timedBattle';
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

const damageSkill = (id: string, slot: 'normal' | 'skill1' | 'ultimate', power: number): SquadSkillDef => ({
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
    // SB-T3: 运行时单位现有 BASE_CRIT_RATE=0.05 基础暴击，叠加单条 critRateUp 0.4 → 0.45。
    expect(getEffectiveModifiers(actor, 0).critRate).toBeCloseTo(0.45, 10);
  });

  it('SB-T3: base crit rate makes runtime units land criticals deterministically via injected RNG', () => {
    // 单位构造时获得 BASE_CRIT_RATE=0.05（DEFAULT_BATTLE_MODIFIERS.critRate 仍为 0）。
    const state = createTimedBattleState({
      rng: createSequenceRng([0.5]),
      units: [unit('p1', 'player'), unit('e1', 'enemy')],
    });
    expect(getEffectiveModifiers(state.units[0], 0).critRate).toBe(0.05);

    // 序列顺序 = [variance, crit]。crit 值 0.01 < 0.05 → 触发暴击。
    const critHit = calculateTimedDamage({
      attacker: getEffectiveStats(state.units[0], 0),
      defender: getEffectiveStats(state.units[1], 0),
      modifiers: getEffectiveModifiers(state.units[0], 0),
      defenderModifiers: getEffectiveModifiers(state.units[1], 0),
      rng: createSequenceRng([0.5, 0.01]),
    });
    expect(critHit.isCritical).toBe(true);

    // crit 值 0.5 ≥ 0.05 → 不暴击（基础暴击不是必暴）。
    const normalHit = calculateTimedDamage({
      attacker: getEffectiveStats(state.units[0], 0),
      defender: getEffectiveStats(state.units[1], 0),
      modifiers: getEffectiveModifiers(state.units[0], 0),
      defenderModifiers: getEffectiveModifiers(state.units[1], 0),
      rng: createSequenceRng([0.5, 0.5]),
    });
    expect(normalHit.isCritical).toBe(false);
  });

  it('SB-T3+SB-T5: stacked critRateUp raises effective crit rate so a mid crit-roll becomes a crit', () => {
    const state = createTimedBattleState({
      rng: createSequenceRng([0.5]),
      units: [unit('p1', 'player'), unit('e1', 'enemy')],
    });
    const actor = state.units[0];
    // 两条来自不同来源的 critRateUp 按来源累加：base 0.05 + (0.15 + 0.2) = 0.4。
    applyStatus(state, actor, actor, { kind: 'critRateUp', amount: 0.15, durationMs: 5000, sourceId: 'buffA' });
    applyStatus(state, actor, actor, { kind: 'critRateUp', amount: 0.2, durationMs: 5000, sourceId: 'buffB' });
    expect(getEffectiveModifiers(actor, 0).critRate).toBeCloseTo(0.4, 10);

    // crit 值 0.3：base 暴击(0.05)下不暴击，但累加 critRateUp 到 0.4 后 0.3 < 0.4 → 暴击。
    const hit = calculateTimedDamage({
      attacker: getEffectiveStats(actor, 0),
      defender: getEffectiveStats(state.units[1], 0),
      modifiers: getEffectiveModifiers(actor, 0),
      defenderModifiers: getEffectiveModifiers(state.units[1], 0),
      rng: createSequenceRng([0.5, 0.3]),
    });
    expect(hit.isCritical).toBe(true);
  });

  it('SB-T5: control statuses (stun) do not stack while dot/hot resolve independently per source', () => {
    const state = createTimedBattleState({
      rng: createSequenceRng([0.5]),
      units: [unit('p1', 'player'), unit('e1', 'enemy', { stats: baseStats({ hp: 1000 }) })],
    });
    const actor = state.units[0];
    const victim = state.units[1];

    // 控制类：两条不同来源 stun → 走布尔存在性，不叠加（仍只是「存在」）。
    applyStatus(state, actor, victim, { kind: 'stun', durationMs: 2000, sourceId: 'ctrlA' });
    applyStatus(state, actor, victim, { kind: 'stun', durationMs: 2000, sourceId: 'ctrlB' });
    expect(hasActiveStatus(victim, 'stun', 0)).toBe(true);
    // stun 不在上限表 / 不经数值聚合——两条各自作为独立状态并存，不合成一个更强的值。
    expect(victim.statuses.filter(s => s.kind === 'stun')).toHaveLength(2);

    // dot：两条不同来源逐条独立结算（各自 tick），绝不 sum-clamp。
    applyStatus(state, actor, victim, { kind: 'dot', amount: 10, durationMs: 3000, tickIntervalMs: 1000, sourceId: 'dotA' });
    applyStatus(state, actor, victim, { kind: 'dot', amount: 15, durationMs: 3000, tickIntervalMs: 1000, sourceId: 'dotB' });
    expect(victim.statuses.filter(s => s.kind === 'dot')).toHaveLength(2);
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

  it('SB-T1: times out at 90 seconds as a true draw when both sides are fully alive and equal HP%', () => {
    // 双方满血僵持（存活数相等 + HP% 均为满） → 真平局（winner=timeout/reason=timeoutDraw）。
    const result = simulateTimedBattle({
      rng: createSequenceRng([0.5, 0.99]),
      units: [
        unit('p1', 'player', { stats: baseStats({ hp: 9999, atk: 1, def: 9999 }) }),
        unit('e1', 'enemy', { stats: baseStats({ hp: 9999, atk: 1, def: 9999 }) }),
      ],
    });

    expect(result.winner).toBe('timeout');
    expect(result.reason).toBe('timeoutDraw');
    expect(result.elapsedMs).toBe(90_000);
  });

  it('SB-T1: on timeout the side with higher remaining HP% wins (player) and can claim rewards', () => {
    // 双方均存活到超时（互相无法击杀：atk=1 vs def=9999，90s 内累计伤害远小于起手 HP），
    // 但敌方起手 HP% 远低（1000/100000）→ player HP% 占优判胜。
    const result = simulateTimedBattle({
      rng: createSequenceRng([0.5, 0.99]),
      units: [
        unit('p1', 'player', { stats: baseStats({ hp: 100000, atk: 1, def: 9999 }) }),
        unit('e1', 'enemy', { currentHp: 1000, stats: baseStats({ hp: 100000, atk: 1, def: 9999 }) }),
      ],
    });

    expect(result.winner).toBe('player');
    expect(result.reason).toBe('timeoutWin');
    expect(result.elapsedMs).toBe(90_000);
    // 超时占优 → winner='player'，rewards 走 progressed 发奖分支（磨血占优不再被判输）。
    expect(calculateTowerBattleReward({ floor: 10, winner: result.winner, reason: 'victory', progressed: true }).shouldRollEquipment).toBe(true);
  });

  it('SB-T1: on timeout the side with lower remaining HP% loses (enemy wins → player defeat)', () => {
    const result = simulateTimedBattle({
      rng: createSequenceRng([0.5, 0.99]),
      units: [
        unit('p1', 'player', { currentHp: 1000, stats: baseStats({ hp: 100000, atk: 1, def: 9999 }) }),
        unit('e1', 'enemy', { stats: baseStats({ hp: 100000, atk: 1, def: 9999 }) }),
      ],
    });

    expect(result.winner).toBe('enemy');
    expect(result.reason).toBe('timeoutLoss');
    expect(result.elapsedMs).toBe(90_000);
  });

  it('SB-T1: on timeout survival count outranks HP% (more survivors wins even at lower HP each)', () => {
    // player 两名低血存活 vs enemy 一名满血存活 → 存活数占优判胜（不被纯 HP% 误判）。
    const result = simulateTimedBattle({
      rng: createSequenceRng([0.5, 0.99]),
      units: [
        unit('p1', 'player', { currentHp: 1000, stats: baseStats({ hp: 100000, atk: 1, def: 9999 }) }),
        unit('p2', 'player', { currentHp: 1000, stats: baseStats({ hp: 100000, atk: 1, def: 9999 }) }),
        unit('e1', 'enemy', { stats: baseStats({ hp: 100000, atk: 1, def: 9999 }) }),
      ],
    });

    expect(result.winner).toBe('player');
    expect(result.reason).toBe('timeoutWin');
    expect(result.elapsedMs).toBe(90_000);
  });
});

describe('SB-T4 position damage-taken mechanic', () => {
  // 同一攻击（flatPower 固定、def=0、variance=1、不暴击）打到不同站位目标，比较落血。
  const hit = (position: 'front' | 'middle' | 'back'): number => {
    const state = createTimedBattleState({
      rng: createSequenceRng([0.5, 0.99]),
      units: [
        unit('p1', 'player'),
        unit('e1', 'enemy', { position, stats: baseStats({ hp: 100000, def: 0 }) }),
      ],
    });
    const actor = state.units[0];
    const target = state.units[1];
    const before = target.currentHp;
    executeSkill(state, actor, damageSkill('nuke', 'skill1', 1000));
    return before - target.currentHp;
  };

  it('reduces single-target damage for middle/back rows while front stays at ×1', () => {
    const front = hit('front');
    const middle = hit('middle');
    const back = hit('back');

    // front 系数=1，middle ×0.95，back ×0.85 → back < middle < front。
    expect(front).toBe(1000);
    expect(middle).toBeLessThan(front);
    expect(back).toBeLessThan(middle);
    expect(middle).toBe(Math.floor(1000 * 0.95));
    expect(back).toBe(Math.floor(1000 * 0.85));
  });

  it('does NOT apply position reduction to AOE (allEnemies) damage — back row cannot dodge it', () => {
    const aoe: SquadSkillDef = {
      id: 'aoe',
      name: 'aoe',
      slot: 'skill1',
      target: 'allEnemies',
      effects: [{ type: 'damage', atkRatio: 0, spRatio: 0, flatPower: 1000, canCrit: true }],
      initialCooldownMs: 0,
    };
    const state = createTimedBattleState({
      rng: createSequenceRng([0.5, 0.99, 0.5, 0.99]),
      units: [
        unit('p1', 'player'),
        unit('e-front', 'enemy', { position: 'front', stats: baseStats({ hp: 100000, def: 0 }) }),
        unit('e-back', 'enemy', { position: 'back', stats: baseStats({ hp: 100000, def: 0 }) }),
      ],
    });
    const actor = state.units[0];
    const front = state.units[1];
    const back = state.units[2];
    const frontBefore = front.currentHp;
    const backBefore = back.currentHp;
    executeSkill(state, actor, aoe);

    // AOE 命中全体：后排不因站位衰减，front 与 back 承受同量伤害。
    expect(frontBefore - front.currentHp).toBe(1000);
    expect(backBefore - back.currentHp).toBe(1000);
  });
});

describe('SB-T2 manual ultimate: target selection + prefix-freeze smooth resume', () => {
  const aoeUltimate = (id: string, power: number): SquadSkillDef => ({
    id,
    name: id,
    slot: 'ultimate',
    target: 'allEnemies',
    effects: [{ type: 'damage', atkRatio: 0, spRatio: 0, flatPower: power, canCrit: false }],
  });

  const singleUltimate = (id: string, power: number, target: 'frontEnemy' | 'lowestHpEnemy' = 'frontEnemy'): SquadSkillDef => ({
    id,
    name: id,
    slot: 'ultimate',
    target,
    effects: [{ type: 'damage', atkRatio: 0, spRatio: 0, flatPower: power, canCrit: false }],
  });

  it('canOverrideTarget: only single enemy selectors are overridable (UI/engine same predicate)', () => {
    expect(canOverrideTarget('frontEnemy')).toBe(true);
    expect(canOverrideTarget('lowestHpEnemy')).toBe(true);
    expect(canOverrideTarget('highestAtkEnemy')).toBe(true);
    expect(canOverrideTarget('backEnemy')).toBe(true);
    // AOE / self / 己方组 / 单个己方 不可覆盖。
    expect(canOverrideTarget('allEnemies')).toBe(false);
    expect(canOverrideTarget('allAllies')).toBe(false);
    expect(canOverrideTarget('self')).toBe(false);
    expect(canOverrideTarget('lowestHpAlly')).toBe(false);
  });

  it('single-target ultimate with targetId hits the chosen alive unit (not the default front target)', () => {
    // 默认 frontEnemy 会打 e-front；指定 targetId=e-back → 命中后排 e-back。
    const result = resumeTimedBattle({
      seed: 123,
      autoUltimates: false,
      resumeFromMs: 0,
      manualUltimateOrders: [{ atMs: 1, unitId: 'p1', targetId: 'e-back' }],
      maxTimeMs: 200,
      units: [
        unit('p1', 'player', { energy: 1000, skills: { ultimate: singleUltimate('nuke', 500) }, stats: baseStats({ atk: 1 }) }),
        unit('e-front', 'enemy', { position: 'front', stats: baseStats({ hp: 100000, def: 0, atk: 1 }) }),
        unit('e-back', 'enemy', { position: 'back', stats: baseStats({ hp: 100000, def: 0, atk: 1 }) }),
      ],
    });
    const dmg = result.events.filter(e => e.type === 'damage' && e.actorId === 'p1');
    expect(dmg).toHaveLength(1);
    expect(dmg[0]).toMatchObject({ targetId: 'e-back' });
  });

  it('AOE ultimate ignores targetId and still hits all enemies', () => {
    const result = resumeTimedBattle({
      seed: 123,
      autoUltimates: false,
      resumeFromMs: 0,
      manualUltimateOrders: [{ atMs: 1, unitId: 'p1', targetId: 'e-back' }],
      maxTimeMs: 200,
      units: [
        unit('p1', 'player', { energy: 1000, skills: { ultimate: aoeUltimate('storm', 500) }, stats: baseStats({ atk: 1 }) }),
        unit('e-front', 'enemy', { position: 'front', stats: baseStats({ hp: 100000, def: 0, atk: 1 }) }),
        unit('e-back', 'enemy', { position: 'back', stats: baseStats({ hp: 100000, def: 0, atk: 1 }) }),
      ],
    });
    const targets = new Set(
      result.events.filter(e => e.type === 'damage' && e.actorId === 'p1').map(e => (e as { targetId: string }).targetId),
    );
    // AOE 忽略 targetId：两名敌人都被命中。
    expect(targets.has('e-front')).toBe(true);
    expect(targets.has('e-back')).toBe(true);
  });

  it('dead targetId falls back to default selector and does NOT waste energy (no empty cast)', () => {
    // e-front 一开局就死（currentHp=0）；指定 targetId=e-front（死目标）→ 回退默认 frontEnemy selector，
    // 命中存活的 e-back（唯一存活敌人）；能量正常扣除（因确有回退目标可命中）。
    const result = resumeTimedBattle({
      seed: 123,
      autoUltimates: false,
      resumeFromMs: 0,
      manualUltimateOrders: [{ atMs: 1, unitId: 'p1', targetId: 'e-front' }],
      maxTimeMs: 200,
      units: [
        unit('p1', 'player', { energy: 1000, skills: { ultimate: singleUltimate('nuke', 500) }, stats: baseStats({ atk: 1 }) }),
        unit('e-front', 'enemy', { position: 'front', currentHp: 0, stats: baseStats({ hp: 100000, def: 0, atk: 1 }) }),
        unit('e-back', 'enemy', { position: 'back', stats: baseStats({ hp: 100000, def: 0, atk: 1 }) }),
      ],
    });
    const cast = result.events.filter(e => e.type === 'action' && e.actorId === 'p1' && e.slot === 'ultimate');
    expect(cast).toHaveLength(1);
    const dmg = result.events.filter(e => e.type === 'damage' && e.actorId === 'p1');
    // 回退默认 frontEnemy → 存活最前排 = e-back，命中它（非空放）。
    expect(dmg).toHaveLength(1);
    expect(dmg[0]).toMatchObject({ targetId: 'e-back' });
    // 施法者能量被扣（大招真放，非空放保留能量）。
    const casterEnergy = result.units.find(u => u.id === 'p1')?.energy ?? -1;
    expect(casterEnergy).toBeLessThan(1000);
  });

  it('prefix freeze: inserting a manual ultimate order leaves the events prefix (at <= insertion) byte-identical', () => {
    // autoUltimates=false 使 p2 攒满能量后不自动开大，保留能量给 resumeFromMs 之后的手动命令。
    const buildUnits = (): SquadUnitSetup[] => [
      unit('p1', 'player', { energy: 0, skills: { skill1: damageSkill('s1', 'skill1', 30) }, stats: baseStats({ atk: 20, spd: 130 }) }),
      unit('p2', 'player', { energy: 1000, skills: { ultimate: singleUltimate('nuke2', 400) }, stats: baseStats({ atk: 20, spd: 110 }) }),
      unit('e1', 'enemy', { stats: baseStats({ hp: 4000, atk: 15, spd: 100 }) }),
      unit('e2', 'enemy', { position: 'back', stats: baseStats({ hp: 4000, atk: 15, spd: 90 }) }),
    ];

    const resumeFromMs = 4000;
    // 基线：无新命令，跑到底。
    const baseline = resumeTimedBattle({
      seed: 777,
      autoUltimates: false,
      resumeFromMs,
      manualUltimateOrders: [],
      units: buildUnits(),
    });
    // 插入一条手动大招命令（在 resumeFromMs 之后：atMs=resumeFromMs+1），前缀应一字不改。
    const withOrder = resumeTimedBattle({
      seed: 777,
      autoUltimates: false,
      resumeFromMs,
      manualUltimateOrders: [{ atMs: resumeFromMs + 1, unitId: 'p2', targetId: 'e2' }],
      units: buildUnits(),
    });

    const prefixOf = (events: typeof baseline.events) => events.filter(e => e.at <= resumeFromMs);
    const basePrefix = prefixOf(baseline.events);
    const orderPrefix = prefixOf(withOrder.events);

    // 前缀逐条相同（无过去被重写 / 时间倒流 / HP-能量跳变）。
    expect(orderPrefix).toEqual(basePrefix);
    // 时间戳单调不倒流。
    for (let i = 1; i < withOrder.events.length; i++) {
      expect(withOrder.events[i].at).toBeGreaterThanOrEqual(withOrder.events[i - 1].at);
    }
    // 后缀确实因新命令而不同（选目标真的改变了后续演出 = 非伪平滑）。
    expect(withOrder.events.some(e => e.type === 'action' && e.at === resumeFromMs + 1 && e.slot === 'ultimate')).toBe(true);
  });

  it('resume matches a full simulation when no new order is inserted (baseline fidelity)', () => {
    const buildUnits = (): SquadUnitSetup[] => [
      unit('p1', 'player', { skills: { skill1: damageSkill('s1', 'skill1', 30) }, stats: baseStats({ atk: 20 }) }),
      unit('e1', 'enemy', { stats: baseStats({ hp: 3000, atk: 15 }) }),
    ];
    const full = simulateTimedBattle({
      rng: createStatefulSeededRng(999),
      autoUltimates: true,
      units: buildUnits(),
    });
    const resumed = resumeTimedBattle({
      seed: 999,
      autoUltimates: true,
      resumeFromMs: 5000,
      manualUltimateOrders: [],
      units: buildUnits(),
    });
    expect(resumed.winner).toBe(full.winner);
    expect(resumed.events).toEqual(full.events);
  });

  it('pending order after timeout (atMs > maxTimeMs) does not change the timeout verdict (SB-T1 三态锁死)', () => {
    // 双方满血僵持 → 真平局（SB-T1）。挂一条 atMs=200000 > maxTimeMs=90000 的 pending order，
    // 它永不生效（nextManualAt 被 Math.min(maxTimeMs,…) 夹住），裁决不变。
    const withPending = resumeTimedBattle({
      seed: 55,
      autoUltimates: false,
      resumeFromMs: 90_000,
      manualUltimateOrders: [{ atMs: 200_000, unitId: 'p1' }],
      units: [
        unit('p1', 'player', { energy: 1000, skills: { ultimate: singleUltimate('nuke', 500) }, stats: baseStats({ hp: 9999, atk: 1, def: 9999 }) }),
        unit('e1', 'enemy', { stats: baseStats({ hp: 9999, atk: 1, def: 9999 }) }),
      ],
    });
    expect(withPending.winner).toBe('timeout');
    expect(withPending.reason).toBe('timeoutDraw');
    expect(withPending.elapsedMs).toBe(90_000);
    // pending order 没有触发任何大招 action。
    expect(withPending.events.some(e => e.type === 'action' && e.slot === 'ultimate')).toBe(false);
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
