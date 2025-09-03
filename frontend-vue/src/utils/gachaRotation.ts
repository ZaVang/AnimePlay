import { useGameDataStore } from '@/stores/gameDataStore';
import type { Card, AnimeCard, CharacterCard } from '@/types/card';

// 类型守卫函数
export function isAnimeCard(card: Card): card is AnimeCard {
  return 'cost' in card;
}

export function isCharacterCard(card: Card): card is CharacterCard {
  return 'activeSkillId' in card && 'passiveSkillId' in card;
}

// 缓存接口定义
interface CachedUpPool {
  gachaType: 'anime' | 'character';
  dateKey: string;
  urId: number;
  hrId: number;
  urCards: Card[];
  hrCards: Card[];
}

interface CachedRotationTimer {
  dateKey: string;
  hours: number;
  minutes: number;
  timestamp: number;
}

// 缓存存储
const upPoolCache = new Map<string, CachedUpPool>();
const rotationTimerCache = new Map<string, CachedRotationTimer>();
const cardFilterCache = new Map<string, { urCards: Card[]; hrCards: Card[]; timestamp: number }>();

// 缓存过期时间 (5分钟)
const CACHE_TTL = 5 * 60 * 1000;

/**
 * 获取今日的日期键，用于缓存标识
 */
function getTodayDateKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
}

/**
 * 获取缓存键
 */
function getCacheKey(gachaType: 'anime' | 'character', dateKey: string): string {
  return `${gachaType}-${dateKey}`;
}

/**
 * 获取或缓存筛选后的卡片
 */
function getCachedFilteredCards(gachaType: 'anime' | 'character'): { urCards: Card[]; hrCards: Card[] } {
  const cacheKey = `${gachaType}-cards`;
  const cached = cardFilterCache.get(cacheKey);
  
  // 检查缓存是否有效（5分钟内）
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return { urCards: cached.urCards, hrCards: cached.hrCards };
  }
  
  // 重新获取并筛选卡片
  const gameDataStore = useGameDataStore();
  const allCards = gachaType === 'anime' ? gameDataStore.allAnimeCards : gameDataStore.allCharacterCards;
  
  const urCards = allCards.filter(card => card.rarity === 'UR');
  const hrCards = allCards.filter(card => card.rarity === 'HR');
  
  // 缓存结果
  cardFilterCache.set(cacheKey, {
    urCards,
    hrCards,
    timestamp: Date.now()
  });
  
  return { urCards, hrCards };
}

/**
 * 获取当前轮换的UP卡池 (优化版本，带缓存)
 * 基于日期计算，每天轮换不同的UR和HR卡组合
 */
export function getCurrentUpPool(gachaType: 'anime' | 'character'): { urId: number; hrId: number } {
  const dateKey = getTodayDateKey();
  const cacheKey = getCacheKey(gachaType, dateKey);
  
  // 检查缓存
  const cached = upPoolCache.get(cacheKey);
  if (cached) {
    return { urId: cached.urId, hrId: cached.hrId };
  }
  
  // 获取筛选后的卡片（带缓存）
  const { urCards, hrCards } = getCachedFilteredCards(gachaType);
  
  // 如果没有足够的卡片，返回默认配置
  if (urCards.length === 0 || hrCards.length === 0) {
    const defaultPool = gachaType === 'anime' 
      ? { urId: 326, hrId: 876 }  // 假设876是HR卡
      : { urId: 12393, hrId: 304 };
    
    // 缓存默认配置
    upPoolCache.set(cacheKey, {
      gachaType,
      dateKey,
      ...defaultPool,
      urCards: [],
      hrCards: []
    });
    
    return defaultPool;
  }
  
  // 获取当前日期
  const now = new Date();
  
  // 计算UR卡索引 (使用日期 + 月份作为种子)
  const urIndex = (now.getDate() + now.getMonth()) % urCards.length;
  
  // 计算HR卡索引 (使用不同的种子避免重复模式)
  const hrIndex = (now.getDate() * 2 + now.getMonth() * 3) % hrCards.length;
  
  const result = {
    urId: urCards[urIndex].id,
    hrId: hrCards[hrIndex].id
  };
  
  // 缓存结果
  upPoolCache.set(cacheKey, {
    gachaType,
    dateKey,
    ...result,
    urCards: urCards.slice(), // 浅拷贝避免引用问题
    hrCards: hrCards.slice()
  });
  
  return result;
}

