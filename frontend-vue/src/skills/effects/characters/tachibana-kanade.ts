/**
 * 立华奏 (Tachibana Kanade) Skills
 * From: Angel Beats!
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 天使守护 - 本回合免疫声望损失，校园卡牌+2强度
 */
const 天使守护: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 本回合免疫所有声望损失
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'angel_protection',
    duration: 1,
    data: { immuneToReputationLoss: true },
    description: '天使守护：免疫声望损失'
  });
  
  // 校园类卡牌+2强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '校园',
    bonusType: 'strength',
    amount: 2,
    duration: 1,
    description: '天使守护：校园卡牌+2强度'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '天使守护',
    '声望保护，校园卡牌+2强度'
  );
  
  helpers.gameStore.addNotification('天使守护：声望免疫+校园强化', 'info');
};

/**
 * 沉默威严 - 对手使用技能时20%几率无效化 (永久被动)
 */
const 沉默威严: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：对手技能有几率被无效化
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'silent_majesty',
    duration: -1, // 永久被动效果
    data: { nullifyChance: 0.2 },
    description: '沉默威严：对手技能20%几率无效化',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '沉默威严',
        '对手技能有概率被无效化'
      );
    }
  });
};

/**
 * Export Tachibana Kanade skills
 */
export const tachibanaKanadeSkills = {
  '立华奏_天使守护': 天使守护,
  '立华奏_沉默威严': 沉默威严
};