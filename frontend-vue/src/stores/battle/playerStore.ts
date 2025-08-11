import { defineStore } from 'pinia';
import type { PlayerState, AnimeCard, CharacterCard, Card } from '@/types';
import { ResourceManager } from '@/core/systems/ResourceManager';

// Helper function to create a default player state
const createDefaultPlayer = (id: 'playerA' | 'playerB', name: string): PlayerState => ({
  id,
  name,
  reputation: 30,
  tp: 2,      // Start with 2 TP on turn 1
  maxTp: 2,   // Start with 2 max TP on turn 1
  hand: [],
  deck: [], // Should be populated at game start
  discardPile: [],
  characters: [], // Should be populated at game start
  activeCharacterIndex: 0,
  skillCooldowns: {},
  needsRotation: false,
});

export const usePlayerStore = defineStore('players', {
  state: () => ({
    playerA: createDefaultPlayer('playerA', 'Player 1'),
    playerB: createDefaultPlayer('playerB', 'Player 2'),
  }),
  actions: {
    // Setup players with their decks and characters
    setupPlayers(
      playerA_deck: AnimeCard[], playerA_chars: CharacterCard[],
      playerB_deck: AnimeCard[], playerB_chars: CharacterCard[]
    ) {
      this.playerA.deck = [...playerA_deck];
      this.playerA.characters = [...playerA_chars];
      
      this.playerB.deck = [...playerB_deck];
      this.playerB.characters = [...playerB_chars];
    },

    // Shuffle deck for a specific player
    shuffleDeck(playerId: 'playerA' | 'playerB') {
      const player = this[playerId];
      const newState = ResourceManager.shuffleDeck(player);
      this[playerId] = { ...this[playerId], ...newState };
    },

    // Draw cards for a specific player
    drawCards(playerId: 'playerA' | 'playerB', count: number) {
      const player = this[playerId];
      const newState = ResourceManager.drawCards(player, count);
      this[playerId] = { ...this[playerId], ...newState };
    },

    // Discard a card from hand
    discardCardFromHand(playerId: 'playerA' | 'playerB', cardId: string) {
      const player = this[playerId];
      const newState = ResourceManager.discardCard(player, cardId);
      this[playerId] = { ...this[playerId], ...newState };
    },

    // Change reputation for a player
    changeReputation(playerId: 'playerA' | 'playerB', amount: number) {
      this[playerId].reputation += amount;
    },
    
    // Change TP for a player by a certain amount
    changeTp(playerId: 'playerA' | 'playerB', amount: number) {
      const player = this[playerId];
      const newTp = amount > 0 
        ? ResourceManager.gainTp(player, amount)
        : ResourceManager.spendTp(player, -amount);

      if (newTp !== null) {
        player.tp = newTp;
      } else {
        console.error(`${playerId} does not have enough TP to spend ${-amount}`);
      }
    },

    // Restore TP at the start of a new turn
    restoreTpForNewTurn(playerId: 'playerA' | 'playerB', turn: number) {
      const player = this[playerId];
      const { newTp, newMaxTp } = ResourceManager.restoreTpForNewTurn(player, turn);
      
      this.$patch(state => {
        state[playerId].tp = newTp;
        state[playerId].maxTp = newMaxTp;
      });
    },

    // Set the active character for a player
    setActiveCharacter(playerId: 'playerA' | 'playerB', characterIndex: number) {
      if (characterIndex >= 0 && characterIndex < this[playerId].characters.length) {
        this[playerId].activeCharacterIndex = characterIndex;
      }
    },

    // Flag a player for character rotation in the next turn
    flagForRotation(playerId: 'playerA' | 'playerB') {
      this[playerId].needsRotation = true;
    },

    // Reduce all skill cooldowns for a player by 1
    reduceSkillCooldowns(playerId: 'playerA' | 'playerB') {
      const player = this[playerId];
      const newCooldowns: Record<string, number> = {};
      for (const skillId in player.skillCooldowns) {
        const remaining = player.skillCooldowns[skillId] - 1;
        if (remaining > 0) {
          newCooldowns[skillId] = remaining;
        }
      }
      player.skillCooldowns = newCooldowns;
    },
    setSkillCooldown(playerId: 'playerA' | 'playerB', skillId: string, duration: number) {
      this[playerId].skillCooldowns[skillId] = duration;
    }
  },
  getters: {
    // Get a player's state by their ID
    getPlayerById: (state) => (id: 'playerA' | 'playerB'): PlayerState => {
      return state[id];
    },
    // Get the active character for a player
    getActiveCharacter: (state) => (id: 'playerA' | 'playerB'): Card | null => {
      const player = state[id];
      return player.characters[player.activeCharacterIndex] || null;
    },
    getSkillCooldown: (state) => (playerId: 'playerA' | 'playerB', skillId: string): number => {
      return state[playerId].skillCooldowns[skillId] || 0;
    }
  }
});
