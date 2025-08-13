import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import { BattleController } from '../battle/BattleController';
import { useSettingsStore } from '@/stores/settings';

export const AIController = {
  /**
   * The AI's main turn logic.
   */
  takeTurn() {
    const gameStore = useGameStore();
    const playerStore = usePlayerStore();
    const historyStore = useHistoryStore();
    const settingsStore = useSettingsStore();
    const aiPlayer = playerStore.playerB;

    historyStore.addLog(`${aiPlayer.name} 正在思考...`, 'info');

    const delay = settingsStore.getBattleDelay('aiThink');
    setTimeout(() => {
      // AI finds all cards it can afford to play
      const playableCards = aiPlayer.hand.filter(card => (card.cost || 0) <= aiPlayer.tp);

      if (playableCards.length > 0) {
        // Choose a random card from the playable ones
        const cardToPlay = playableCards[Math.floor(Math.random() * playableCards.length)];
        
        // Simple choice: always use the cheaper '友好安利' style for now
        const style = '友好安利';
        historyStore.addLog(`${aiPlayer.name} 打出了 [${cardToPlay.name}]。`, 'clash');
        BattleController.initiateClash(cardToPlay.id, style);
      } else {
        // If no card can be played, end the turn
        historyStore.addLog(`${aiPlayer.name} 选择结束回合。`, 'event');
        BattleController.endTurn();
      }
    }, delay);
  },
};
