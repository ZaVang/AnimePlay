/**
 * 碇真嗣 (Ikari Shinji) Skills
 * From: Neon Genesis Evangelion
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * AT力场 - 本回合免疫对手的所有技能效果，科幻类卡牌+1强度
 */
const AT力场: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现本回合免疫对手的所有技能效果，科幻类卡牌+1强度的功能
  // 添加技能免疫效果
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'skill_immunity',
    duration: 1,
    data: { immuneToOpponentSkills: true },
    description: 'AT力场：技能免疫',
    onApply: () => {
      console.log('AT力场：展开技能免疫');
    }
  });
  
  // 科幻类卡牌+1强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '科幻',
    bonusType: 'strength',
    amount: 1,
    duration: 1,
    description: 'AT力场：科幻卡牌+1强度'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    'AT力场',
    '技能免疫，科幻卡牌+1强度！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 展开AT力场：技能免疫，科幻卡牌+1强度。`, 'info');
  helpers.gameStore.addNotification('AT力场：技能免疫+科幻强化', 'info');
};

/**
 * 逃避现实 - 己方声望≤15时所有卡牌成本-1
 */
const 逃避现实: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现己方声望≤15时所有卡牌成本-1的功能
  if (helpers.playerStore[ctx.playerId].reputation <= 15) {
    persistentSystem.addTemporaryBonus({
      playerId: ctx.playerId,
      cardType: undefined, // 所有卡牌
      bonusType: 'cost',
      amount: 1,
      duration: -1, // 持续到声望回复
      description: '逃避现实：低声望时卡牌成本-1'
    });
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '逃避现实',
      '低声望时卡牌成本-1！'
    );
    
    console.log('逃避现实：低声望时卡牌成本-1');
  }
};

/**
 * Export Ikari Shinji skills
 */
export const ikarishinjiSkills = {
  '碇真嗣_AT力场': AT力场,
  '碇真嗣_逃避现实': 逃避现实
};