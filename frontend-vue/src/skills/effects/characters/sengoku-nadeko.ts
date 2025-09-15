/**
 * 千石抚子 (Sengoku Nadeko) Skills
 * From: Bakemonogatari
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 蛇神缠绕 - 对手下张打出的卡牌强度-2，持续2回合
 */
const 蛇神缠绕: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  // 对手下张打出的卡牌强度-2，持续2回合
  persistentSystem.addEffect({
    playerId: opponentId,
    type: 'snake_god_entangle',
    duration: 2, // 持续2回合
    data: { strengthReduction: 2 },
    description: '蛇神缠绕：卡牌强度-2',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '蛇神缠绕',
        '削弱对手后续卡牌'
      );
    }
  });
  
  helpers.gameStore.addNotification('蛇神缠绕：对手卡牌-2强度', 'warning');
};

/**
 * 害羞可爱 - 对手使用"辛辣点评"时己方声望损失-1 (永久被动)
 */
const 害羞可爱: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：减轻辛辣点评伤害
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'shy_cute_protection',
    duration: -1, // 永久被动
    data: { cardName: '辛辣点评', reputationReduction: 1 },
    description: '害羞可爱：减轻辛辣点评伤害',
    onApply: () => {
      console.log('害羞可爱：减轻辛辣点评伤害');
    }
  });
};

/**
 * Export Sengoku Nadeko skills
 */
export const sengokuNadekoSkills = {
  '千石抚子_蛇神缠绕': 蛇神缠绕,
  '千石抚子_害羞可爱': 害羞可爱
};