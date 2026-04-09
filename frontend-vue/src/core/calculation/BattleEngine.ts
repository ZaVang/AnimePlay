import type { ClashInfo, BattleContext } from '@/types/battle';
import { StrengthCalculator } from './StrengthCalculator';
import { RewardCalculator, type RewardResult } from './RewardCalculator';
import { useGameStore } from '@/stores/battle';
import { SkillSystem } from '@/core/systems/SkillSystem';
import { systemRegistry } from '@/core/di/registry';

export interface ClashResult {
  rewards: RewardResult;
  attackerStrength: number;
  defenderStrength: number;
}

export const BattleEngine = {
  /**
   * Resolves a clash. In a real game context, it builds the context from stores.
   * In a test context, the caller can provide a pre-built clash object.
   */
  resolveClash(clash: ClashInfo): ClashResult {
    const { attackingCard, defendingCard, attackerId, defenderId } = clash;
    const gameStore = useGameStore();

    // 1. Snapshot the environment into a Context
    // This part is the "Bridge" between global state and pure logic
    const context: BattleContext = {
      topicBias: gameStore.topicBias,
      attackerAuraBonus: SkillSystem.getAuraStrengthBonus(attackingCard, attackerId),
      defenderAuraBonus: defendingCard && defenderId ? SkillSystem.getAuraStrengthBonus(defendingCard, defenderId) : 0
    };

    // Add persistent system bonuses to the context
    try {
      const persistentSystem = systemRegistry.getPersistentEffectSystem();
      context.attackerAuraBonus = (context.attackerAuraBonus || 0) + persistentSystem.getStrengthBonus(attackerId, attackingCard.synergy_tags || []);
      if (defendingCard && defenderId) {
        context.defenderAuraBonus = (context.defenderAuraBonus || 0) + persistentSystem.getStrengthBonus(defenderId, defendingCard.synergy_tags || []);
      }
    } catch (e) {
      // Ignore if system is not available
    }

    // 2. Perform calculations using the pure calculators + context
    const attackerStrength = StrengthCalculator.calculateFinalStrength(attackingCard, attackerId, context);
    const defenderStrength = StrengthCalculator.calculateFinalStrength(defendingCard, defenderId, context);

    const finalClashInfo: ClashInfo = {
      ...clash,
      attackerStrength,
      defenderStrength,
    };
    
    const rewards = RewardCalculator.calculateRewards(finalClashInfo);

    return {
      rewards,
      attackerStrength,
      defenderStrength,
    };
  },
};