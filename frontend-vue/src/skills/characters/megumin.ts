/**
 * 惠惠 (Megumin) Skills
 * From: KonoSuba
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 爆裂魔法 - 议题偏向+4，但下回合exhausted无法使用卡牌
 */
const 爆裂魔法: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 造成巨大议题偏向变化+4
  const delta = ctx.playerId === 'playerA' ? 4 : -4;
  helpers.gameStore.updateTopicBias(delta);
  
  // 下回合无法使用任何卡牌（exhausted状态）
  persistentSystem.addRestriction(ctx.playerId, 'exhausted', { cannotPlayCards: true }, 1);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '爆裂魔法',
    '巨大议题冲击+4，但下回合exhausted！'
  );
  
  helpers.gameStore.addNotification('爆裂魔法：下回合exhausted', 'warning');
};

/**
 * 爆裂专精 - 使用奇幻卡牌后议题偏向额外+1
 */
const 爆裂专精: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event === 'afterResolve' && ctx.card?.synergy_tags?.includes('奇幻')) {
    const helpers = getEffectHelpers(ctx);
    const delta = ctx.playerId === 'playerA' ? 1 : -1;
    helpers.gameStore.updateTopicBias(delta);
    
    console.log('爆裂专精：奇幻卡牌议题偏向效果+1');
  }
};

/**
 * Export Megumin skills
 */
export const meguminSkills = {
  '惠惠_爆裂魔法': 爆裂魔法,
  '惠惠_爆裂专精': 爆裂专精
};