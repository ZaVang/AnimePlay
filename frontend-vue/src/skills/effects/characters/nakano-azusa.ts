/**
 * 中野梓 (Nakano Azusa) Skills
 * From: K-On!
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 认真练习 - 下3张音乐类卡牌强度各+1
 */
const 认真练习: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 下3张音乐类卡牌强度各+1
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'music_practice_bonus',
    duration: -1, // 持久效果直到用完
    data: { remainingBonus: 3 },
    description: '认真练习：下3张音乐卡+1强度',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '认真练习',
        '下3张音乐卡牌将获得强度加成'
      );
      helpers.gameStore.addNotification('认真练习：音乐卡+1强度(3次)', 'info');
    }
  });
};

/**
 * 后辈努力 - 当己方TP<对方时，所有音乐类卡牌成本-1
 */
const 后辈努力: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
  
  // 当己方TP<对方时，所有音乐类卡牌成本-1
  if (helpers.playerStore[ctx.playerId].tp < helpers.playerStore[opponentId].tp) {
    persistentSystem.addCardTypeCostReduction(ctx.playerId, '音乐', 1, 1);
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '后辈努力',
      'TP劣势激发斗志，音乐卡成本-1'
    );
    helpers.gameStore.addNotification('后辈努力：音乐卡成本-1', 'info');
  }
};

/**
 * Export Nakano Azusa skills
 */
export const nakanoAzusaSkills = {
  '中野梓_认真练习': 认真练习,
  '中野梓_后辈努力': 后辈努力
};