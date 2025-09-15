/**
 * 坂田银时 (Sakata Gintoki) Skills
 * From: Gintama
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 武士觉醒 - 声望≤15时攻击+3强度
 */
const 武士觉醒: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  if (helpers.playerStore[ctx.playerId].reputation <= 15) {
    // 低声望时所有攻击+3强度（持续本回合）
    persistentSystem.addTemporaryBonus({
      playerId: ctx.playerId,
      bonusType: 'strength',
      amount: 3,
      duration: 1,
      description: '武士觉醒：所有攻击+3强度'
    });
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '武士觉醒',
      '逆境中爆发，攻击+3强度！'
    );
    
    helpers.gameStore.addNotification('武士觉醒：攻击+3强度', 'info');
  }
};

/**
 * 万事屋精神 - 手牌种类≥3种时所有卡牌成本-1
 */
const 万事屋精神: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 计算手牌中的不同类型数量
  const handTypes = new Set();
  helpers.playerStore[ctx.playerId].hand.forEach(card => {
    if (card.synergy_tags) {
      card.synergy_tags.forEach(tag => handTypes.add(tag));
    }
  });
  
  if (handTypes.size >= 3) {
    // 手牌种类≥3种时所有卡牌成本-1（持续本回合）
    persistentSystem.addTemporaryBonus({
      playerId: ctx.playerId,
      bonusType: 'cost',
      amount: -1,
      duration: 1,
      description: '万事屋精神：所有卡牌成本-1'
    });
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '万事屋精神',
      `手牌多样化(${handTypes.size}种)，卡牌成本-1`
    );
    
    helpers.gameStore.addNotification('万事屋精神：卡牌成本-1', 'info');
  }
};

/**
 * Export Sakata Gintoki skills
 */
export const sakataGintokiSkills = {
  '坂田银时_武士觉醒': 武士觉醒,
  '坂田银时_万事屋精神': 万事屋精神
};