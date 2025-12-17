/**
 * 八奈见杏菜 (Yamada Kanna) Skills
 * From: Bocchi the Rock!
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 天然魅力 - 对手下次攻击必须选择"友好安利"
 */
const 天然魅力: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 对手下次攻击必须选择"友好安利"
  const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
  persistentSystem.addEffect({
    playerId: opponentId,
    type: 'forced_friendly_recommendation',
    duration: 1, // 下次攻击时生效
    data: {},
    description: '天然魅力：下次攻击必须选择友好安利',
    onApply: () => {
      const opponent = opponentId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
      helpers.historyStore.addLog(`${opponent} 受到天然魅力影响：下次攻击必须选择友好安利。`, 'info');
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '天然魅力',
    '对手只能友好安利'
  );
  helpers.gameStore.addNotification('天然魅力：强制友好安利', 'info');
};

/**
 * 人气者 - 出牌时30%几率获得1TP
 */
const 人气者: SkillEffect = (ctx: EffectContext) => {
  if (ctx.event !== 'onPlay') return;
  
  const helpers = getEffectHelpers(ctx);
  
  // 30%几率获得1TP
  if (Math.random() < 0.3) {
    helpers.playerStore.changeTp(ctx.playerId, 1);
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '人气者',
      '魅力触发：获得1TP'
    );
  }
};

/**
 * Export Yamada Kanna skills
 */
export const yamadaKannaSkills = {
  '八奈见杏菜_天然魅力': 天然魅力,
  '八奈见杏菜_人气者': 人气者
};