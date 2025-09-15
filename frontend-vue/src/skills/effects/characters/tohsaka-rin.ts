/**
 * 远坂凛 (Tohsaka Rin) Skills
 * From: Fate/stay night
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 宝石魔术 - 下张卡牌结算前强度+2
 */
const 宝石魔术: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 选择一张手牌，获得"结算前强度+2"效果
  if (helpers.playerStore[ctx.playerId].hand.length > 0) {
    // 添加效果：下张打出的卡牌结算前强度+2
    persistentSystem.addEffect({
      playerId: ctx.playerId,
      type: 'gem_magic_bonus',
      duration: 1,
      data: { bonusUsed: false },
      description: '宝石魔术：下张卡牌+2强度',
      onApply: () => {
        EffectPatterns.logSkillActivation(
          helpers,
          ctx.playerId,
          '宝石魔术',
          '下张卡牌将获得强化'
        );
        
        helpers.gameStore.addNotification('宝石魔术：下张卡牌+2强度', 'info');
      }
    });
  }
};

/**
 * 魔术师血统 - 奇幻卡牌40%几率不消耗 (永久被动)
 */
const 魔术师血统: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：奇幻卡牌40%几率不消耗
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'magician_bloodline',
    duration: -1, // 永久被动
    data: { returnChance: 0.4 },
    description: '魔术师血统：奇幻卡40%不消耗',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '魔术师血统',
        '奇幻卡牌有概率不消耗'
      );
    }
  });
};

/**
 * Export Tohsaka Rin skills
 */
export const tohsakaRinSkills = {
  '远坂凛_宝石魔术': 宝石魔术,
  '远坂凛_魔术师血统': 魔术师血统
};