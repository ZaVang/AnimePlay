/**
 * 角色养成规则 —— 纯函数（S4 自 userStore / NurtureActions 提取）。
 * 等级曲线、升级属性分配、经验奖励系数、训练对手与训练结算。
 */
import type { CharacterNurtureData } from '@/types/nurture';
import type { BattleStats } from '../squad/combat';
import type { RNG } from '../rng';

/** 角色等级上限。 */
export const MAX_CHARACTER_LEVEL = 100;
/** 基础属性单项上限（魅力/智力/体力/心情）。 */
export const ATTRIBUTE_CAP = 100;
/** 战斗属性强化百分比上限。 */
export const ENHANCEMENT_CAP = 100;

/** 互动经验：每点好感度 ×5。 */
export const EXP_PER_AFFECTION = 5;
/** 基础训练经验：每点属性 ×15。 */
export const EXP_PER_ATTRIBUTE = 15;
/** 战斗训练经验：每点强化 ×25。 */
export const EXP_PER_BATTLE_STAT = 25;

/** 升到 level 级所需总经验 = (level-1)² × 1000。 */
export function getRequiredExpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) * (level - 1) * 1000;
}

/** 由总经验反推等级。 */
export function getLevelFromExp(totalExp: number): number {
  let level = 1;
  while (getRequiredExpForLevel(level + 1) <= totalExp) {
    level++;
  }
  return level;
}

export interface LevelProgress {
  current: number;
  required: number;
  percentage: number;
}

/** 当前等级内的经验进度。 */
export function getLevelProgress(level: number, totalExp: number): LevelProgress {
  const currentLevelExpStart = getRequiredExpForLevel(level);
  const nextLevelExpStart = getRequiredExpForLevel(level + 1);

  const currentLevelExp = Math.max(0, totalExp - currentLevelExpStart);
  const requiredForNext = nextLevelExpStart - currentLevelExpStart;
  const percentage = requiredForNext > 0 ? (currentLevelExp / requiredForNext) * 100 : 0;

  return {
    current: currentLevelExp,
    required: requiredForNext,
    percentage: Math.min(100, Math.max(0, percentage)),
  };
}

/** 升到第 level 级时获得的随机属性点总数。 */
export function levelUpAttributePoints(level: number): number {
  return level * 10;
}

export interface AttributeDistribution {
  charm: number;
  intelligence: number;
  strength: number;
}

/**
 * 把属性点随机分配到 魅力/智力/体力：每项至少 10%、至多 60%，剩余逐点随机。
 */
export function distributeRandomAttributes(totalPoints: number, rng: RNG): AttributeDistribution {
  const attributes = ['charm', 'intelligence', 'strength'] as const;
  const distribution: AttributeDistribution = { charm: 0, intelligence: 0, strength: 0 };

  let remainingPoints = totalPoints;

  for (const attr of attributes) {
    const minPoints = Math.floor(totalPoints * 0.1);
    const maxPoints = Math.floor(totalPoints * 0.6);
    const points = Math.min(
      Math.max(minPoints, Math.floor(rng.next() * (maxPoints - minPoints + 1)) + minPoints),
      remainingPoints - (attributes.length - attributes.indexOf(attr) - 1),
    );
    distribution[attr] = points;
    remainingPoints -= points;
  }

  while (remainingPoints > 0) {
    const randomAttr = attributes[Math.floor(rng.next() * attributes.length)];
    distribution[randomAttr]++;
    remainingPoints--;
  }

  return distribution;
}

/** 新角色的默认养成数据。 */
export function createDefaultNurtureData(): CharacterNurtureData {
  return {
    affection: 0,
    intimacy: 0,
    lastInteraction: '',
    totalInteractions: 0,
    dialogueHistory: [],
    gifts: [],
    specialEvents: [],
    level: 1,
    experience: 0,
    totalExperience: 0,
    attributes: { charm: 50, intelligence: 50, strength: 50, mood: 80 },
    levelBonusAttributes: { charm: 0, intelligence: 0, strength: 0 },
    battleEnhancements: { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 },
    preferences: { favoriteTopics: [], dislikedTopics: [], favoriteGifts: [] },
  };
}

/** 最终战斗属性 = 原始属性 × (1 + 强化%/100)，向下取整。 */
export function applyBattleEnhancements(
  baseStats: BattleStats,
  enhancements: CharacterNurtureData['battleEnhancements'],
): BattleStats {
  return {
    hp: Math.floor(baseStats.hp * (1 + enhancements.hp / 100)),
    atk: Math.floor(baseStats.atk * (1 + enhancements.atk / 100)),
    def: Math.floor(baseStats.def * (1 + enhancements.def / 100)),
    sp: Math.floor(baseStats.sp * (1 + enhancements.sp / 100)),
    spd: Math.floor(baseStats.spd * (1 + enhancements.spd / 100)),
  };
}

export type TrainingStat = 'hp' | 'atk' | 'def' | 'sp' | 'spd';

/**
 * 训练对手：玩家属性打折为基底，再按训练项强化对应克制能力
 * （练攻击给防御型对手、练防御给攻击型对手……）。
 */
export function generateTrainingOpponent(trainingStat: TrainingStat, playerStats: BattleStats): BattleStats {
  const baseOpponent = {
    hp: playerStats.hp * 0.8,
    atk: playerStats.atk * 0.9,
    def: playerStats.def * 0.8,
    sp: playerStats.sp * 0.8,
    spd: playerStats.spd * 0.9,
  };

  switch (trainingStat) {
    case 'atk':
      baseOpponent.def *= 1.2; // 防御型对手，训练攻击
      break;
    case 'def':
      baseOpponent.atk *= 1.2; // 攻击型对手，训练防御
      break;
    case 'sp':
      baseOpponent.sp *= 1.3;
      break;
    case 'spd':
      baseOpponent.spd *= 1.3;
      break;
    case 'hp':
      baseOpponent.hp *= 1.4;
      break;
  }

  return {
    hp: Math.floor(baseOpponent.hp),
    atk: Math.floor(baseOpponent.atk),
    def: Math.floor(baseOpponent.def),
    sp: Math.floor(baseOpponent.sp),
    spd: Math.floor(baseOpponent.spd),
  };
}

export interface TrainingOutcome {
  /** 实得强化点（按胜负打折，向上取整）。 */
  gain: number;
  /** 训练经验。 */
  exp: number;
}

/** 训练结算：胜 100%/25 经验，负 40%/10 经验，平 70%/18 经验。 */
export function trainingOutcome(winner: 'attacker' | 'defender' | null, fullGain: number): TrainingOutcome {
  if (winner === 'attacker') return { gain: fullGain, exp: 25 };
  if (winner === 'defender') return { gain: Math.ceil(fullGain * 0.4), exp: 10 };
  return { gain: Math.ceil(fullGain * 0.7), exp: 18 };
}
