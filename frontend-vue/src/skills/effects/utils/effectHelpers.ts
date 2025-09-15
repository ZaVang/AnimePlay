/**
 * Common helper functions for skill effects
 */

import { usePlayerStore, useHistoryStore, useGameStore } from '@/stores/battle';
import type { EffectContext } from '@/types/effects';
import { systemRegistry } from '@/core/di/registry';

export interface EffectHelpers {
  playerStore: ReturnType<typeof usePlayerStore>;
  historyStore: ReturnType<typeof useHistoryStore>;
  gameStore: ReturnType<typeof useGameStore>;
  persistentSystem: ReturnType<typeof systemRegistry.getPersistentEffectSystem>;
  getOpponentId: (playerId: 'playerA' | 'playerB') => 'playerA' | 'playerB';
  getPlayerName: (playerId: 'playerA' | 'playerB') => string;
}

/**
 * Get common helper objects for skill effects
 */
export function getEffectHelpers(ctx: EffectContext): EffectHelpers {
  const playerStore = usePlayerStore();
  const historyStore = useHistoryStore();
  const gameStore = useGameStore();
  const persistentSystem = systemRegistry.getPersistentEffectSystem();

  const getOpponentId = (playerId: 'playerA' | 'playerB') => 
    playerId === 'playerA' ? 'playerB' : 'playerA';

  const getPlayerName = (playerId: 'playerA' | 'playerB') =>
    playerId === 'playerA' ? playerStore.playerA.name : playerStore.playerB.name;

  return {
    playerStore,
    historyStore,
    gameStore,
    persistentSystem,
    getOpponentId,
    getPlayerName
  };
}

/**
 * Common effect patterns
 */
export const EffectPatterns = {
  /**
   * Add temporary strength bonus for specified duration
   */
  addStrengthBonus(helpers: EffectHelpers, playerId: 'playerA' | 'playerB', amount: number, duration: number = 1, description?: string) {
    helpers.persistentSystem.addTemporaryBonus({
      playerId,
      bonusType: 'strength',
      amount,
      duration,
      description: description || `强度+${amount} (${duration}回合)`
    });
  },

  /**
   * Add temporary cost reduction for specified card type
   */
  addCostReduction(helpers: EffectHelpers, playerId: 'playerA' | 'playerB', cardType: string, amount: number, duration: number = 1) {
    helpers.persistentSystem.addCardTypeCostReduction(playerId, cardType, amount, duration);
  },

  /**
   * Add restriction to player
   */
  addRestriction(helpers: EffectHelpers, playerId: 'playerA' | 'playerB', restrictionType: string, data: any, duration: number = 1) {
    helpers.persistentSystem.addRestriction(playerId, restrictionType, data, duration);
  },

  /**
   * Log skill activation with notification
   */
  logSkillActivation(helpers: EffectHelpers, playerId: 'playerA' | 'playerB', skillName: string, description: string) {
    const name = helpers.getPlayerName(playerId);
    helpers.historyStore.addLog(`${name} ${skillName}：${description}`, 'info');
    helpers.gameStore.addNotification(`${skillName}：${description}`, 'info');
  }
};

export type SkillEffect = (ctx: EffectContext) => void | Promise<void>;