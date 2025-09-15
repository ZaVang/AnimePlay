/**
 * 逢坂大河 (Aisaka Taiga) Skills
 * From: Toradora!
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 掌中老虎 - 声望受损时本回合攻击+2强度
 */
const 掌中老虎: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 实现若对手上回合伤害了己方声望，本回合所有攻击+2强度的功能
  // 简化检测：如果声望低于30则认为受到了伤害
  if (helpers.playerStore[ctx.playerId].reputation < 30) {
    // 本回合所有卡牌+2强度（攻击性强化）
    persistentSystem.addTemporaryBonus({
      playerId: ctx.playerId,
      cardType: undefined, // 所有攻击性卡牌
      bonusType: 'strength',
      amount: 2,
      duration: 1,
      description: '掌中老虎：受伤反击+2强度'
    });
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '掌中老虎',
      '受到伤害后反击+2强度！'
    );
    
    helpers.gameStore.addNotification('掌中老虎：攻击+2强度', 'info');
  }
};

/**
 * 傲娇反击 - 对手使用"辛辣点评"时强制反击 (被动)
 */
const 傲娇反击: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：对手使用辛辣点评时的反击机制
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'tsundere_counter',
    duration: -1, // 永久被动
    data: { targetCard: '辛辣点评' },
    description: '傲娇反击：以牙还牙',
    onApply: () => {
      console.log('傲娇反击：以牙还牙');
    }
  });
};

/**
 * Export Aisaka Taiga skills
 */
export const aisakaTaigaSkills = {
  '逢坂大河_掌中老虎': 掌中老虎,
  '逢坂大河_傲娇反击': 傲娇反击
};