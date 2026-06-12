/**
 * 抽卡逻辑特征测试（S1 安全网）。
 * 锁死：稀有度概率分布（权重归一化）、70 抽 UP 保底、66% UP 替换、十连保底 SSR。
 * 当前逻辑在 Pinia store 内且直接用 Math.random（S3 迁入 engine/gacha 并注入 RNG），
 * 此处用 mulberry32 种子接管 Math.random 获得确定性；S3 后改为直接注入 createSeededRng。
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
import { useUserStore } from './userStore';

const mk = (id: number, rarity: string): AnimeCard =>
  ({ id, name: `卡${id}`, rarity }) as unknown as AnimeCard;

/** 构造测试卡池：普通卡 + UP 卡（900001 UR / 900002 HR）+ N 卡（不应被抽到） */
function buildPool(): AnimeCard[] {
  const pool: AnimeCard[] = [];
  pool.push(mk(1101, 'UR'), mk(1102, 'UR'));
  pool.push(mk(1201, 'HR'), mk(1202, 'HR'), mk(1203, 'HR'));
  for (let i = 0; i < 8; i++) pool.push(mk(1300 + i, 'SSR'));
  for (let i = 0; i < 20; i++) pool.push(mk(1400 + i, 'SR'));
  for (let i = 0; i < 30; i++) pool.push(mk(1500 + i, 'R'));
  for (let i = 0; i < 10; i++) pool.push(mk(1600 + i, 'N')); // p=0，永不应出现
  pool.push(mk(900001, 'UR'), mk(900002, 'HR')); // UP 卡也在池内
  return pool;
}

beforeEach(() => {
  setActivePinia(createPinia());
  mockUpPool = null;
  const gameData = useGameDataStore();
  gameData.allAnimeCards = buildPool();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('稀有度概率分布（权重 UR0.5/HR2.5/SSR7/SR20/R30，N=0）', () => {
  it('6000 抽的频率落在理论概率附近，且 N 卡零出现', () => {
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(12345));
    const gacha = useGachaStore();
    const result = gacha.performGachaLogic('anime', 6000);
    expect(result).toHaveLength(6000);

    const freq: Record<string, number> = {};
    for (const c of result) freq[c.rarity] = (freq[c.rarity] || 0) + 1;
    const pct = (r: string) => ((freq[r] || 0) / 6000) * 100;

    expect(pct('UR')).toBeGreaterThan(0.83 - 0.6);
    expect(pct('UR')).toBeLessThan(0.83 + 0.6);
    expect(pct('HR')).toBeGreaterThan(4.17 - 1.2);
    expect(pct('HR')).toBeLessThan(4.17 + 1.2);
    expect(pct('SSR')).toBeGreaterThan(11.67 - 1.8);
    expect(pct('SSR')).toBeLessThan(11.67 + 1.8);
    expect(pct('SR')).toBeGreaterThan(33.33 - 2.5);
    expect(pct('SR')).toBeLessThan(33.33 + 2.5);
    expect(pct('R')).toBeGreaterThan(50 - 2.5);
    expect(pct('R')).toBeLessThan(50 + 2.5);
    expect(freq['N'] || 0).toBe(0); // 权重 0 的 N 不参与抽取
  });
});

describe('70 抽 UP 保底', () => {
  it('累计 70 抽未中 UP 时，下一抽必定是 UP 卡，且保底计数归零', () => {
    mockUpPool = { urId: 900001, hrId: 900002 };
    vi.spyOn(Math, 'random').mockImplementation(mulberry32(777));
    const user = useUserStore();
    user.animePityState.pullsSinceLastHR = 69; // 本次 +1 后达到 70 → 触发保底

    const result = useGachaStore().performGachaLogic('anime', 1);
    expect([900001, 900002]).toContain(result[0].id);
    expect(user.animePityState.pullsSinceLastHR).toBe(0);
  });
});

describe('66% UP 替换（抽到 HR/UR 稀有度时）', () => {
  it('命中 66%：UR 档结果被替换为对应稀有度的 UP 卡', () => {
    mockUpPool = { urId: 900001, hrId: 900002 };
    // 序列：[稀有度 roll → UR, UP 判定 0.5<0.66 命中, UP 同稀有度选卡]
    const seq = [0.001, 0.5, 0];
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => seq[Math.min(i++, seq.length - 1)]);

    const result = useGachaStore().performGachaLogic('anime', 1);
    expect(result[0].id).toBe(900001); // UR 档 → UP 的 UR
    expect(useUserStore().animePityState.pullsSinceLastHR).toBe(0); // 中 UP 重置保底
  });

  it('未命中 66%：从普通 UR 池随机，保底同样重置（因出了 UR）', () => {
    mockUpPool = { urId: 900001, hrId: 900002 };
    const seq = [0.001, 0.9, 0]; // 0.9 ≥ 0.66 → 不替换；第三个 0 → 取 UR 池第一张
    let i = 0;
    vi.spyOn(Math, 'random').mockImplementation(() => seq[Math.min(i++, seq.length - 1)]);

    const result = useGachaStore().performGachaLogic('anime', 1);
    expect(result[0].rarity).toBe('UR');
    expect(result[0].id).toBe(1101); // 池内第一张 UR（构造顺序）
    expect(useUserStore().animePityState.pullsSinceLastHR).toBe(0);
  });
});

describe('十连保底 SSR', () => {
  it('十连全为低稀有度时，强制替换一张为 SSR', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9); // rand=54 → 恒为 R 档
    const result = useGachaStore().performGachaLogic('anime', 10);
    expect(result).toHaveLength(10);
    const ssrCount = result.filter((c) => c.rarity === 'SSR').length;
    const rCount = result.filter((c) => c.rarity === 'R').length;
    expect(ssrCount).toBe(1);
    expect(rCount).toBe(9);
  });

  it('单抽不触发十连保底（count<10）', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    const result = useGachaStore().performGachaLogic('anime', 1);
    expect(result[0].rarity).toBe('R');
  });
});
