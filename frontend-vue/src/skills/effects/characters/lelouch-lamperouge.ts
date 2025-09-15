/**
 * 鲁路修·兰佩路基 (Lelouch Lamperouge) Skills
 * From: Code Geass
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * GEASS命令 - 强制对手出牌类型
 */
const GEASS命令: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  // 实现强制对手下回合打出指定类型卡牌的功能
  const cardTypes = ['日常', '战斗', '科幻', '音乐', '奇幻'];
  const forcedType = cardTypes[Math.floor(Math.random() * cardTypes.length)];
  
  persistentSystem.addRestriction(opponentId, 'forced_card_type', { requiredType: forcedType }, 1);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    'GEASS命令',
    `强制对手下回合必须打出${forcedType}类卡牌`
  );
  
  helpers.gameStore.addNotification(`Geass命令：对手必须出${forcedType}卡`, 'warning');
};

/**
 * 皇族智谋 - 累积强度加成
 */
const 皇族智谋: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 实现每使用一次技能，下次卡牌强度+1的累积效果
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'royal_strategy_bonus',
    duration: -1,
    data: { bonusUsed: false },
    description: '皇族智谋：下张卡牌+1强度',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '皇族智谋',
        '技能运用将增强下张卡牌'
      );
      helpers.gameStore.addNotification('皇族智谋：下张卡+1强度', 'info');
    }
  });
};

/**
 * Export Lelouch Lamperouge skills
 */
export const lelouchLamperougeSkills = {
  '鲁路修_兰佩路基_GEASS命令': GEASS命令,
  '鲁路修_兰佩路基_皇族智谋': 皇族智谋
};