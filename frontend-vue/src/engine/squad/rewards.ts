import type { BattleEndReason, TimedBattleWinner } from './types';

export interface TowerBattleRewardInput {
  floor: number;
  winner: TimedBattleWinner;
  reason: BattleEndReason;
  progressed: boolean;
}

export interface TowerBattleReward {
  knowledge: number;
  characterExpEach: number;
  survivorBonus: number;
  shouldRollEquipment: boolean;
}

export interface TowerBattleRewardsInput<TEquipment = unknown> {
  floor: number;
  progressed: boolean;
  outcome: {
    winner: TimedBattleWinner | null;
    reason: BattleEndReason | 'elimination';
  };
  equipmentDrop?: TEquipment | null;
}

export interface TowerBattleRewards<TEquipment = unknown> {
  characterExp: number;
  knowledgePoints: number;
  equipmentDrop: TEquipment | null;
}

/**
 * SA-T5：扫荡（已通层重复挑战）奖励 —— 纯函数（无随机源需求，产出确定）。
 * 语义：卡关止损 / 落后补给，绝不比推塔更划算。
 *  - 缩水：产出 = 首通（calculateTowerBattleRewards）的约 35%（落在合同 30~50% 区间）。
 *  - 边际递减 + 绝对封顶：floor 派生量按 sqrt 递减、再对 SWEEP_*_CAP 取 min，
 *    杜绝「只扫最高层最无脑」的 AFK Dead Zone（高层与低层产出差距被压平）。
 *  - 装备不掉（合同二选一取「不掉」，保持扫荡是补给非 farm）。
 * 命名中性/道具化（sweepKnowledge/sweepCharacterExp），留「未来演化为道具产出」的口。
 */
export interface SweepReward {
  /** 缩水后的知识点产出（扁平定长、非按层膨胀）。 */
  sweepKnowledge: number;
  /** 缩水后的角色经验产出（每名参战/受益角色）。 */
  sweepCharacterExp: number;
}

/** 扫荡单次产出的绝对封顶（防高层无限刷）。 */
export const SWEEP_KNOWLEDGE_CAP = 60;
export const SWEEP_CHARACTER_EXP_CAP = 55;

export function calculateSweepReward(floor: number): SweepReward {
  const f = Math.max(1, Math.floor(floor));
  // 首通量级：knowledge 50+f*10、exp 40+f*10（见 calculateTowerBattleRewards）。
  // 扫荡缩水 ~35%，且对 floor 用 sqrt 边际递减（10*sqrt(f) 而非 10*f）+ 绝对封顶。
  const knowledgeRaw = 0.35 * (50 + 10 * Math.sqrt(f));
  const expRaw = 0.35 * (40 + 10 * Math.sqrt(f));
  return {
    sweepKnowledge: Math.min(SWEEP_KNOWLEDGE_CAP, Math.round(knowledgeRaw)),
    sweepCharacterExp: Math.min(SWEEP_CHARACTER_EXP_CAP, Math.round(expRaw)),
  };
}

export function calculateTowerBattleReward(input: TowerBattleRewardInput): TowerBattleReward {
  const floor = Math.max(1, Math.floor(input.floor));
  const victory = input.progressed && input.winner === 'player' && input.reason === 'victory';
  if (victory) {
    return {
      knowledge: 25 + floor * 5,
      characterExpEach: 80 + floor * 12,
      survivorBonus: 20,
      shouldRollEquipment: true,
    };
  }

  return {
    knowledge: 0,
    characterExpEach: 0,
    survivorBonus: 0,
    shouldRollEquipment: false,
  };
}

export function calculateTowerBattleRewards<TEquipment = unknown>(
  input: TowerBattleRewardsInput<TEquipment>,
): TowerBattleRewards<TEquipment> {
  const floor = Math.max(1, Math.floor(input.floor));
  const victory = input.progressed && input.outcome.winner === 'player' && (input.outcome.reason === 'victory' || input.outcome.reason === 'elimination');
  if (!victory) {
    return {
      characterExp: 0,
      knowledgePoints: 0,
      equipmentDrop: null,
    };
  }

  return {
    characterExp: 40 + floor * 10,
    knowledgePoints: 50 + floor * 10,
    equipmentDrop: input.equipmentDrop ?? null,
  };
}
