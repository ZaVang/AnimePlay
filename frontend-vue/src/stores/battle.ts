import { defineStore } from 'pinia';
import type { PlayerState, AnimeCard, CharacterCard, Card } from '@/types';
import type { GameState, ClashInfo, Notification } from '@/types/battle';
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
  rotationsUsedThisTurn: 0,
});

// =============================================================================
// GAME STORE
// =============================================================================
export const useGameStore = defineStore('game', {
  state: (): GameState & { notifications: Notification[], clashInfo: ClashInfo | null } => ({
    turn: 1,
    activePlayer: 'playerA',
    phase: 'setup',
    topicBias: 0,
    winner: null,
    notifications: [],
    clashInfo: null, // State for the current battle clash
  }),
  actions: {
    addNotification(message: string, type: 'info' | 'warning' = 'info') {
      const id = Date.now();
      this.notifications.push({ id, message, type });
      setTimeout(() => {
        this.removeNotification(id);
      }, 1000);
    },
    removeNotification(id: number) {
      this.notifications = this.notifications.filter(n => n.id !== id);
    },
    startGame() {
      this.turn = 1;
      this.activePlayer = 'playerA';
      this.phase = 'draw';
      this.topicBias = 0;
      this.clashInfo = null; // Reset clash info on new game
      console.log('Game started!');
    },
    nextTurn() {
      this.turn++;
      this.activePlayer = this.activePlayer === 'playerA' ? 'playerB' : 'playerA';
      this.phase = 'draw';
      this.clashInfo = null; // Clear clash info at the end of a turn
      console.log(`Turn ${this.turn}, ${this.activePlayer}'s turn.`);
    },
    setPhase(phase: GameState['phase']) {
      this.phase = phase;
      console.log(`Phase changed to: ${phase}`);
    },
    updateTopicBias(change: number) {
      const newBias = this.topicBias + change;
      this.topicBias = Math.max(-10, Math.min(10, newBias));
    },
    setWinner(winner: 'playerA' | 'playerB' | 'draw' | null) {
      this.winner = winner;
    },
    // Actions to manage the clash state
    setClash(clash: ClashInfo) {
      this.clashInfo = clash;
    },
    clearClash() {
      this.clashInfo = null;
    },
    // Reset game to initial state
    resetGame() {
      this.turn = 1;
      this.activePlayer = 'playerA';
      this.phase = 'setup';
      this.topicBias = 0;
      this.winner = null;
      this.clashInfo = null;
      this.notifications = [];
      console.log('Game state reset to initial values');
    },
  },
  getters: {
    isGameOver: (state) => state.phase === 'game_over',
    opponentId: (state): 'playerA' | 'playerB' => {
      return state.activePlayer === 'playerA' ? 'playerB' : 'playerA';
    },
    isSetupPhase: (state) => state.phase === 'setup',
  },
});

// =============================================================================
// PLAYER STORE
// =============================================================================
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

    // Set max TP for a specific player and clamp current TP if necessary
    setMaxTp(playerId: 'playerA' | 'playerB', value: number) {
      const player = this[playerId];
      player.maxTp = value;
      if (player.tp > value) {
        player.tp = value;
      }
    },

    // Sync both players' max TP to the same value
    syncBothPlayersMaxTp(newMax: number) {
      this.setMaxTp('playerA', newMax);
      this.setMaxTp('playerB', newMax);
    },

    // Restore TP to max for a specific player
    restoreTpToMax(playerId: 'playerA' | 'playerB') {
      this[playerId].tp = this[playerId].maxTp;
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

    // Set the active character for a player (with rotation limit)
    setActiveCharacter(playerId: 'playerA' | 'playerB', characterIndex: number): boolean {
      const player = this[playerId];
      
      // 检查轮换次数限制
      if (player.rotationsUsedThisTurn >= 1) {
        return false; // 超过轮换限制
      }
      
      if (characterIndex >= 0 && characterIndex < player.characters.length) {
        // 只有在实际改变主辩手时才增加轮换次数
        if (player.activeCharacterIndex !== characterIndex) {
          player.activeCharacterIndex = characterIndex;
          player.rotationsUsedThisTurn++;
          return true;
        }
        return true; // 没有改变，但不算错误
      }
      return false; // 索引无效
    },

    // 重置玩家的轮换次数（每回合开始时调用）
    resetRotationsForNewTurn(playerId: 'playerA' | 'playerB') {
      this[playerId].rotationsUsedThisTurn = 0;
    },

    // 检查玩家是否还能轮换
    canRotateCharacter(playerId: 'playerA' | 'playerB'): boolean {
      return this[playerId].rotationsUsedThisTurn < 1;
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
    },

    // Hand manipulation methods for complex interactions
    addCardToHand(playerId: 'playerA' | 'playerB', card: AnimeCard) {
      this[playerId].hand.push(card);
    },

    removeCardFromHand(playerId: 'playerA' | 'playerB', card: AnimeCard) {
      const hand = this[playerId].hand;
      const index = hand.findIndex(c => c.id === card.id);
      if (index !== -1) {
        hand.splice(index, 1);
      }
    },

    // Move card from deck top to specific position or hand
    moveCardFromDeck(playerId: 'playerA' | 'playerB', fromIndex: number, toHand: boolean = true) {
      const player = this[playerId];
      if (fromIndex >= 0 && fromIndex < player.deck.length) {
        const card = player.deck.splice(fromIndex, 1)[0];
        if (toHand) {
          player.hand.push(card);
        }
        return card;
      }
      return null;
    },

    // Reorder deck (for library manipulation effects)
    reorderDeckTop(playerId: 'playerA' | 'playerB', newOrder: AnimeCard[]) {
      const player = this[playerId];
      // Remove the cards from their current positions
      newOrder.forEach(card => {
        const index = player.deck.findIndex(c => c.id === card.id);
        if (index !== -1) {
          player.deck.splice(index, 1);
        }
      });
      // Add them back at the top in the specified order
      player.deck.unshift(...newOrder);
    },

    // Clear all player data and reset to defaults
    clearPlayers() {
      this.playerA = createDefaultPlayer('playerA', 'Player 1');
      this.playerB = createDefaultPlayer('playerB', 'Player 2');
      console.log('Player states cleared and reset to defaults');
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

// =============================================================================
// HISTORY STORE  
// =============================================================================
export const useHistoryStore = defineStore('battleHistory', {
  state: () => ({
    log: [] as string[],
  }),
  actions: {
    addEntry(entry: string) {
      this.log.push(entry);
      console.log(`[Battle Log] ${entry}`);
    },
    // Keep the old method name for compatibility
    addLog(entry: string) {
      this.addEntry(entry);
    },
    clearLog() {
      this.log = [];
    }
  }
});