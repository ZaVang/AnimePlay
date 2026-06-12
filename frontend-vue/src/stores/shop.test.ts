/**
 * 商店每日限购测试（S6）。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useShopStore } from './shop';

beforeEach(() => {
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('每日限购计数', () => {
  it('无限购商品恒可购（剩余 Infinity）', () => {
    const shop = useShopStore();
    expect(shop.remainingToday('up_ur_326')).toBe(Infinity);
    expect(shop.canPurchase('up_ur_326', undefined)).toBe(true);
  });

  it('计数到上限后不可再购', () => {
    const shop = useShopStore();
    expect(shop.remainingToday('anime_ticket_1', 5)).toBe(5);
    for (let i = 0; i < 5; i++) {
      expect(shop.canPurchase('anime_ticket_1', 5)).toBe(true);
      shop.recordPurchase('anime_ticket_1');
    }
    expect(shop.remainingToday('anime_ticket_1', 5)).toBe(0);
    expect(shop.canPurchase('anime_ticket_1', 5)).toBe(false);
  });

  it('不同商品独立计数', () => {
    const shop = useShopStore();
    shop.recordPurchase('a');
    shop.recordPurchase('a');
    expect(shop.purchasedToday('a')).toBe(2);
    expect(shop.purchasedToday('b')).toBe(0);
  });

  it('跨天自动归零（读取时判定）', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 12, 23, 50));
    const shop = useShopStore();
    shop.recordPurchase('exp_booster_small');
    shop.recordPurchase('exp_booster_small');
    expect(shop.remainingToday('exp_booster_small', 10)).toBe(8);

    vi.setSystemTime(new Date(2026, 5, 13, 0, 10)); // 次日
    expect(shop.purchasedToday('exp_booster_small')).toBe(0);
    expect(shop.remainingToday('exp_booster_small', 10)).toBe(10);

    shop.recordPurchase('exp_booster_small'); // 新的一天重新记
    expect(shop.purchasedToday('exp_booster_small')).toBe(1);
  });

  it('序列化往返保真', () => {
    const shop = useShopStore();
    shop.recordPurchase('x');
    const data = JSON.parse(JSON.stringify(shop.serialize()));
    shop.reset();
    expect(shop.purchasedToday('x')).toBe(0);
    shop.deserialize(data);
    expect(shop.purchasedToday('x')).toBe(1);
  });
});
