/**
 * 惣流·明日香·兰格雷 (Asuka Langley Soryu) Skills
 * From: Neon Genesis Evangelion
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 同步率爆发 - 科幻卡牌强度暴增
 */
const 同步率爆发: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现本回合科幻类卡牌+4强度，但下回合无法使用技能的功能
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '科幻',
    bonusType: 'strength',
    amount: 4,
    duration: 1,
    description: '同步率爆发：科幻卡牌+4强度'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '同步率爆发',
    '科幻卡牌+4强度，但下回合无法使用技能'
  );
  
  helpers.gameStore.addNotification('同步率爆发：科幻+4强度', 'info');
};

/**
 * 驾驶员骄傲 - 优势时强度增强
 */
const 驾驶员骄傲: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
    const helpers = getEffectHelpers(ctx);
    const opponentId = helpers.getOpponentId(ctx.playerId);
    
    if (helpers.playerStore[ctx.playerId].reputation > helpers.playerStore[opponentId].reputation) {
      ctx.addStrengthBonus(ctx.role, 1);
      console.log('驾驶员骄傲：声望优势，卡牌+1强度');
    }
  }
};

/**
 * Export Asuka Langley skills
 */
export const asukaLangleySkills = {
  '惣流_明日香_兰格雷_同步率爆发': 同步率爆发,
  '惣流_明日香_兰格雷_驾驶员骄傲': 驾驶员骄傲
};