/**
 * 获取一年中的第几天
 */
function getDayOfYear(date: Date): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * 获取UP池轮换的剩余时间（到下一个轮换的小时数）- 优化版本，带缓存
 */
export function getTimeUntilNextRotation(): { hours: number; minutes: number } {
  const dateKey = getTodayDateKey();
  const cached = rotationTimerCache.get(dateKey);
  
  // 检查缓存是否有效（1分钟内）
  if (cached && (Date.now() - cached.timestamp) < 60000) {
    return { hours: cached.hours, minutes: cached.minutes };
  }
  
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const timeDiff = tomorrow.getTime() - now.getTime();
  const hours = Math.floor(timeDiff / (1000 * 60 * 60));
  const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
  
  const result = { hours, minutes };
  
  // 缓存结果（1分钟缓存，因为时间变化频繁）
  rotationTimerCache.set(dateKey, {
    dateKey,
    ...result,
    timestamp: Date.now()
  });
  
  return result;
}

/**
 * 获取当前UP池的商店物品配置 - 优化版本，复用UP池缓存
 */
export function getCurrentUpShopItems(gachaType: 'anime' | 'character'): Array<{ Id: number; cost: number }> {
  try {
    // 直接复用已缓存的UP池结果
    const { urId, hrId } = getCurrentUpPool(gachaType);
    return [
      { Id: urId, cost: 10000 }, // UR卡价格
      { Id: hrId, cost: 4000 }   // HR卡价格
    ];
  } catch (error) {
    console.warn('Failed to get UP shop items:', error);
    return [];
  }
}

/**
 * 清理过期缓存
 * 建议在应用启动时或定时调用，防止内存泄漏
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  const currentDateKey = getTodayDateKey();
  
  // 清理过期的UP池缓存
  for (const [key, value] of upPoolCache.entries()) {
    if (value.dateKey !== currentDateKey) {
      upPoolCache.delete(key);
    }
  }
  
  // 清理过期的轮换计时器缓存
  for (const [key, value] of rotationTimerCache.entries()) {
    if (value.dateKey !== currentDateKey || (now - value.timestamp) > 60000) {
      rotationTimerCache.delete(key);
    }
  }
  
  // 清理过期的卡片筛选缓存
  for (const [key, value] of cardFilterCache.entries()) {
    if ((now - value.timestamp) > CACHE_TTL) {
      cardFilterCache.delete(key);
    }
  }
}

/**
 * 手动清空所有缓存
 * 用于调试或强制刷新
 */
export function clearAllCache(): void {
  upPoolCache.clear();
  rotationTimerCache.clear();
  cardFilterCache.clear();
}

/**
 * 获取缓存统计信息
 * 用于调试和监控
 */
export function getCacheStats(): {
  upPoolCacheSize: number;
  rotationTimerCacheSize: number;
  cardFilterCacheSize: number;
} {
  return {
    upPoolCacheSize: upPoolCache.size,
    rotationTimerCacheSize: rotationTimerCache.size,
    cardFilterCacheSize: cardFilterCache.size
  };
}

/**
 * 获取轮换历史（过去7天和未来7天的UP卡组合）
 */
export function getRotationSchedule(days: number = 7): Array<{
  date: Date;
  urId: number;
  hrId: number;
  isToday: boolean;
}> {
  const schedule = [];
  const today = new Date();
  
  // 获取过去几天和未来几天的轮换
  for (let i = -days; i <= days; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    
    // 模拟那一天的计算
    const urIndex = (date.getDate() + date.getMonth()) % 10; // 假设有10张UR
    const hrIndex = (date.getDate() * 2 + date.getMonth() * 3) % 10; // 假设有10张HR
    
    schedule.push({
      date: new Date(date),
      urId: urIndex + 1, // 简化示例，实际应该从真实卡片数组计算
      hrId: hrIndex + 100, // 简化示例
      isToday: i === 0
    });
  }
  
  return schedule;
}