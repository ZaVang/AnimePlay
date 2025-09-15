/**
 * 藤林杏 (Fujibayashi Kyou) Skills
 * From: Clannad
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 不良委员长 - 本回合校园类卡牌+2强度，若使用"辛辣点评"则额外+1强度
 */
const 不良委员长: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现本回合校园类卡牌+2强度，若使用"辛辣点评"则额外+1强度的功能
  // 校园类卡牌基础+2强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '校园',
    bonusType: 'strength',
    amount: 2,
    duration: 1,
    description: '不良委员长：校园卡牌+2强度'
  });
  
  // 辛辣点评额外+1强度
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'harsh_review_bonus',
    duration: 1,
    data: { extraStrength: 1 },
    description: '不良委员长：辛辣点评额外+1强度',
    onApply: () => {
      console.log('不良委员长：辛辣点评额外强化');
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '不良委员长',
    '校园卡牌+2强度！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 展现不良委员长：校园卡牌+2强度。`, 'info');
};

/**
 * 外硬内软 - 己方声望受损时下次校园类卡牌成本-1
 */
const 外硬内软: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现己方声望受损时下次校园类卡牌成本-1的功能
  if (helpers.playerStore[ctx.playerId].reputation < 30) { // 简化检测
    persistentSystem.addTemporaryBonus({
      playerId: ctx.playerId,
      cardType: '校园',
      bonusType: 'cost',
      amount: 1,
      duration: 1, // 下次使用
      description: '外硬内软：校园卡牌成本-1'
    });
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '外硬内软',
      '声望受损，校园卡牌成本-1！'
    );
    
    console.log('外硬内软：声望受损，校园卡牌成本-1');
  }
};

/**
 * Export Fujibayashi Kyou skills
 */
export const fujibayashikyouSkills = {
  '藤林杏_不良委员长': 不良委员长,
  '藤林杏_外硬内软': 外硬内软
};