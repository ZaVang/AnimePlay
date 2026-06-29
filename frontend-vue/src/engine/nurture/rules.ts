/**
 * 角色养成规则 —— 纯函数（S4 自 userStore / NurtureActions 提取；S13-C1 改加点制）。
 * 等级曲线、升级随机加点（5 战斗维）、瘦身版默认数据工厂。
 * 训练/属性/强化相关函数已随 S13-C1 养成精简删除。
 */
import type { CharacterNurtureData, StatPoints } from '@/types/nurture';
import type { RNG } from '../rng';

/** 角色等级上限。 */
export const MAX_CHARACTER_LEVEL = 100;

/** 每升一级 roll 的加点总数（可调；起 10）。随机分配到 5 战斗维。 */
export const POINTS_PER_LEVEL = 10;

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

/** 空加点（新角色 / 旧档迁移缺省）。 */
export function createEmptyStatPoints(): StatPoints {
  return { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
}

/**
 * 把 totalPoints 点随机分配到 5 战斗维（hp/atk/def/sp/spd）：逐点随机投放。
 * 注入 RNG，同种子可复现。总和恒等于输入点数，各项非负。
 */
export function distributeRandomStatPoints(totalPoints: number, rng: RNG): StatPoints {
  const stats = ['hp', 'atk', 'def', 'sp', 'spd'] as const;
  const distribution = createEmptyStatPoints();
  let remaining = Math.max(0, Math.floor(totalPoints));
  while (remaining > 0) {
    const stat = stats[rng.int(stats.length)];
    distribution[stat]++;
    remaining--;
  }
  return distribution;
}

/**
 * 升级 oldLevel → newLevel 期间累计的随机加点（每升一级各 roll POINTS_PER_LEVEL 点）。
 * 用于把多级跳跃一次性结算成一份加点增量；注入 RNG 可复现。
 */
export function rollLevelUpStatPoints(oldLevel: number, newLevel: number, rng: RNG): StatPoints {
  const gain = createEmptyStatPoints();
  for (let level = oldLevel + 1; level <= newLevel; level++) {
    const roll = distributeRandomStatPoints(POINTS_PER_LEVEL, rng);
    gain.hp += roll.hp;
    gain.atk += roll.atk;
    gain.def += roll.def;
    gain.sp += roll.sp;
    gain.spd += roll.spd;
  }
  return gain;
}

/** 新角色的默认养成数据（瘦身两轴 + 空加点）。 */
export function createDefaultNurtureData(): CharacterNurtureData {
  return {
    affection: 0,
    lastInteraction: '',
    level: 1,
    experience: 0,
    totalExperience: 0,
    statPoints: createEmptyStatPoints(),
    claimedBondMilestones: [],
  };
}
