import type { Card } from '@/types';
import type { BattleContext } from '@/types/battle';
import { useGameStore } from '@/stores/battle';
import { SkillSystem } from '@/core/systems/SkillSystem';
import { systemRegistry } from '@/core/di/registry';

export const StrengthCalculator = {
  /**
   * Calculates the final strength of an anime card in a clash.
   * Now supports an optional BattleContext for pure functional testing.
   */
  calculateFinalStrength(card: Card | undefined, playerId: 'playerA' | 'playerB', context?: BattleContext): number {
    if (!card) return 0;

    let finalStrength = card.points || 0;

    // 1. Apply Aura/Passive bonuses (Prefer context if provided)
    if (context) {
      const auraBonus = playerId === 'playerA' ? context.attackerAuraBonus : context.defenderAuraBonus;
      finalStrength += (auraBonus || 0);
    } else {
      // Fallback to legacy global system calls
      finalStrength += SkillSystem.getAuraStrengthBonus(card, playerId);
      try {
        finalStrength += systemRegistry.getPersistentEffectSystem().getStrengthBonus(playerId, card.synergy_tags || []);
      } catch (error) {
        console.warn('PersistentEffectSystem not available in StrengthCalculator:', error);
      }
    }

    return finalStrength;
  }
};