/**
 * 藤原千花 (Fujiwara Chika) Skills
 * From: Kaguya-sama: Love is War
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils';
import { systemRegistry } from '@/core/di/registry';

/**
 * 千花游戏 - 抽2张牌，然后隐藏其中一张直到下回合，当打出时+2强度
 */
const 千花游戏: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  // 抽2张牌
  helpers.playerStore.drawCards(ctx.playerId, 2);
  
  // 添加千花游戏特殊效果：下张卡牌+2强度
  persistentSystem.addEffect({
    playerId: ctx.playerId,
    type: 'chika_game_bonus',
    duration: 2,
    data: { strengthBonus: 2, cardsAffected: 1 },
    description: '千花游戏：下张卡牌+2强度',
    onApply: () => {
      console.log(`千花游戏效果激活：${ctx.playerId} 下张卡牌+2强度`);
    }
  });
  
  // 额外获得1TP作为游戏奖励
  helpers.playerStore.changeTp(ctx.playerId, 1);
  
  EffectPatterns.logSkillActivation(
    helpers,
    ctx.playerId,
    '千花游戏',
    '抽2张牌，获得强化效果！'
  );
  
  const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
  helpers.historyStore.addLog(`${name} 开始千花游戏：抽2张牌，下张卡牌将获得+2强度。`, 'info');
  helpers.gameStore.addNotification('千花游戏：下张牌+2强度', 'info');
};

/**
 * 天真烂漫 - 恋爱卡牌降低技能成本
 */
const 天真烂漫: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  if (ctx.event === 'onPlay' && ctx.card?.synergy_tags?.includes('恋爱')) {
    // 添加技能成本减免效果
    persistentSystem.addEffect({
      playerId: ctx.playerId,
      type: 'skill_cost_reduction',
      duration: 1, // 下次使用技能时消耗
      data: { costReduction: 1 },
      description: '天真烂漫：下次技能成本-1',
      onApply: () => {
        console.log(`天真烂漫：${ctx.playerId} 获得技能成本减免`);
      }
    });
    
    // 额外给1TP作为即时奖励
    helpers.playerStore.changeTp(ctx.playerId, 1);
    
    // 追加恋爱卡牌额外强度
    if (ctx.addStrengthBonus) {
      ctx.addStrengthBonus(1);
    }
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '天真烂漫',
      '恋爱卡牌触发，获得技能减免！'
    );
    
    const name = ctx.playerId === 'playerA' ? helpers.playerStore.playerA.name : helpers.playerStore.playerB.name;
    helpers.historyStore.addLog(`${name} 的天真烂漫：恋爱卡牌获得+1TP和技能成本减免。`, 'info');
    helpers.gameStore.addNotification('天真烂漫：技能成本-1', 'info');
    console.log(`天真烂漫触发：${name} 恋爱卡牌获得加成`);
  }
};

/**
 * Export Fujiwara Chika skills
 */
export const fujiwaraChikaSkills = {
  '藤原千花_千花游戏': 千花游戏,
  '藤原千花_天真烂漫': 天真烂漫
};