import { defineStore } from 'pinia';
import type { BattleLogMessage } from '@/types/battle';

export const useHistoryStore = defineStore('history', {
  state: () => ({
    log: [] as BattleLogMessage[],
  }),
  actions: {
    addLog(message: string, type: 'event' | 'clash' | 'damage' | 'info' = 'info') {
      const newLog: BattleLogMessage = {
        id: Date.now() + Math.random(),
        turn: 0, // We can get this from gameStore if needed
        message,
        type,
      };
      this.log.unshift(newLog); // Add to the beginning of the array

      // Optional: Limit log size
      if (this.log.length > 50) {
        this.log.pop();
      }
    },
    clearLog() {
      this.log = [];
    },
  },
});
