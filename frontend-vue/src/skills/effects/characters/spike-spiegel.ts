/**
 * 史派克·斯皮格尔 (Spike Spiegel) Skills
 * From: Cowboy Bebop
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 截拳道 - 本回合战斗类卡牌+2强度，并在击败对手时获得2TP
 */
const 截拳道: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现本回合战斗类卡牌+2强度，并在击败对手时获得2TP的功能
  // 战斗类卡牌+2强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '战斗',
    bonusType: 'strength',
    amount: 2,
    duration: 1,
    description: '截拳道：战斗卡牌+2强度'
  });
  
  // 击败对手时获得2TP的被动
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'victory_bonus',
    duration: 1,
    data: { tpReward: 2 },
    description: '截拳道：击败对手获得2TP',
    onApply: () => {
      console.log('截拳道：击败对手获得额外TP');
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
};

/**
 * 赏金猎人 - 己方造成对手声望损失时有40%几率获得1TP
 */
const 赏金猎人: SkillEffect = (ctx: EffectContext) => {
  // TODO: 实现己方造成对手声望损失时有40%几率获得1TP的功能
  if (Math.random() < 0.4) {
    const helpers = getEffectHelpers(ctx);
    
    helpers.playerStore.changeTp(ctx.playerId, 1);
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '赏金猎人',
      '造成损失获得1TP'
    );
  }
};

/**
 * Export Spike Spiegel skills
 */
export const spikeSpiegelSkills = {
  '史派克_斯皮格尔_截拳道': 截拳道,
  '史派克_斯皮格尔_赏金猎人': 赏金猎人
};