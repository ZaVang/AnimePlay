/**
 * 雪之下雪乃 (Yukinoshita Yukino) Skills
 * From: Yahari Ore no Seishun Love Comedy wa Machigatteiru
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 完美主义 - 卡牌强度≥对方时额外+1强度
 */
const 完美主义: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：卡牌强度≥对方时额外+1强度
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'perfectionist_bonus',
    duration: 1, // 持续本回合
    data: {},
    description: '完美主义：优势时额外+1强度',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '完美主义',
        '优势卡牌将获得额外增强'
      );
    }
  });
};

/**
 * 优等生 - 每回合第一张抽牌强度+1 (永久被动)
 */
const 优等生: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加永久被动效果：每回合第一张抽牌强度+1
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'first_draw_bonus',
    duration: -1, // 永久效果
    data: { firstDrawUsed: false },
    description: '优等生：首张抽牌+1强度',
    onTurnStart: function() {
      this.data.firstDrawUsed = false; // 每回合重置
    },
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '优等生',
        '每回合首张抽牌将获得强度加成'
      );
    }
  });
};

/**
 * Export Yukinoshita Yukino skills
 */
export const yukinoshitaYukinoSkills = {
  '雪之下雪乃_完美主义': 完美主义,
  '雪之下雪乃_优等生': 优等生
};