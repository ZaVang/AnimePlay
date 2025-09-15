/**
 * 战场原黑仪 (Senjougahara Hitagi) Skills
 * From: Bakemonogatari
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 毒舌反击 - 对手下次"辛辣点评"强度-3
 */
const 毒舌反击: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 给对手添加一个减弱"辛辣点评"的持续效果
  const opponentId = helpers.getOpponentId(ctx.playerId);
  persistentSystem.addEffect({
    playerId: opponentId,
    type: 'harsh_critique_weakness',
    duration: 1, // 下次使用时生效，使用后消失
    data: { strengthReduction: 3, cardName: '辛辣点评' },
    description: '毒舌反击：下次辛辣点评强度-3',
    onApply: () => {
      const opponentName = helpers.getPlayerName(opponentId);
      helpers.historyStore.addLog(`${opponentName} 受到毒舌反击影响：下次辛辣点评强度-3。`, 'info');
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '毒舌反击',
    '对方辛辣点评-3强度'
  );
  
  helpers.gameStore.addNotification('毒舌反击：对方辛辣点评-3强度', 'warning');
};

/**
 * 傲娇魅力 - 对手使用"友好安利"时议题偏向额外+1 (永久被动)
 */
const 傲娇魅力: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加一个被动效果：当对手使用"友好安利"时议题偏向额外+1
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'friendly_recommendation_bonus',
    duration: -1, // 永久效果
    data: { biasBonus: 1 },
    description: '傲娇魅力：对手友好安利时议题偏向额外+1',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '傲娇魅力',
        '对手友好安利时议题偏向额外+1'
      );
    }
  });
};

/**
 * Export Senjougahara Hitagi skills
 */
export const senjougaharaHitagiSkills = {
  '战场原黑仪_毒舌反击': 毒舌反击,
  '战场原黑仪_傲娇魅力': 傲娇魅力
};