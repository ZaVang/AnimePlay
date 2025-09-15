/**
 * 后藤一里 (Goto Hitori) Skills  
 * From: Bocchi the Rock!
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';

/**
 * 独奏时光 - 手牌≥7张时日常卡牌+3强度
 */
const 独奏时光: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  
  const handSize = helpers.playerStore[ctx.playerId].hand.length;
  if (handSize >= 7) {
    // 日常类卡牌+3强度
    helpers.persistentSystem.addTemporaryBonus({
      playerId: ctx.playerId,
      cardType: '日常',
      bonusType: 'strength',
      amount: 3,
      duration: 1,
      description: '独奏时光：日常卡牌+3强度'
    });
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '独奏时光',
      '手牌充足，日常卡牌+3强度'
    );
  }
};

/**
 * 隐居创作 - 回合开始时TP劣势则抽1张牌
 */
const 隐居创作: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  
  // 添加永久被动效果
  helpers.persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'hermit_creation',
    duration: -1, // 永久被动效果
    data: {},
    description: '隐居创作：回合开始时TP劣势则抽1张牌',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '隐居创作',
        '回合开始时TP劣势将抽1张牌'
      );
    },
    onTurnStart: () => {
      const opponentId = helpers.getOpponentId(ctx.playerId);
      if (helpers.playerStore[ctx.playerId].tp < helpers.playerStore[opponentId].tp) {
        helpers.playerStore.drawCards(ctx.playerId, 1);
        helpers.historyStore.addLog(
          `${helpers.getPlayerName(ctx.playerId)} 隐居创作触发：抽1张牌。`, 
          'info'
        );
      }
    }
  });
};

/**
 * Export Goto Hitori skills
 */
export const gotoHitoriSkills = {
  '后藤一里_独奏时光': 独奏时光,
  '后藤一里_隐居创作': 隐居创作
};