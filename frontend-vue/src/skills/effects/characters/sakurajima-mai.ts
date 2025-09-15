/**
 * 樱岛麻衣 (Sakurajima Mai) Skills
 * From: Bunny Girl Senpai
 */

import type { EffectContext } from '@/types/effects';
import { getEffectHelpers, EffectPatterns, type SkillEffect } from '../utils/effectHelpers';
import { systemRegistry } from '@/core/di/registry';

/**
 * 存在感操作 - 使对手下回合必须选择“停止讨论”
 */
const 存在感操作: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
  
  // TODO: 实现使对手下回合必须选择“停止讨论”的功能
  persistentSystem.addEffect({
    playerId: opponentId,
    type: 'forced_stop_discussion',
    duration: 1,
    data: {},
    description: '存在感操作：下回合必须停止讨论',
    onApply: () => {
      EffectPatterns.logSkillActivation(
        helpers,
        ctx.playerId,
        '存在感操作',
        '对手必须停止讨论'
      );
    }
  });
};

/**
 * 前偶像 - 使用校园或日常类卡牌时，20%几率对手下次攻击强度-1
 */
const 前偶像: SkillEffect = (ctx: EffectContext) => {
  const helpers = getEffectHelpers(ctx);
  const persistentSystem = systemRegistry.getPersistentEffectSystem();
  
  if (ctx.event !== 'onPlay' || !ctx.card?.synergy_tags?.some(tag => ['校园', '日常'].includes(tag))) return;
  
  // TODO: 实现20%几率对手下次攻击强度-1的功能
  if (Math.random() < 0.2) {
    const opponentId = ctx.playerId === 'playerA' ? 'playerB' : 'playerA';
    
    // 对手下次攻击强度-1
    persistentSystem.addTemporaryBonus({
      playerId: opponentId,
      cardType: undefined, // 下张卡牌
      bonusType: 'strength',
      amount: -1,
      duration: 1,
      description: '前偶像：下次攻击强度-1'
    });
    
    EffectPatterns.logSkillActivation(
      helpers,
      ctx.playerId,
      '前偶像',
      '魅力影响，对手下次攻击强度-1！'
    );
    
    console.log('前偶像：魅力影响，对手下次攻击强度-1');
  }
};

/**
 * Export Sakurajima Mai skills
 */
export const sakurajimaMaiSkills = {
  '樱岛麻衣_存在感操作': 存在感操作,
  '樱岛麻衣_前偶像': 前偶像
};