/**
 * 明石 (Akashi) Skills
 * From: Tatami Galaxy / 四畳半神話大系
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 冷静分析 - 重构双方手牌，双方弃掉成本最高的手牌然后各抽2张
 */
const 冷静分析: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const opponentId = helpers.getOpponentId(ctx.playerId);

  // 实现双方弃掉成本最高的手牌，然后各抽2张牌

  // 玩家A弃掉成本最高的卡牌
  const playerAHand = helpers.playerStore.playerA.hand;
  if (playerAHand.length > 0) {
    const highestCostCard = playerAHand.reduce((max, card) =>
      (card.cost || 0) > (max.cost || 0) ? card : max
    );
    helpers.playerStore.discardCardFromHand('playerA', highestCostCard.id.toString());
    helpers.historyStore.addLog(`${helpers.playerStore.playerA.name} 弃掉了 [${highestCostCard.name}] (成本${highestCostCard.cost || 0})`, 'info');
  }

  // 玩家B弃掉成本最高的卡牌
  const playerBHand = helpers.playerStore.playerB.hand;
  if (playerBHand.length > 0) {
    const highestCostCard = playerBHand.reduce((max, card) =>
      (card.cost || 0) > (max.cost || 0) ? card : max
    );
    helpers.playerStore.discardCardFromHand('playerB', highestCostCard.id.toString());
    helpers.historyStore.addLog(`${helpers.playerStore.playerB.name} 弃掉了 [${highestCostCard.name}] (成本${highestCostCard.cost || 0})`, 'info');
  }

  // 双方各抽2张牌
  helpers.playerStore.drawCards(ctx.playerId, 2);
  helpers.playerStore.drawCards(opponentId, 2);

  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '冷静分析',
    '双方弃掉成本最高的卡牌，然后各抽2张！'
  );

  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 冷静分析：双方重构手牌完成。`, 'info');
};

/**
 * 理智思考 - 己方每回合打出的第一张卡牌成本-1
 */
const 理智思考: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();

  // 实现己方每回合打出的第一张卡牌成本-1的功能
  // 添加被动效果：首张卡牌成本-1（包含正确的costReduction数据）
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'first_card_discount',
    duration: -1, // 永久被动
    data: {
      costReduction: 1,  // 成本减免1点
      usedThisTurn: false, // 本回合是否已使用
      description: '每回合首张卡牌成本-1'
    },
    description: '理智思考：每回合首张卡牌成本-1',
    onApply: () => {
      console.log('理智思考被动效果激活：首张卡牌成本-1');
    },
    onTurnStart: () => {
      // 回合开始时重置标记
      console.log('理智思考：重置首张卡牌标记');
    }
  });

  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '理智思考',
    '获得永久被动：每回合首张卡牌成本-1！'
  );

  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 理智思考：获得永久被动效果。`, 'info');
};

/**
 * Export Akashi skills
 */
export const akashiSkills = {
  '明石_冷静分析': 冷静分析,
  '明石_理智思考': 理智思考
};