/**
 * 折木奉太郎 (Oreki Houtarou) Skills
 * From: Hyouka
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 节能推理 - TP劣势时查看对手3张手牌，然后抽1张牌
 */
const 节能推理: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
  
  if (helpers.playerStore[ctx.playerId].tp <= helpers.playerStore[opponentId].tp) {
    // TODO: 实现查看对手3张手牌的功能
    helpers.playerStore.drawCards(ctx.playerId, 1);
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '节能推理',
      'TP劣势时侦查并抽牌！'
    );
    
    const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
    helpers.historyStore.addLog(`${name} 节能推理：TP劣势时侦查并抽牌。`, 'info');
  }
};

/**
 * 省力主义 - 己方每跳过一次攻击机会，下次卡牌成本-1
 */
const 省力主义: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现己方每跳过一次攻击机会，下次卡牌成本-1的功能
  // 添加被动效果：跳过攻击时记录
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'energy_saving',
    duration: -1, // 永久被动
    data: { skipCount: 0 },
    description: '省力主义：跳过攻击降低成本',
    onApply: () => {
      console.log('省力主义：跳过攻击机会');
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '省力主义',
    '跳过攻击机会降低卡牌成本！'
  );
};

/**
 * Export Oreki Houtarou skills
 */
export const orekihoutarouSkills = {
  '折木奉太郎_节能推理': 节能推理,
  '折木奉太郎_省力主义': 省力主义
};