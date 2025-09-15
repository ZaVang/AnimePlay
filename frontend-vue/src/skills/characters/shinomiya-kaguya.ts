/**
 * 四宫辉夜 (Shinomiya Kaguya) Skills
 * From: Kaguya-sama: Love is War
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 冰山女王 - 对手声望高时获得优势
 */
const 冰山女王: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const opponentId = helpers.getOpponentId(ctx.playerId);
  const opponentReputation = helpers.playerStore[opponentId].reputation;
  
  // TODO: 实现对手声望≥35时获得特殊优势的功能
  if (opponentReputation >= 35) {
    helpers.playerStore.changeTp(ctx.playerId, 1);
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '冰山女王',
      '对手声望过高时展现王者气质'
    );
  }
};

/**
 * 完美主义 - 校园卡牌完美发挥
 */
const 完美主义: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现己方校园类卡牌成本-1且+1强度的功能
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '校园',
    bonusType: 'strength',
    amount: 1,
    duration: 1,
    description: '完美主义：校园卡牌+1强度'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '完美主义',
    '校园环境下的完美表现'
  );
};

/**
 * Export Shinomiya Kaguya skills
 */
export const shinomiyaKaguyaSkills = {
  '四宫辉夜_冰山女王': 冰山女王,
  '四宫辉夜_完美主义': 完美主义
};