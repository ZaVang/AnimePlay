import { usePlayerStore } from '@/stores/battle';
import type { ClashInfo } from '../battle/BattleController';
import { StrengthCalculator } from './StrengthCalculator';
import { RewardCalculator } from './RewardCalculator';

export const BattleEngine = {
  /**
   * Resolves a clash after both players have acted.
   * This is now a pure function that returns the result without side effects.
   * @param clashInfo - The complete information about the clash.
   * @returns The changes to be applied to the stores.
   */
  resolveClash(clashInfo: ClashInfo): { reputationChange: { attacker: number, defender: number }, topicBiasChange: number } {
    const playerStore = usePlayerStore();

    if (!clashInfo.defenderId || !clashInfo.defendingAnime || !clashInfo.defenseStyle) {
      throw new Error("Cannot resolve incomplete clash.");
    }

    const attacker = playerStore[clashInfo.attackerId];
    const defender = playerStore[clashInfo.defenderId];

    // 1. Calculate final strength for both players
    const attackerStrength = StrengthCalculator.calculateFinalStrength(attacker, clashInfo.attackingAnime);
    const defenderStrength = StrengthCalculator.calculateFinalStrength(defender, clashInfo.defendingAnime);
    
    // Create a temporary clash info with final strengths for the calculator
    const finalClashInfo: ClashInfo = {
      ...clashInfo,
      attackingAnime: { ...clashInfo.attackingAnime, points: attackerStrength },
      defendingAnime: { ...clashInfo.defendingAnime, points: defenderStrength },
    };
    
    console.log(`Clash resolved: Attacker (${attackerStrength}) vs Defender (${defenderStrength}). Diff: ${attackerStrength - defenderStrength}`);

    // 2. Calculate rewards using the final strengths
    const rewards = RewardCalculator.calculateRewards(finalClashInfo);

    return {
      reputationChange: {
        attacker: rewards.attackerReputationChange,
        defender: rewards.defenderReputationChange,
      },
      topicBiasChange: rewards.topicBiasChange,
    };
  },
};
