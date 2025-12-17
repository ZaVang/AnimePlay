/**
 * 史派克·斯皮格尔 (Spike Spiegel) Skills
 * From: Cowboy Bebop
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 截拳道 - 本回合战斗类卡牌+2强度，并在击败对手时获得2TP
 */
const 截拳道: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();

  // 战斗类卡牌+2强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '战斗',
    bonusType: 'strength',
    amount: 2,
    duration: 1,
    description: '截拳道：战斗卡牌+2强度'
  });

  // 添加击败奖励触发器（afterResolve时检查）
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'jeet_kune_do_victory_bonus',
    duration: 1,
    data: {
      tpReward: 2,
      triggerOnVictory: true // 标记为胜利触发
    },
    description: '截拳道：击败对手获得2TP',
    sourceCharacterId: ctx.character?.id,
    onApply: () => {
      console.log('截拳道：准备好击败奖励');
    }
  });

  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '截拳道',
    '战斗卡牌+2强度，击败获得2TP！'
  );

  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 施展截拳道：战斗卡牌+2强度。`, 'info');
  helpers.gameStore.addNotification('截拳道：战斗+2强度', 'info');
};

/**
 * 赏金猎人 - 己方造成对手声望损失时有40%几率获得1TP（被动）
 */
const 赏金猎人: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();

  // 添加被动效果：造成声望损失时触发
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'bounty_hunter_tp_gain',
    duration: -1, // 永久被动
    data: {
      triggerChance: 0.4, // 40%触发几率
      tpReward: 1
    },
    description: '赏金猎人：造成损失时40%几率获得1TP',
    sourceCharacterId: ctx.character?.id,
    onApply: () => {
      console.log('赏金猎人：被动效果激活');
    }
  });

  helpers.gameStore.addNotification('赏金猎人：被动生效', 'info');
};

/**
 * Export Spike Spiegel skills
 */
export const spikeSpiegelSkills = {
  '史派克_斯皮格尔_截拳道': 截拳道,
  '史派克_斯皮格尔_赏金猎人': 赏金猎人
};