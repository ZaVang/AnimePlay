/**
 * 黄前久美子 (Kumiko Oumae) Skills
 * From: Hibike! Euphonium
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 和谐演奏 - 双方声望提升
 */
const 和谐演奏: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  // 双方声望各+2
  helpers.playerStore.changeReputation(ctx.playerId, 2);
  helpers.playerStore.changeReputation(opponentId, 2);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '和谐演奏',
    '双方声望各+2'
  );
};

/**
 * 校园协调 - 打出校园卡牌时，本回合所有校园类卡牌成本-1（被动触发）
 */
const 校园协调: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event === 'afterResolve' && ctx.card?.synergy_tags?.includes('校园')) {
    const helpers = getEffectHelpers(ctx);
    const persistentSystem = systemRegistry.getPersistentEffectSystem();

    // 本回合所有校园类卡牌成本-1
    persistentSystem.addTemporaryBonus({
      playerId: ctx.playerId,
      cardType: '校园',
      bonusType: 'cost',
      amount: 1,
      duration: 1,
      description: '校园协调：校园卡牌成本-1'
    });

    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '校园协调',
      '校园卡牌成本-1'
    );

    helpers.gameStore.addNotification('校园协调：校园卡牌-1成本', 'info');
  }
};

/**
 * Export Kumiko Oumae skills
 */
export const kumikoOumaeSkills = {
  '黄前久美子_和谐演奏': 和谐演奏,
  '黄前久美子_校园协调': 校园协调
};