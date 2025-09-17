/**
 * 艾米莉娅 (Emilia) Skills
 * From: Re:Zero kara Hajimeru Isekai Seikatsu
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 精灵加护 - 双方声望各+3，奇幻卡牌本回合+1强度
 */
const 精灵加护: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  // 双方声望各+3
  helpers.playerStore.changeReputation(ctx.playerId, 3);
  helpers.playerStore.changeReputation(opponentId, 3);
  
  // 己方奇幻类卡牌本回合+1强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '奇幻',
    bonusType: 'strength',
    amount: 1,
    duration: 1,
    description: '精灵加护：奇幻卡牌+1强度'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '精灵加护',
    '双方声望+3，奇幻卡牌+1强度'
  );
};

/**
 * 银发王选 - 议题偏向=0时奇幻卡牌成本-1
 */
const 银发王选: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();

  // 检查是否已经有相同的效果存在，避免重复添加
  const existingBonuses = persistentSystem.getActiveBonuses(ctx.playerId);
  const hasExistingEffect = existingBonuses.some(bonus =>
    bonus.bonusType === 'cost' &&
    bonus.cardType === '奇幻' &&
    bonus.description === '银发王选：议题中立时奇幻卡牌成本-1'
  );

  // 议题中立时所有奇幻类卡牌成本-1
  if (helpers.gameStore.topicBias === 0 && !hasExistingEffect) {
    persistentSystem.addTemporaryBonus({
      playerId: ctx.playerId,
      cardType: '奇幻',
      bonusType: 'cost',
      amount: 1, // 正数表示减免量
      duration: 1,
      description: '银发王选：议题中立时奇幻卡牌成本-1'
    });

    console.log('银发王选：议题中立时奇幻卡牌成本-1 (新增效果)');
  } else if (hasExistingEffect) {
    console.log('银发王选：效果已存在，跳过添加');
  }
};

/**
 * Export Emilia skills
 */
export const emiliaSkills = {
  '艾米莉娅_精灵加护': 精灵加护,
  '艾米莉娅_银发王选': 银发王选
};