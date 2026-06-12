/**
 * 对撞结算 —— 纯函数。
 * 强度由调用方算好传入（含光环/持续效果加成）；不传则回退用卡面点数，
 * 方便测试与「无加成」场景。奖励基于传入强度计算。
 */
import type { ClashInfo } from '@/types/battle';
import { calculateRewards, type RewardResult } from './rewards';

export interface ClashStrengths {
  attacker: number;
  defender: number;
}

export interface ClashResult {
  rewards: RewardResult;
  attackerStrength: number;
  defenderStrength: number;
}

export function resolveClash(clash: ClashInfo, strengths?: ClashStrengths): ClashResult {
  const attackerStrength = strengths?.attacker ?? (clash.attackingCard.points || 0);
  const defenderStrength = strengths?.defender ?? (clash.defendingCard?.points || 0);

  const rewards = calculateRewards({ ...clash, attackerStrength, defenderStrength });

  return { rewards, attackerStrength, defenderStrength };
}
