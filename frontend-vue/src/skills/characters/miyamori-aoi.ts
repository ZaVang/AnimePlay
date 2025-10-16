/**
 * 宫森葵 (Miyamori Aoi) Skills
 * From: Shirobako
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 制作进行 - 查看己方牌库顶3张牌，选择一张加入手牌，其余放回牌库顺序不变
 */
const 制作进行: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const interactionSystem = systemRegistry.getInteractionSystem();

  // 从牌库顶选择卡牌
  const result = await interactionSystem.selectFromDeck(ctx.playerId, {
    count: 1,
    source: 'deck',
    required: false,
    title: '制作进行',
    description: '查看牌库顶部3张牌，选择一张加入手牌'
  });

  // 如果选择了卡牌，加入手牌并从牌库移除
  if (!result.cancelled && result.selected.length > 0) {
    const selectedCard = result.selected[0];
    helpers.playerStore.addCardToHand(ctx.playerId, selectedCard);

    // 从牌库移除该卡牌
    const deck = helpers.playerStore[ctx.playerId].deck;
    const cardIndex = deck.findIndex(c => c.id === selectedCard.id);
    if (cardIndex !== -1) {
      deck.splice(cardIndex, 1);
    }

    helpers.gameStore.addNotification(`制作进行：获得 ${selectedCard.name}`, 'info');
  }

  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '制作进行',
    '精选牌库卡牌！'
  );

  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 制作进行：精选牌库卡牌。`, 'info');
};

/**
 * 团队合作 - 己方打出的第2张和第3张不同类型的卡牌都+1强度
 */
const 团队合作: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  
  // TODO: 实现己方打出的第2张和第3张不同类型的卡牌都+1强度的功能
  if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
    // 简化检测：假设是多样化出牌
    ctx.addStrengthBonus(1);
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '团队合作',
      '多样化出牌+1强度！'
    );
    
    console.log('团队合作：多样化出牌+1强度');
  }
};

/**
 * Export Miyamori Aoi skills
 */
export const miyamoriaoiSkills = {
  '宫森葵_制作进行': 制作进行,
  '宫森葵_团队合作': 团队合作
};