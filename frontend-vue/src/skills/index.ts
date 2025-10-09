/**
 * Skills System - Unified Entry Point
 *
 * 技能系统统一入口：
 * - 技能注册表和执行器
 * - 效果帮助函数
 * - 类型定义
 */

// 技能注册表和执行器
export {
  skillEffects,
  runEffect,
  getAvailableSkillIds,
  hasSkillEffect,
  getSkillCacheStats,
  clearSkillCache,
  resetSkillStats
} from './registry';

// 效果帮助函数和模式
export {
  getEffectHelpers,
  EffectPatterns,
  getEffectText,
  getTriggerText,
  type SkillEffect,
  type EffectId,
  type TriggerId
} from './utils';

// 技能库（向后兼容）
export { skillLibrary } from './library';