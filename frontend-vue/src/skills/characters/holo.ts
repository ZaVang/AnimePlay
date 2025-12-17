/**
 * 赫萝 (Holo) Skills
 * From: Spice and Wolf
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 商业智慧 - 查看对手手牌及卡组中最高成本的卡牌，复制其效果到己方下张手牌
 */
const 商业智慧: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const interactionSystem = systemRegistry.getInteractionSystem();
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';

  // 查看对手手牌
  const viewedCards = await interactionSystem.viewOpponentHand(ctx.playerId, {
    count: 5,
    source: 'hand',
    title: '商业智慧 - 分析市场'
  });

  // 从对手手牌和牌库中找到最高成本的卡牌
  const opponentDeck = helpers.playerStore[opponentId].deck;
  const allOpponentCards = [...viewedCards, ...opponentDeck];

  if (allOpponentCards.length > 0) {
    const highestCostCard = allOpponentCards.reduce((prev, current) =>
      (current.cost > prev.cost) ? current : prev
    );

    // 添加持久效果：下张打出的卡牌获得最高成本卡牌的效果
    persistentSystem.addEffect({
      playerId: ctx.playerId,
      type: 'copy_card_effect',
      duration: 1,
      data: { copiedCardId: highestCostCard.id, copiedEffects: highestCostCard.skills },
      description: `商业智慧：复制 ${highestCostCard.name} 的效果`
    });

    helpers.gameStore.addNotification(`商业智慧：复制 ${highestCostCard.name} (成本${highestCostCard.cost})`, 'info');

    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '商业智慧',
      `复制${highestCostCard.name}的效果！`
    );

    const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
    helpers.historyStore.addLog(`${name} 商业智慧：复制 ${highestCostCard.name} 的效果。`, 'info');
  } else {
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '商业智慧',
      '分析市场！'
    );
  }
};

/**
 * 丰收之神 - 己方打出的卡牌每有一个协同标签，下张卡牌成本-1（被动）
 */
const 丰收之神: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event !== 'afterResolve') return;

  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();

  const synergy_count = ctx.card?.synergy_tags?.length || 0;
  if (synergy_count > 0) {
    // 添加下张卡牌成本减免效果
    persistentSystem.addEffect({
      playerId: ctx.playerId,
      type: 'next_card_cost_reduction',
      duration: 1,
      data: { costReduction: synergy_count },
      description: `丰收之神：下张卡牌成本-${synergy_count}`
    });

    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '丰收之神',
      `下张卡牌成本-${synergy_count}`
    );

    helpers.gameStore.addNotification(`丰收之神：下张卡牌成本-${synergy_count}`, 'info');
  }
};

/**
 * Export Holo skills
 */
export const holoSkills = {
  '赫萝_商业智慧': 商业智慧,
  '赫萝_丰收之神': 丰收之神
};