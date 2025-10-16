/**
 * 惣流·明日香·兰格雷 (Asuka Langley Soryu) Skills
 * From: Neon Genesis Evangelion
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 同步率爆发 - 科幻卡牌强度暴增，但下回合技能被封印
 */
const 同步率爆发: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();

  // 本回合科幻卡牌+4强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '科幻',
    bonusType: 'strength',
    amount: 4,
    duration: 1,
    description: '同步率爆发：科幻卡牌+4强度'
  });

  // 下回合技能封印（2回合后自动解除：1=本回合结束，2=下回合）
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'skill_locked',
    duration: 2,
    data: {
      reason: 'sync_burst_backlash',
      lockedSkillSlot: 'all' // 封印所有技能位
    },
    description: '同步率爆发：技能封印惩罚',
    sourceCharacterId: ctx.character?.id,
    onApply: () => {
      console.log('同步率爆发：下回合技能将被封印');
    },
    onExpire: () => {
      helpers.gameStore.addNotification('技能封印解除！', 'info');
    }
  });

  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '同步率爆发',
    '科幻卡牌+4强度，但下回合无法使用技能'
  );

  helpers.gameStore.addNotification('同步率爆发：科幻+4强度（下回合技能封印）', 'warning');
};

/**
 * 驾驶员骄傲 - 优势时强度增强
 */
const 驾驶员骄傲: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
    const helpers = getEffectHelpers(ctx);
    const opponentId = helpers.getOpponentId(ctx.playerId);

    if (helpers.playerStore[ctx.playerId].reputation > helpers.playerStore[opponentId].reputation) {
      ctx.addStrengthBonus(1); // 简化版：只传递强度值
      console.log('驾驶员骄傲：声望优势，卡牌+1强度');
    }
  }
};

/**
 * Export Asuka Langley skills
 */
export const asukaLangleySkills = {
  '惣流_明日香_兰格雷_同步率爆发': 同步率爆发,
  '惣流_明日香_兰格雷_驾驶员骄傲': 驾驶员骄傲
};