import type { RNG } from '../rng';
import type { BattleStats } from './combat';

export type SquadSide = 'player' | 'enemy';
export type SquadPosition = 'front' | 'middle' | 'back';

export type SquadSkillSlot = 'normal' | 'skill1' | 'passive' | 'ultimate';

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
  passive?: SquadSkillDef;
  ultimate?: SquadSkillDef;
}

export interface CompleteSquadSkillKit extends SquadSkillKit {
  normalAttack: SquadSkillDef;
  skill1: SquadSkillDef;
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
  cooldownReadyAt: Record<'skill1' | 'ultimate', number>;
  nextActionAt: number;
  defeatedAt: number | null;
}

/**
 * SB-T2（拍板 3/4）：手动大招命令。写成可扩展命令形状（`{atMs, unitId, targetId?}`，语义等价
 * discriminated union 的 ultimate 分支），为未来手动技能/换位/撤退留统一命令口，本轮只实现 ultimate。
 *
 * `targetId`（可选）：仅对**单体** selector 大招生效——engine 优先用它命中所选存活单位；
 * AOE（allEnemies/allAllies）/ self / 全体治疗**一律忽略** targetId（复用 SB-T4 单体/AOE 二分口径）。
 * 死目标（生效前已阵亡）→ 回退到该大招默认 selector（拍板 5）。UI 侧只对单体大招亮「选目标」，
 * 与 engine 覆盖规则同一口径（防 P1-4 反向 affordance 欺骗）。
 */
export interface ManualUltimateOrder {
  atMs: number;
  unitId: string;
  targetId?: string;
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
/**
 * SB-T1：超时不再一刀切判负，改按「存活数 + 剩余 HP%」裁决。winner 不扩（避开 View:501/rewards/多测试波及，
 * 坑 C-1）——超时占优 winner='player'、劣势 winner='enemy'（复用现有胜负映射与发奖）、真平局 winner='timeout'。
 * 三态用 reason 显形：
 *  - timeoutWin：超时占优判胜（winner='player'，走发奖）
 *  - timeoutLoss：超时劣势判负（winner='enemy'）
 *  - timeoutDraw：真平局（winner='timeout'，存活数与 HP% 均相等，rewards 全 0，平局不发奖）
 * 事件上限触发的僵持沿用同口径（reason 复用 timeout* 三态，语义 = 未推进）。
 */
export type BattleEndReason =
  | 'victory'
  | 'defeat'
  | 'timeout'
  | 'eventLimit'
  | 'timeoutWin'
  | 'timeoutLoss'
  | 'timeoutDraw';

export type TimedBattleEvent =
  | { type: 'battleStart'; at: number }
  | { type: 'action'; at: number; actorId: string; skillId: string; skillName: string; slot: SquadSkillSlot }
  | { type: 'passiveActivated'; at: number; actorId: string; skillId: string; skillName: string }
  | { type: 'actionSkipped'; at: number; actorId: string; reason: 'stun' | 'noTarget' }
  | { type: 'manualUltimateReady'; at: number; actorId: string }
  | { type: 'manualUltimateFailed'; at: number; actorId: string; reason: 'notReady' | 'controlled' | 'missingSkill' | 'noTarget' }
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
