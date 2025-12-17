/**
 * 妮亚 (Nia) Skills
 * From: Gurren Lagann
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 天真好奇 - 查看对手3张手牌，每种不同类型令己方抽1张牌
 */
const 天真好奇: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const interactionSystem = systemRegistry.getInteractionSystem();

  // 查看对手3张手牌
  const viewedCards = await interactionSystem.viewOpponentHand(ctx.playerId, {
    count: 3,
    source: 'hand',
    title: '天真好奇 - 查看对手手牌'
  });

  // 计算不同类型数量
  const uniqueTypes = new Set();
  viewedCards.forEach(card => {
    card.synergy_tags?.forEach(tag => uniqueTypes.add(tag));
  });

  const drawCount = Math.min(uniqueTypes.size, 3); // 最多抽3张
  if (drawCount > 0) {
    helpers.playerStore.drawCards(ctx.playerId, drawCount);
  }

  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '天真好奇',
    `发现${uniqueTypes.size}种类型，抽${drawCount}张牌！`
  );

  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 天真好奇：发现${uniqueTypes.size}种类型，抽${drawCount}张牌。`, 'info');
};

/**
 * 螺旋公主 - 己方议题偏向变化时额外+1（朝己方有利方向）
 */
const 螺旋公主: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  if (ctx.event === 'afterResolve') {
    // TODO: 实现己方议题偏向变化时额外+1（朝己方有利方向）的功能
    const delta = ctx.playerId === 'playerA' ? 1 : -1;
    helpers.gameStore.updateTopicBias(delta);
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '螺旋公主',
      '议题偏向额外+1！'
    );
    
    console.log('螺旋公主：议题偏向额外+1');
  }
  
  // 添加被动效果：议题偏向变化时触发
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'spiral_power',
    duration: -1, // 永久被动
    data: { spiralBonus: 1 },
    description: '螺旋公主：议题偏向额外+1',
    onApply: () => {
      console.log('螺旋公主：螺旋力量激活');
    }
  });
};

/**
 * Export Nia skills
 */
export const niaSkills = {
  '妮亚_天真好奇': 天真好奇,
  '妮亚_螺旋公主': 螺旋公主
};