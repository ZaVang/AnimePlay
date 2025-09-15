/**
 * 绫波丽 (Ayanami Rei) Skills
 * From: Neon Genesis Evangelion
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 绝对沉默 - 对手下回合无法使用任何技能
 */
const 绝对沉默: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 对手下回合无法使用任何技能
  const opponentId = helpers.getOpponentId(ctx.playerId);
  persistentSystem.addEffect({
    playerId: opponentId,
    type: 'absolute_silence',
    duration: 1, // 下回合生效
    data: {},
    description: '绝对沉默：无法使用任何技能',
    onApply: () => {
      const opponentName = helpers.getPlayerName(opponentId);
      helpers.historyStore.addLog(`${opponentName} 被绝对沉默影响：下回合无法使用技能。`, 'info');
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '绝对沉默',
    '对手下回合无法使用技能'
  );
  
  helpers.gameStore.addNotification('绝对沉默：对手技能禁用', 'warning');
};

/**
 * 零的存在 - 议题偏向=0时所有卡牌强度+1
 */
const 零的存在: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 实现己方议题偏向=0时所有卡牌强度+1的功能
  if (helpers.gameStore.topicBias === 0) {
    persistentSystem.addTemporaryBonus({
      playerId: ctx.playerId,
      cardType: undefined, // 所有卡牌类型
      bonusType: 'strength',
      amount: 1,
      duration: 1,
      description: '零的存在：议题中立时所有卡牌+1强度'
    });
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '零的存在',
      '议题中立，所有卡牌强度+1'
    );
  }
};

/**
 * Export Ayanami Rei skills
 */
export const ayanamiReiSkills = {
  '绫波丽_绝对沉默': 绝对沉默,
  '绫波丽_零的存在': 零的存在
};