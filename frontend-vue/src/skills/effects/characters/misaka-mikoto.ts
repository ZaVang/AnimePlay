/**
 * 御坂美琴 (Misaka Mikoto) Skills
 * From: Toaru Kagaku no Railgun
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';

/**
 * 超电磁炮 - 科幻/战斗类卡牌+2强度，议题偏向-1
 */
const 超电磁炮: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  
  // 科幻和战斗类卡牌+2强度
  EffectPatterns.addStrengthBonus(helpers, ctx.playerId, 2, 1, '超电磁炮：科幻卡牌+2强度');
  helpers.persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '科幻',
    bonusType: 'strength',
    amount: 2,
    duration: 1,
    description: '超电磁炮：科幻卡牌+2强度'
  });
  
  helpers.persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '战斗',
    bonusType: 'strength',
    amount: 2,
    duration: 1,
    description: '超电磁炮：战斗卡牌+2强度'
  });
  
  // 议题偏向-1
  const delta = ctx.playerId === 'playerA' ? -1 : 1;
  helpers.gameStore.updateTopicBias(delta);
  
  EffectPatterns.logSkillActivation(
    helpers, 
    ctx.playerId, 
    '超电磁炮', 
    '科幻/战斗卡牌+2强度，议题偏向-1'
  );
};

/**
 * 电磁干扰 - 对手使用技能时25%几率冷却+1
 */
const 电磁干扰: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  
  // 添加永久被动效果
  helpers.persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'electromagnetic_interference',
    duration: -1, // 永久被动效果
    data: { interferenceChance: 0.25 },
    description: '电磁干扰：对手技能25%几率冷却+1',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '电磁干扰',
        '对手技能有几率受到干扰'
      );
    }
  });
};

/**
 * Export Misaka Mikoto skills
 */
export const misakaMikotoSkills = {
  '御坂美琴_超电磁炮': 超电磁炮,
  '御坂美琴_电磁干扰': 电磁干扰
};