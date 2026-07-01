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
