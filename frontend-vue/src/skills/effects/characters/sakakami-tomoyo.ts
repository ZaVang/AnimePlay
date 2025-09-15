/**
 * 坂上智代 (Sakakami Tomoyo) Skills
 * From: Clannad
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 学生会改革 - 重置己方一个技能的冷却时间，并使所有校园类卡牌本回合+1强度
 */
const 学生会改革: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 重置技能冷却效果
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'skill_cooldown_reset',
    duration: 1, // 立即生效
    data: { resetCount: 1, skillsReset: [] },
    description: '学生会改革：重置一个技能冷却',
    onApply: () => {
      console.log(`学生会改革：${ctx.playerId} 获得技能冷却重置`);
      // TODO: 实际重置技能冷却的逻辑将在战斗系统中实现
    }
  });
  
  // 校园类卡牌本回合+1强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '校园',
    bonusType: 'strength',
    amount: 1,
    duration: 1,
    description: '学生会改革：校园卡牌+1强度'
  });
  
  // 额外获得1TP作为改革成果
  helpers.playerStore.changeTp(ctx.playerId, 1);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '学生会改革',
    '重置技能冷却，校园卡牌+1强度！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 推行学生会改革：重置技能冷却，校园卡牌+1强度，获得1TP。`, 'info');
  helpers.gameStore.addNotification('学生会改革：校园+1强度，技能重置', 'info');
};

/**
 * 领导魅力 - 回合开始时，若己方议题偏向≥0，全队技能冷却-1
 */
const 领导魅力: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加被动效果：每回合检查议题偏向
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'leadership_cooldown_reduction',
    duration: -1, // 永久被动
    data: { cooldownReduction: 1, checkBias: true },
    description: '领导魅力：议题优势时全队技能冷却-1',
    onTurnStart: () => {
      const bias = ctx.playerId === 'playerA' ? helpers.gameStore.topicBias : -helpers.gameStore.topicBias;
      if (bias >= 0) {
        console.log(`领导魅力触发：${ctx.playerId} 议题优势，全队技能冷却-1`);
        // TODO: 实际的技能冷却减少将在战斗系统中实现
        
        const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
        helpers.historyStore.addLog(`${name} 的领导魅力：议题优势，全队技能冷却-1。`, 'info');
        helpers.gameStore.addNotification('领导魅力：技能冷却-1', 'info');
      }
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '领导魅力',
    '议题优势时技能冷却减少！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 激活领导魅力：议题优势时全队技能冷却-1。`, 'info');
};

/**
 * Export Sakakami Tomoyo skills
 */
export const sakakamitomoyoSkills = {
  '坂上智代_学生会改革': 学生会改革,
  '坂上智代_领导魅力': 领导魅力
};