/**
 * 抽卡规则特征测试（S1 建立于 gachaStore，S3 随逻辑迁入 engine/gacha 后纯函数化）。
 * 锁死：稀有度概率分布（权重归一化）、70 抽 UP 保底、66% UP 替换、十连保底 SSR。
 * 不再需要 Pinia / mock / Math.random spy —— 随机源直接注入。
 */
import { describe, it, expect } from 'vitest';
import { performDraws, createPityState, type GachaDrawConfig } from './draw';
import { createSeededRng, createSequenceRng } from '../rng';
import type { AnimeCard } from '@/types/card';

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

/** 与 GAME_CONFIG.animeSystem 同形的测试配置（权重 UR0.5/HR2.5/SSR7/SR20/R30/N0）。 */
const config: GachaDrawConfig = {
  rarityConfig: {
    UR: { p: 0.5 },
    HR: { p: 2.5 },
    SSR: { p: 7 },
    SR: { p: 20 },
    R: { p: 30 },
    N: { p: 0 },
  },
  rateUp: { pityPulls: 70, hrChance: 0.66 },
  guaranteedSSRPulls: 10,
};

const allCards = buildPool();
const upCards = allCards.filter(c => c.id === 900001 || c.id === 900002);

describe('稀有度概率分布（权重归一化后 0.83%/4.17%/11.67%/33.33%/50%）', () => {
  it('6000 抽的频率落在理论概率附近，且 N 卡零出现', () => {
    const { cards } = performDraws({
      count: 6000,
      allCards,
      rateUpCards: [], // 无 UP 池：纯分布测试
      pity: createPityState(),
      config,
      rng: createSeededRng(12345),
    });
    expect(cards).toHaveLength(6000);

    const freq: Record<string, number> = {};
    for (const c of cards) freq[c.rarity] = (freq[c.rarity] || 0) + 1;
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

  it('同种子结果完全可复现', () => {
    const run = () =>
      performDraws({ count: 100, allCards, rateUpCards: upCards, pity: createPityState(), config, rng: createSeededRng(42) });
    expect(run().cards.map(c => c.id)).toEqual(run().cards.map(c => c.id));
  });
});

describe('70 抽 UP 保底', () => {
  it('累计 70 抽未中 UP 时，下一抽必定是 UP 卡，且保底计数归零', () => {
    const { cards, pity } = performDraws({
      count: 1,
      allCards,
      rateUpCards: upCards,
      pity: { totalPulls: 69, pullsSinceLastHR: 69 }, // 本次 +1 后达到 70 → 触发保底
      config,
      rng: createSeededRng(777),
    });
    expect([900001, 900002]).toContain(cards[0].id);
    expect(pity.pullsSinceLastHR).toBe(0);
    expect(pity.totalPulls).toBe(70);
  });

  it('传入的 pity 对象不被就地修改', () => {
    const before = { totalPulls: 69, pullsSinceLastHR: 69 };
    performDraws({ count: 1, allCards, rateUpCards: upCards, pity: before, config, rng: createSeededRng(1) });
    expect(before).toEqual({ totalPulls: 69, pullsSinceLastHR: 69 });
  });
});

describe('66% UP 替换（抽到 HR/UR 稀有度时）', () => {
  it('命中 66%：UR 档结果被替换为对应稀有度的 UP 卡', () => {
    // 序列：[稀有度 roll → UR, UP 判定 0.5<0.66 命中, UP 同稀有度选卡]
    const { cards, pity } = performDraws({
      count: 1,
      allCards,
      rateUpCards: upCards,
      pity: createPityState(),
      config,
      rng: createSequenceRng([0.001, 0.5, 0]),
    });
    expect(cards[0].id).toBe(900001); // UR 档 → UP 的 UR
    expect(pity.pullsSinceLastHR).toBe(0); // 中 UP 重置保底
  });

  it('未命中 66%：从普通 UR 池随机，保底同样重置（因出了 UR）', () => {
    const { cards, pity } = performDraws({
      count: 1,
      allCards,
      rateUpCards: upCards,
      pity: createPityState(),
      config,
      rng: createSequenceRng([0.001, 0.9, 0]), // 0.9 ≥ 0.66 → 不替换；第三个 0 → 取 UR 池第一张
    });
    expect(cards[0].rarity).toBe('UR');
    expect(cards[0].id).toBe(1101); // 池内第一张 UR（构造顺序）
    expect(pity.pullsSinceLastHR).toBe(0);
  });

  it('无 UP 池时不消耗 66% 判定随机数，直接从稀有度池取卡', () => {
    const { cards } = performDraws({
      count: 1,
      allCards,
      rateUpCards: [],
      pity: createPityState(),
      config,
      rng: createSequenceRng([0.001, 0]), // 第二个数直接用于选卡
    });
    expect(cards[0].rarity).toBe('UR');
    expect(cards[0].id).toBe(1101);
  });
});

describe('十连保底 SSR', () => {
  it('十连全为低稀有度时，强制替换一张为 SSR', () => {
    const { cards } = performDraws({
      count: 10,
      allCards,
      rateUpCards: [],
      pity: createPityState(),
      config,
      rng: createSequenceRng([0.9]), // 恒 0.9 → rand=54 → 恒为 R 档
    });
    expect(cards).toHaveLength(10);
    expect(cards.filter(c => c.rarity === 'SSR')).toHaveLength(1);
    expect(cards.filter(c => c.rarity === 'R')).toHaveLength(9);
  });

  it('单抽不触发十连保底（count<10）', () => {
    const { cards } = performDraws({
      count: 1,
      allCards,
      rateUpCards: [],
      pity: createPityState(),
      config,
      rng: createSequenceRng([0.9]),
    });
    expect(cards[0].rarity).toBe('R');
  });
});
