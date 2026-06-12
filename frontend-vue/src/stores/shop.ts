/**
 * shop 领域 store（S6 建立）：商店每日限购的真实计数。
 * 每个商品按本地日期记一条 { date, count }；跨天自动归零（读取时判定，不存定时器）。
 * 不触发存档（由门面统一控制）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ShopPurchaseRecord } from '@/infra/persistence';

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export const useShopStore = defineStore('shop', () => {
  /** key = ShopItem.id */
  const dailyPurchases = ref<Record<string, ShopPurchaseRecord>>({});

  /** 今日已购数量（过期记录视为 0）。 */
  function purchasedToday(itemId: string): number {
    const record = dailyPurchases.value[itemId];
    if (!record || record.date !== todayKey()) return 0;
    return record.count;
  }

  /** 今日剩余可购数。无限购的商品返回 Infinity。 */
  function remainingToday(itemId: string, dailyLimit?: number): number {
    if (!dailyLimit || dailyLimit <= 0) return Infinity;
    return Math.max(0, dailyLimit - purchasedToday(itemId));
  }

  function canPurchase(itemId: string, dailyLimit?: number): boolean {
    return remainingToday(itemId, dailyLimit) > 0;
  }

  function recordPurchase(itemId: string) {
    const today = todayKey();
    const record = dailyPurchases.value[itemId];
    if (record && record.date === today) {
      record.count++;
    } else {
      dailyPurchases.value[itemId] = { date: today, count: 1 };
    }
  }

  // --- 持久化装配 ---

  function serialize(): Record<string, ShopPurchaseRecord> {
    return dailyPurchases.value;
  }

  function deserialize(data: Record<string, ShopPurchaseRecord>) {
    dailyPurchases.value = data || {};
  }

  function reset() {
    dailyPurchases.value = {};
  }

  return {
    dailyPurchases,
    purchasedToday,
    remainingToday,
    canPurchase,
    recordPurchase,
    serialize,
    deserialize,
    reset,
  };
});
