import { useGameStore } from '@/stores/battle';
import type { PlayerState, Card } from '@/types';

export const StrengthCalculator = {
  /**
   * Calculates the final strength of a player's argument in a clash.
   * @param player - The state of the player making the argument.
   * @param card - The card being used.
   * @returns The final calculated strength.
   */
  calculateFinalStrength(player: PlayerState, card: Card): number {
    const gameStore = useGameStore();
    let finalStrength = card.points || 1;

    // 1. Add bonus from Topic Bias
    const topicBias = gameStore.topicBias;
    const playerBiasSide = player.id === 'playerA' ? 1 : -1; // playerA is positive, playerB is negative

    if (topicBias * playerBiasSide >= 9) {
      // This is a simplification. The real rule is "该方向所有技能CD-1", not a strength bonus.
      // We will handle that in the SkillSystem later. For now, let's give a strength bonus.
      finalStrength += 3;
    } else if (topicBias * playerBiasSide >= 7) {
      // This is a simplification. The real rule is "+1TP per turn".
      // We will handle that in the TurnManager later. For now, let's give a strength bonus.
      finalStrength += 2;
    } else if (topicBias * playerBiasSide >= 5) {
      finalStrength += 2;
    } else if (topicBias * playerBiasSide >= 3) {
      finalStrength += 1;
    }

    // 2. TODO: Add bonus from character passive auras

    // 3. TODO: Add bonus from character synergies

    // 4. TODO: Add bonus/malus from status effects

    console.log(`[StrengthCalc] ${player.id}: Base(${card.points || 1}) -> Final(${finalStrength})`);

    return finalStrength;
  },
};
