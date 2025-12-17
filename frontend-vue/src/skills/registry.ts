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
import { LRUCache } from '@/core/cache/LRUCache';

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
 * 技能效果LRU缓存
 * 缓存最近使用的技能效果函数，提升查找性能
 */
const skillEffectCache = new LRUCache<string, SkillEffect>(150);

/**
 * 技能执行统计
 */
let executionStats = {
  totalExecutions: 0,
  successfulExecutions: 0,
  failedExecutions: 0,
  notFoundCount: 0
};

/**
 * 执行技能效果（带缓存优化）
 * @param effectId 技能效果标识符
 * @param context 效果执行上下文
 */
export async function runEffect(effectId: string, context: EffectContext): Promise<void> {
  executionStats.totalExecutions++;

  // 尝试从缓存获取
  let effect = skillEffectCache.get(effectId);

  // 缓存未命中，从注册表查找
  if (!effect) {
    effect = skillEffects[effectId];

    if (!effect) {
      console.warn(`技能效果 "${effectId}" 未找到`);
      executionStats.notFoundCount++;
      return;
    }

    // 加入缓存
    skillEffectCache.set(effectId, effect);
  }

  try {
    await effect(context);
    executionStats.successfulExecutions++;
  } catch (error) {
    console.error(`执行技能效果 "${effectId}" 时出错:`, error);
    executionStats.failedExecutions++;
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
 * 获取技能缓存统计
 */
export function getSkillCacheStats() {
  const cacheStats = skillEffectCache.getStats();

  return {
    // 缓存统计
    cacheHits: cacheStats.hits,
    cacheMisses: cacheStats.misses,
    cacheHitRate: cacheStats.hitRate,
    cacheSize: cacheStats.size,
    cacheMaxSize: cacheStats.maxSize,

    // 执行统计
    totalExecutions: executionStats.totalExecutions,
    successfulExecutions: executionStats.successfulExecutions,
    failedExecutions: executionStats.failedExecutions,
    notFoundCount: executionStats.notFoundCount,

    // 成功率
    successRate: executionStats.totalExecutions > 0
      ? ((executionStats.successfulExecutions / executionStats.totalExecutions) * 100).toFixed(2) + '%'
      : '0%'
  };
}

/**
 * 清理技能缓存
 */
export function clearSkillCache(): void {
  skillEffectCache.clear();
  console.log('[SkillRegistry] 技能缓存已清理');
}

/**
 * 重置统计信息
 */
export function resetSkillStats(): void {
  skillEffectCache.resetStats();
  executionStats = {
    totalExecutions: 0,
    successfulExecutions: 0,
    failedExecutions: 0,
    notFoundCount: 0
  };
  console.log('[SkillRegistry] 统计信息已重置');
}

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