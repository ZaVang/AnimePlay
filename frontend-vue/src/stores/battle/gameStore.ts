import { defineStore } from 'pinia';
import type { GameState, ClashInfo } from '@/types/battle'; // Assuming ClashInfo is in battle types
import type { Notification } from '@/types';

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
      }, 3000);
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
  },
  getters: {
    isGameOver: (state) => state.phase === 'game_over',
    opponentId: (state): 'playerA' | 'playerB' => {
      return state.activePlayer === 'playerA' ? 'playerB' : 'playerA';
    },
    isSetupPhase: (state) => state.phase === 'setup',
  },
});