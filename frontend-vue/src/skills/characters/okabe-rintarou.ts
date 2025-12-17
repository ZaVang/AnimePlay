/**
 * 冈部伦太郎 (Okabe Rintarou) Skills
 * From: Steins;Gate
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 命运探测 - 查看牌库顶5张牌，选择2张加入手牌
 */
const 命运探测: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const interactionSystem = systemRegistry.getInteractionSystem();
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '命运探测',
    '精选未来卡牌'
  );
  
  try {
    // TODO: 实现selectFromDeck方法，现在简化为直接抽牌
    // 直接抽2张牌代替选择机制
    helpers.playerStore.drawCards(ctx.playerId, 2);
    
    const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
    helpers.historyStore.addLog(`${name} 命运探测：从未来抽取2张卡牌。`, 'info');
    helpers.gameStore.addNotification('命运探测：精选卡牌', 'info');
    
  } catch (error) {
    console.warn('Deck selection not available:', error);
    // 降级处理：直接抽2张牌
    helpers.playerStore.drawCards(ctx.playerId, 2);
    
    const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
    helpers.historyStore.addLog(`${name} 命运探测：从未来抽取2张卡牌。`, 'info');
    helpers.gameStore.addNotification('命运探测：抽取未来卡牌', 'info');
  }
};


/**
 * 狂乱科学家 - 使用科幻卡牌后议题偏向+1
 */
const 狂乱科学家: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event === 'afterResolve' && ctx.card?.synergy_tags?.includes('科幻')) {
    const helpers = getEffectHelpers(ctx);
    const delta = ctx.playerId === 'playerA' ? 1 : -1;
    helpers.gameStore.updateTopicBias(delta);
    
    console.log('狂乱科学家：科幻卡牌议题偏向+1');
  }
};

/**
 * Export Okabe Rintarou skills
 */
export const okabeRintarouSkills = {
  '冈部伦太郎_命运探测': 命运探测,
  '冈部伦太郎_狂乱科学家': 狂乱科学家
};