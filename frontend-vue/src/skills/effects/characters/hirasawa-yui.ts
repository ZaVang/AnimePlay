/**
 * 平泽唯 (Hirasawa Yui) Skills
 * From: K-On!
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 专注演奏 - 本回合限制1张牌，但该牌强度+3
 */
const 专注演奏: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 限制本回合只能打出1张牌，但该牌强度+3
  persistentSystem.addRestriction(ctx.playerId, 'max_cards_per_turn', { maxCards: 1 }, 1);
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    bonusType: 'strength',
    amount: 3,
    duration: 1,
    description: '专注演奏：单牌+3强度'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '专注演奏',
    '限制出牌但大幅增强'
  );
  
  helpers.gameStore.addNotification('专注演奏：单牌+3强度', 'info');
};

/**
 * 天然直觉 - 每回合第一张音乐卡牌强度+1 (永久被动)
 */
const 天然直觉: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加永久被动效果：每回合第一张音乐卡牌强度+1
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'first_music_card_bonus',
    duration: -1, // 永久效果
    data: { firstMusicUsed: false },
    description: '天然直觉：首张音乐卡+1强度',
    onTurnStart: function() {
      this.data.firstMusicUsed = false; // 每回合重置
    },
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '天然直觉',
        '每回合首张音乐卡将获得强度加成'
      );
    }
  });
};

/**
 * Export Hirasawa Yui skills
 */
export const hirasawaYuiSkills = {
  '平泽唯_专注演奏': 专注演奏,
  '平泽唯_天然直觉': 天然直觉
};