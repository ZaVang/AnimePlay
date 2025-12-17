/**
 * 洛琪希·米格路迪亚·格雷拉特 (Roxy Migurdia Greyrat) Skills
 * From: Mushoku Tensei
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 魔法指导 - 选择手牌视为任意类型
 */
const 魔法指导: SkillEffect = async (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const interactionSystem = systemRegistry.getInteractionSystem();
  const persistentSystem = systemRegistry.getPersistentEffectSystem();

  // 从手牌中选择一张卡牌
  const result = await interactionSystem.selectFromHand(ctx.playerId, {
    count: 1,
    source: 'hand',
    required: false,
    title: '魔法指导',
    description: '选择一张手牌，本回合打出时可视为任意类型'
  });

  if (!result.cancelled && result.selected.length > 0) {
    const selectedCard = result.selected[0];

    // 添加持久效果：该卡牌视为任意类型
    persistentSystem.addEffect({
      playerId: ctx.playerId,
      type: 'card_type_override',
      duration: 1,
      data: { cardId: selectedCard.id, newType: 'any' },
      description: `魔法指导：${selectedCard.name} 视为任意类型`
    });

    helpers.gameStore.addNotification(`魔法指导：${selectedCard.name} 已强化为万能类型`, 'info');

    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '魔法指导',
      `${selectedCard.name} 视为任意类型！`
    );

    const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
    helpers.historyStore.addLog(`${name} 魔法指导：${selectedCard.name} 视为任意类型。`, 'info');
  }
};

/**
 * 师者风范 - 奇幻卡牌获得TP
 */
const 师者风范: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('奇幻')) {
    const helpers = getEffectHelpers(ctx);
    
    helpers.playerStore.changeTp(ctx.playerId, 1);
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '师者风范',
      '打出奇幻卡牌，获得1TP'
    );
  }
};

/**
 * Export Roxy Migurdia skills
 */
export const roxyMigurdiaSkills = {
  '洛琪希_米格路迪亚_格雷拉特_魔法指导': 魔法指导,
  '洛琪希_米格路迪亚_格雷拉特_师者风范': 师者风范
};