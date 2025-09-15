/**
 * 山田凉 (Yamada Ryo) Skills
 * From: Bocchi the Rock!
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 贝斯律动 - 本回合内每打出一张日常类卡牌，下张卡牌强度+1
 */
const 贝斯律动: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现复杂的卡牌监听机制，现在简化为基础效果
  // 为日常类卡牌本回合+1强度
  persistentSystem.addTemporaryBonus({
    playerId: ctx.playerId,
    cardType: '日常',
    bonusType: 'strength',
    amount: 1,
    duration: 1,
    description: '贝斯律动：日常卡牌+1强度'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '贝斯律动',
    '日常卡牌强化连击'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 启动贝斯律动：日常卡牌+1强度。`, 'info');
};

/**
 * 音乐狂热 - 己方打出3张不同类型卡牌后下次卡牌成本-2
 */
const 音乐狂热: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // TODO: 实现复杂的卡牌类型追踪机制，现在简化为基础效果
  // 添加基础的成本减少效果
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'music_frenzy_basic',
    duration: 3, // 持续3回合
    data: { costReduction: 1 },
    description: '音乐狂热：卡牌成本-1'
  });
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '音乐狂热',
    '多样化演奏降低成本'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 启动音乐狂热：卡牌成本降低。`, 'info');
};

/**
 * Export Yamada Ryo skills
 */
export const yamadaRyoSkills = {
  '山田凉_贝斯律动': 贝斯律动,
  '山田凉_音乐狂热': 音乐狂热
};