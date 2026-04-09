/**
 * Gacha System Calculation Engine
 * Pure logic for rarity rolling, pity mechanics, and card pool selection.
 */

import { type Card, type Rarity } from '@/types/card';

export interface GachaPityState {
  totalPulls: number;
  pullsSinceLastHR: number;
  pullsSinceLastUR: number;
}

export interface GachaRarityConfig {
  p: number; // Probability weight
}

export interface GachaConfig {
  rarityConfig: Record<string, GachaRarityConfig>;
  rateUp: {
    urPityPulls: number;
    hrPityPulls: number;
    hrChance: number; // Chance to get UP card when rolling HR/UR
  };
  gacha: {
    guaranteedSSR_Pulls: number;
  };
}

export interface GachaResult {
  cards: Card[];
  newPityState: GachaPityState;
}

export type RandomFn = () => number;

export const GachaEngine = {
  /**
   * Execute a single or multi-pull session.
   * @returns The drawn cards and the updated pity state.
   */
  execute(
    config: GachaConfig,
    initialPityState: GachaPityState,
    allCards: Card[],
    rateUpCards: Card[],
    count: number,
    randomFn: RandomFn = Math.random
  ): GachaResult {
    const drawnCards: Card[] = [];
    const pityState = { ...initialPityState };

    const rarityEntries = Object.entries(config.rarityConfig).filter(([, data]) => data.p > 0);
    const totalWeight = rarityEntries.reduce((sum, [, data]) => sum + data.p, 0);

    for (let i = 0; i < count; i++) {
      pityState.totalPulls++;
      pityState.pullsSinceLastHR++;
      pityState.pullsSinceLastUR++;

      let drawnCard: Card | undefined;

      // 1. UR Pity Check (Highest Priority)
      if (config.rateUp.urPityPulls > 0 && pityState.pullsSinceLastUR >= config.rateUp.urPityPulls && rateUpCards.length > 0) {
        drawnCard = this.pickByRarity(rateUpCards, 'UR', rateUpCards, randomFn);
        this.resetPity(pityState, 'UR');
      }
      // 2. HR Pity Check
      else if (config.rateUp.hrPityPulls > 0 && pityState.pullsSinceLastHR >= config.rateUp.hrPityPulls && rateUpCards.length > 0) {
        drawnCard = this.pickByRarity(rateUpCards, 'HR', rateUpCards, randomFn);
        this.resetPity(pityState, 'HR');
      }
      // 3. Normal Roll
      else {
        const rarity = this.rollRarity(rarityEntries, totalWeight, randomFn);
        
        // UP Logic for HR/UR
        if ((rarity === 'HR' || rarity === 'UR') && rateUpCards.length > 0 && randomFn() < config.rateUp.hrChance) {
          drawnCard = this.pickByRarity(rateUpCards, rarity, rateUpCards, randomFn);
          this.resetPity(pityState, rarity);
        } else {
          // Normal pool roll
          drawnCard = this.pickByRarity(allCards, rarity, allCards, randomFn);
          if (rarity === 'UR' || rarity === 'HR') {
            this.resetPity(pityState, rarity);
          }
        }
      }

      if (drawnCard) {
        drawnCards.push({ ...drawnCard });
      }
    }

    // 4. Multi-pull Multi-SSR Guarantee (e.g. 10-pull guarantee)
    this.applyMultiPullGuarantee(drawnCards, allCards, config.gacha.guaranteedSSR_Pulls, count, randomFn);

    return {
      cards: drawnCards,
      newPityState: pityState
    };
  },

  /**
   * Internal: Roll for rarity based on weights.
   */
  rollRarity(rarityEntries: [string, GachaRarityConfig][], totalWeight: number, randomFn: RandomFn): Rarity {
    const rand = randomFn() * totalWeight;
    let cumulative = 0;
    for (const [rarity, data] of rarityEntries) {
      cumulative += data.p;
      if (rand < cumulative) return rarity as Rarity;
    }
    return 'N';
  },

  /**
   * Internal: Pick a card of specific rarity from a pool.
   */
  pickByRarity(pool: Card[], rarity: Rarity, fallbackPool: Card[], randomFn: RandomFn): Card | undefined {
    const filtered = pool.filter(c => c.rarity === rarity);
    const targetPool = filtered.length > 0 ? filtered : (pool.length > 0 ? pool : fallbackPool);
    if (targetPool.length === 0) return undefined;
    return targetPool[Math.floor(randomFn() * targetPool.length)];
  },

  /**
   * Internal: Reset pity counters.
   */
  resetPity(pityState: GachaPityState, rarity: Rarity) {
    if (rarity === 'UR') {
      pityState.pullsSinceLastUR = 0;
      pityState.pullsSinceLastHR = 0; // UR resets HR as well
    } else if (rarity === 'HR') {
      pityState.pullsSinceLastHR = 0;
    }
  },

  /**
   * Internal: Handle "10-pull guarantee" (1 SSR or higher).
   */
  applyMultiPullGuarantee(drawnCards: Card[], allCards: Card[], minPulls: number, count: number, randomFn: RandomFn) {
    const highRarities: Rarity[] = ['SSR', 'HR', 'UR'];
    if (count >= minPulls && !drawnCards.some(card => highRarities.includes(card.rarity))) {
      const ssrPool = allCards.filter(c => c.rarity === 'SSR');
      if (ssrPool.length > 0) {
        const indexToReplace = drawnCards.findIndex(c => !highRarities.includes(c.rarity));
        const safeIndex = indexToReplace === -1 ? 0 : indexToReplace;
        drawnCards[safeIndex] = { ...ssrPool[Math.floor(randomFn() * ssrPool.length)] };
      }
    }
  }
};
