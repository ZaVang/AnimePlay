/**
 * 技能缓存性能监控工具
 * 用于开发环境查看缓存统计信息
 */

import { getSkillCacheStats, clearSkillCache, resetSkillStats } from '@/skills';

/**
 * 打印缓存统计信息到控制台
 */
export function printSkillCacheStats(): void {
  const stats = getSkillCacheStats();

  console.log('┌─────────────────────────────────────────┐');
  console.log('│     技能系统缓存统计 (Skill Cache)     │');
  console.log('├─────────────────────────────────────────┤');
  console.log('│ 缓存性能统计                            │');
  console.log(`│  - 缓存命中:     ${String(stats.cacheHits).padStart(6)} 次`);
  console.log(`│  - 缓存未命中:   ${String(stats.cacheMisses).padStart(6)} 次`);
  console.log(`│  - 命中率:       ${String(stats.cacheHitRate).padStart(10)}`);
  console.log(`│  - 当前大小:     ${String(stats.cacheSize).padStart(6)} 项`);
  console.log(`│  - 最大容量:     ${String(stats.cacheMaxSize).padStart(6)} 项`);
  console.log('├─────────────────────────────────────────┤');
  console.log('│ 执行统计                                │');
  console.log(`│  - 总执行次数:   ${String(stats.totalExecutions).padStart(6)} 次`);
  console.log(`│  - 成功执行:     ${String(stats.successfulExecutions).padStart(6)} 次`);
  console.log(`│  - 执行失败:     ${String(stats.failedExecutions).padStart(6)} 次`);
  console.log(`│  - 未找到技能:   ${String(stats.notFoundCount).padStart(6)} 次`);
  console.log(`│  - 成功率:       ${String(stats.successRate).padStart(10)}`);
  console.log('└─────────────────────────────────────────┘');
}

/**
 * 启动定时监控
 * @param intervalMs 监控间隔（毫秒）
 * @returns 停止函数
 */
export function startCacheMonitor(intervalMs: number = 30000): () => void {
  console.log(`[SkillCache] 开始监控，间隔 ${intervalMs}ms`);

  const intervalId = setInterval(() => {
    printSkillCacheStats();
  }, intervalMs);

  return () => {
    clearInterval(intervalId);
    console.log('[SkillCache] 停止监控');
  };
}

/**
 * 性能建议分析
 */
export function analyzeCachePerformance(): void {
  const stats = getSkillCacheStats();
  const hitRate = parseFloat(stats.cacheHitRate);

  console.log('\n📊 缓存性能分析:');

  if (hitRate >= 90) {
    console.log('✅ 优秀 - 缓存命中率 ≥ 90%，性能表现出色');
  } else if (hitRate >= 70) {
    console.log('✔️  良好 - 缓存命中率 ≥ 70%，性能正常');
  } else if (hitRate >= 50) {
    console.log('⚠️  一般 - 缓存命中率 ≥ 50%，建议检查技能使用模式');
  } else {
    console.log('❌ 较差 - 缓存命中率 < 50%，可能需要增加缓存容量');
  }

  // 缓存利用率
  const utilizationRate = (stats.cacheSize / stats.cacheMaxSize) * 100;
  console.log(`\n📦 缓存利用率: ${utilizationRate.toFixed(1)}%`);

  if (utilizationRate >= 90) {
    console.log('💡 建议: 缓存接近满载，考虑增加缓存容量');
  }

  // 失败率分析
  if (stats.failedExecutions > 0) {
    const failureRate = (stats.failedExecutions / stats.totalExecutions) * 100;
    console.log(`\n⚠️  执行失败率: ${failureRate.toFixed(2)}%`);
    console.log('   建议: 检查技能实现代码中的错误处理');
  }

  // 未找到技能警告
  if (stats.notFoundCount > 0) {
    console.log(`\n🔍 发现 ${stats.notFoundCount} 次技能ID未找到`);
    console.log('   建议: 检查技能ID绑定是否正确');
  }

  console.log('');
}

// 开发环境下暴露到全局
if (import.meta.env.DEV) {
  (window as any).__skillCacheDebug = {
    printStats: printSkillCacheStats,
    analyze: analyzeCachePerformance,
    clearCache: clearSkillCache,
    resetStats: resetSkillStats,
    startMonitor: startCacheMonitor
  };

  console.log('💡 技能缓存调试工具已挂载到 window.__skillCacheDebug');
  console.log('   可用命令:');
  console.log('   - __skillCacheDebug.printStats()  - 打印统计信息');
  console.log('   - __skillCacheDebug.analyze()     - 性能分析');
  console.log('   - __skillCacheDebug.clearCache()  - 清空缓存');
  console.log('   - __skillCacheDebug.resetStats()  - 重置统计');
  console.log('   - __skillCacheDebug.startMonitor(30000) - 启动监控');
}
