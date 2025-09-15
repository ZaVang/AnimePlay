/**
 * 艾莉丝·格雷拉特 (Alice Greyrat) Skills
 * From: Mushoku Tensei
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 狂犬突击 - 本回合所有战斗和奇幻类卡牌+2强度，但下回合无法选择"友好安利"
 */
const 狂犬突击: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 战斗类卡牌+2强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '战斗',
    bonusType: 'strength',
    amount: 2,
    duration: 1,
    description: '狂犬突击：战斗卡牌+2强度'
  });
  
  // 奇幻类卡牌+2强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '奇幻',
    bonusType: 'strength',
    amount: 2,
    duration: 1,
    description: '狂犬突击：奇幻卡牌+2强度'
  });
  
  // 下回合无法选择"友好安利"
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'friendly_recommendation_blocked',
    duration: 1,
    data: {},
    description: '狂犬突击：下回合禁止友好安利',
    onTurnStart: () => {
      helpers.gameStore.addNotification('狂犬突击余韵：不能友好安利', 'warning');
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '狂犬突击',
    '战斗/奇幻卡牌+2强度'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 发动狂犬突击：战斗/奇幻卡牌+2强度！`, 'info');
  helpers.gameStore.addNotification('狂犬突击：战斗/奇幻+2强度', 'info');
};

/**
 * 贵族血统 - 己方打出同一类型的第2张卡牌时成本-1
 */
const 贵族血统: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现复杂的卡牌类型计数机制，现在简化为基础效果
  // 所有卡牌成本-1持续时间
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    bonusType: 'cost',
    amount: 1,
    duration: 3,
    description: '贵族血统：卡牌成本-1'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '贵族血统',
    '同类型第2张卡牌成本-1'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 展现贵族血统：卡牌成本降低。`, 'info');
};


/**
 * Export Alice Greyrat skills
 */
export const aliceGreyratSkills = {
  '艾莉丝_格雷拉特_狂犬突击': 狂犬突击,
  '艾莉丝_格雷拉特_贵族血统': 贵族血统
};