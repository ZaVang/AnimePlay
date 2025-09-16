/**
 * 技能注册测试脚本
 * 用于验证特定角色的技能是否正确注册
 */

import { skillEffects, getRegistryInfo, hasSkillEffect } from '../skills/registry';

// 测试逢坂大河的技能注册
export function testAisakaTaigaSkills() {
  console.log('=== 逢坂大河技能注册测试 ===');

  const skills = [
    '逢坂大河_掌中老虎',
    '逢坂大河_傲娇反击'
  ];

  const results = {
    registryInfo: getRegistryInfo(),
    skillTests: [] as any[]
  };

  skills.forEach(skillId => {
    const isRegistered = hasSkillEffect(skillId);
    const effect = skillEffects[skillId];

    results.skillTests.push({
      skillId,
      isRegistered,
      hasFunction: typeof effect === 'function',
      functionSource: effect ? effect.toString().substring(0, 100) + '...' : null
    });

    console.log(`技能 ${skillId}: ${isRegistered ? '✅ 已注册' : '❌ 未注册'}`);
    if (isRegistered) {
      console.log(`  函数类型: ${typeof effect}`);
    }
  });

  console.log('\n=== 注册表信息 ===');
  console.log(`模块数量: ${results.registryInfo.moduleCount}`);
  console.log(`技能数量: ${results.registryInfo.skillCount}`);
  console.log('模块路径:', results.registryInfo.modulePaths);
  console.log('技能ID示例:', results.registryInfo.skillIds);

  return results;
}

// 检查所有技能是否匹配角色技能数据
export function validateSkillMapping() {
  console.log('\n=== 验证技能映射 ===');

  const registeredSkills = Object.keys(skillEffects);
  const aisakaTaigaSkills = registeredSkills.filter(id => id.includes('逢坂大河'));

  console.log('逢坂大河相关技能:', aisakaTaigaSkills);

  return {
    totalRegistered: registeredSkills.length,
    aisakaTaigaCount: aisakaTaigaSkills.length,
    aisakaTaigaSkills
  };
}