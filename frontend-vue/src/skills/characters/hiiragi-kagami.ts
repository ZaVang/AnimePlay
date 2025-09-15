/**
 * 柊镜 (Hiiragi Kagami) Skills
 * From: Lucky Star
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 射击精准 - 锁定对手卡牌增加成本
 */
const 射击精准: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  const opponentId = helpers.getOpponentId(ctx.playerId);
  
  // TODO: 实现指定对手一张手牌，令其成本+2，持续到被打出为止的功能
  // 对对手的随机一张手牌增加成本
  persistentSystem.addEffect({
    playerId: opponentId,
    type: 'precision_shot_cost',
    duration: -1, // 持续到被打出
    data: { costIncrease: 2 },
    description: '射击精准：手牌成本+2',
    onApply: () => {
      console.log('射击精准：锁定手牌增加成本');
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '射击精准',
    '锁定对手卡牌增加成本！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 射击精准：锁定对手卡牌增加成本。`, 'info');
  helpers.gameStore.addNotification('射击精准：对手卡牌+2费用', 'info');
};

/**
 * 双子感应 - 同类型连击强化
 */
const 双子感应: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现己方打出与上张卡牌相同类型时强度+2的功能
  // 添加同类型连击检测器
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'twin_sense',
    duration: -1, // 永久被动
    data: { lastCardType: '', strengthBonus: 2 },
    description: '双子感应：同类型连击+2强度',
    onApply: () => {
      console.log('双子感应：同类型连击强化');
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '双子感应',
    '同类型连击+2强度！'
  );
};

/**
 * Export Hiiragi Kagami skills
 */
export const hiiragikagamiSkills = {
  '柊镜_射击精准': 射击精准,
  '柊镜_双子感应': 双子感应
};