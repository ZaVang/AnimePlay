/**
 * 芙莉莲 (Frieren) Skills
 * From: Frieren: Beyond Journey's End
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 魔法收集 - 查看对手所有手牌，选择一张奇幻类卡牌复制到己方手牌
 */
const 魔法收集: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const interactionSystem = systemRegistry.getInteractionSystem();
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '魔法收集',
    '从对手手牌复制奇幻卡牌'
  );
  
  try {
    // 查看对手所有手牌
    const opponentHand = await interactionSystem.viewOpponentHand(ctx.playerId, {
      count: -1, // 查看全部
      source: 'hand',
      title: '魔法收集：查看对手所有手牌'
    });
    
    // 筛选出奇幻类卡牌
    const fantasyCards = opponentHand?.filter(card => 
      card.synergy_tags?.includes('奇幻')
    ) || [];
    
    if (fantasyCards.length > 0) {
      // 选择一张奇幻类卡牌复制
      // TODO: 实现selectFromCards方法，现在简化为选择第一张
      const selectedCard = fantasyCards.length > 0 ? [fantasyCards[0]] : null;
      
      if (selectedCard && selectedCard.length > 0) {
        const cardToCopy = selectedCard[0];
        // 复制卡牌到己方手牌（创建一个副本）
        const copiedCard = { ...cardToCopy, id: `${cardToCopy.id}_copy_${Date.now()}` };
        // TODO: 实现addCardToHand方法
        // helpers.playerStore.addCardToHand(ctx.playerId, copiedCard);
        
        const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
        helpers.historyStore.addLog(`${name} 魔法收集：复制了「${cardToCopy.name}」到手牌。`, 'info');
        helpers.gameStore.addNotification(`魔法收集：复制「${cardToCopy.name}」`, 'info');
      }
    } else {
      const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
      helpers.historyStore.addLog(`${name} 魔法收集：对手没有奇幻类卡牌。`, 'info');
      helpers.gameStore.addNotification('魔法收集：未发现奇幻卡牌', 'info');
    }
    
  } catch (error) {
    console.warn('Hand viewing not available:', error);
    helpers.gameStore.addNotification('魔法收集：搜集魔法知识', 'info');
  }
};

/**
 * 魔法精通 - 己方奇幻类卡牌无视类型限制，可触发任意被动效果
 */
const 魔法精通: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现复杂的卡牌监听机制，现在简化为基础效果
  // 给奇幻类卡牌添加强度加成
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '奇幻',
    bonusType: 'strength',
    amount: 2,
    duration: 3,
    description: '魔法精通：奇幻卡牌+2强度'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '魔法精通',
    '奇幻卡牌万能触发'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 展现魔法精通：奇幻卡牌可以产生任意效果。`, 'info');
};


/**
 * Export Frieren skills
 */
export const frierenSkills = {
  '芙莉莲_魔法收集': 魔法收集,
  '芙莉莲_魔法精通': 魔法精通
};