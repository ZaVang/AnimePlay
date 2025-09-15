/**
 * 阿良良木历 (Araragi Koyomi) Skills
 * From: Monogatari Series
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 吐槽连击 - 针对校园环境获得TP
 */
const 吐槽连击: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  
  // TODO: 实现对手每有一张校园类手牌，己方获得1TP（最多3TP）的功能
  helpers.playerStore.changeTp(ctx.playerId, 2); // 简化为固定2TP
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '吐槽连击',
    '针对校园环境获得2TP'
  );
};

/**
 * 半吸血鬼 - 声望损失减免
 */
const 半吸血鬼: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现己方声望损失时有30%几率减少1点损失的功能
  // 添加被动保护效果
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'reputation_protection',
    duration: -1, // 永久被动
    data: { reductionChance: 0.3, reductionAmount: 1 },
    description: '半吸血鬼：30%几率减少声望损失',
    onApply: () => {
      if (Math.random() < 0.3) {
        console.log('半吸血鬼：减少声望损失');
      }
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '半吸血鬼',
    '30%几率减少声望损失！'
  );
};

/**
 * Export Araragi Koyomi skills
 */
export const araragiKoyomiSkills = {
  '阿良良木历_吐槽连击': 吐槽连击,
  '阿良良木历_半吸血鬼': 半吸血鬼
};