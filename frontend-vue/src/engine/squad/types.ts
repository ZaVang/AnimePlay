import type { RNG } from '../rng';
import type { BattleStats } from './combat';

export type SquadSide = 'player' | 'enemy';
export type SquadPosition = 'front' | 'middle' | 'back';

export type SquadSkillSlot = 'normal' | 'skill1' | 'skill2' | 'passive' | 'ultimate';

export type TargetSelector =
  | 'frontEnemy'
  | 'lowestHpEnemy'
  | 'highestAtkEnemy'
  | 'backEnemy'
  | 'allEnemies'
  | 'self'
  | 'lowestHpAlly'
  | 'firstDefeatedAlly'
  | 'allAllies';

export type StatusKind =
  | 'shield'
  | 'atkUp'
  | 'atkDown'
  | 'defUp'
  | 'defDown'
  | 'spUp'
  | 'spDown'
  | 'haste'
  | 'slow'
  | 'critRateUp'
  | 'stun'
  | 'silence'
  | 'taunt'
  | 'dot'
  | 'hot';

export interface BattleModifiers {
  critRate: number;
  critDamage: number;
  damageUp: number;
  damageTakenUp: number;
  healUp: number;
  shieldUp: number;
}

export interface StatusSpec {
  kind: StatusKind;
  durationMs: number;
  amount?: number;
  sourceId?: string;
  tickIntervalMs?: number;
}

export interface StatusRuntime extends StatusSpec {
  id: string;
  appliedAt: number;
  expiresAt: number;
  nextTickAt?: number;
  shieldRemaining?: number;
}

export type SkillEffect =
  | {
      type: 'damage';
      target?: TargetSelector;
      atkRatio?: number;
      spRatio?: number;
      flatPower?: number;
      canCrit?: boolean;
    }
  | {
      type: 'heal';
      target?: TargetSelector;
      atkRatio?: number;
      spRatio?: number;
      flatPower?: number;
    }
  | {
      type: 'shield';
      target?: TargetSelector;
      spRatio?: number;
      defRatio?: number;
      flatPower?: number;
      durationMs: number;
    }
  | {
      type: 'applyStatus';
      target?: TargetSelector;
      status: StatusSpec;
    }
  | {
      type: 'cleanse';
      target?: TargetSelector;
      kinds?: StatusKind[];
    }
  | {
      type: 'energyGain';
      target?: TargetSelector;
      amount: number;
    }
  | {
      type: 'dispel';
      target?: TargetSelector;
      kinds?: StatusKind[];
    }
  | {
      type: 'revive';
      target?: TargetSelector;
      hpRatio: number;
    }
  | {
      type: 'execute';
      target?: TargetSelector;
      hpRatioThreshold: number;
    };

export interface SquadSkillDef {
  id: string;
  name: string;
  slot: SquadSkillSlot;
  target: TargetSelector;
  description?: string;
  effects: readonly SkillEffect[];
  cooldownMs?: number;
  initialCooldownMs?: number;
  energyCost?: number;
}

export interface SquadSkillKit {
  normalAttack: SquadSkillDef;
  skill1?: SquadSkillDef;
  skill2?: SquadSkillDef;
  passive?: SquadSkillDef;
  ultimate?: SquadSkillDef;
}

export interface CompleteSquadSkillKit extends SquadSkillKit {
  normalAttack: SquadSkillDef;
  skill1: SquadSkillDef;
  skill2: SquadSkillDef;
  passive: SquadSkillDef;
  ultimate: SquadSkillDef;
}

export interface SquadUnitSetup {
  id: string;
  name: string;
  side: SquadSide;
  position: SquadPosition;
  stats: BattleStats;
  currentHp?: number;
  energy?: number;
  skills?: Partial<SquadSkillKit>;
  modifiers?: Partial<BattleModifiers>;
}

export interface SquadUnitRuntime {
  id: string;
  name: string;
  side: SquadSide;
  position: SquadPosition;
  baseStats: BattleStats;
  currentHp: number;
  maxHp: number;
  energy: number;
  skills: SquadSkillKit;
  modifiers: BattleModifiers;
  statuses: StatusRuntime[];
  cooldownReadyAt: Record<'skill1' | 'skill2' | 'ultimate', number>;
  nextActionAt: number;
  defeatedAt: number | null;
}

export interface ManualUltimateOrder {
  atMs: number;
  unitId: string;
}

export interface TimedBattleInput {
  units: readonly SquadUnitSetup[];
  rng: RNG;
  autoUltimates?: boolean;
  manualUltimateOrders?: readonly ManualUltimateOrder[];
  maxTimeMs?: number;
  maxEvents?: number;
}

export type TimedBattleWinner = 'player' | 'enemy' | 'timeout';
export type BattleEndReason = 'victory' | 'defeat' | 'timeout' | 'eventLimit';

export type TimedBattleEvent =
  | { type: 'battleStart'; at: number }
  | { type: 'action'; at: number; actorId: string; skillId: string; skillName: string; slot: SquadSkillSlot }
  | { type: 'passiveActivated'; at: number; actorId: string; skillId: string; skillName: string }
  | { type: 'actionSkipped'; at: number; actorId: string; reason: 'stun' | 'noTarget' }
  | { type: 'manualUltimateReady'; at: number; actorId: string }
  | { type: 'manualUltimateFailed'; at: number; actorId: string; reason: 'notReady' | 'controlled' | 'missingSkill' }
  | { type: 'damage'; at: number; actorId: string; targetId: string; amount: number; hpAfter: number; isCritical: boolean; absorbed: number }
  | { type: 'heal'; at: number; actorId: string; targetId: string; amount: number; hpAfter: number }
  | { type: 'shield'; at: number; actorId: string; targetId: string; amount: number; expiresAt: number }
  | { type: 'statusApplied'; at: number; actorId: string; targetId: string; status: StatusKind; amount: number; expiresAt: number }
  | { type: 'statusExpired'; at: number; targetId: string; status: StatusKind }
  | { type: 'statusTick'; at: number; targetId: string; status: 'dot' | 'hot'; amount: number; hpAfter: number }
  | { type: 'energy'; at: number; targetId: string; amount: number; energyAfter: number; reason: 'action' | 'damage' | 'kill' | 'effect' }
  | { type: 'revive'; at: number; actorId: string; targetId: string; amount: number; hpAfter: number }
  | { type: 'defeated'; at: number; targetId: string; by: string | null }
  | { type: 'battleEnd'; at: number; winner: TimedBattleWinner; reason: BattleEndReason };

export interface TimedBattleResult {
  winner: TimedBattleWinner;
  reason: BattleEndReason;
  elapsedMs: number;
  units: readonly SquadUnitRuntime[];
  events: readonly TimedBattleEvent[];
}

export interface TimedBattleState {
  now: number;
  units: SquadUnitRuntime[];
  events: TimedBattleEvent[];
  rng: RNG;
  autoUltimates: boolean;
}
