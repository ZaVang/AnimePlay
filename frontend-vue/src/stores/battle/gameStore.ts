import { defineStore } from 'pinia';
import type { GameState } from '@/types';

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    turn: 1,
    activePlayer: 'playerA',
    phase: 'setup',
    topicBias: 0,
  }),
  actions: {
    // Example action to start the game
    startGame() {
      this.turn = 1;
      this.activePlayer = 'playerA';
      this.phase = 'draw';
      this.topicBias = 0;
      console.log('Game started!');
    },
    // Action to advance to the next turn
    nextTurn() {
      this.turn++;
      this.activePlayer = this.activePlayer === 'playerA' ? 'playerB' : 'playerA';
      this.phase = 'draw';
      console.log(`Turn ${this.turn}, ${this.activePlayer}'s turn.`);
    },
    // Action to change the game phase
    setPhase(phase: GameState['phase']) {
      this.phase = phase;
      console.log(`Phase changed to: ${phase}`);
    },
    // Action to update the topic bias
    updateTopicBias(change: number) {
      const newBias = this.topicBias + change;
      this.topicBias = Math.max(-10, Math.min(10, newBias)); // Clamp between -10 and 10
    },
  },
  getters: {
    isGameOver: (state) => state.phase === 'game_over',
    // Getter to check if it's the setup phase
    isSetupPhase: (state) => state.phase === 'setup',
  },
});
