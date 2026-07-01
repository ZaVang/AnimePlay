/**
 * SC-T5：塔层「软战力门槛」纯函数（零 config import、零 RNG、可单测）。
 *
 * 只做提示、不硬拦（eligibility / canStartBattle / canStartTowerBattle 一律不改）。
 * 双方战力同口径：调用方我方用 squadPower/getSquadPower、敌方用 floorPower，
 * 二者都是 Σ calculateBattlePower(...) —— 本层只对两个已算好的标量做比值判档。
 *
 * 系数作参数注入（默认阈值贴近真实胜负线，避免层层皆红），仿 rollTowerDrop 的注入范式。
 */

export type SquadReadinessLevel = 'ready' | 'risky' | 'underpowered';

export interface SquadReadinessThresholds {
  /** ratio ≥ readyRatio → ready（建议 0.9）。 */
  readyRatio: number;
  /** ratio ≥ riskyRatio 且 < readyRatio → risky（建议 0.7）；< riskyRatio → underpowered。 */
  riskyRatio: number;
}

export const DEFAULT_READINESS_THRESHOLDS: SquadReadinessThresholds = {
  readyRatio: 0.9,
  riskyRatio: 0.7,
};

export interface SquadReadinessAssessment {
  /** 我方战力（原样回传，便于 UI 展示）。 */
  playerPower: number;
  /** 敌方/推荐战力基准（= floorPower）。 */
  floorPower: number;
  /** 推荐战力（floorPower × recommendMultiplier，向上取整）。 */
  recommendedPower: number;
  /** 我方 − 推荐（负=不足）。 */
  delta: number;
  /** playerPower / floorPower（floorPower≤0 时为 Infinity 视作 ready）。 */
  ratio: number;
  level: SquadReadinessLevel;
}

/**
 * 推荐战力 = floorPower × multiplier（默认 1.0，即建议至少与敌方持平即可稳过）。
 * multiplier 作参数便于调参 / 测试；恒 ≥0。
 */
export function recommendedPowerForFloor(floorPower: number, multiplier = 1): number {
  return Math.ceil(Math.max(0, floorPower) * multiplier);
}

/**
 * 评估我方对某层的准备度：给定 playerPower / floorPower 返回 ratio + 三档 level + delta。
 * 纯函数：同输入同输出，无副作用、无 RNG。
 */
export function assessSquadReadiness(
  playerPower: number,
  floorPower: number,
  thresholds: SquadReadinessThresholds = DEFAULT_READINESS_THRESHOLDS,
  recommendMultiplier = 1,
): SquadReadinessAssessment {
  const safeFloor = Math.max(0, floorPower);
  const recommendedPower = recommendedPowerForFloor(safeFloor, recommendMultiplier);
  const ratio = safeFloor <= 0 ? Number.POSITIVE_INFINITY : playerPower / safeFloor;

  let level: SquadReadinessLevel;
  if (ratio >= thresholds.readyRatio) level = 'ready';
  else if (ratio >= thresholds.riskyRatio) level = 'risky';
  else level = 'underpowered';

  return {
    playerPower,
    floorPower: safeFloor,
    recommendedPower,
    delta: playerPower - recommendedPower,
    ratio,
    level,
  };
}
