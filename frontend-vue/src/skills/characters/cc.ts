/**
 * CC Skills
 * From: Code Geass: Lelouch of the Rebellion
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * GEASS契约 - 与对手交换一张手牌，获得的牌成本-2
 */
const GEASS契约: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  const interactionSystem = systemRegistry.getInteractionSystem();
  const opponentId = helpers.getOpponentId(ctx.playerId);

  const playerHand = helpers.playerStore[ctx.playerId].hand;
  const opponentHand = helpers.playerStore[opponentId].hand;

  // 检查双方是否都有手牌
  if (playerHand.length === 0 || opponentHand.length === 0) {
    helpers.gameStore.addNotification('无法执行Geass契约：手牌不足', 'warning');
    return;
  }

  try {
    // 玩家选择自己的一张手牌
    const selection = await interactionSystem.selectFromHand(ctx.playerId, {
      count: 1,
      source: 'hand',
      required: true,
      title: 'Geass契约',
      description: '选择一张手牌与对手交换'
    });

    if (selection.cancelled || selection.selected.length === 0) {
      helpers.gameStore.addNotification('Geass契约：取消交换', 'info');
      return;
    }

    const playerCard = selection.selected[0];

    // 对手随机选择一张手牌
    const randomIndex = Math.floor(Math.random() * opponentHand.length);
    const opponentCard = opponentHand[randomIndex];

    // 执行交换
    helpers.playerStore.removeCardFromHand(ctx.playerId, playerCard);
    helpers.playerStore.removeCardFromHand(opponentId, opponentCard);
    helpers.playerStore.addCardToHand(ctx.playerId, opponentCard);
    helpers.playerStore.addCardToHand(opponentId, playerCard);

    // 记录详细的交换日志
    const playerName = helpers.getPlayerName(ctx.playerId);
    const opponentName = helpers.getPlayerName(opponentId);
    helpers.historyStore.addLog(
      `${playerName} 使用Geass契约，用「${playerCard.name}」交换了${opponentName}的「${opponentCard.name}」`,
      'info'
    );

    // 添加临时效果：交换得到的卡牌成本-2
    persistentSystem.addEffect({
      playerId: ctx.playerId,
      type: 'next_card_cost_reduction',
      duration: 1,
      data: {
        costReduction: 2,
        exchangedCardId: opponentCard.id,
        targetCardName: opponentCard.name
      },
      description: `Geass契约：「${opponentCard.name}」成本-2`,
      onApply: () => {
        EffectPatterns.logSkillActivation(
          helpers,
          ctx.playerId,
          'Geass契约',
          `交换获得「${opponentCard.name}」，成本-2`
        );
      }
    });

    helpers.gameStore.addNotification(`Geass契约：获得「${opponentCard.name}」，成本-2`, 'info');

  } catch (error) {
    console.error('Geass契约执行失败:', error);
    helpers.gameStore.addNotification('Geass契约执行失败', 'warning');
  }
};

/**
 * 不死之身 - 声望<10时出牌自动恢复2声望
 */
const 不死之身: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event === 'onPlay') {
    const helpers = getEffectHelpers(ctx);
    
    if (helpers.playerStore[ctx.playerId].reputation < 10) {
      helpers.playerStore.changeReputation(ctx.playerId, 2);
      
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '不死之身',
        '声望自动恢复'
      );
    }
  }
};

/**
 * Export CC skills
 */
export const ccSkills = {
  'CC_GEASS契约': GEASS契约,
  'CC_不死之身': 不死之身
};