/**
 * 羽川翼 (Hanekawa Tsubasa) Skills
 * From: Monogatari Series
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 完美主义 - 选择己方一张手牌，将其强度调整为5点
 */
const 完美主义: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const interactionSystem = systemRegistry.getInteractionSystem();
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '完美主义',
    '强制标准化卡牌强度'
  );
  
  // TODO: 实现复杂的卡牌选择机制，现在简化为基础效果
  // 暂时使用通用强度加成
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    bonusType: 'strength',
    amount: 2,
    duration: 2,
    description: '完美主义：卡牌强度+2'
  });
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 完美主义：标准化卡牌强度。`, 'info');
  helpers.gameStore.addNotification('完美主义：卡牌强度标准化', 'info');
};

/**
 * 班长职责 - 使用校园卡牌时，对手下次攻击成本+1
 */
const 班长职责: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event !== 'onPlay' || !ctx.card?.synergy_tags?.includes('校园')) return;
  
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
  
  // TODO: 实现复杂的攻击成本增加机制，现在简化为基础效果
  // 给对手添加临时成本增加
  persistentSystem.addEffect({
    playerId: opponentId,
    type: 'class_president_penalty',
    duration: 2,
    data: { costIncrease: 1 },
    description: '班长职责：成本+1'
  });
  
  console.log('班长职责：校园环境增加对手攻击负担');
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 的班长职责：对手下次攻击成本+1。`, 'info');
};


/**
 * Export Hanekawa Tsubasa skills
 */
export const hanekawaTsubasaSkills = {
  '羽川翼_完美主义': 完美主义,
  '羽川翼_班长职责': 班长职责
};