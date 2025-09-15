/**
 * 阿万音铃羽 (Amane Suzuha) Skills
 * From: Steins;Gate
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 时间警告 - 查看对手下张牌并可选择使其成本+2
 */
const 时间警告: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  // TODO: 实现查看对手下张要打出的牌，可选择令其成本+2的功能
  persistentSystem.addEffect({
    playerId: opponentId,
    type: 'time_warning_cost_increase',
    duration: 1,
    data: { costIncrease: 2 },
    description: '时间警告：下张卡牌成本+2'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '时间警告',
    '预知并干扰对手'
  );
  
  helpers.gameStore.addNotification('时间警告：对手卡牌成本+2', 'info');
};

/**
 * 未来知识 - 科幻卡牌可预知对手下回合第一张牌
 */
const 未来知识: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现己方科幻类卡牌可预知对手下回合的第一张牌的功能
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'future_knowledge',
    duration: -1, // 永久被动
    data: { cardType: '科幻' },
    description: '未来知识：科幻卡牌预知对手行动',
    onApply: () => {
      console.log('未来知识：科幻卡牌预知对手行动');
    }
  });
};

/**
 * Export Amane Suzuha skills
 */
export const amaneSuzuhaSkills = {
  '阿万音铃羽_时间警告': 时间警告,
  '阿万音铃羽_未来知识': 未来知识
};