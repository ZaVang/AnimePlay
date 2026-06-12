/**
 * 抽卡规则 —— 纯函数（随机源注入）。
 * 保底状态不被就地修改：传入当前值，返回新值，由调用方（gachaStore）写回并负责持久化。
 * 数值规则受 engine/gacha/draw.test.ts 锁定（分布 / 70 抽保底 / 66% UP 替换 / 十连保底 SSR）。
 */
import type { Card, Rarity } from '@/types/card';
import type { RNG } from '../rng';

/** UP 保底状态（按卡池各一份，进存档）。 */
export interface PityState {
  totalPulls: number;
  pullsSinceLastHR: number;
}

export function createPityState(): PityState {
  return { totalPulls: 0, pullsSinceLastHR: 0 };
}

/** 形状对齐 GAME_CONFIG 的 animeSystem/characterSystem 子集，调用方直接切片传入。 */
export interface GachaDrawConfig {
  rarityConfig: Readonly<Record<string, { p: number }>>;
  rateUp: { pityPulls: number; hrChance: number };
  /** 抽数达到该值时保证至少一张 SSR+（即 GAME_CONFIG.gacha.guaranteedSSR_Pulls）。 */
  guaranteedSSRPulls: number;
}

export interface GachaDrawInput {
  count: number;
  /** 当前卡池全卡（含 UP 卡本体）。 */
  allCards: readonly Card[];
  /** 当期 UP 卡（可为空数组 = 无 UP 池）。 */
  rateUpCards: readonly Card[];
  pity: Readonly<PityState>;
  config: GachaDrawConfig;
  rng: RNG;
}

export interface GachaDrawResult {
  cards: Card[];
  pity: PityState;
}

const HIGH_RARITIES: readonly Rarity[] = ['SSR', 'HR', 'UR'];

export function performDraws(input: GachaDrawInput): GachaDrawResult {
  const { count, allCards, rateUpCards, config, rng } = input;
  const pity: PityState = { ...input.pity };
  const drawnCards: Card[] = [];

  const effectiveRarityEntries = Object.entries(config.rarityConfig).filter(([, d]) => d.p > 0);
  if (effectiveRarityEntries.length === 0) {
    return { cards: [], pity };
  }
  const totalEffectiveProbability = effectiveRarityEntries.reduce((sum, [, d]) => sum + d.p, 0);

  for (let i = 0; i < count; i++) {
    pity.totalPulls++;
    pity.pullsSinceLastHR++;

    let drawnCard: Card | undefined;

    // 1) 硬保底：累计抽数到阈值必出 UP
    if (config.rateUp.pityPulls > 0 && pity.pullsSinceLastHR >= config.rateUp.pityPulls && rateUpCards.length > 0) {
      pity.pullsSinceLastHR = 0;
      drawnCard = rateUpCards[Math.floor(rng.next() * rateUpCards.length)];
    } else {
      // 2) 稀有度轮盘（权重归一化，p=0 的稀有度不参与）
      const rand = rng.next() * totalEffectiveProbability;
      let cumulativeProb = 0;
      let drawnRarity: Rarity = 'N';
      for (const rarity in config.rarityConfig) {
        cumulativeProb += config.rarityConfig[rarity].p;
        if (rand < cumulativeProb) {
          drawnRarity = rarity as Rarity;
          break;
        }
      }

      // 3) UP 替换：抽到 HR/UR 档时有 hrChance 概率换成对应稀有度的 UP 卡
      if ((drawnRarity === 'HR' || drawnRarity === 'UR') && rateUpCards.length > 0 && rng.next() < config.rateUp.hrChance) {
        pity.pullsSinceLastHR = 0; // 中 UP 重置保底
        const upCardsOfRarity = rateUpCards.filter(c => c.rarity === drawnRarity);
        if (upCardsOfRarity.length > 0) {
          drawnCard = upCardsOfRarity[Math.floor(rng.next() * upCardsOfRarity.length)];
        } else {
          drawnCard = rateUpCards[Math.floor(rng.next() * rateUpCards.length)];
        }
      } else {
        const pool = allCards.filter(c => c.rarity === drawnRarity);
        if (pool.length > 0) {
          drawnCard = pool[Math.floor(rng.next() * pool.length)];
        } else {
          // 该稀有度无卡时的兜底：全池随机
          drawnCard = allCards.length > 0 ? allCards[Math.floor(rng.next() * allCards.length)] : undefined;
        }
        if (drawnRarity === 'HR' || drawnRarity === 'UR') {
          pity.pullsSinceLastHR = 0; // 出了 HR/UR 本体也重置
        }
      }
    }

    if (drawnCard) {
      drawnCards.push({ ...drawnCard });
    }
  }

  // 4) 十连保底：整单无 SSR+ 时，把第一张低稀有度替换为随机 SSR
  if (count >= config.guaranteedSSRPulls && !drawnCards.some(card => HIGH_RARITIES.includes(card.rarity))) {
    const ssrPool = allCards.filter(c => c.rarity === 'SSR');
    const indexToReplace = drawnCards.findIndex(c => c.rarity === 'N' || c.rarity === 'R' || c.rarity === 'SR');
    if (ssrPool.length > 0 && indexToReplace !== -1) {
      drawnCards[indexToReplace] = { ...ssrPool[Math.floor(rng.next() * ssrPool.length)] };
    }
  }

  return { cards: drawnCards, pity };
}
