/**
 * 亚丝娜·结城明日奈 (Asuna Yuuki) Skills
 * From: Sword Art Online
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 闪光剑技 - 本回合科幻类卡牌+3强度，击败对手获得额外1TP
 */
const 闪光剑技: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 科幻类卡牌本回合+3强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '科幻',
    bonusType: 'strength',
    amount: 3,
    duration: 1,
    description: '闪光剑技：科幻卡牌+3强度'
  });
  
  // 添加闪光剑技准备状态
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'flash_strike_prepare',
    duration: 1,
    data: { 
      strengthBonus: 3, 
      victoryTpReward: 1,
      isActive: true 
    },
    description: '闪光剑技：战斗准备状态',
    onApply: () => {
      console.log(`闪光剑技：${ctx.playerId} 进入战斗准备状态`);
    }
  });
  
  // 击败对手时获得额外TP的被动效果
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'flash_strike_victory',
    duration: 3, // 持续几回合
    data: { tpReward: 1 },
    description: '闪光剑技：击败对手获得额外1TP',
    onApply: () => {
      console.log(`闪光剑技：${ctx.playerId} 击败对手奖励激活`);
    }
  });
  
  // 额外获得1TP作为技能激活奖励
  helpers.playerStore.changeTp(ctx.playerId, 1);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '闪光剑技',
    '科幻卡牌+3强度，获得胜利奖励！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 发动闪光剑技：科幻卡牌+3强度，击败对手将获得额外TP！`, 'info');
  helpers.gameStore.addNotification('闪光剑技：科幻+3强度+胜利奖励', 'info');
};

/**
 * 副团长 - 科幻卡牌降低恋爱卡牌成本
 */
const 副团长: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：副团长领导力
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'deputy_leader',
    duration: -1, // 永久被动
    data: { costReduction: 1, targetCardType: '恋爱', triggerCardType: '科幻' },
    description: '副团长：科幻卡牌降低恋爱成本',
    onApply: () => {
      if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('科幻')) {
        // 添加恋爱卡牌成本减免
        persistentSystem.addTemporaryBonus({
          playerId: ctx.playerId,
          cardType: '恋爱',
          bonusType: 'cost',
          amount: 1,
          duration: 2, // 持续2回合
          description: '副团长：恋爱卡牌成本-1'
        });
        
        const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
        helpers.historyStore.addLog(`${name} 的副团长：科幻卡牌触发，恋爱卡牌成本-1。`, 'info');
        helpers.gameStore.addNotification('副团长：恋爱成本-1', 'info');
        
        console.log(`副团长：${ctx.playerId} 科幻卡牌降低恋爱成本`);
      }
    }
  });
  
  // 如果立即有科幻卡牌，直接触发效果
  if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('科幻')) {
    persistentSystem.addTemporaryBonus({
      playerId: ctx.playerId,
      cardType: '恋爱',
      bonusType: 'cost',
      amount: 1,
      duration: 2,
      description: '副团长：恋爱卡牌成本-1'
    });
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '副团长',
      '科幻卡牌降低恋爱成本！'
    );
  } else {
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '副团长',
      '领导力激活，监控科幻卡牌！'
    );
  }
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 激活副团长：科幻卡牌将降低恋爱成本。`, 'info');
};

/**
 * Export Asuna Yuuki skills
 */
export const asunaYuukiSkills = {
  '亚丝娜_结城明日奈_闪光剑技': 闪光剑技,
  '亚丝娜_结城明日奈_副团长': 副团长
};