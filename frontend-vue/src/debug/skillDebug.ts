/**
 * 技能系统调试工具
 * 在开发环境中可以在浏览器控制台使用
 */

import { skillEffects, getAvailableSkillIds } from '@/skills/registry';
import { useGameDataStore } from '@/stores/gameDataStore';

export function debugSkillSystem() {
  console.log('=== 技能系统调试信息 ===');

  // 1. 检查技能注册表
  const registeredSkills = getAvailableSkillIds();
  console.log('已注册技能数量:', registeredSkills.length);
  console.log('前10个技能ID:', registeredSkills.slice(0, 10));

  // 2. 检查泉此方技能
  const konataSkills = registeredSkills.filter(id => id.includes('泉此方'));
  console.log('泉此方技能:', konataSkills);

  // 3. 检查技能数据源
  const gameDataStore = useGameDataStore();
  console.log('游戏数据中的技能数量:', gameDataStore.allSkills.length);

  // 4. 检查具体技能
  if (konataSkills.length > 0) {
    const skillId = konataSkills[0];
    const skillData = gameDataStore.getSkillById(skillId);
    console.log(`技能数据 [${skillId}]:`, skillData);
    console.log(`技能函数存在:`, typeof skillEffects[skillId] === 'function');
  }

  // 5. 检查UR技能
  const urSkills = registeredSkills.filter(id => id.includes('_'));
  console.log('UR技能示例 (前5个):', urSkills.slice(0, 5));

  return {
    registeredSkills,
    konataSkills,
    urSkills: urSkills.length,
    totalSkills: gameDataStore.allSkills.length
  };
}

// 全局暴露调试函数
if (import.meta.env.DEV) {
  (window as any).debugSkillSystem = debugSkillSystem;
  console.log('技能调试函数已注册到 window.debugSkillSystem()');
}