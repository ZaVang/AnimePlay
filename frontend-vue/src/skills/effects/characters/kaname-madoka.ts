/**
 * 鹿目圆 (Kaname Madoka) Skills
 * From: Puella Magi Madoka Magica
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';

/**
 * 希望之光 - 双方声望各+3，己方议题偏向+1
 */
const 希望之光: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  // 双方声望各+3，己方议题偏向+1
  helpers.playerStore.changeReputation(ctx.playerId, 3);
  helpers.playerStore.changeReputation(opponentId, 3);
  const delta = ctx.playerId === 'playerA' ? 1 : -1;
  helpers.gameStore.updateTopicBias(delta);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '希望之光',
    '双方声望+3，己方议题+1'
  );
};

/**
 * 圆环理 - 对手声望≤5时卡牌强度+2
 */
const 圆环理: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
    const helpers = getEffectHelpers(ctx);
    const opponentId = helpers.getOpponentId(ctx.playerId);
    
    if (helpers.playerStore[opponentId].reputation <= 5) {
      ctx.addStrengthBonus(ctx.role, 2);
      console.log('圆环理：对手危机，卡牌强度+2');
    }
  }
};

/**
 * Export Kaname Madoka skills
 */
export const kanameMadokaSkills = {
  '鹿目圆_希望之光': 希望之光,
  '鹿目圆_圆环理': 圆环理
};