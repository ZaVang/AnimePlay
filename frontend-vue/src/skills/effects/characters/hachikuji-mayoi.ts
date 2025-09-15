/**
 * 八九寺真宵 (Hachikuji Mayoi) Skills
 * From: Monogatari Series
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 咬咬攻击 - 对手下张卡牌强度-1，若己方手牌≥6张则额外-1
 */
const 咬咬攻击: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现对手下张卡牌强度-1，若己方手牌≥6张则额外-1的功能
  const handSize = helpers.playerStore[ctx.playerId].hand.length;
  const penalty = handSize >= 6 ? 2 : 1;
  
  const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
  
  // 对对手的下张卡牌添加强度惩罚
  persistentSystem.addTemporaryBonus({
    playerId: opponentId,
    cardType: undefined, // 下张卡牌
    bonusType: 'strength',
    amount: -penalty,
    duration: 1,
    description: `咬咬攻击：下张卡牌-${penalty}强度`
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '咬咬攻击',
    `对手下张卡牌-${penalty}强度！`
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 咬咬攻击：对手下张卡牌-${penalty}强度。`, 'info');
  helpers.gameStore.addNotification(`咬咬攻击：对手卡牌-${penalty}强度`, 'info');
};

/**
 * 迷路小学生 - 对手查看己方手牌时可选择隐藏其中1张
 */
const 迷路小学生: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现对手查看己方手牌时可选择隐藏其中1张的功能
  // 添加被动保护效果
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'hand_protection',
    duration: -1, // 永久被动
    data: { hideCards: 1 },
    description: '迷路小学生：手牌查看时隐藏1张',
    onApply: () => {
      console.log('迷路小学生：手牌查看时隐藏1张');
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '迷路小学生',
    '手牌查看时隐藏保护！'
  );
};

/**
 * Export Hachikuji Mayoi skills
 */
export const hachikujimayoiSkills = {
  '八九寺真宵_咬咬攻击': 咬咬攻击,
  '八九寺真宵_迷路小学生': 迷路小学生
};