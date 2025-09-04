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
 * 商店物品类型定义
 */
export interface ShopItem {
  id: string;
  type: 'card' | 'ticket' | 'currency' | 'booster';
  cardId?: number;
  cost: number;
  name: string;
  description: string;
  icon?: string;
  quantity?: number;
  dailyLimit?: number;
}

/**
 * 获取当前UP池的商店物品配置 - 扩展版本，包含更多商店物品类型
 */
export function getCurrentUpShopItems(gachaType: 'anime' | 'character'): ShopItem[] {
  try {
    // 当前UP卡牌 - 调整价格以匹配新的分解值系统
    const { urId, hrId } = getCurrentUpPool(gachaType);
    const upItems: ShopItem[] = [
      {
        id: `up_ur_${urId}`,
        type: 'card',
        cardId: urId,
        cost: 1500, // 从10000降至1500，约为7.5张UR分解价值
        name: `今日UP UR卡牌`,
        description: '当前轮换的UR稀有度卡牌',
      },
      {
        id: `up_hr_${hrId}`,
        type: 'card',
        cardId: hrId,
        cost: 800, // 从4000降至800，约为8张HR分解价值
        name: `今日UP HR卡牌`,
        description: '当前轮换的HR稀有度卡牌',
      }
    ];

    // 常规商店物品 - 重新平衡价格
    const regularItems: ShopItem[] = [
      // 抽卡券类 - 价格降低，更容易获得
      {
        id: `${gachaType}_ticket_1`,
        type: 'ticket',
        cost: 60, // 从300降至60，约为2-3张SR分解值
        name: `${gachaType === 'anime' ? '动画' : '角色'}抽卡券`,
        description: '用于进行抽卡的基础券种',
        quantity: 1,
        dailyLimit: 5,
      },
      {
        id: `${gachaType}_ticket_10`,
        type: 'ticket',
        cost: 550, // 从2800降至550，约10张券的9折优惠
        name: `${gachaType === 'anime' ? '动画' : '角色'}抽卡券包`,
        description: '10张抽卡券的优惠包装',
        quantity: 10,
        dailyLimit: 2,
      },

      // 增强道具类 - 价格略微降低，但数量重新平衡
      {
        id: 'exp_booster_small',
        type: 'booster',
        cost: 30, // 从150降至30
        name: '经验药水（小）',
        description: '增加50点经验值', // 从100降至50，保持性价比
        quantity: 50,
        dailyLimit: 10,
      },
      {
        id: 'exp_booster_large',
        type: 'booster',
        cost: 120, // 从500降至120
        name: '经验药水（大）',
        description: '增加250点经验值', // 从500降至250，保持性价比
        quantity: 250,
        dailyLimit: 3,
      },

      // 货币兑换类 - 重新设计为合理的循环经济
      {
        id: 'knowledge_pack_small',
        type: 'currency',
        cost: 40, // 从50降至40
        name: '知识点包（小）',
        description: '额外获得50知识点', // 从200降至50，投资回报率25%
        quantity: 50,
        dailyLimit: 20,
      },
      {
        id: 'knowledge_pack_large',
        type: 'currency',
        cost: 160, // 从200降至160
        name: '知识点包（大）',
        description: '额外获得200知识点', // 从1000降至200，投资回报率25%
        quantity: 200,
        dailyLimit: 5,
      }
    ];

    // 组合所有物品
    return [...upItems, ...regularItems];
  } catch (error) {
    console.warn('Failed to get UP shop items:', error);
    return [];
  }
}

/**
 * 获取历史UP卡牌商店物品（过去一周的UP卡牌）
 */
export function getHistoricalUpShopItems(gachaType: 'anime' | 'character'): ShopItem[] {
  try {
    const { urCards, hrCards } = getCachedFilteredCards(gachaType);
    const historicalItems: ShopItem[] = [];
    
    // 获取过去7天的UP卡牌
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // 计算该日期的UP卡牌索引
      const urIndex = (date.getDate() + date.getMonth()) % urCards.length;
      const hrIndex = (date.getDate() * 2 + date.getMonth() * 3) % hrCards.length;
      
      if (urCards[urIndex] && hrCards[hrIndex]) {
        historicalItems.push(
          {
            id: `historical_ur_${urCards[urIndex].id}_${i}`,
            type: 'card',
            cardId: urCards[urIndex].id,
            cost: 1800, // 从12000降至1800，比当前UP贵20%
            name: `过往UP UR卡牌`,
            description: `${i}天前的UP卡牌 (${date.toLocaleDateString()})`,
          },
          {
            id: `historical_hr_${hrCards[hrIndex].id}_${i}`,
            type: 'card',
            cardId: hrCards[hrIndex].id,
            cost: 960, // 从5000降至960，比当前UP贵20%
            name: `过往UP HR卡牌`,
            description: `${i}天前的UP卡牌 (${date.toLocaleDateString()})`,
          }
        );
      }
    }
    
    return historicalItems;
  } catch (error) {
    console.warn('Failed to get historical UP shop items:', error);
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