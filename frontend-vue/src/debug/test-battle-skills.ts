/**
 * 战斗中的技能测试
 * 模拟真实战斗场景，测试逢坂大河技能是否生效
 */

import { useGameStore, usePlayerStore, useHistoryStore } from '@/stores/battle';
import { useGameDataStore } from '@/stores/gameDataStore';
import { SkillSystem } from '@/core/systems/SkillSystem';
import { systemRegistry } from '@/core/di/registry';

export async function simulateTaigaBattle() {
  console.log('=== 逢坂大河战斗技能测试 ===\n');

  const gameStore = useGameStore();
  const playerStore = usePlayerStore();
  const historyStore = useHistoryStore();
  const gameDataStore = useGameDataStore();

  try {
    // 1. 初始化测试战斗状态
    console.log('1. 初始化战斗状态...');

    // 重置游戏状态
    gameStore.$reset();
    playerStore.$reset();
    historyStore.$reset();

    // 设置逢坂大河为playerA的角色
    const taigaCharacter = gameDataStore.getCharacterById(1762);
    if (!taigaCharacter) {
      console.error('❌ 未找到逢坂大河角色数据');
      return { error: '角色数据未找到' };
    }

    console.log('✅ 找到逢坂大河:', taigaCharacter.name);

    // 设置角色到角色槽
    playerStore.playerA.characters = [
      taigaCharacter,
      null,
      null
    ];
    playerStore.playerA.activeCharacterIndex = 0;
    playerStore.playerA.name = '测试玩家A';
    playerStore.playerA.tp = 10; // 给足够的TP

    // 设置对手
    playerStore.playerB.name = '测试玩家B';
    playerStore.playerB.reputation = 50;

    // 2. 测试掌中老虎技能触发条件
    console.log('\n2. 测试掌中老虎技能...');

    // 模拟声望受损（低于30）
    playerStore.playerA.reputation = 25;
    console.log(`设置playerA声望为: ${playerStore.playerA.reputation}`);

    // 获取掌中老虎技能
    const taigaSkills = taigaCharacter.skills || [];
    const 掌中老虎 = taigaSkills.find(skill => skill.id === '逢坂大河_掌中老虎');

    if (!掌中老虎) {
      console.error('❌ 未找到掌中老虎技能');
      return { error: '技能未找到' };
    }

    console.log('✅ 找到掌中老虎技能:', 掌中老虎);

    // 3. 测试技能使用
    console.log('\n3. 使用掌中老虎技能...');

    const canUse = SkillSystem.canUseSkill('playerA', 掌中老虎);
    console.log(`技能可用性: ${canUse ? '✅' : '❌'}`);

    if (canUse) {
      await SkillSystem.useSkill('playerA', 掌中老虎);
      console.log('✅ 技能使用成功');

      // 检查效果是否生效
      const persistentSystem = systemRegistry.getPersistentEffectSystem();
      const effects = persistentSystem.getAllEffects('playerA');
      console.log('当前持久效果数量:', effects.length);

      effects.forEach((effect, index) => {
        console.log(`效果${index + 1}: ${effect.type} - ${effect.description}`);
      });
    }

    // 4. 测试傲娇反击被动技能
    console.log('\n4. 测试傲娇反击被动技能...');

    const 傲娇反击 = taigaSkills.find(skill => skill.id === '逢坂大河_傲娇反击');
    if (傲娇反击) {
      console.log('✅ 找到傲娇反击技能:', 傲娇反击);

      // 被动技能应该在角色激活时自动应用
      if (傲娇反击.effectId) {
        await SkillSystem.useSkill('playerA', 傲娇反击);
        console.log('✅ 傲娇反击被动效果已应用');
      }
    }

    return {
      success: true,
      character: taigaCharacter,
      skills: taigaSkills,
      effects: systemRegistry.getPersistentEffectSystem().getAllEffects('playerA'),
      playerState: {
        reputation: playerStore.playerA.reputation,
        tp: playerStore.playerA.tp
      }
    };

  } catch (error) {
    console.error('❌ 战斗技能测试失败:', error);
    return { success: false, error };
  }
}

export function testSkillEffectVisibility() {
  console.log('\n=== 技能效果可见性测试 ===');

  const persistentSystem = systemRegistry.getPersistentEffectSystem();

  // 检查所有玩家的效果
  ['playerA', 'playerB'].forEach(playerId => {
    const effects = persistentSystem.getAllEffects(playerId as any);
    console.log(`${playerId} 效果数量: ${effects.length}`);

    effects.forEach((effect, index) => {
      console.log(`  ${index + 1}. ${effect.type} (持续${effect.duration}回合) - ${effect.description}`);
    });
  });

  // 测试强度加成检查
  const playerStore = usePlayerStore();
  const activeChar = playerStore.getActiveCharacter('playerA');
  if (activeChar) {
    const strengthBonus = SkillSystem.getAuraStrengthBonus(null, 'playerA');
    console.log(`当前强度加成: ${strengthBonus}`);
  }

  return {
    playerAEffects: persistentSystem.getAllEffects('playerA'),
    playerBEffects: persistentSystem.getAllEffects('playerB'),
    activeCharacter: activeChar
  };
}