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

    helpers.gameStore.addNotification(`魔法修行：获得 ${selectedCard.name}`, 'info');
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
 * 师父照顾 - 己方奇幻类卡牌连续打出时第2张起成本-1（被动）
 */
const 师父照顾: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();

  // afterResolve: 检查是否打出奇幻卡牌
  if (ctx.event === 'afterResolve' && ctx.card?.synergy_tags?.includes('奇幻')) {
    // 查找现有的奇幻连击效果
    let comboEffect = Array.from(persistentSystem['effects'].values()).find(
      effect => effect.playerId === ctx.playerId && effect.type === 'fern_fantasy_combo'
    );

    if (comboEffect) {
      // 已有连击，增加计数并应用成本-1
      comboEffect.data.comboCount = (comboEffect.data.comboCount || 0) + 1;

      // 第2张起成本-1
      if (comboEffect.data.comboCount >= 1) {
        persistentSystem.addEffect({
          playerId: ctx.playerId,
          type: 'next_card_cost_reduction',
          duration: 1,
          data: { costReduction: 1 },
          description: '师父照顾：下张卡牌成本-1'
        });
        helpers.gameStore.addNotification(`师父照顾：奇幻连击x${comboEffect.data.comboCount + 1}，下张-1成本`, 'info');
      }
    } else {
      // 第一次打出奇幻卡牌，建立连击追踪
      persistentSystem.addEffect({
        playerId: ctx.playerId,
        type: 'fern_fantasy_combo',
        duration: -1, // 永久追踪
        data: { comboCount: 0, lastCardType: '奇幻' },
        description: '师父照顾：奇幻连击追踪',
        sourceCharacterId: ctx.character?.id,
        onApply: () => {
          console.log('师父照顾：开始奇幻连击追踪');
        }
      });
    }

    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '师父照顾',
      '奇幻连击！'
    );
  }

  // afterResolve: 如果打出非奇幻卡牌，重置连击
  if (ctx.event === 'afterResolve' && !ctx.card?.synergy_tags?.includes('奇幻')) {
    const comboEffect = Array.from(persistentSystem['effects'].values()).find(
      effect => effect.playerId === ctx.playerId && effect.type === 'fern_fantasy_combo'
    );

    if (comboEffect) {
      comboEffect.data.comboCount = 0;
      console.log('师父照顾：连击中断');
    }
  }
};

/**
 * Export Fern skills
 */
export const fernSkills = {
  '菲伦_魔法修行': 魔法修行,
  '菲伦_师父照顾': 师父照顾
};