import { systemRegistry } from '@/core/di/registry';
import type { AnimeCard } from '@/types/card';

/**
 * 费用计算器 - 计算卡牌的实际使用费用
 */
export const CostCalculator = {
  /**
   * 计算卡牌的最终费用（考虑所有减免效果）
   */
  calculateFinalCost(card: AnimeCard, playerId: 'playerA' | 'playerB'): number {
    const baseCost = card.cost || 0;

    try {
      const persistentSystem = systemRegistry.getPersistentEffectSystem();

      // 获取卡牌类型相关的费用减免
      const typeReduction = persistentSystem.getCostReduction(playerId, card.synergy_tags || []);

      // 获取下张卡牌的费用减免
      const nextCardReduction = persistentSystem.getNextCardCostModification(playerId);

      // 计算最终费用，但不能低于0
      const finalCost = Math.max(0, baseCost + typeReduction + nextCardReduction);

      return finalCost;
    } catch (error) {
      console.warn('PersistentEffectSystem not available in CostCalculator:', error);
      return baseCost;
    }
  },

  /**
   * 获取费用变化的信息
   */
  getCostModification(card: AnimeCard, playerId: 'playerA' | 'playerB'): {
    baseCost: number;
    finalCost: number;
    reduction: number;
    hasModification: boolean;
  } {
    const baseCost = card.cost || 0;
    const finalCost = this.calculateFinalCost(card, playerId);
    const reduction = baseCost - finalCost;

    return {
      baseCost,
      finalCost,
      reduction,
      hasModification: reduction > 0
    };
  }
};