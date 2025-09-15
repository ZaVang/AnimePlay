/**
 * 长门有希 (Nagato Yuki) Skills
 * From: The Melancholy of Haruhi Suzumiya
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 信息操作 - 查看牌库顶3张牌并重新排列
 */
const 信息操作: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  
  // 查看己方牌库顶3张牌，并重新排列（简化实现：洗牌顶部3张）
  const player = helpers.playerStore[ctx.playerId];
  if (player.deck.length >= 3) {
    // 取出顶部3张牌
    const topCards = player.deck.splice(0, 3);
    // 重新洗牌这3张牌并放回顶部
    for (let i = topCards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [topCards[i], topCards[j]] = [topCards[j], topCards[i]];
    }
    // 放回牌库顶部
    player.deck.unshift(...topCards);
  }
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '信息操作',
    '重新排列牌库顶部'
  );
  
  helpers.gameStore.addNotification('信息操作：重排牌库', 'info');
};

/**
 * 数据分析 - 打出科幻卡牌时下张卡牌成本-1 (永久被动)
 */
const 数据分析: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：打出科幻卡牌时下张卡牌成本-1
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'data_analysis',
    duration: -1, // 永久被动效果
    data: { cardType: '科幻' },
    description: '数据分析：科幻卡牌打出时下张卡牌成本-1',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '数据分析',
        '科幻卡牌打出时下张卡牌成本-1'
      );
    }
  });
};

/**
 * Export Nagato Yuki skills
 */
export const nagatoYukiSkills = {
  '长门有希_信息操作': 信息操作,
  '长门有希_数据分析': 数据分析
};