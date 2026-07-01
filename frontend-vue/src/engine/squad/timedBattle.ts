import { calculateActionIntervalMs, DEFAULT_BATTLE_MODIFIERS } from './formulas';
import {
  activeStatuses,
  executeSkill,
  gainEnergy,
  getEffectiveStats,
  getSpeedModifier,
  hasActiveStatus,
} from './effects';
import { getAliveUnits, isAlive, selectTargets } from './targeting';
import type {
  BattleEndReason,
  ManualUltimateOrder,
  SquadSkillDef,
  SquadSkillKit,
  SquadUnitRuntime,
  SquadUnitSetup,
  TimedBattleEvent,
  TimedBattleInput,
  TimedBattleResult,
  TimedBattleState,
  TimedBattleWinner,
} from './types';

const DEFAULT_MAX_TIME_MS = 90_000;
const DEFAULT_MAX_EVENTS = 5_000;
const DEFAULT_ULTIMATE_COST = 1000;

const defaultNormalAttack: SquadSkillDef = {
  id: 'normal_attack',
  name: '普攻',
  slot: 'normal',
  target: 'frontEnemy',
  effects: [{ type: 'damage', atkRatio: 1, spRatio: 0, canCrit: true }],
};

function normalizeSkill(slot: SquadSkillDef['slot'], skill?: SquadSkillDef): SquadSkillDef | undefined {
  if (!skill) return slot === 'normal' ? defaultNormalAttack : undefined;
  return { ...skill, slot };
}

function createSkillKit(skills: Partial<SquadSkillKit> | undefined): SquadSkillKit {
  return {
    normalAttack: normalizeSkill('normal', skills?.normalAttack) ?? defaultNormalAttack,
    skill1: normalizeSkill('skill1', skills?.skill1),
    skill2: normalizeSkill('skill2', skills?.skill2),
    passive: normalizeSkill('passive', skills?.passive),
    ultimate: normalizeSkill('ultimate', skills?.ultimate),
  };
}

function defaultInitialCooldown(slot: 'skill1' | 'skill2'): number {
  return slot === 'skill1' ? 2000 : 5000;
}

function defaultCooldown(slot: 'skill1' | 'skill2'): number {
  return slot === 'skill1' ? 8000 : 12000;
}

function createRuntimeUnit(setup: SquadUnitSetup): SquadUnitRuntime {
  const skills = createSkillKit(setup.skills);
  const unit: SquadUnitRuntime = {
    id: setup.id,
    name: setup.name,
    side: setup.side,
    position: setup.position,
    baseStats: setup.stats,
    currentHp: Math.min(setup.currentHp ?? setup.stats.hp, setup.stats.hp),
    maxHp: setup.stats.hp,
    energy: Math.min(1000, Math.max(0, setup.energy ?? 0)),
    skills,
    modifiers: { ...DEFAULT_BATTLE_MODIFIERS, ...setup.modifiers },
    statuses: [],
    cooldownReadyAt: {
      skill1: skills.skill1?.initialCooldownMs ?? defaultInitialCooldown('skill1'),
      skill2: skills.skill2?.initialCooldownMs ?? defaultInitialCooldown('skill2'),
      ultimate: 0,
    },
    nextActionAt: 0,
    defeatedAt: null,
  };
  unit.nextActionAt = calculateActionIntervalMs(getEffectiveStats(unit, 0).spd, getSpeedModifier(unit, 0));
  return unit;
}

function aliveBySide(state: TimedBattleState, side: 'player' | 'enemy'): SquadUnitRuntime[] {
  return getAliveUnits(state.units, side);
}

function battleEnd(state: TimedBattleState, maxTimeMs: number, eventLimitReached: boolean): { winner: TimedBattleWinner; reason: BattleEndReason } | null {
  const players = aliveBySide(state, 'player');
  const enemies = aliveBySide(state, 'enemy');
  if (players.length === 0 && enemies.length === 0) return { winner: 'player', reason: 'victory' };
  if (enemies.length === 0) return { winner: 'player', reason: 'victory' };
  if (players.length === 0) return { winner: 'enemy', reason: 'defeat' };
  if (eventLimitReached) return { winner: 'timeout', reason: 'eventLimit' };
  if (state.now >= maxTimeMs) return { winner: 'timeout', reason: 'timeout' };
  return null;
}

