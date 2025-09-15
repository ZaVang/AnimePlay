/**
 * 伊地知虹夏 (Ijichi Nijika) Skills
 * From: Bocchi the Rock!
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 节拍调整 - 重置一个己方角色技能冷却
 */
const 节拍调整: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  
  // 重置一个己方角色技能冷却（简化实现：重置所有技能冷却）
  const player = helpers.playerStore[ctx.playerId];
  for (const skillId in player.skillCooldowns) {
    if (player.skillCooldowns[skillId] > 0) {
      helpers.playerStore.setSkillCooldown(ctx.playerId, skillId, 0);
    }
  }
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '节拍调整',
    '重置角色技能冷却'
  );
  helpers.gameStore.addNotification('节拍调整：技能冷却重置', 'info');
};

/**
 * 团队协调 - 己方使用技能后全队技能冷却-1
 */
const 团队协调: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：己方使用技能后全队技能冷却-1
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'team_coordination',
    duration: -1, // 永久被动效果
    data: { cooldownReduction: 1 },
    description: '团队协调：使用技能后全队技能冷却-1',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '团队协调',
        '使用技能后全队冷却-1'
      );
    }
  });
};

/**
 * Export Ijichi Nijika skills
 */
export const ijichiNijikaSkills = {
  '伊地知虹夏_节拍调整': 节拍调整,
  '伊地知虹夏_团队协调': 团队协调
};