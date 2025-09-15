/**
 * Skills Library - 技能库
 * 向后兼容的技能数据导出
 */

import type { Skill } from '@/types/skill';
import { urCharacterSkills } from '@/data/urCharacterSkills';

/**
 * 技能库
 * 主要包含 UR 角色技能数据
 */
export const skillLibrary: Skill[] = [
  // UR 角色技能
  ...urCharacterSkills,
];
