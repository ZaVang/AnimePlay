/**
 * 由比滨结衣 (Yuigahama Yui) Skills
 * From: Yahari Ore no Seishun Love Comedy wa Machigatteiru
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 察言观色 - 查看对手2张手牌，有恋爱/校园类则+1TP
 */
const 察言观色: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const interactionSystem = systemRegistry.getInteractionSystem();
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  try {
    const viewedCards = await interactionSystem.viewOpponentHand(ctx.playerId, {
      count: 2,
      source: 'hand',
      title: '察言观色：查看对手手牌'
    });
    
    // 检查是否有恋爱或校园类卡牌
    const hasTargetTypes = viewedCards.some(card => 
      card.synergy_tags?.includes('恋爱') || card.synergy_tags?.includes('校园')
    );
    
    // 添加观察技能效果
    persistentSystem.addEffect({
      playerId: ctx.playerId,
      type: 'observation_skills',
      duration: 2,
      data: { 
        viewedCards: viewedCards.length, 
        foundTargetTypes: hasTargetTypes,
        cardTypes: viewedCards.map(c => c.synergy_tags).flat()
      },
      description: '察言观色：观察技能激活',
      onApply: () => {
        console.log(`察言观色：${ctx.playerId} 观察了${viewedCards.length}张对手卡牌`);
      }
    });
    
    if (hasTargetTypes) {
      helpers.playerStore.changeTp(ctx.playerId, 1);
      
      // 额外获得下张恋爱/校园卡牌强度加成
      persistentSystem.addEffect({
        playerId: ctx.playerId,
        type: 'next_card_strength',
        duration: 2,
        data: { strengthBonus: 1, cardTypes: ['恋爱', '校园'] },
        description: '察言观色：恋爱/校园卡牌+1强度'
      });
      
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '察言观色',
        '发现目标类型，获得1TP和卡牌强化！'
      );
      
      helpers.gameStore.addNotification('察言观色：获得TP+强化', 'info');
    } else {
      // 即使没有发现目标类型，也获得观察经验
      helpers.playerStore.changeTp(ctx.playerId, 1);
      
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '察言观色',
        '观察对手获得1TP'
      );
      
      helpers.gameStore.addNotification('察言观色：获得观察经验', 'info');
    }
    
    const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
    helpers.historyStore.addLog(`${name} 使用察言观色：观察对手${viewedCards.length}张手牌${hasTargetTypes ? '，发现目标类型' : ''}。`, 'info');
    
  } catch (error) {
    // 备用实现：直接给TP
    helpers.playerStore.changeTp(ctx.playerId, 1);
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '察言观色',
      '侦查对手获得1TP'
    );
    console.error('察言观色技能执行失败:', error);
  }
};

/**
 * 温柔体贴 - 声望差距≥5时获得1TP
 */
const 温柔体贴: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：温柔体贴
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'gentle_caring',
    duration: -1, // 永久被动
    data: { reputationThreshold: 5, tpReward: 1 },
    description: '温柔体贴：声望差距≥5时获得1TP',
    onTurnStart: () => {
      const opponentId = helpers.getOpponentId(ctx.playerId);
      const repDiff = Math.abs(helpers.playerStore[ctx.playerId].reputation - helpers.playerStore[opponentId].reputation);
      
      if (repDiff >= 5) {
        helpers.playerStore.changeTp(ctx.playerId, 1);
        
        const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
        helpers.historyStore.addLog(`${name} 的温柔体贴：声望差距大，获得1TP。`, 'info');
        helpers.gameStore.addNotification('温柔体贴：获得1TP', 'info');
        
        console.log(`温柔体贴触发：${ctx.playerId} 声望差距${repDiff}，获得1TP`);
      }
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '温柔体贴',
    '声望差距监控激活！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 激活温柔体贴：声望差距≥5时获得TP奖励。`, 'info');
};

/**
 * Export Yuigahama Yui skills
 */
export const yuigahamaYuiSkills = {
  '由比滨结衣_察言观色': 察言观色,
  '由比滨结衣_温柔体贴': 温柔体贴
};