/**
 * Common helper functions for skill effects
 */

import { usePlayerStore, useHistoryStore, useGameStore } from '@/stores/battle';
import type { EffectContext, PlayerId } from '@/types/effects';
import { systemRegistry } from '@/core/di/registry';

export interface EffectHelpers {
  playerStore: ReturnType<typeof usePlayerStore>;
  historyStore: ReturnType<typeof useHistoryStore>;
  gameStore: ReturnType<typeof useGameStore>;
  persistentSystem: ReturnType<typeof systemRegistry.getPersistentEffectSystem>;
  interactionSystem: {
    viewOpponentHand: (playerId: PlayerId, options: any) => Promise<void>;
  };
  getOpponentId: (playerId: 'playerA' | 'playerB') => 'playerA' | 'playerB';
  getPlayerName: (playerId: 'playerA' | 'playerB') => string;
}

/**
 * Get common helper objects for skill effects
 * Refactored to use the standardized SkillAPI from context
 */
export function getEffectHelpers(ctx: EffectContext): EffectHelpers {
  const api = ctx.api;

  return {
    // Legacy mapping to new API methods
    playerStore: {
      drawCards: (playerId: 'playerA' | 'playerB', count: number) => api.drawCards(playerId, count),
      changeTp: (playerId: 'playerA' | 'playerB', amount: number) => api.changeTp(playerId, amount),
      discardCardFromHand: (playerId: 'playerA' | 'playerB', cardId: string) => api.discardCard(playerId, cardId),
    } as any,
    historyStore: {
      addLog: (msg: string, type?: string) => api.addLog(msg, type as any),
    } as any,
    gameStore: {
      addNotification: (msg: string, type?: string) => api.addNotification(msg, type as any),
    } as any,
    persistentSystem: {
      addTemporaryBonus: (params: any) => api.addTemporaryBonus({ ...params, bonusType: 'strength' }),
      addCardTypeStrengthBonus: (pId: any, type: string, amt: number, dur: number) => 
        api.addTemporaryBonus({ playerId: pId, cardType: type, amount: amt, duration: dur, bonusType: 'strength', description: '类型强化' }),
      addCardTypeCostReduction: (pId: any, type: string, amt: number, dur: number) => 
        api.addTemporaryBonus({ playerId: pId, cardType: type, amount: amt, duration: dur, bonusType: 'cost', description: '费用减免' }),
    } as any,
    interactionSystem: {
      viewOpponentHand: (pId: PlayerId, opts: any) => api.viewOpponentHand(pId, opts),
    },
    getOpponentId: (playerId: 'playerA' | 'playerB') => api.getOpponentId(playerId),
    getPlayerName: (playerId: 'playerA' | 'playerB') => api.getPlayerName(playerId)
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
    // 移除技能激活的弹窗通知，效果已通过被动技能面板和卡牌实时显示展现
    // helpers.gameStore.addNotification(`${skillName}：${description}`, 'info');
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