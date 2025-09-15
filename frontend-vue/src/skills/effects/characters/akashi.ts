/**
 * 明石 (Akashi) Skills
 * From: Tatami Galaxy / 四畳半神話大系
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 冷静分析 - 重构双方手牌，双方弃掉成本最高的手牌然后各抽2张
 */
const 冷静分析: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  // TODO: 实现双方弃掉所有手牌中成本最高的1张，然后各抽2张牌的功能
  // 简化实现：直接让双方各抽2张牌
  helpers.playerStore.drawCards(ctx.playerId, 2);
  helpers.playerStore.drawCards(opponentId, 2);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '冷静分析',
    '双方重构手牌，各抽2张！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 冷静分析：双方重构手牌，各抽2张。`, 'info');
};

/**
 * 理智思考 - 己方每回合打出的第一张卡牌成本-1
 */
const 理智思考: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现己方每回合打出的第一张卡牌成本-1的功能
  // 添加被动效果：首张卡牌成本-1
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'first_card_discount',
    duration: -1, // 永久被动
    data: { used: false },
    description: '理智思考：每回合首张卡牌成本-1',
    onApply: () => {
      console.log('理智思考：首张卡牌成本-1');
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '理智思考',
    '每回合首张卡牌成本-1！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 理智思考：每回合首张卡牌成本-1。`, 'info');
};

/**
 * Export Akashi skills
 */
export const akashiSkills = {
  '明石_冷静分析': 冷静分析,
  '明石_理智思考': 理智思考
};