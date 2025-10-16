/**
 * 珂朵莉·诺塔·瑟尼欧里斯 (Chtholly Nota Seniorious) Skills
 * From: WorldEnd: What do you do at the end of the world? Are you busy? Will you save us?
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 圣剑解放 - 本回合奇幻和战斗类卡牌+4强度，但己方声望-3
 */
const 圣剑解放: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 本回合奇幻和战斗类卡牌+4强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '奇幻',
    bonusType: 'strength',
    amount: 4,
    duration: 1,
    description: '圣剑解放：奇幻卡牌+4强度'
  });
  
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '战斗',
    bonusType: 'strength',
    amount: 4,
    duration: 1,
    description: '圣剑解放：战斗卡牌+4强度'
  });
  
  // 代价：己方声望-3
  helpers.playerStore.changeReputation(ctx.playerId, -3);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '圣剑解放',
    '奇幻/战斗卡牌+4强度，代价声望-3！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 圣剑解放：奇幻/战斗卡牌+4强度，代价声望-3。`, 'info');
};

/**
 * 牺牲觉悟 - 己方声望≤10时所有卡牌强度+2
 */
const 牺牲觉悟: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  
  if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
    if (helpers.playerStore[ctx.playerId].reputation <= 10) {
      ctx.addStrengthBonus(2);
      
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '牺牲觉悟',
        '危机状态，卡牌强度+2！'
      );
      
      console.log('牺牲觉悟：危机状态，卡牌强度+2');
    }
  }
};

/**
 * Export Chtholly Nota Seniorious skills
 */
export const chthollySenioriousSkills = {
  '珂朵莉_诺塔_瑟尼欧里斯_圣剑解放': 圣剑解放,
  '珂朵莉_诺塔_瑟尼欧里斯_牺牲觉悟': 牺牲觉悟
};