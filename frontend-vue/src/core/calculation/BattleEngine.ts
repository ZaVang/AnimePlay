import type { ClashInfo } from '@/types/battle';
import { StrengthCalculator } from './StrengthCalculator';
import { RewardCalculator, type RewardResult } from './RewardCalculator';

export interface ClashResult {
  rewards: RewardResult;
  attackerStrength: number;
  defenderStrength: number;
}

export const BattleEngine = {
  /**
   * Resolves a clash after both players have acted.
   * This is now a pure function that returns the result without side effects.
   * @param clashInfo - The complete information about the clash.
   * @returns An object containing the full results of the clash.
   */
  resolveClash(clash: ClashInfo): ClashResult {
    const { attackingCard, defendingCard, attackerId, defenderId } = clash;

    // Calculate final strength for both sides
    const attackerStrength = StrengthCalculator.calculateFinalStrength(attackingCard, attackerId);
    const defenderStrength = StrengthCalculator.calculateFinalStrength(defendingCard, defenderId);

    const strengthDifference = attackerStrength - defenderStrength;

    // Create a temporary clash info with final strengths for the calculator
    const finalClashInfo: ClashInfo = {
      ...clash,
      attackerStrength,
      defenderStrength,
    };
    
    console.log(`Clash resolved: Attacker (${attackerStrength}) vs Defender (${defenderStrength}). Diff: ${strengthDifference}`);

    // 2. Calculate rewards using the final strengths
    const rewards = RewardCalculator.calculateRewards(finalClashInfo);

    return {
      rewards,
      attackerStrength,
      defenderStrength,
    };
  },
};