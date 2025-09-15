/**
 * 赫萝 (Holo) Skills
 * From: Spice and Wolf
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 商业智慧 - 查看对手手牌及卡组中最高成本的卡牌，复制其效果到己方下张手牌
 */
const 商业智慧: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const interactionSystem = systemRegistry.getInteractionSystem();
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '商业智慧',
    '分析市场+复制效果'
  );
  
  // TODO: 实现查看对手手牌及卡组中最高成本的卡牌，复制其效果到己方下张手牌的复杂功能
  try {
    await interactionSystem.viewOpponentHand(ctx.playerId, {
      count: 3,
      source: 'hand',
      title: '商业智慧：分析市场'
    });
  } catch (error) {
    console.warn('Hand viewing not available:', error);
  }
  
  helpers.gameStore.addNotification('商业智慧：复制效果', 'info');
};

/**
 * 丰收之神 - 己方打出的卡牌每有一个协同标签，下张卡牌成本-1
 */
const 丰收之神: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event !== 'afterResolve') return;
  
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  const synergy_count = ctx.card?.synergy_tags?.length || 0;
  if (synergy_count > 0) {
    // TODO: 实现下张卡牌成本-synergy_count的功能
    persistentSystem.addEffect({
      playerId: ctx.playerId,
      type: 'next_card_cost_reduction',
      duration: 1,
      data: { costReduction: synergy_count },
      description: `贤狼协商：下张卡牌成本-${synergy_count}`
    });
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '丰收之神',
      `下张卡牌成本-${synergy_count}`
    );
  }
};

/**
 * Export Holo skills
 */
export const holoSkills = {
  '赫萝_商业智慧': 商业智慧,
  '赫萝_丰收之神': 丰收之神
};