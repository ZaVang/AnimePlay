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
 * 逃避现实 - 己方声望≤15时所有卡牌成本-1（被动，每回合检查）
 */
const 逃避现实: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();

  // 被动技能在回合开始时检查条件
  if (ctx.event !== 'onTurnStart' && ctx.event !== 'onGameStart') {
    return;
  }

  const currentReputation = helpers.playerStore[ctx.playerId].reputation;

  // 清除旧的逃避现实效果
  const existingEffects = Array.from(persistentSystem['bonuses'].values()).filter(
    bonus => bonus.playerId === ctx.playerId && bonus.description.includes('逃避现实')
  );
  existingEffects.forEach(effect => {
    persistentSystem['bonuses'].delete(effect.id);
  });

  // 如果声望≤15，添加成本减免
  if (currentReputation <= 15) {
    persistentSystem.addTemporaryBonus({
      playerId: ctx.playerId,
      cardType: undefined, // 所有卡牌
      bonusType: 'cost',
      amount: 1,
      duration: 1, // 持续1回合，下回合重新检查
      description: '逃避现实：低声望时卡牌成本-1'
    });

    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '逃避现实',
      `低声望（${currentReputation}）时卡牌成本-1！`
    );

    helpers.gameStore.addNotification('逃避现实：卡牌成本-1', 'info');
  }
};

/**
 * Export Ikari Shinji skills
 */
export const ikarishinjiSkills = {
  '碇真嗣_AT力场': AT力场,
  '碇真嗣_逃避现实': 逃避现实
};