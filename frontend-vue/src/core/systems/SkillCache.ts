/**
 * 技能系统结果缓存
 * 为130+技能效果添加智能缓存机制，减少重复计算
 */
import type { EffectContext } from '@/types/effects';

// 缓存键类型
interface CacheKey {
  effectId: string;
  playerId: string;
  cardId?: number;
  gameState?: string; // 游戏状态的简化哈希
  contextHash: string; // 上下文的哈希
}

// 缓存条目
interface CacheEntry {
  result: any;
  timestamp: number;
  hitCount: number;
  contextHash: string;
}

// 缓存配置
interface CacheConfig {
  maxSize: number; // 最大缓存条目数
  ttl: number; // 生存时间 (毫秒)
  enableProfiling: boolean; // 是否启用性能分析
}

export class SkillCache {
  private cache = new Map<string, CacheEntry>();
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalExecutions: 0
  };
  
  private config: CacheConfig = {
    maxSize: 1000, // 最多缓存1000个结果
    ttl: 30000, // 30秒过期
    enableProfiling: true
  };

  // 可缓存的效果ID - 只缓存纯函数式、无副作用的计算结果
  private cacheableEffects = new Set([
    'STRENGTH_PLUS_1',
    'STRENGTH_PLUS_2', 
    'STRENGTH_PLUS_3',
    'STRENGTH_CALCULATION',
    'SYNERGY_BONUS',
    'TYPE_MATCH_BONUS',
    'DEFENSIVE_BONUS',
    'COMBO_MULTIPLIER'
    // 可以添加更多确认为纯函数的效果
  ]);

  // 不可缓存的效果ID - 有状态变更或随机性的效果
  private uncacheableEffects = new Set([
    'DRAW_1',
    'DRAW_2', 
    'GAIN_TP_1',
    'GAIN_TP_2',
    'ADD_NOTIFICATION',
    'RANDOM_EFFECT',
    'STATE_CHANGE'
    // 任何有副作用的效果都不应缓存
  ]);

  /**
   * 检查效果是否可缓存
   */
  private isCacheable(effectId: string, ctx: EffectContext): boolean {
    // 明确标记为不可缓存的效果
    if (this.uncacheableEffects.has(effectId)) {
      return false;
    }

    // 明确标记为可缓存的效果
    if (this.cacheableEffects.has(effectId)) {
      return true;
    }

    // 对于未知效果，采用保守策略：只缓存只读计算
    // 通过效果ID的命名模式来判断
    const readOnlyPatterns = [
      /^(GET|CALC|CHECK|IS|HAS)_/,
      /_(BONUS|MULTIPLIER|VALUE)$/,
      /^STRENGTH_/,
      /^SYNERGY_/
    ];

    return readOnlyPatterns.some(pattern => pattern.test(effectId));
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(effectId: string, ctx: EffectContext): string {
    const contextData = {
      event: ctx.event,
      playerId: ctx.playerId,
      role: ctx.role,
      cardId: ctx.card?.id,
      // 只包含影响效果结果的关键状态信息
      clashPresent: !!ctx.clash
      // 注意: gameState 不在 EffectContext 中，需要从其他地方获取
    };

    const contextHash = this.hashObject(contextData);
    return `${effectId}:${contextHash}`;
  }

  /**
   * 简单的对象哈希函数
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32位整数
    }
    return hash.toString(36);
  }

  /**
   * 获取缓存的结果
   */
  async getCachedResult(
    effectId: string, 
    ctx: EffectContext, 
    executor: () => Promise<any>
  ): Promise<any> {
    this.stats.totalExecutions++;

    // 检查是否可缓存
    if (!this.isCacheable(effectId, ctx)) {
      return await executor();
    }

    const cacheKey = this.generateCacheKey(effectId, ctx);
    const now = Date.now();

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && (now - cached.timestamp) < this.config.ttl) {
      cached.hitCount++;
      this.stats.hits++;
      
      if (this.config.enableProfiling) {
        console.debug(`[SkillCache] Hit: ${effectId} (使用次数: ${cached.hitCount})`);
      }
      
      return cached.result;
    }

    // 缓存未命中，执行效果
    this.stats.misses++;
    const result = await executor();

    // 存储到缓存
    this.cache.set(cacheKey, {
      result,
      timestamp: now,
      hitCount: 1,
      contextHash: cacheKey.split(':')[1]
    });

    // 清理过期缓存
    this.cleanup();

    if (this.config.enableProfiling) {
      console.debug(`[SkillCache] Miss: ${effectId} - 结果已缓存`);
    }

    return result;
  }

  /**
   * 清理过期和超量的缓存条目
   */
  private cleanup(): void {
    const now = Date.now();
    
    // 删除过期条目
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.cache.delete(key);
        this.stats.evictions++;
      }
    }

    // 如果仍然超出大小限制，删除最少使用的条目
    if (this.cache.size > this.config.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].hitCount - b[1].hitCount); // 按使用次数排序
      
      const deleteCount = this.cache.size - this.config.maxSize;
      for (let i = 0; i < deleteCount; i++) {
        this.cache.delete(entries[i][0]);
        this.stats.evictions++;
      }
    }
  }

  /**
   * 手动清理所有缓存（如游戏重置时）
   */
  clearAll(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0, 
      evictions: 0,
      totalExecutions: 0
    };
  }

  /**
   * 获取缓存统计信息
   */
  getStats() {
    const hitRate = this.stats.totalExecutions > 0 
      ? (this.stats.hits / this.stats.totalExecutions * 100).toFixed(2)
      : '0.00';

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      cacheSize: this.cache.size,
      config: this.config
    };
  }

  /**
   * 更新缓存配置
   */
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * 预热缓存 - 在游戏开始时预计算常用效果
   */
  async warmup(commonEffects: string[], baseContext: EffectContext): Promise<void> {
    console.log('[SkillCache] 开始预热缓存...');
    
    for (const effectId of commonEffects) {
      if (this.isCacheable(effectId, baseContext)) {
        // 这里可以添加预计算逻辑
        // 但需要实际的执行器，暂时跳过
      }
    }
    
    console.log('[SkillCache] 缓存预热完成');
  }
}

// 导出单例实例
export const skillCache = new SkillCache();