/**
 * 古河渚 (Furukawa Nagisa) Skills
 * From: CLANNAD
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 团子治愈 - 己方声望+3，对方声望+1
 */
const 团子治愈: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  // 己方声望+3，对方声望+1
  helpers.playerStore.changeReputation(ctx.playerId, 3);
  helpers.playerStore.changeReputation(opponentId, 1);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '团子治愈',
    '双方声望提升'
  );
};

/**
 * 温柔鼓励 - 声望≤20时回合开始获得额外1TP (永久被动)
 */
const 温柔鼓励: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：己方声望≤20时回合开始获得额外1TP
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'gentle_encouragement',
    duration: -1, // 永久被动效果
    data: { tpBonus: 1 },
    description: '温柔鼓励：声望≤20时回合开始获得额外1TP',
    onApply: () => {
      // 移除重复的技能提示，效果已通过被动技能面板显示
      // EffectPatterns.logSkillActivation(
      //   helpers,
      //   ctx.playerId,
      //   '温柔鼓励',
      //   '声望低迷时回合开始获得额外TP'
      // );
    },
    onTurnStart: () => {
      if (helpers.playerStore[ctx.playerId].reputation <= 20) {
        helpers.playerStore.changeTp(ctx.playerId, 1);
        helpers.historyStore.addLog(
          `${helpers.getPlayerName(ctx.playerId)} 的温柔鼓励触发：声望低迷，获得1TP。`, 
          'info'
        );
      }
    }
  });
};

/**
 * Export Furukawa Nagisa skills
 */
export const furukawaNagisaSkills = {
  '古河渚_团子治愈': 团子治愈,
  '古河渚_温柔鼓励': 温柔鼓励
};