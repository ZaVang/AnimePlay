/**
 * 泉此方 (Izumi Konata) Skills
 * From: Lucky Star
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 宅女知识 - 查看对手2张手牌，若其中有日常类卡牌则己方抽1张牌
 */
const 宅女知识: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const interactionSystem = systemRegistry.getInteractionSystem();
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '宅女知识',
    '侦查对手战术'
  );
  
  try {
    // 查看对手2张手牌
    const viewedCards = await interactionSystem.viewOpponentHand(ctx.playerId, {
      count: 2,
      source: 'hand',
      title: '宅女知识：查看对手手牌'
    });
    
    // 检查查看的卡牌中是否有日常类
    let hasDailyCard = false;
    if (viewedCards && viewedCards.length > 0) {
      hasDailyCard = viewedCards.some(card => 
        card.synergy_tags?.includes('日常')
      );
    }
    
    if (hasDailyCard) {
      // 发现日常类卡牌，抽1张牌
      helpers.playerStore.drawCards(ctx.playerId, 1);
      
      const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
      helpers.historyStore.addLog(`${name} 宅女知识：发现对手的日常类卡牌，抽1张牌。`, 'info');
      helpers.gameStore.addNotification('宅女知识：发现日常卡牌，抽牌！', 'info');
    } else {
      const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
      helpers.historyStore.addLog(`${name} 宅女知识：未发现日常类卡牌。`, 'info');
    }
    
  } catch (error) {
    console.warn('Hand viewing not available:', error);
    // 降级处理：简化为基础效果
    helpers.gameStore.addNotification('宅女知识：分析对手战术', 'info');
  }
};

/**
 * 运动天赋 - 使用运动卡牌时+2强度
 */
const 运动天赋: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event !== 'beforeResolve' || !ctx.card?.synergy_tags?.includes('运动') || !ctx.addStrengthBonus) return;
  
  ctx.addStrengthBonus(2);
  console.log('运动天赋：运动卡牌+2强度');
};

/**
 * Export Izumi Konata skills
 */
export const izumiKonataSkills = {
  '泉此方_宅女知识': 宅女知识,
  '泉此方_运动天赋': 运动天赋
};