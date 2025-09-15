/**
 * 高坂丽奈 (Takasaka Reina) Skills
 * From: Hibike! Euphonium
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 专业演奏 - 本回合所有校园类卡牌+3强度，但只能打出1张卡牌
 */
const 专业演奏: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加校园类卡牌强度加成
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '校园',
    bonusType: 'strength',
    amount: 3,
    duration: 1,
    description: '专业演奏：校园卡牌+3强度'
  });
  
  // 限制本回合出牌数量为1张
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'play_limit',
    duration: 1,
    data: { maxPlays: 1, currentPlays: 0 },
    description: '专业演奏：本回合限制出牌1张',
    onApply: () => {
      console.log(`专业演奏：${ctx.playerId} 本回合限制出牌1张`);
    }
  });
  
  // 额外获得1TP作为专业技能奖励
  helpers.playerStore.changeTp(ctx.playerId, 1);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '专业演奏',
    '校园卡牌+3强度，限制出牌！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 开始专业演奏：校园卡牌+3强度，但本回合只能出1张牌。`, 'info');
  helpers.gameStore.addNotification('专业演奏：校园+3强度，限1张牌', 'info');
};

/**
 * 音乐世家 - 己方打出的第一张校园类卡牌每回合+2强度
 */
const 音乐世家: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 添加永久被动效果：音乐世家
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'musical_family',
    duration: -1, // 永久被动
    data: { firstSchoolCardPlayed: false, strengthBonus: 2 },
    description: '音乐世家：每回合第一张校园卡牌+2强度',
    onTurnStart: () => {
      // 回合开始重置状态
      const effect = persistentSystem.getActiveEffects(ctx.playerId)
        .find(e => e.type === 'musical_family');
      if (effect) {
        effect.data.firstSchoolCardPlayed = false;
      }
    }
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '音乐世家',
    '每回合首张校园卡牌获得强化！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 激活音乐世家：每回合第一张校园卡牌+2强度。`, 'info');
  helpers.gameStore.addNotification('音乐世家：校园卡牌强化', 'info');
};

/**
 * Export Takasaka Reina skills
 */
export const takasakareinaSkills = {
  '高坂丽奈_专业演奏': 专业演奏,
  '高坂丽奈_音乐世家': 音乐世家
};