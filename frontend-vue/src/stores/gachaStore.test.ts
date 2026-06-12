/**
 * gachaStore 接线薄测试（S3 后规则在 engine/gacha，重测试见 engine/gacha/draw.test.ts）。
 * 只验证 store 的职责：持有保底状态、把 UP 池/配置/卡池接给 engine、写回新保底。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { mulberry32 } from '@/engine/rng';
import type { AnimeCard } from '@/types/card';

// 可变的 UP 池 mock：null = 轮换系统失败（gachaStore 会兜底为无 UP 池）
let mockUpPool: { urId: number; hrId: number } | null = null;
vi.mock('@/utils/gachaRotation', () => ({
  getCurrentUpPool: () => {
    if (!mockUpPool) throw new Error('no up pool (mock)');
    return mockUpPool;
  },
}));

import { useGachaStore } from './gachaStore';
import { useGameDataStore } from './gameDataStore';

const mk = (id: number, rarity: string): AnimeCard =>
  ({ id, name: `卡${id}`, rarity }) as unknown as AnimeCard;

function buildPool(): AnimeCard[] {
  const pool: AnimeCard[] = [];
  pool.push(mk(1101, 'UR'), mk(1102, 'UR'));
  pool.push(mk(1201, 'HR'));
  for (let i = 0; i < 8; i++) pool.push(mk(1300 + i, 'SSR'));
  for (let i = 0; i < 20; i++) pool.push(mk(1400 + i, 'SR'));
  for (let i = 0; i < 30; i++) pool.push(mk(1500 + i, 'R'));
  pool.push(mk(900001, 'UR'), mk(900002, 'HR'));
  return pool;
}

beforeEach(() => {
  setActivePinia(createPinia());
  mockUpPool = null;
  useGameDataStore().allAnimeCards = buildPool();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('保底状态归属 gacha 域', () => {
  it('保底计数随抽卡推进并保存在 gachaStore 自身状态里', () => {
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(99));
    const gacha = useGachaStore();
    expect(gacha.animePity.totalPulls).toBe(0);

    gacha.performGachaLogic('anime', 5);
    expect(gacha.animePity.totalPulls).toBe(5);
    expect(gacha.characterPity.totalPulls).toBe(0); // 两池独立

    gacha.performGachaLogic('anime', 5);
    expect(gacha.animePity.totalPulls).toBe(10);
  });

  it('69 抽后下一抽触发保底 UP，并把归零后的状态写回 store', () => {
    mockUpPool = { urId: 900001, hrId: 900002 };
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(777));
    const gacha = useGachaStore();
    gacha.animePity = { totalPulls: 69, pullsSinceLastHR: 69 };

    const result = gacha.performGachaLogic('anime', 1);
    expect([900001, 900002]).toContain(result[0].id);
    expect(gacha.animePity.pullsSinceLastHR).toBe(0);
  });

  it('resetPity 双池归零', () => {
    const gacha = useGachaStore();
    gacha.animePity = { totalPulls: 9, pullsSinceLastHR: 9 };
    gacha.characterPity = { totalPulls: 3, pullsSinceLastHR: 3 };
    gacha.resetPity();
    expect(gacha.animePity).toEqual({ totalPulls: 0, pullsSinceLastHR: 0 });
    expect(gacha.characterPity).toEqual({ totalPulls: 0, pullsSinceLastHR: 0 });
  });
});

describe('UP 轮换失败兜底', () => {
  it('getCurrentUpPool 抛错时按无 UP 池抽取（不会崩，保底不触发 UP）', () => {
    mockUpPool = null; // mock 将抛错
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // 恒 R 档
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const gacha = useGachaStore();
    gacha.animePity = { totalPulls: 100, pullsSinceLastHR: 100 }; // 已超保底线

    const result = gacha.performGachaLogic('anime', 1);
    expect(result).toHaveLength(1);
    expect(result[0].rarity).toBe('R'); // 无 UP 池 → 保底分支不生效，正常掉落
  });
});
