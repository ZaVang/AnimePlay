/**
 * 千反田爱瑠 (Chitanda Eru) Skills  
 * From: Hyouka
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 好奇探究 - 抽牌并检查校园类卡牌
 */
const 好奇探究: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  
  // 抽2张牌
  helpers.playerStore.drawCards(ctx.playerId, 2);
  
  // 检查新抽到的牌中是否有校园类卡牌
  const hand = helpers.playerStore[ctx.playerId].hand;
  const hasSchoolCard = hand.slice(-2).some(card => card.synergy_tags?.includes('校园'));
  
  if (hasSchoolCard) {
    // 如果抽到校园类卡牌，额外抽1张牌
    helpers.playerStore.drawCards(ctx.playerId, 1);
    helpers.gameStore.addNotification('好奇探究：校园卡牌额外抽牌', 'info');
  }
  
  // TODO: 实现让玩家选择弃牌的功能，这里简化为自动弃掉第一张
  if (hand.length > 0) {
    const discardedCard = hand.splice(0, 1)[0];
  }
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '好奇探究',
    `抽2张牌${hasSchoolCard ? '（校园类额外+1张）' : ''}，然后弃1张`
  );
};

/**
 * 大小姐魅力 - 对手友好安利时获得声望
 */
const 大小姐魅力: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现对手使用友好安利时己方声望+1的被动效果
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'ojousama_charm',
    duration: -1,
    data: { reputationBonus: 1 },
    description: '大小姐魅力：对手友好安利时己方声望+1',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '大小姐魅力',
        '对手友好安利时己方声望+1'
      );
    }
  });
};

/**
 * Export Chitanda Eru skills
 */
export const chitandaEruSkills = {
  '千反田爱瑠_好奇探究': 好奇探究,
  '千反田爱瑠_大小姐魅力': 大小姐魅力
};