/**
 * 秋山澪 (Akiyama Mio) Skills
 * From: K-On!
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 贝斯节奏 - 本回合每打出音乐卡牌，下张卡牌成本-1
 */
const 贝斯节奏: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加效果：本回合内每打出一张音乐类卡牌，下张卡牌成本-1
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'bass_rhythm',
    duration: 1, // 本回合有效
    data: { musicCardCount: 0, costReduction: 0 },
    description: '贝斯节奏：音乐卡牌连击减费',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '贝斯节奏',
        '音乐卡牌连击减费'
      );
    }
  });
};

/**
 * 学霸气质 - 声望优势时卡牌+1强度
 */
const 学霸气质: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
    const helpers = getEffectHelpers(ctx);
    const opponentId = helpers.getOpponentId(ctx.playerId);
    
    if (helpers.playerStore[ctx.playerId].reputation >= helpers.playerStore[opponentId].reputation) {
      ctx.addStrengthBonus(1);
      console.log('学霸气质：声望优势，卡牌+1强度');
    }
  }
};

/**
 * Export Akiyama Mio skills
 */
export const akiyamaMioSkills = {
  '秋山澪_贝斯节奏': 贝斯节奏,
  '秋山澪_学霸气质': 学霸气质
};