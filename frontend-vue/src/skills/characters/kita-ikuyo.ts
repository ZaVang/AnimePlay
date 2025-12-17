/**
 * 喜多郁代 (Kita Ikuyo) Skills
 * From: Bocchi the Rock!
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 社交网络 - 查看对手2张手牌并抽1张牌
 */
const 社交网络: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
  
  // 查看对手2张手牌并抽1张牌
  if (helpers.playerStore[opponentId].hand.length >= 2) {
    // 添加效果：可以查看对手的前2张手牌
    persistentSystem.addEffect({
      playerId: ctx.playerId,
      type: 'spy_network',
      duration: 1,
      data: { cardsRevealed: 2 },
      description: '社交网络：查看对手2张手牌',
      onApply: () => {
        EffectPatterns.logSkillActivation(
          helpers,
          ctx.playerId,
          '社交网络',
          '窥探对手手牌，获得情报优势'
        );
        helpers.gameStore.addNotification('社交网络：查看对手手牌', 'info');
      }
    });
  }
  
  helpers.playerStore.drawCards(ctx.playerId, 1);
};

/**
 * 阳光魅力 - 出牌时议题优势则获得1TP
 */
const 阳光魅力: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event !== 'onPlay') return;
  
  const helpers = getEffectHelpers(ctx);
  
  const bias = ctx.playerId === 'playerA' ? helpers.gameStore.topicBias : -helpers.gameStore.topicBias;
  if (bias > 0) {
    helpers.playerStore.changeTp(ctx.playerId, 1);
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '阳光魅力',
      '议题优势，获得1TP'
    );
  }
};

/**
 * Export Kita Ikuyo skills
 */
export const kitaIkuyoSkills = {
  '喜多郁代_社交网络': 社交网络,
  '喜多郁代_阳光魅力': 阳光魅力
};