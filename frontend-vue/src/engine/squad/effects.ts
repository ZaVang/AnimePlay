import {
  calculateTimedDamage,
  calculateTimedHeal,
  calculateTimedShield,
  energyFromDamage,
  DEFAULT_BATTLE_MODIFIERS,
} from './formulas';
import { selectTargets } from './targeting';
import type {
  BattleModifiers,
  SkillEffect,
  SquadSkillDef,
  SquadUnitRuntime,
  StatusKind,
  StatusRuntime,
  StatusSpec,
  TimedBattleEvent,
  TimedBattleState,
} from './types';
import type { BattleStats } from './combat';

const NEGATIVE_STATUSES: readonly StatusKind[] = ['atkDown', 'defDown', 'spDown', 'slow', 'stun', 'silence', 'taunt', 'dot'];
const POSITIVE_STATUSES: readonly StatusKind[] = ['shield', 'atkUp', 'defUp', 'spUp', 'haste', 'critRateUp', 'hot'];

export interface RuntimeStatus {
  id: string;
  type: StatusKind;
  value: number;
  appliedAtMs: number;
  expiresAtMs: number;
  tickIntervalMs?: number;
  nextTickAtMs?: number;
}

export interface RuntimeStatusSpec {
  id: string;
  type: StatusKind;
  value: number;
  durationMs: number;
  tickIntervalMs?: number;
}

export function activeStatusesAt(statuses: readonly RuntimeStatus[], now: number): RuntimeStatus[] {
  return statuses.filter(status => status.expiresAtMs > now);
}

function maxRuntimeStatusValue(statuses: readonly RuntimeStatus[], kind: StatusKind, now: number): number {
  const values = activeStatusesAt(statuses, now)
    .filter(status => status.type === kind)
    .map(status => status.value);
  return values.length > 0 ? Math.max(...values) : 0;
}

export function hasStatus(statuses: readonly RuntimeStatus[], kind: StatusKind, now: number): boolean {
  return activeStatusesAt(statuses, now).some(status => status.type === kind);
}

export function getSpeedMultiplier(statuses: readonly RuntimeStatus[], now: number): number {
  return Math.max(0.1, 1 + maxRuntimeStatusValue(statuses, 'haste', now) - maxRuntimeStatusValue(statuses, 'slow', now));
}

export function getCritRateBonus(statuses: readonly RuntimeStatus[], now: number): number {
  return maxRuntimeStatusValue(statuses, 'critRateUp', now);
}

export function calculateEffectiveStats(base: BattleStats, statuses: readonly RuntimeStatus[], now: number): BattleStats {
  const atkMod = 1 + maxRuntimeStatusValue(statuses, 'atkUp', now) - maxRuntimeStatusValue(statuses, 'atkDown', now);
  const defMod = 1 + maxRuntimeStatusValue(statuses, 'defUp', now) - maxRuntimeStatusValue(statuses, 'defDown', now);
  const spMod = 1 + maxRuntimeStatusValue(statuses, 'spUp', now) - maxRuntimeStatusValue(statuses, 'spDown', now);
  return {
    hp: base.hp,
    atk: Math.max(1, Math.floor(base.atk * atkMod)),
    def: Math.max(0, Math.floor(base.def * defMod)),
    sp: Math.max(0, Math.floor(base.sp * spMod)),
    spd: base.spd,
  };
}

function addRuntimeStatus(
  statuses: readonly RuntimeStatus[],
  spec: RuntimeStatusSpec,
  now: number,
): RuntimeStatus[] {
  const next: RuntimeStatus = {
    id: spec.id,
    type: spec.type,
    value: spec.value,
    appliedAtMs: now,
    expiresAtMs: now + spec.durationMs,
  };
  if (spec.tickIntervalMs) {
    next.tickIntervalMs = spec.tickIntervalMs;
    next.nextTickAtMs = now + spec.tickIntervalMs;
  }
  return [...statuses, next];
}

