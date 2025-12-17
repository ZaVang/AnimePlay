/**
 * 安原绘麻 (Yasuhara Ema) Skills
 * From: Shirobako
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 原画创作 - 将己方一张手牌的类型改变为任意类型直到打出为止
 */
const 原画创作: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现将己方一张手牌的类型改变为任意类型直到打出为止的功能
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'card_type_change',
    duration: -1, // 持续到使用为止
    data: { allowTypeChange: true },
    description: '原画创作：改变手牌类型',
    onApply: () => {
      console.log('原画创作：改变手牌类型');
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '原画创作',
    '改变手牌类型！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 原画创作：改变手牌类型。`, 'info');
};

/**
 * 内向专注 - 手牌数量≥7时卡牌强度+1
 */
const 内向专注: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);

  if (ctx.event === 'beforeResolve' && ctx.addStrengthBonus) {
    if (helpers.playerStore[ctx.playerId].hand.length >= 7) {
      ctx.addStrengthBonus(1);

      // 技能效果静默应用，避免在强度预览时产生过多提示
    }
  }
};

/**
 * Export Yasuhara Ema skills
 */
export const yasuharaemaSkills = {
  '安原绘麻_原画创作': 原画创作,
  '安原绘麻_内向专注': 内向专注
};