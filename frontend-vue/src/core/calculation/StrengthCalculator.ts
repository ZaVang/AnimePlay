import { useGameStore, usePlayerStore } from '@/stores/battle';
import type { Card } from '@/types';

// A simple function to get all active passive skills from both players
function getActiveAuras(): Card['skills'] {
  const playerStore = usePlayerStore();
  const allAuras = [];

  const playerA = playerStore.playerA;
  const playerB = playerStore.playerB;

  // Get auras from all characters on the field for both players
  for (const char of [...playerA.characters, ...playerB.characters]) {
    if (char.skills) {
      for (const skill of char.skills) {
        if (skill.type === '被动光环') {
          allAuras.push(skill);
        }
      }
    }
  }

  return allAuras;
}

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
    const bias = gameStore.topicBias;
    if (playerId === 'playerA' && bias > 0) {
      finalStrength += bias;
    } else if (playerId === 'playerB' && bias < 0) {
      finalStrength += Math.abs(bias);
    }

    // 2. Apply passive aura effects
    const auras = getActiveAuras();
    for (const aura of auras) {
      // Example: Konata's aura
      if (aura.id === 'KONATA_LUCKY' && card.synergy_tags?.includes('日常')) {
        // This is a simple implementation. We might need a more robust effect system later.
        finalStrength += 1;
      }
      // Add other auras here
    }

    return finalStrength;
  }
};