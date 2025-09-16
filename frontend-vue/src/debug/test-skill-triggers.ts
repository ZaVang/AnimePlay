/**
 * 技能触发机制测试
 * 专门测试逢坂大河的技能触发条件和效果
 */

import { usePlayerStore, useGameStore } from '@/stores/battle';
import { SkillSystem } from '@/core/systems/SkillSystem';
import { systemRegistry } from '@/core/di/registry';
import { runEffect } from '@/skills/registry';

export function testTaigaSkillTriggers() {
  console.log('=== 逢坂大河技能触发测试 ===\n');

  const playerStore = usePlayerStore();
  const gameStore = useGameStore();

  // 1. 测试主动技能 - 掌中老虎
  console.log('1. 测试掌中老虎（主动技能）');

  // 模拟声望受损条件
  playerStore.playerA.reputation = 25; // 低于30

  const 掌中老虎Skill = {
    id: '逢坂大河_掌中老虎',
    name: '掌中老虎',
    type: '主动技能' as const,
    cost: 3,
    cooldown: 2,
    effectId: '逢坂大河_掌中老虎'
  };

  // 检查技能是否可用
  const canUse = SkillSystem.canUseSkill('playerA', 掌中老虎Skill);
  console.log(`技能可用性: ${canUse ? '✅' : '❌'} (TP: ${playerStore.playerA.tp})`);

  // 2. 测试被动技能 - 傲娇反击
  console.log('\n2. 测试傲娇反击（被动光环）');

  const 傲娇反击Skill = {
    id: '逢坂大河_傲娇反击',
    name: '傲娇反击',
    type: '被动光环' as const,
    effectId: '逢坂大河_傲娇反击'
  };

  // 3. 测试技能效果执行
  console.log('\n3. 测试技能效果执行');

  return {
    掌中老虎可用: canUse,
    playerAReputation: playerStore.playerA.reputation,
    playerATP: playerStore.playerA.tp,
    技能数据: [掌中老虎Skill, 傲娇反击Skill]
  };
}

export async function testSkillExecution() {
  console.log('\n=== 技能效果执行测试 ===');

  try {
    // 测试掌中老虎效果
    console.log('执行掌中老虎效果...');
    await runEffect('逢坂大河_掌中老虎', {
      event: 'onPlay',
      playerId: 'playerA',
      role: 'attacker'
    });
    console.log('✅ 掌中老虎效果执行成功');

    // 测试傲娇反击效果
    console.log('执行傲娇反击效果...');
    await runEffect('逢坂大河_傲娇反击', {
      event: 'onPlay',
      playerId: 'playerA',
      role: 'attacker'
    });
    console.log('✅ 傲娇反击效果执行成功');

    return { success: true };
  } catch (error) {
    console.error('❌ 技能效果执行失败:', error);
    return { success: false, error };
  }
}

export function testPersistentEffects() {
  console.log('\n=== 持久效果测试 ===');

  try {
    const persistentSystem = systemRegistry.getPersistentEffectSystem();

    // 检查现有效果
    const playerAEffects = persistentSystem.getAllEffects('playerA');
    console.log('playerA持久效果数量:', playerAEffects.length);

    playerAEffects.forEach((effect, index) => {
      console.log(`效果${index + 1}: ${effect.type} - ${effect.description}`);
    });

    return { effectCount: playerAEffects.length, effects: playerAEffects };
  } catch (error) {
    console.error('❌ 持久效果系统错误:', error);
    return { error };
  }
}