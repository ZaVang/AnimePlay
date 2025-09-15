/**
 * 凉宫春日 (Suzumiya Haruhi) Skills
 * From: The Melancholy of Haruhi Suzumiya
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';

/**
 * 团长命令 - 强制反转议题偏向值
 */
const 团长命令: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  
  // 强制交换双方的议题偏向值（正负号互换）
  const currentBias = helpers.gameStore.topicBias;
  helpers.gameStore.updateTopicBias(-currentBias * 2); // 从current变为-current
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '团长命令',
    '议题偏向反转！'
  );
};

/**
 * SOS团氛围 - 日常卡牌防守时+1强度
 */
const SOS团氛围: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event === 'beforeResolve' && ctx.card?.synergy_tags?.includes('日常') && ctx.addStrengthBonus) {
    ctx.addStrengthBonus(ctx.role, 1);
    console.log('SOS团氛围：日常卡牌+1强度');
  }
};

/**
 * Export Suzumiya Haruhi skills
 */
export const suzumiyaHaruhiSkills = {
  '凉宫春日_团长命令': 团长命令,
  '凉宫春日_SOS团氛围': SOS团氛围
};