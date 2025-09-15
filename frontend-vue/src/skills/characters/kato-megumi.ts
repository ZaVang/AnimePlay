/**
 * 加藤惠 (Kato Megumi) Skills
 * From: Saenai Heroine no Sodatekata
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 存在感消失 - 恋爱卡牌成本降低，隐藏手牌
 */
const 存在感消失: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  // 己方恋爱类卡牌成本-1
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '恋爱',
    bonusType: 'cost',
    amount: 1,
    duration: 1,
    description: '存在感消失：恋爱卡牌成本-1'
  });
  
  // 本回合对手无法查看己方手牌
  persistentSystem.addEffect({
    playerId: opponentId,
    type: 'hand_visibility_blocked',
    duration: 1,
    data: { targetPlayerId: ctx.playerId },
    description: '存在感消失：无法查看对手手牌'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '存在感消失',
    '恋爱卡牌成本-1，手牌隐藏'
  );
  
  helpers.gameStore.addNotification('存在感消失：恋爱卡牌-1费用', 'info');
};

/**
 * 平凡魅力 - 日常卡牌随机获得TP
 */
const 平凡魅力: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('日常')) {
    const helpers = getEffectHelpers(ctx);
    
    // 50%几率获得1TP
    if (Math.random() < 0.5) {
      helpers.playerStore.changeTp(ctx.playerId, 1);
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '平凡魅力',
        '打出日常卡牌，获得1TP'
      );
    }
  }
};

/**
 * Export Kato Megumi skills
 */
export const katoMegumiSkills = {
  '加藤惠_存在感消失': 存在感消失,
  '加藤惠_平凡魅力': 平凡魅力
};