export function activeStatuses(unit: SquadUnitRuntime, now: number): StatusRuntime[] {
  return unit.statuses.filter(status => status.expiresAt > now && (status.kind !== 'shield' || (status.shieldRemaining ?? 0) > 0));
}

function maxStatusAmount(unit: SquadUnitRuntime, kind: StatusKind, now: number): number {
  const amounts = activeStatuses(unit, now)
    .filter(status => status.kind === kind)
    .map(status => status.amount ?? 0);
  return amounts.length > 0 ? Math.max(...amounts) : 0;
}

export function hasActiveStatus(unit: SquadUnitRuntime, kind: StatusKind, now: number): boolean {
  return activeStatuses(unit, now).some(status => status.kind === kind);
}

export function getEffectiveStats(unit: SquadUnitRuntime, now: number): BattleStats {
  const atkMod = 1 + maxStatusAmount(unit, 'atkUp', now) - maxStatusAmount(unit, 'atkDown', now);
  const defMod = 1 + maxStatusAmount(unit, 'defUp', now) - maxStatusAmount(unit, 'defDown', now);
  const spMod = 1 + maxStatusAmount(unit, 'spUp', now) - maxStatusAmount(unit, 'spDown', now);
  return {
    hp: unit.baseStats.hp,
    atk: Math.max(1, Math.floor(unit.baseStats.atk * atkMod)),
    def: Math.max(0, Math.floor(unit.baseStats.def * defMod)),
    sp: Math.max(0, Math.floor(unit.baseStats.sp * spMod)),
    spd: unit.baseStats.spd,
  };
}

export function getEffectiveModifiers(unit: SquadUnitRuntime, now: number): BattleModifiers {
  return {
    ...DEFAULT_BATTLE_MODIFIERS,
    ...unit.modifiers,
    critRate: (unit.modifiers.critRate ?? DEFAULT_BATTLE_MODIFIERS.critRate) + maxStatusAmount(unit, 'critRateUp', now),
  };
}

export function getSpeedModifier(unit: SquadUnitRuntime, now: number): { haste: number; slow: number } {
  return {
    haste: maxStatusAmount(unit, 'haste', now),
    slow: maxStatusAmount(unit, 'slow', now),
  };
}

export function gainEnergy(
  state: TimedBattleState,
  target: SquadUnitRuntime,
  amount: number,
  reason: Extract<TimedBattleEvent, { type: 'energy' }>['reason'],
): void {
  if (amount <= 0 || target.currentHp <= 0) return;
  target.energy = Math.min(1000, target.energy + Math.floor(amount));
  state.events.push({ type: 'energy', at: state.now, targetId: target.id, amount: Math.floor(amount), energyAfter: target.energy, reason });
}

function defeatIfNeeded(state: TimedBattleState, target: SquadUnitRuntime, by: string | null): void {
  if (target.currentHp > 0 || target.defeatedAt !== null) return;
  target.currentHp = 0;
  target.defeatedAt = state.now;
  state.events.push({ type: 'defeated', at: state.now, targetId: target.id, by });
}

export function dealDamage(
  state: TimedBattleState,
  actor: SquadUnitRuntime | null,
  target: SquadUnitRuntime,
  amount: number,
  isCritical: boolean,
): void {
  if (amount <= 0 || target.currentHp <= 0) return;

  let remaining = amount;
  let absorbed = 0;
  for (const shield of target.statuses.filter(status => status.kind === 'shield' && status.expiresAt > state.now && (status.shieldRemaining ?? 0) > 0)) {
    const spend = Math.min(remaining, shield.shieldRemaining ?? 0);
    shield.shieldRemaining = (shield.shieldRemaining ?? 0) - spend;
    remaining -= spend;
    absorbed += spend;
    if (remaining <= 0) break;
  }

  target.statuses = target.statuses.filter(status => status.kind !== 'shield' || (status.shieldRemaining ?? 0) > 0);
  const hpDamage = Math.min(target.currentHp, remaining);
  target.currentHp = Math.max(0, target.currentHp - hpDamage);
  state.events.push({
    type: 'damage',
    at: state.now,
    actorId: actor?.id ?? 'status',
    targetId: target.id,
    amount: hpDamage,
    hpAfter: target.currentHp,
    isCritical,
    absorbed,
  });

  gainEnergy(state, target, energyFromDamage(hpDamage, target.maxHp), 'damage');
  defeatIfNeeded(state, target, actor?.id ?? null);
  if (target.defeatedAt === state.now && actor) {
    gainEnergy(state, actor, 120, 'kill');
  }
}

