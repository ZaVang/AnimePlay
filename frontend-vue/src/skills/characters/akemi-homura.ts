/**
 * 晓美焰 (Akemi Homura) Skills
 * From: Puella Magi Madoka Magica
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 时间停止 - 下回合获得先手权
 */
const 时间停止: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 下回合己方先手（打破轮流制一次）
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'time_stop_priority',
    duration: 1, // 下回合生效
    data: {},
    description: '时间停止：下回合获得先手权',
    onApply: () => {
      // 设置下回合先手标记（简化实现：记录在效果数据中）
      console.log(`${ctx.playerId} 将在下回合获得先手权`);
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '时间停止',
    '下回合获得先手权！'
  );
  
  helpers.gameStore.addNotification('时间停止：获得额外回合', 'warning');
};

/**
 * 轮回记忆 - 失败卡牌25%几率返回手牌 (永久被动)
 */
const 轮回记忆: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：己方被击败的卡牌25%几率返回手牌
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'reincarnation_memory',
    duration: -1, // 永久被动效果
    data: { recoveryChance: 0.25 },
    description: '轮回记忆：失败卡牌25%几率回收',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '轮回记忆',
        '失败卡牌有概率回收到手牌'
      );
    }
  });
};

/**
 * Export Akemi Homura skills
 */
export const akemiHomuraSkills = {
  '晓美焰_时间停止': 时间停止,
  '晓美焰_轮回记忆': 轮回记忆
};