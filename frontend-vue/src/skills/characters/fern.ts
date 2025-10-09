/**
 * 菲伦 (Fern) Skills
 * From: Frieren: Beyond Journey's End
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 魔法修行 - 查看己方牌库顶4张牌，选择一张奇幻类加入手牌
 */
const 魔法修行: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const interactionSystem = systemRegistry.getInteractionSystem();

  // 从牌库顶选择奇幻类卡牌
  const result = await interactionSystem.selectFromDeck(ctx.playerId, {
    count: 1,
    source: 'deck',
    filter: (card) => card.synergy_tags?.includes('奇幻') || false,
    required: false,
    title: '魔法修行',
    description: '查看牌库顶部4张牌，选择一张奇幻类卡牌加入手牌'
  });

  // 如果选择了卡牌，加入手牌并从牌库移除
  if (!result.cancelled && result.selected.length > 0) {
    const selectedCard = result.selected[0];
    helpers.playerStore.addCardToHand(ctx.playerId, selectedCard);

    // 从牌库移除该卡牌
    const deck = helpers.playerStore[ctx.playerId].deck;
    const cardIndex = deck.findIndex(c => c.id === selectedCard.id);
    if (cardIndex !== -1) {
      deck.splice(cardIndex, 1);
    }

    helpers.gameStore.addNotification(`魔法修行：获得 ${selectedCard.name}`, 'success');
  }

  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '魔法修行',
    '精选奇幻卡牌！'
  );

  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 魔法修行：从牌库精选奇幻卡牌。`, 'info');
};

/**
 * 师父照顾 - 己方奇幻类卡牌连续打出时第2张起成本-1
 */
const 师父照顾: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现己方奇幻类卡牌连续打出时第2张起成本-1的功能
  if (ctx.card?.synergy_tags?.includes('奇幻')) {
    // 添加奇幻连击记录器
    persistentSystem.addEffect({
      playerId: ctx.playerId,
      type: 'fantasy_combo',
      duration: -1, // 永久被动
      data: { comboCount: 0 },
      description: '师父照顾：奇幻连击降低成本',
      onApply: () => {
        console.log('师父照顾：奇幻连击降低成本');
      }
    });
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '师父照顾',
      '奇幻连击降低成本！'
    );
  }
};

/**
 * Export Fern skills
 */
export const fernSkills = {
  '菲伦_魔法修行': 魔法修行,
  '菲伦_师父照顾': 师父照顾
};