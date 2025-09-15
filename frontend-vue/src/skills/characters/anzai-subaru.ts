/**
 * 安和昴 (Anzai Subaru) Skills
 * From: Mayo Chiki!
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 偶像魅力 - 对手下回合必须选择"友好安利"，己方校园类卡牌本回合+1强度
 */
const 偶像魅力: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现对手下回合必须选择"友好安利"，己方校园类卡牌本回合+1强度的功能
  const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
  
  // 强制对手下回合选择友好安利
  persistentSystem.addEffect({
    playerId: opponentId,
    type: 'forced_action',
    duration: 1,
    data: { forcedAction: '友好安利' },
    description: '偶像魅力：强制友好安利',
    onApply: () => {
      console.log('偶像魅力：强制对手友好安利');
    }
  });
  
  // 己方校园类卡牌+1强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '校园',
    bonusType: 'strength',
    amount: 1,
    duration: 1,
    description: '偶像魅力：校园卡牌+1强度'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '偶像魅力',
    '强制友好安利，校园卡牌+1强度！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 展现偶像魅力：强制友好安利，校园卡牌+1强度。`, 'info');
  helpers.gameStore.addNotification('偶像魅力：强制友好安利', 'info');
};

/**
 * 世渡り上手 - 己方议题偏向优势时获得1TP
 */
const 世渡り上手: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  
  if (ctx.event === 'onPlay') {
    const bias = ctx.playerId === 'playerA' ? helpers.gameStore.topicBias : -helpers.gameStore.topicBias;
    if (bias > 0) {
      helpers.playerStore.changeTp(ctx.playerId, 1);
      
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '世渡り上手',
        '议题优势，获得1TP！'
      );
      
      const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
      helpers.historyStore.addLog(`${name} 世渡り上手：议题优势，获得1TP。`, 'info');
    }
  }
};

/**
 * Export Anzai Subaru skills
 */
export const anzaisubaruSkills = {
  '安和昴_偶像魅力': 偶像魅力,
  '安和昴_世渡り上手': 世渡り上手
};