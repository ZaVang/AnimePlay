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

// === Effect Descriptions ===

export type EffectId =
  | 'DRAW_1'
  | 'STRENGTH_PLUS_2'
  | 'GAIN_TP_2'
  | 'GAIN_TP_1'
  | 'NEXT_CARD_ANY_TYPE'
  | 'BIAS_HALVE_OPP'
  | 'STRENGTH_PLUS_1'
  | 'TOPIC_BIAS_PLUS_1'
  | 'AURA_GENRE_EXPERT'
  | (string & {});

export type TriggerId = 'onPlay' | 'beforeResolve' | 'afterResolve' | (string & {});

const effectTextMap: Record<string, string> = {
  DRAW_1: '抽1张牌',
  STRENGTH_PLUS_2: '强度+2',
  GAIN_TP_2: '恢复2点TP',
  GAIN_TP_1: '恢复1点TP',
  NEXT_CARD_ANY_TYPE: '下一张卡视为任意类型',
  BIAS_HALVE_OPP: '削减对手议题优势一半（向下取整）',
  STRENGTH_PLUS_1: '强度+1',
  TOPIC_BIAS_PLUS_1: '议题偏向+1（向己方）',
  AURA_GENRE_EXPERT: '打出同类型动画卡时，额外+1强度',
};

const triggerTextMap: Record<string, string> = {
  onPlay: '打出时',
  beforeResolve: '结算前',
  afterResolve: '结算后',
};

/**
 * 获取效果描述文本
 */
export function getEffectText(effectId: string): string {
  return effectTextMap[effectId] || effectId;
}

/**
 * 获取触发时机描述文本
 */
export function getTriggerText(trigger: string): string {
  return triggerTextMap[trigger] || trigger;
}