/**
 * 阿尔托莉雅·潘德拉贡 (Artoria Pendragon) Skills
 * From: Fate/stay night
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 王者威严 - 本回合奇幻/战斗卡牌+2强度，友好安利议题偏向效果+1
 */
const 王者威严: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 本回合内奇幻或战斗类卡牌+2强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '奇幻',
    bonusType: 'strength',
    amount: 2,
    duration: 1,
    description: '王者威严：奇幻卡牌+2强度'
  });
  
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '战斗',
    bonusType: 'strength',
    amount: 2,
    duration: 1,
    description: '王者威严：战斗卡牌+2强度'
  });
  
  // 友好安利的议题偏向效果+1
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'friendly_recommendation_enhance',
    duration: 1,
    data: { biasBonus: 1 },
    description: '王者威严：友好安利议题偏向效果+1'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '王者威严',
    '奇幻/战斗卡牌+2强度，友好安利效果+1'
  );
  
  helpers.gameStore.addNotification('王者威严：奇幻/战斗+2强度', 'info');
};

/**
 * 骑士守护 - 己方声望≤15时防守强度+1 (永久被动)
 */
const 骑士守护: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 实现己方声望≤15时所有防守时强度+1的功能
  if (helpers.playerStore[ctx.playerId].reputation <= 15) {
    persistentSystem.addEffect({
      playerId: ctx.playerId,
      type: 'defensive_strength_bonus',
      duration: -1, // 永久效果直到条件不满足
      data: { amount: 1 },
      description: '骑士守护：防守时强度+1'
    });
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '骑士守护',
      '声望危机时防守强度+1'
    );
  }
};

/**
 * Export Artoria Pendragon skills
 */
export const artoriaPendragonSkills = {
  '阿尔托莉雅_潘德拉贡_王者威严': 王者威严,
  '阿尔托莉雅_潘德拉贡_骑士守护': 骑士守护
};