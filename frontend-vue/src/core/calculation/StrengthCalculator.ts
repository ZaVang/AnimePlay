import { useGameStore } from '@/stores/battle';
import type { Card } from '@/types';
import { SkillSystem } from '@/core/systems/SkillSystem';

// A simple function to get all active passive skills from both players
// Removed direct aura scan; delegated to SkillSystem

export const StrengthCalculator = {
  /**
   * Calculates the final strength of an anime card in a clash.
   * This now includes passive aura effects.
   * It safely handles cases where no card is played (e.g., a pass).
   */
  calculateFinalStrength(card: Card | undefined, playerId: 'playerA' | 'playerB'): number {
    // If no card is provided, strength is 0
    if (!card) {
      return 0;
    }

    const gameStore = useGameStore();

    let finalStrength = card.points || 0;

    // 1. Add base topic bias
    // const bias = gameStore.topicBias;
    // if (playerId === 'playerA' && bias > 0) {
    //   finalStrength += bias;
    // } else if (playerId === 'playerB' && bias < 0) {
    //   finalStrength += Math.abs(bias);
    // }

    // 2. Treat as any type if status consumed (simple heuristic: grants +1 if card有任意标签可触发的被动)
    // 已通过 SkillSystem.onCardPlayed 设置了临时标记 __treatedAsAnyType
    // 具体的“任何类型匹配策略”可在此扩展，这里仅让被动聚合阶段感知。
    if ((card as any).__treatedAsAnyType) {
      // 在 getAuraStrengthBonus 中会检查卡的标签，这里不修改标签，仅保留标记影响逻辑（如后续实现）
    }

    // 3. Apply passive aura effects via SkillSystem
    finalStrength += SkillSystem.getAuraStrengthBonus(card, playerId);

    return finalStrength;
  }
};