/**
 * 千早爱音 (Chihaya Anon) Skills
 * From: Lycoris Recoil
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 会长领导 - 己方校园类卡牌本回合+2强度，并获得1TP
 */
const 会长领导: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 校园类卡牌本回合+2强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '校园',
    bonusType: 'strength',
    amount: 2,
    duration: 1,
    description: '会长领导：校园卡牌+2强度'
  });
  
  // 获得1TP
  helpers.playerStore.changeTp(ctx.playerId, 1);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '会长领导',
    '校园卡牌+2强度，获得1TP'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 展现会长领导力：校园卡牌+2强度，获得1TP。`, 'info');
};

/**
 * 流行追随 - 对手打出的卡牌类型，己方下次打出相同类型时成本-1
 */
const 流行追随: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现复杂的对手卡牌监听机制，现在简化为基础效果
  // 所有类型卡牌成本-1
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'trend_following_basic',
    duration: 3,
    data: { costReduction: 1 },
    description: '流行追随：卡牌成本-1'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '流行追随',
    '模仿对手降低成本'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 启动流行追随：卡牌成本降低。`, 'info');
};

/**
 * Export Chihaya Anon skills
 */
export const chihayaAnonSkills = {
  '千早爱音_会长领导': 会长领导,
  '千早爱音_流行追随': 流行追随
};