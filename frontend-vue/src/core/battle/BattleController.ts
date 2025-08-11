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
      gameStore.addNotification('TP不足，无法出牌！', 'warning');
      return;
    }

    // 3. Spend TP and discard the card
    playerStore.changeTp(attackerId, -totalCost);
    playerStore.discardCardFromHand(attackerId, animeId.toString());

    // 4. Set game phase to defense and wait for opponent
    gameStore.setPhase('defense');
    
    // Store clash info globally for the UI to pick up
    const clashInfo: ClashInfo = {
      attackerId,
      attackingAnime,
      attackStyle: style,
    };
    (window as any).currentClash = clashInfo;

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
      // AI has no affordable cards, must pass
      console.log("AI has no valid card to play and will pass defense.");
      this.passDefense();
    }
  },

  /**
   * Allows the defending player to pass their turn without playing a card.
   */
  passDefense() {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const clashInfo = (window as any).currentClash as ClashInfo;
    if (!clashInfo) {
      console.error("No active clash to pass defense on.");
      return;
    }

    // Step 2: Resolve the clash using the pure BattleEngine
    const clashResult = BattleEngine.resolveClash(clashInfo);

    // Step 3: Apply results to the stores
    const { rewards, attackerStrength, defenderStrength } = clashResult;
    playerStore.changeReputation(clashInfo.attackerId, rewards.attackerReputationChange);
    if (clashInfo.defenderId) {
      playerStore.changeReputation(clashInfo.defenderId, rewards.defenderReputationChange);
    }
    gameStore.updateTopicBias(rewards.topicBiasChange);

    // For UI display purposes, update the clash info with final strengths
    (window as any).currentClash = {
      ...clashInfo,
      attackerStrength,
      defenderStrength,
    };

    // Step 4: Check for victory conditions
    TurnManager.checkVictoryConditions();
  },

  /**
   * Responds to an ongoing clash.
   * @param defendingAnimeId - The ID of the anime card used for defense.
   * @param defenseStyle - The style of the defense.
   */
  respondToClash(defendingAnimeId: number, defenseStyle: '赞同' | '反驳') {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();

    const clashInfo = (window as any).currentClash as ClashInfo;
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
      gameStore.addNotification('TP不足，无法响应！', 'warning');
      return;
    }
    
    playerStore.changeTp(defenderId, -totalCost);
    playerStore.discardCardFromHand(defenderId, defendingAnimeId.toString());

    // Update clash info
    clashInfo.defenderId = defenderId;
    clashInfo.defendingAnime = defendingAnime;
    clashInfo.defenseStyle = defenseStyle;

    // Resolve the clash
    const clashResult = BattleEngine.resolveClash(clashInfo);

    // Apply results
    const { rewards, attackerStrength, defenderStrength } = clashResult;
    playerStore.changeReputation(clashInfo.attackerId, rewards.attackerReputationChange);
    playerStore.changeReputation(clashInfo.defenderId, rewards.defenderReputationChange);
    gameStore.updateTopicBias(rewards.topicBiasChange);
    
    // For UI display purposes, update the clash info with final strengths
    (window as any).currentClash = {
      ...clashInfo,
      attackerStrength,
      defenderStrength,
    };

    // Clear the clash after a delay
    setTimeout(() => {
      (window as any).currentClash = null;
      TurnManager.checkVictoryConditions();
    }, 2000); // Show clash result for 2 seconds
  }
};
