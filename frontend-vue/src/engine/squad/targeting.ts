import type { BattleStats } from './combat';
import type { SquadPosition, SquadSide, SquadUnitRuntime, StatusKind, TargetSelector } from './types';

export interface TargetableStatus {
  id?: string;
  kind?: StatusKind;
  type?: StatusKind;
  value?: number;
  appliedAtMs?: number;
  expiresAt?: number;
  expiresAtMs?: number;
  tickIntervalMs?: number;
  nextTickAtMs?: number;
}

export interface TargetableUnit {
  id: string;
  side: SquadSide;
  position: SquadPosition | number;
  maxHp: number;
  statuses: readonly TargetableStatus[];
  hp?: number;
  currentHp?: number;
  defeatedAt?: number | null;
  atk?: number;
  baseStats?: Pick<BattleStats, 'atk'>;
}

export type TargetSelectorInput = TargetSelector | { type: TargetSelector };

const POSITION_ORDER: Record<string, number> = {
  front: 0,
  middle: 1,
  back: 2,
};

function opposingSide(side: SquadSide): SquadSide {
  return side === 'player' ? 'enemy' : 'player';
}

function selectorType(selector: TargetSelectorInput): TargetSelector {
  return typeof selector === 'string' ? selector : selector.type;
}

function positionRank(position: SquadPosition | number): number {
  return typeof position === 'number' ? position : POSITION_ORDER[position];
}

function hp(unit: TargetableUnit): number {
  return unit.currentHp ?? unit.hp ?? 0;
}

function atk(unit: TargetableUnit): number {
  return unit.baseStats?.atk ?? unit.atk ?? 0;
}

export function isAlive(unit: TargetableUnit): boolean {
  return hp(unit) > 0 && (unit.defeatedAt ?? null) === null;
}

export function hasTargetStatus(unit: TargetableUnit, status: string, now: number): boolean {
  return unit.statuses.some(s => (s.kind ?? s.type) === status && (s.expiresAt ?? s.expiresAtMs ?? 0) > now);
}

export function getAliveUnits<T extends TargetableUnit>(units: readonly T[], side: SquadSide): T[] {
  return units.filter(unit => unit.side === side && isAlive(unit));
}

function getDefeatedUnits<T extends TargetableUnit>(units: readonly T[], side: SquadSide): T[] {
  return units.filter(unit => unit.side === side && !isAlive(unit));
}

function byFrontOrder<T extends TargetableUnit>(a: T, b: T): number {
  return positionRank(a.position) - positionRank(b.position);
}

function byBackOrder<T extends TargetableUnit>(a: T, b: T): number {
  return positionRank(b.position) - positionRank(a.position);
}

function applyTaunt(
  units: readonly TargetableUnit[],
  actor: TargetableUnit,
  selector: TargetSelectorInput,
  now: number,
  selected: TargetableUnit[],
): TargetableUnit[] {
  const type = selectorType(selector);
  const isSingleEnemySelector =
    type === 'frontEnemy' ||
    type === 'lowestHpEnemy' ||
    type === 'highestAtkEnemy' ||
    type === 'backEnemy';
  if (!isSingleEnemySelector) return selected;

  const taunters = getAliveUnits(units, opposingSide(actor.side)).filter(unit => hasTargetStatus(unit, 'taunt', now));
  return taunters.length > 0 ? [taunters.sort(byFrontOrder)[0]] : selected;
}

export function selectTargets<T extends TargetableUnit>(
  units: readonly T[],
  actor: T,
  selector: TargetSelectorInput,
  now = 0,
): T[] {
  const enemies = getAliveUnits(units, opposingSide(actor.side));
  const allies = getAliveUnits(units, actor.side);

  let selected: T[] = [];
  switch (selectorType(selector)) {
    case 'frontEnemy':
      selected = enemies.sort(byFrontOrder).slice(0, 1);
      break;
    case 'lowestHpEnemy':
      selected = enemies.sort((a, b) => hp(a) / a.maxHp - hp(b) / b.maxHp).slice(0, 1);
      break;
    case 'highestAtkEnemy':
      selected = enemies.sort((a, b) => atk(b) - atk(a)).slice(0, 1);
      break;
    case 'backEnemy':
      selected = enemies.sort(byBackOrder).slice(0, 1);
      break;
    case 'allEnemies':
      selected = enemies;
      break;
    case 'self':
      selected = isAlive(actor) ? [actor] : [];
      break;
    case 'lowestHpAlly':
      selected = allies.sort((a, b) => hp(a) / a.maxHp - hp(b) / b.maxHp).slice(0, 1);
      break;
    case 'firstDefeatedAlly':
      selected = getDefeatedUnits(units, actor.side).sort(byFrontOrder).slice(0, 1);
      break;
    case 'allAllies':
      selected = allies;
      break;
  }

  return applyTaunt(units, actor, selector, now, selected) as T[];
}
