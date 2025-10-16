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
 * 双子感应 - 同类型连击强化（被动）
 */
const 双子感应: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();

  // afterResolve: 检查卡牌类型并追踪连击
  if (ctx.event === 'afterResolve' && ctx.card) {
    const currentTypes = ctx.card.synergy_tags || [];

    // 查找现有的双子感应追踪效果
    let twinEffect = Array.from(persistentSystem['effects'].values()).find(
      effect => effect.playerId === ctx.playerId && effect.type === 'twin_sense_tracker'
    );

    if (twinEffect) {
      const lastTypes = twinEffect.data.lastCardTypes || [];

      // 检查是否有相同类型
      const hasMatch = currentTypes.some(type => lastTypes.includes(type));

      if (hasMatch) {
        // 下张卡牌+2强度
        persistentSystem.addTemporaryBonus({
          playerId: ctx.playerId,
          cardType: undefined, // 所有卡牌
          bonusType: 'strength',
          amount: 2,
          duration: 0, // 单次使用
          description: '双子感应：同类型连击+2强度'
        });

        helpers.gameStore.addNotification('双子感应：同类型连击+2强度', 'info');
        EffectPatterns.logSkillActivation(
          helpers,
          ctx.playerId,
          '双子感应',
          '同类型连击！'
        );
      }

      // 更新上次卡牌类型
      twinEffect.data.lastCardTypes = currentTypes;
    } else {
      // 首次使用，建立追踪
      persistentSystem.addEffect({
        playerId: ctx.playerId,
        type: 'twin_sense_tracker',
        duration: -1, // 永久被动
        data: { lastCardTypes: currentTypes },
        description: '双子感应：类型追踪',
        sourceCharacterId: ctx.character?.id,
        onApply: () => {
          console.log('双子感应：开始类型追踪');
        }
      });
    }
  }
};

/**
 * Export Hiiragi Kagami skills
 */
export const hiiragikagamiSkills = {
  '柊镜_射击精准': 射击精准,
  '柊镜_双子感应': 双子感应
};