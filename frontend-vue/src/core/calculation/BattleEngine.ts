import type { ClashInfo } from '@/core/battle/BattleController';
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
    const { attackingAnime, defendingAnime, attackerId, defenderId } = clash;

    // Calculate final strength for both sides
    const attackerStrength = StrengthCalculator.calculateFinalStrength(attackingAnime, attackerId);
    
    let defenderStrength = 0;
    if (defendingAnime && defenderId) {
      defenderStrength = StrengthCalculator.calculateFinalStrength(defendingAnime, defenderId);
    }

    const strengthDifference = attackerStrength - defenderStrength;

    // Create a temporary clash info with final strengths for the calculator
    const finalClashInfo: ClashInfo = {
      ...clash,
      attackingAnime: { ...clash.attackingAnime, points: attackerStrength },
      defendingAnime: clash.defendingAnime ? { ...clash.defendingAnime, points: defenderStrength } : undefined,
    };
    
    console.log(`Clash resolved: Attacker (${attackerStrength}) vs Defender (${defenderStrength}). Diff: ${attackerStrength - defenderStrength}`);

    // 2. Calculate rewards using the final strengths
    const rewards = RewardCalculator.calculateRewards(finalClashInfo);

    return {
      rewards,
      attackerStrength,
      defenderStrength,
    };
  },
};
