/**
 * 草薙素子 (Kusanagi Motoko) Skills
 * From: Ghost in the Shell
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 电子战 - 禁用对手技能，科幻卡牌强化
 */
const 电子战: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现禁用对手下回合的一个随机技能，并使己方科幻类卡牌+2强度的功能
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '科幻',
    bonusType: 'strength',
    amount: 2,
    duration: 1,
    description: '电子战：科幻卡牌+2强度'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '电子战',
    '禁用对手技能，科幻卡牌+2强度'
  );
  
  helpers.gameStore.addNotification('电子战：技能禁用+科幻强化', 'info');
};

/**
 * 义体强化 - 科幻卡牌无视对手被动
 */
const 义体强化: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现己方科幻类卡牌无视防守方的被动光环效果的功能
  // 为科幻卡牌添加被动无视效果
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'cybernetic_enhancement',
    duration: -1, // 永久被动
    data: { cardType: '科幻', ignorePassive: true },
    description: '义体强化：科幻卡牌无视对手被动',
    onApply: () => {
      console.log('义体强化：科幻卡牌无视对手被动');
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '义体强化',
    '科幻卡牌无视对手被动！'
  );
};

/**
 * Export Kusanagi Motoko skills
 */
export const kusanagiMotokoSkills = {
  '草薙素子_电子战': 电子战,
  '草薙素子_义体强化': 义体强化
};