function healTarget(state: TimedBattleState, actor: SquadUnitRuntime, target: SquadUnitRuntime, amount: number): void {
  if (amount <= 0 || target.currentHp <= 0) return;
  target.currentHp = Math.min(target.maxHp, target.currentHp + amount);
  state.events.push({ type: 'heal', at: state.now, actorId: actor.id, targetId: target.id, amount, hpAfter: target.currentHp });
}

function statusRuntime(actor: SquadUnitRuntime, target: SquadUnitRuntime, spec: StatusSpec, now: number): StatusRuntime {
  const sourceId = spec.sourceId ?? actor.id;
  const tickIntervalMs = spec.tickIntervalMs;
  return {
    ...spec,
    sourceId,
    id: `${spec.kind}:${sourceId}:${target.id}`,
    appliedAt: now,
    expiresAt: now + spec.durationMs,
    nextTickAt: tickIntervalMs ? now + tickIntervalMs : undefined,
  };
}

function applyBattleStatus(
  state: TimedBattleState,
  actor: SquadUnitRuntime,
  target: SquadUnitRuntime,
  spec: StatusSpec,
): void {
  if (target.currentHp <= 0) return;
  const runtime = statusRuntime(actor, target, spec, state.now);
  const existing = target.statuses.find(status => status.id === runtime.id);
  if (existing && spec.kind !== 'shield' && spec.kind !== 'dot' && spec.kind !== 'hot') {
    existing.amount = spec.amount ?? existing.amount;
    existing.expiresAt = runtime.expiresAt;
    existing.nextTickAt = runtime.nextTickAt;
  } else {
    target.statuses.push(runtime);
  }
  state.events.push({
    type: 'statusApplied',
    at: state.now,
    actorId: actor.id,
    targetId: target.id,
    status: spec.kind,
    amount: spec.amount ?? 0,
    expiresAt: runtime.expiresAt,
  });
}

export function applyStatus(statuses: readonly RuntimeStatus[], spec: RuntimeStatusSpec, now: number): RuntimeStatus[];
export function applyStatus(
  state: TimedBattleState,
  actor: SquadUnitRuntime,
  target: SquadUnitRuntime,
  spec: StatusSpec,
): void;
export function applyStatus(
  first: TimedBattleState | readonly RuntimeStatus[],
  second: SquadUnitRuntime | RuntimeStatusSpec,
  third: SquadUnitRuntime | number,
  fourth?: StatusSpec,
): RuntimeStatus[] | void {
  if (Array.isArray(first)) {
    return addRuntimeStatus(first, second as RuntimeStatusSpec, third as number);
  }

  applyBattleStatus(first as TimedBattleState, second as SquadUnitRuntime, third as SquadUnitRuntime, fourth as StatusSpec);
}

function addShield(
  state: TimedBattleState,
  actor: SquadUnitRuntime,
  target: SquadUnitRuntime,
  amount: number,
  durationMs: number,
): void {
  if (amount <= 0 || target.currentHp <= 0) return;
  const shield = statusRuntime(actor, target, { kind: 'shield', amount, durationMs }, state.now);
  shield.shieldRemaining = amount;
  target.statuses.push(shield);
  state.events.push({ type: 'shield', at: state.now, actorId: actor.id, targetId: target.id, amount, expiresAt: shield.expiresAt });
}

