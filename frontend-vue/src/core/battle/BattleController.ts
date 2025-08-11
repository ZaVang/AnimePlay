import { useGameStore, usePlayerStore } from '@/stores/battle';
import type { Card } from '@/types';
import { BattleEngine } from '../calculation/BattleEngine';
import { TurnManager } from './TurnManager';

// This will be expanded to include defense info later
export interface ClashInfo {
  attackerId: 'playerA' | 'playerB';
  attackingAnime: Card;
  attackStyle: '友好安利' | '辛辣点评';
  defenderId?: 'playerA' | 'playerB';
  defendingAnime?: Card;
  defenseStyle?: '赞同' | '反驳';
}

export const BattleController = {
  /**
   * Initiates a clash (an attack).
   * @param animeId - The ID of the anime card being used.
   * @param style - The style of the attack.
   */
  initiateClash(animeId: number, style: '友好安利' | '辛辣点评') {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const attackerId = gameStore.activePlayer;
    const attacker = playerStore[attackerId];

    // 1. Find the anime card in hand
    const attackingAnime = attacker.hand.find(a => a.id === animeId);
    if (!attackingAnime) {
      console.error(`Anime with ID ${animeId} not found in ${attackerId}'s hand.`);
      return;
    }

    // 2. Check for TP cost
    const styleCost = style === '辛辣点评' ? 1 : 0;
    const totalCost = (attackingAnime.cost || 1) + styleCost;
    
    if (attacker.tp < totalCost) {
      console.error(`Not enough TP for this action.`);
      return;
    }

    // 3. Spend TP and discard the card
    playerStore.changeTp(attackerId, -totalCost);
    playerStore.discardCardFromHand(attackerId, animeId);

    // 4. Set game phase to defense and wait for opponent
    gameStore.setPhase('defense');
    console.log(`Clash initiated by ${attackerId}. Waiting for defense.`);

    // --- AI Auto-response ---
    if (gameStore.activePlayer === 'playerA') {
      setTimeout(() => {
        this.aiRespondToClash();
      }, 1500); // Wait 1.5 seconds to simulate AI "thinking"
    }
  },

  /**
   * AI automatically selects a card and defense style to respond to a clash.
   * This is a simplified logic.
   */
  aiRespondToClash() {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const defenderId = gameStore.opponentId;
    const defender = playerStore[defenderId];

    if (gameStore.phase !== 'defense') return;

    // AI Logic: Find the best card to defend with.
    // Simple logic: find the highest strength card the AI can afford.
    const affordableCards = defender.hand
      .filter(card => (card.cost || 1) <= defender.tp)
      .sort((a, b) => (b.points || 1) - (a.points || 1));

    if (affordableCards.length > 0) {
      const bestCard = affordableCards[0];
      // Simple logic: always choose '反驳' if possible
      const defenseStyle = (bestCard.cost || 1) + 1 <= defender.tp ? '反驳' : '赞同';
      this.respondToClash(bestCard.id, defenseStyle);
    } else {
      // AI has no affordable cards, must pass (logic to be implemented)
      console.log("AI has no valid card to play and passes.");
      // For now, let's assume the turn ends if AI can't respond.
      // This part needs to be connected to a "pass" or "no defense" flow.
      TurnManager.endTurn();
    }
  },

  /**
   * Responds to an ongoing clash.
   * @param defendingAnimeId - The ID of the anime card used for defense.
   * @param defenseStyle - The style of the defense.
   */
  respondToClash(defendingAnimeId: number, defenseStyle: '赞同' | '反驳') {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();

    const clashInfo: ClashInfo = (window as any).currentClash;
    if (!clashInfo) {
      console.error("No active clash to respond to.");
      return;
    }

    const defenderId = clashInfo.attackerId === 'playerA' ? 'playerB' : 'playerA';
    const defender = playerStore[defenderId];

    const defendingAnime = defender.hand.find(a => a.id === defendingAnimeId);
    if (!defendingAnime) {
      console.error(`Anime with ID ${defendingAnimeId} not found in ${defenderId}'s hand.`);
      return;
    }

    // TP Cost for defense
    const styleCost = defenseStyle === '反驳' ? 1 : 0;
    const totalCost = (defendingAnime.cost || 1) + styleCost;
    if (defender.tp < totalCost) {
      console.error(`Not enough TP for this defense.`);
      return;
    }
    
    playerStore.changeTp(defenderId, -totalCost);
    playerStore.discardCardFromHand(defenderId, defendingAnimeId);

    // Update clash info
    clashInfo.defenderId = defenderId;
    clashInfo.defendingAnime = defendingAnime;
    clashInfo.defenseStyle = defenseStyle;

    // Resolve the clash
    const results = BattleEngine.resolveClash(clashInfo);

    // Apply results
    playerStore.changeReputation(clashInfo.attackerId, results.reputationChange.attacker);
    playerStore.changeReputation(clashInfo.defenderId, results.reputationChange.defender);
    gameStore.updateTopicBias(results.topicBiasChange);

    // Check for victory
    TurnManager.checkVictoryConditions();

    // Reset for next action
    if (!gameStore.isGameOver) {
      gameStore.setPhase('action');
    }
    (window as any).currentClash = null;
    console.log(`${defenderId} has responded. The clash is resolved.`);
  }
};
