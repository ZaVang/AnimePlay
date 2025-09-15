/**
 * 椎名真由理 (Shiina Mayuri) Skills
 * From: Steins;Gate
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 治愈笑容 - 双方声望各+2，己方抽1张牌
 */
const 治愈笑容: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  // 双方声望各+2，己方抽1张牌
  helpers.playerStore.changeReputation(ctx.playerId, 2);
  helpers.playerStore.changeReputation(opponentId, 2);
  helpers.playerStore.drawCards(ctx.playerId, 1);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '治愈笑容',
    '双方声望+2，己方抽牌'
  );
};

/**
 * 天然黑洞 - 对手使用技能时30%几率获得1TP (被动)
 */
const 天然黑洞: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现复杂的技能监听机制，现在简化为基础效果
  // 添加基础被动效果
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'natural_black_hole_basic',
    duration: -1, // 永久被动
    data: { tpGainChance: 0.3 },
    description: '天然黑洞：被动获得TP'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '天然黑洞',
    '将吸收对手技能能量'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 启动天然黑洞：对手技能有30%几率被吸收。`, 'info');
};

/**
 * Export Shiina Mayuri skills
 */
export const shiinaMayuriSkills = {
  '椎名真由理_治愈笑容': 治愈笑容,
  '椎名真由理_天然黑洞': 天然黑洞
};