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
    const newMaxTp = turn + 1;
    // According to the rules, TP is restored to the new max TP at the start of the turn.
    const newTp = Math.min(player.tp + newMaxTp, newMaxTp);
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
    const hand = player.hand.filter(c => c.id !== cardId);
    const discardedCard = player.hand.find(c => c.id === cardId);
    const discardPile = discardedCard ? [...player.discardPile, discardedCard] : [...player.discardPile];

    return { ...player, hand, discardPile };
  },

  /**
   * Shuffles the player's deck.
   * @param player - The player state.
   * @returns The updated player state with a shuffled deck.
   */
  shuffleDeck(player: PlayerState): PlayerState {
    const deck = [...player.deck];
    // Fisher-Yates shuffle algorithm
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return { ...player, deck };
  },
};