function removeStatuses(
  target: SquadUnitRuntime,
  kinds: readonly StatusKind[],
  now: number,
): StatusRuntime[] {
  const removed: StatusRuntime[] = [];
  target.statuses = target.statuses.filter(status => {
    const shouldRemove = status.expiresAt > now && kinds.includes(status.kind);
    if (shouldRemove) removed.push(status);
    return !shouldRemove;
  });
  return removed;
}

function executeEffect(
  state: TimedBattleState,
  actor: SquadUnitRuntime,
  skill: SquadSkillDef,
  effect: SkillEffect,
): boolean {
  const targets = selectTargets(state.units, actor, effect.target ?? skill.target, state.now);
  if (targets.length === 0) return false;

  for (const target of targets) {
    switch (effect.type) {
      case 'damage': {
        const damage = calculateTimedDamage({
          attacker: getEffectiveStats(actor, state.now),
          defender: getEffectiveStats(target, state.now),
          modifiers: getEffectiveModifiers(actor, state.now),
          defenderModifiers: getEffectiveModifiers(target, state.now),
          rng: state.rng,
          atkRatio: effect.atkRatio,
          spRatio: effect.spRatio,
          flatPower: effect.flatPower,
          canCrit: effect.canCrit,
        });
        dealDamage(state, actor, target, damage.amount, damage.isCritical);
        break;
      }
      case 'heal': {
        const amount = calculateTimedHeal({
          caster: getEffectiveStats(actor, state.now),
          modifiers: getEffectiveModifiers(actor, state.now),
          atkRatio: effect.atkRatio,
          spRatio: effect.spRatio,
          flatPower: effect.flatPower,
        });
        healTarget(state, actor, target, amount);
        break;
      }
      case 'shield': {
        const amount = calculateTimedShield({
          caster: getEffectiveStats(actor, state.now),
          modifiers: getEffectiveModifiers(actor, state.now),
          spRatio: effect.spRatio,
          defRatio: effect.defRatio,
          flatPower: effect.flatPower,
        });
        addShield(state, actor, target, amount, effect.durationMs);
        break;
      }
      case 'applyStatus':
        applyStatus(state, actor, target, effect.status);
        break;
      case 'cleanse': {
        const removed = removeStatuses(target, effect.kinds ?? NEGATIVE_STATUSES, state.now);
        for (const status of removed) {
          state.events.push({ type: 'statusExpired', at: state.now, targetId: target.id, status: status.kind });
        }
        break;
      }
      case 'energyGain':
        gainEnergy(state, target, effect.amount, 'effect');
        break;
      case 'dispel': {
        const removed = removeStatuses(target, effect.kinds ?? POSITIVE_STATUSES, state.now);
        for (const status of removed) {
          state.events.push({ type: 'statusExpired', at: state.now, targetId: target.id, status: status.kind });
        }
        break;
      }
      case 'revive':
        if (target.currentHp <= 0) {
          const amount = Math.max(1, Math.floor(target.maxHp * effect.hpRatio));
          target.currentHp = amount;
          target.defeatedAt = null;
          state.events.push({ type: 'revive', at: state.now, actorId: actor.id, targetId: target.id, amount, hpAfter: target.currentHp });
        }
        break;
      case 'execute':
        if (target.currentHp / target.maxHp <= effect.hpRatioThreshold) {
          dealDamage(state, actor, target, target.currentHp, false);
        }
        break;
    }
  }

  return true;
}

export function executeSkill(state: TimedBattleState, actor: SquadUnitRuntime, skill: SquadSkillDef): boolean {
  let affected = false;
  for (const effect of skill.effects) {
    affected = executeEffect(state, actor, skill, effect) || affected;
  }
  return affected;
}
