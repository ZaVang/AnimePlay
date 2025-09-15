/**
 * 忍野忍 (Oshino Shinobu) Skills
 * From: Bakemonogatari
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 吸血冲击 - 对手TP≥2时吸取2TP，否则造成3声望损失
 */
const 吸血冲击: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  if (helpers.playerStore[opponentId].tp >= 2) {
    helpers.playerStore.changeTp(opponentId, -2);
    helpers.playerStore.changeTp(ctx.playerId, 2);
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '吸血冲击',
      '吸取对手2TP'
    );
  } else {
    helpers.playerStore.changeReputation(opponentId, -3);
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '吸血冲击',
      '对手TP不足，造成3点声望损失'
    );
  }
};

/**
 * 不老传说 - 技能冷却每回合额外-1 (永久被动)
 */
const 不老传说: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：己方技能冷却每回合额外-1
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'immortal_legend',
    duration: -1, // 永久被动效果
    data: { cooldownReduction: 1 },
    description: '不老传说：技能冷却每回合额外-1',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '不老传说',
        '技能冷却每回合额外-1'
      );
    },
    onTurnEnd: () => {
      // 在回合结束时额外减少1点冷却
      const player = helpers.playerStore[ctx.playerId];
      for (const skillId in player.skillCooldowns) {
        if (player.skillCooldowns[skillId] > 0) {
          helpers.playerStore.setSkillCooldown(ctx.playerId, skillId, Math.max(0, player.skillCooldowns[skillId] - 1));
        }
      }
    }
  });
};

/**
 * Export Oshino Shinobu skills
 */
export const oshinoShinobuSkills = {
  '忍野忍_吸血冲击': 吸血冲击,
  '忍野忍_不老传说': 不老传说
};