function nextActionAt(state: TimedBattleState): number {
  const times = state.units.filter(isAlive).map(unit => unit.nextActionAt);
  return times.length > 0 ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

function nextStatusTickAt(state: TimedBattleState): number {
  const times = state.units
    .flatMap(unit => activeStatuses(unit, state.now).map(status => status.nextTickAt ?? Number.POSITIVE_INFINITY))
    .filter(time => Number.isFinite(time));
  return times.length > 0 ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

function nextStatusExpiryAt(state: TimedBattleState): number {
  const times = state.units
    .flatMap(unit => activeStatuses(unit, state.now).map(status => status.expiresAt))
    .filter(time => Number.isFinite(time));
  return times.length > 0 ? Math.min(...times) : Number.POSITIVE_INFINITY;
}

function expireStatuses(state: TimedBattleState): void {
  for (const unit of state.units) {
    const before = unit.statuses;
    unit.statuses = unit.statuses.filter(status => status.expiresAt > state.now && (status.kind !== 'shield' || (status.shieldRemaining ?? 0) > 0));
    for (const status of before) {
      if (!unit.statuses.includes(status)) {
        state.events.push({ type: 'statusExpired', at: state.now, targetId: unit.id, status: status.kind });
      }
    }
  }
}

function defeatByStatusIfNeeded(state: TimedBattleState, unit: SquadUnitRuntime): void {
  if (unit.currentHp > 0 || unit.defeatedAt !== null) return;
  unit.currentHp = 0;
  unit.defeatedAt = state.now;
  state.events.push({ type: 'defeated', at: state.now, targetId: unit.id, by: null });
}

function processStatusTicks(state: TimedBattleState): void {
  for (const unit of state.units) {
    if (!isAlive(unit)) continue;
    for (const status of unit.statuses) {
      if (status.expiresAt < state.now) continue;
      if ((status.kind !== 'dot' && status.kind !== 'hot') || !status.nextTickAt || !status.tickIntervalMs) continue;
      while (status.nextTickAt <= state.now && status.nextTickAt <= status.expiresAt && isAlive(unit)) {
        const amount = Math.max(0, Math.floor(status.amount ?? 0));
        if (status.kind === 'dot') {
          unit.currentHp = Math.max(0, unit.currentHp - amount);
          state.events.push({ type: 'statusTick', at: state.now, targetId: unit.id, status: 'dot', amount, hpAfter: unit.currentHp });
          defeatByStatusIfNeeded(state, unit);
        } else {
          unit.currentHp = Math.min(unit.maxHp, unit.currentHp + amount);
          state.events.push({ type: 'statusTick', at: state.now, targetId: unit.id, status: 'hot', amount, hpAfter: unit.currentHp });
        }
        status.nextTickAt += status.tickIntervalMs;
      }
    }
  }
}

function canCastSpecial(unit: SquadUnitRuntime, now: number): boolean {
  return !hasActiveStatus(unit, 'stun', now) && !hasActiveStatus(unit, 'silence', now);
}

function shouldAutoUltimate(state: TimedBattleState, unit: SquadUnitRuntime): boolean {
  return unit.side === 'enemy' || state.autoUltimates;
}

function ultimateReady(unit: SquadUnitRuntime): boolean {
  const skill = unit.skills.ultimate;
  const cost = skill?.energyCost ?? DEFAULT_ULTIMATE_COST;
  return Boolean(skill) && unit.energy >= cost;
}

function chooseActionSkill(state: TimedBattleState, unit: SquadUnitRuntime): SquadSkillDef {
  if (shouldAutoUltimate(state, unit) && ultimateReady(unit) && canCastSpecial(unit, state.now)) {
    return unit.skills.ultimate as SquadSkillDef;
  }

  if (!hasActiveStatus(unit, 'stun', state.now) && !hasActiveStatus(unit, 'silence', state.now)) {
    if (unit.skills.skill1 && state.now >= unit.cooldownReadyAt.skill1) return unit.skills.skill1;
    if (unit.skills.skill2 && state.now >= unit.cooldownReadyAt.skill2) return unit.skills.skill2;
  }

  return unit.skills.normalAttack;
}

function spendUltimateEnergy(unit: SquadUnitRuntime, skill: SquadSkillDef): void {
  if (skill.slot !== 'ultimate') return;
  unit.energy = Math.max(0, unit.energy - (skill.energyCost ?? DEFAULT_ULTIMATE_COST));
}

function applyActionEnergy(state: TimedBattleState, unit: SquadUnitRuntime, skill: SquadSkillDef): void {
  if (skill.slot === 'normal') gainEnergy(state, unit, 90, 'action');
  if (skill.slot === 'skill1' || skill.slot === 'skill2') gainEnergy(state, unit, 120, 'action');
}

function scheduleCooldown(state: TimedBattleState, unit: SquadUnitRuntime, skill: SquadSkillDef): void {
  if (skill.slot === 'skill1') unit.cooldownReadyAt.skill1 = state.now + (skill.cooldownMs ?? defaultCooldown('skill1'));
  if (skill.slot === 'skill2') unit.cooldownReadyAt.skill2 = state.now + (skill.cooldownMs ?? defaultCooldown('skill2'));
  if (skill.slot === 'ultimate') unit.cooldownReadyAt.ultimate = state.now + (skill.cooldownMs ?? 0);
}

function scheduleNextAction(state: TimedBattleState, unit: SquadUnitRuntime): void {
  unit.nextActionAt = state.now + calculateActionIntervalMs(getEffectiveStats(unit, state.now).spd, getSpeedModifier(unit, state.now));
}

function processUnitAction(state: TimedBattleState, unit: SquadUnitRuntime): void {
  if (!isAlive(unit)) return;
  if (hasActiveStatus(unit, 'stun', state.now)) {
    state.events.push({ type: 'actionSkipped', at: state.now, actorId: unit.id, reason: 'stun' });
    scheduleNextAction(state, unit);
    return;
  }

  const skill = chooseActionSkill(state, unit);
  if (selectTargets(state.units, unit, skill.target, state.now).length === 0) {
    state.events.push({ type: 'actionSkipped', at: state.now, actorId: unit.id, reason: 'noTarget' });
    scheduleNextAction(state, unit);
    return;
  }

  state.events.push({ type: 'action', at: state.now, actorId: unit.id, skillId: skill.id, skillName: skill.name, slot: skill.slot });
  spendUltimateEnergy(unit, skill);
  executeSkill(state, unit, skill);
  applyActionEnergy(state, unit, skill);
  scheduleCooldown(state, unit, skill);
  scheduleNextAction(state, unit);
}

function processActions(state: TimedBattleState): void {
  const actors = state.units
    .filter(unit => isAlive(unit) && unit.nextActionAt <= state.now)
    .sort((a, b) => a.nextActionAt - b.nextActionAt || a.id.localeCompare(b.id));

  for (const actor of actors) {
    processUnitAction(state, actor);
  }
}

function processManualUltimates(state: TimedBattleState, orders: readonly ManualUltimateOrder[], orderIndex: { value: number }): void {
  while (orderIndex.value < orders.length && orders[orderIndex.value].atMs <= state.now) {
    const order = orders[orderIndex.value++];
    const unit = state.units.find(u => u.id === order.unitId);
    if (!unit || !isAlive(unit) || !unit.skills.ultimate) {
      state.events.push({ type: 'manualUltimateFailed', at: state.now, actorId: order.unitId, reason: 'missingSkill' });
      continue;
    }
    if (!ultimateReady(unit)) {
      state.events.push({ type: 'manualUltimateFailed', at: state.now, actorId: unit.id, reason: 'notReady' });
      continue;
    }
    if (!canCastSpecial(unit, state.now)) {
      state.events.push({ type: 'manualUltimateFailed', at: state.now, actorId: unit.id, reason: 'controlled' });
      continue;
    }

    const skill = unit.skills.ultimate;
    state.events.push({ type: 'action', at: state.now, actorId: unit.id, skillId: skill.id, skillName: skill.name, slot: 'ultimate' });
    spendUltimateEnergy(unit, skill);
    executeSkill(state, unit, skill);
    scheduleCooldown(state, unit, skill);
  }
}

function nextManualAt(orders: readonly ManualUltimateOrder[], orderIndex: number): number {
  return orders[orderIndex]?.atMs ?? Number.POSITIVE_INFINITY;
}

export function createTimedBattleState(input: TimedBattleInput): TimedBattleState {
  const state: TimedBattleState = {
    now: 0,
    units: input.units.map(createRuntimeUnit),
    events: [{ type: 'battleStart', at: 0 }],
    rng: input.rng,
    autoUltimates: input.autoUltimates ?? true,
  };
  for (const unit of state.units) {
    const passive = unit.skills.passive;
    if (!passive) continue;
    if (executeSkill(state, unit, passive)) {
      state.events.push({ type: 'passiveActivated', at: 0, actorId: unit.id, skillId: passive.id, skillName: passive.name });
    }
  }
  return state;
}

export function simulateTimedBattle(input: TimedBattleInput): TimedBattleResult {
  const maxTimeMs = input.maxTimeMs ?? DEFAULT_MAX_TIME_MS;
  const maxEvents = input.maxEvents ?? DEFAULT_MAX_EVENTS;
  const state = createTimedBattleState(input);
  const manualOrders = [...(input.manualUltimateOrders ?? [])].sort((a, b) => a.atMs - b.atMs);
  const orderIndex = { value: 0 };

  let end = battleEnd(state, maxTimeMs, false);
  while (!end) {
    const nextAt = Math.min(
      maxTimeMs,
      nextManualAt(manualOrders, orderIndex.value),
      nextStatusTickAt(state),
      nextStatusExpiryAt(state),
      nextActionAt(state),
    );

    if (!Number.isFinite(nextAt)) {
      state.now = maxTimeMs;
    } else {
      state.now = nextAt;
    }

    processStatusTicks(state);
    expireStatuses(state);
    processManualUltimates(state, manualOrders, orderIndex);
    processActions(state);

    end = battleEnd(state, maxTimeMs, state.events.length >= maxEvents);
  }

  state.events.push({ type: 'battleEnd', at: state.now, winner: end.winner, reason: end.reason });
  return {
    winner: end.winner,
    reason: end.reason,
    elapsedMs: state.now,
    units: state.units,
    events: state.events,
  };
}
