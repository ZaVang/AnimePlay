/**
 * 牧濑红莉栖 (Makise Kurisu) Skills
 * From: Steins;Gate
 */

import { usePlayerStore, useHistoryStore, useGameStore } from '@/stores/battle';
import type { EffectContext, PlayerId } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 时间理论 - 查看对手3张手牌，本回合科幻类卡牌+2强度
 */
const 时间理论: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const interactionSystem = helpers.interactionSystem;
  const persistentSystem = helpers.persistentSystem;
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '时间理论',
    '查看对手手牌+科幻强化'
  );
  
  // 查看对手3张手牌
  try {
    await interactionSystem.viewOpponentHand(ctx.playerId, { 
      count: 3, 
      source: 'hand', 
      title: '时间理论：查看对手手牌' 
    });
  } catch (error) {
    console.warn('Hand viewing not available:', error);
  }
  
  // 本回合科幻类卡牌+2强度
  persistentSystem.addCardTypeStrengthBonus(ctx.playerId, '科幻', 2, 1);
  
  helpers.gameStore.addNotification('时间理论：查看手牌+科幻强化', 'info');
};

/**
 * 科学逻辑 - 使用科幻卡时30%几率抽1张牌
 */
const 科学逻辑: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event !== 'onPlay' || !ctx.card?.synergy_tags?.includes('科幻')) return;
  
  const helpers = getEffectHelpers(ctx);
  
  // 30%几率抽1张牌
  if (Math.random() < 0.3) {
    helpers.playerStore.drawCards(ctx.playerId, 1);
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '科学逻辑',
      '触发：抽1张牌'
    );
  }
};

/**
 * Export Makise Kurisu skills
 */
export const makiseKurisuSkills = {
  '牧濑红莉栖_时间理论': 时间理论,
  '牧濑红莉栖_科学逻辑': 科学逻辑
};