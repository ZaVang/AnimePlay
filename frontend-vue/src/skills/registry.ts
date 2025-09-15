/**
 * Skills Registry - 技能注册表和执行器
 *
 * 负责：
 * - 自动导入所有角色技能
 * - 提供技能执行接口
 * - 管理技能缓存
 */

import type { EffectContext } from '@/types/effects';
import type { SkillEffect } from './utils';

/**
 * 自动导入所有角色技能文件
 * 使用 Vite 的 glob import 功能
 */
const characterModules = import.meta.glob('./characters/*.ts', {
  eager: true
}) as Record<string, any>;

/**
 * 合并所有角色技能到统一注册表
 */
function createSkillRegistry(): Record<string, SkillEffect> {
  const registry: Record<string, SkillEffect> = {};

  // 处理所有角色模块
  for (const [path, module] of Object.entries(characterModules)) {
    // 查找以 "Skills" 结尾的导出
    for (const [exportName, exportValue] of Object.entries(module)) {
      if (exportName.endsWith('Skills') && typeof exportValue === 'object') {
        Object.assign(registry, exportValue);
      }
    }
  }

  return registry;
}

/**
 * 技能效果注册表
 * 映射技能ID到效果函数
 */
export const skillEffects = createSkillRegistry();

/**
 * 执行技能效果
 * @param effectId 技能效果标识符
 * @param context 效果执行上下文
 */
export async function runEffect(effectId: string, context: EffectContext): Promise<void> {
  const effect = skillEffects[effectId];

  if (!effect) {
    console.warn(`技能效果 "${effectId}" 未找到`);
    return;
  }

  try {
    await effect(context);
  } catch (error) {
    console.error(`执行技能效果 "${effectId}" 时出错:`, error);
  }
}

/**
 * 获取所有可用的技能ID
 */
export function getAvailableSkillIds(): string[] {
  return Object.keys(skillEffects);
}

/**
 * 检查技能效果是否存在
 */
export function hasSkillEffect(effectId: string): boolean {
  return effectId in skillEffects;
}

/**
 * 获取技能缓存统计（占位符实现）
 */
export const getSkillCacheStats = () => ({
  hits: 0,
  misses: 0,
  evictions: 0,
  totalExecutions: 0,
  hitRate: '0%',
  cacheSize: 0
});

/**
 * 清理技能缓存（占位符实现）
 */
export const clearSkillCache = () => console.log('技能缓存已清理');

/**
 * 获取自动导入信息（调试用）
 */
export function getRegistryInfo() {
  return {
    moduleCount: Object.keys(characterModules).length,
    modulePaths: Object.keys(characterModules),
    skillCount: Object.keys(skillEffects).length,
    skillIds: Object.keys(skillEffects).slice(0, 10) // 显示前10个技能ID
  };
}