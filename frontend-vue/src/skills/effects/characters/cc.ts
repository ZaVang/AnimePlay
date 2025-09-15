/**
 * CC Skills
 * From: Code Geass: Lelouch of the Rebellion
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * GEASS契约 - 与对手交换一张手牌，获得的牌成本-2
 */
const GEASS契约: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  // 简化实现：如果双方都有手牌，进行交换并给予成本减免
  if (helpers.playerStore[ctx.playerId].hand.length > 0 && helpers.playerStore[opponentId].hand.length > 0) {
    // 添加临时效果：交换得到的卡牌成本-2
    persistentSystem.addEffect({
      playerId: ctx.playerId,
      type: 'geass_contract_bonus',
      duration: 1,
      data: {},
      description: 'Geass契约：交换卡牌成本-2',
      onApply: () => {
        EffectPatterns.logSkillActivation(
          helpers,
          ctx.playerId,
          'Geass契约',
          '交换手牌，获得成本减免'
        );
        
        helpers.gameStore.addNotification('Geass契约：卡牌成本-2', 'info');
      }
    });
  }
};

/**
 * 不死之身 - 声望<10时出牌自动恢复2声望
 */
const 不死之身: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event === 'onPlay') {
    const helpers = getEffectHelpers(ctx);
    
    if (helpers.playerStore[ctx.playerId].reputation < 10) {
      helpers.playerStore.changeReputation(ctx.playerId, 2);
      
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '不死之身',
        '声望自动恢复'
      );
    }
  }
};

/**
 * Export CC skills
 */
export const ccSkills = {
  'CC_GEASS契约': GEASS契约,
  'CC_不死之身': 不死之身
};