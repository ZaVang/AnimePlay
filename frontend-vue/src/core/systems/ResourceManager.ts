import type { PlayerState } from '@/types';

/**
 * Manages player resources like TP and cards.
 * This is a stateless service, it operates on the state provided to it.
 */
export const ResourceManager = {
  /**
   * Restores TP for a player at the start of their turn based on the current round.
   * @param player - The player state.
   * @param turn - The current turn number.
   * @returns The new TP amount.
   */
  restoreTpForNewTurn(player: PlayerState, turn: number): { newTp: number, newMaxTp: number } {
    // On turn 1, use the initial maxTp. For subsequent turns, increment it.
    const newMaxTp = turn > 1 ? player.maxTp + 1 : player.maxTp;
    
    // At the start of the turn, TP is fully restored to the new max TP.
    const newTp = newMaxTp;
    
    return { newTp, newMaxTp };
  },

  /**
   * Spends TP for an action.
   * @param player - The player state.
   * @param amount - The amount of TP to spend.
   * @returns The new TP amount, or null if not enough TP.
   */
  spendTp(player: PlayerState, amount: number): number | null {
    if (player.tp >= amount) {
      return player.tp - amount;
    }
    return null; // Not enough TP
  },

  /**
   * Adds TP to a player.
   * @param player - The player state.
   * @param amount - The amount of TP to add.
   * @returns The new TP amount.
   */
  gainTp(player: PlayerState, amount: number): number {
    return Math.min(player.tp + amount, player.maxTp);
  },

  /**
   * Draws a number of cards from the deck to the hand.
   * @param player - The player state.
   * @param count - The number of cards to draw.
   * @returns The updated player state, or the original state if unable to draw.
   */
  drawCards(player: PlayerState, count: number): PlayerState {
    const deck = [...player.deck];
    const hand = [...player.hand];
    
    if (deck.length < count) {
      console.warn(`${player.id} has insufficient cards to draw ${count}.`);
      // Optional: implement fatigue or deck reshuffling later
      return player;
    }

    for (let i = 0; i < count; i++) {
      if (hand.length >= 10) {
        console.warn(`${player.id} has a full hand (10 cards). Cannot draw more.`);
        break;
      }
      const card = deck.pop();
      if (card) {
        hand.push(card);
      }
    }

    return { ...player, deck, hand };
  },

  /**
   * Discards a card from the hand.
   * @param player - The player state.
   * @param cardId - The ID of the card to discard.
   * @returns The updated player state.
   */
  discardCard(player: PlayerState, cardId: string): PlayerState {
    const numericCardId = parseInt(cardId, 10);
    if (isNaN(numericCardId)) {
      console.error("Invalid cardId provided for discard:", cardId);
      return player;
    }

    const hand = player.hand.filter(c => c.id !== numericCardId);
    const discardedCard = player.hand.find(c => c.id === numericCardId);
    const discardPile = discardedCard ? [...player.discardPile, discardedCard] : [...player.discardPile];

    if (!discardedCard) {
      console.warn(`Card with ID ${cardId} not found in hand of player ${player.id}`);
    }

    return { ...player, hand, discardPile };
  },

  /**
   * Shuffles the player's deck using improved Fisher-Yates algorithm.
   * @param player - The player state.
   * @returns The updated player state with a shuffled deck.
   */
  shuffleDeck(player: PlayerState): PlayerState {
    const deck = [...player.deck];
    
    // Enhanced Fisher-Yates shuffle with better randomness
    for (let i = deck.length - 1; i > 0; i--) {
      // Use crypto.getRandomValues for better randomness if available
      let randomValue;
      if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
        const randomArray = new Uint32Array(1);
        window.crypto.getRandomValues(randomArray);
        randomValue = randomArray[0] / (0xFFFFFFFF + 1); // Convert to 0-1 range
      } else {
        randomValue = Math.random();
      }
      
      const j = Math.floor(randomValue * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    
    return { ...player, deck };
  },
};
