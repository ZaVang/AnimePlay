
import { describe, it, expect, vi } from 'vitest';
import { GachaEngine, type GachaConfig, type GachaPityState } from '../GachaEngine';
import { type Card } from '@/types/card';

describe('GachaEngine: Probability & Pity logic', () => {
  
  const mockConfig: GachaConfig = {
    rarityConfig: {
      UR: { p: 1 },    // 1%
      HR: { p: 4 },    // 4%
      SSR: { p: 10 },  // 10%
      SR: { p: 25 },   // 25%
      R: { p: 60 },    // 60%
    },
    rateUp: {
      urPityPulls: 80,
      hrPityPulls: 20,
      hrChance: 0.5
    },
    gacha: {
      guaranteedSSR_Pulls: 10
    }
  };

  const mockCards: Card[] = [
    { id: 1, name: 'UR Card', rarity: 'UR' } as any,
    { id: 2, name: 'HR Card', rarity: 'HR' } as any,
    { id: 3, name: 'SSR Card', rarity: 'SSR' } as any,
    { id: 4, name: 'SR Card', rarity: 'SR' } as any,
    { id: 5, name: 'R Card', rarity: 'R' } as any,
  ];

  const defaultPityState: GachaPityState = {
    totalPulls: 0,
    pullsSinceLastHR: 0,
    pullsSinceLastUR: 0
  };

  describe('Pity Mechanics', () => {
    it('should trigger UR pity exactly at the configured pull', () => {
      // Set pity state to 79 pulls
      const pityState: GachaPityState = { ...defaultPityState, pullsSinceLastUR: 79 };
      
      // Inject randomFn that always returns 0.99 (worst possible luck, would normally result in R)
      const mockRandom = vi.fn().mockReturnValue(0.99);
      
      const result = GachaEngine.execute(
        mockConfig,
        pityState,
        mockCards,
        mockCards, // rateUpCards
        1,
        mockRandom
      );

      expect(result.cards[0].rarity).toBe('UR');
      expect(result.newPityState.pullsSinceLastUR).toBe(0);
      expect(result.newPityState.pullsSinceLastHR).toBe(0);
    });

    it('should trigger HR pity independently', () => {
      // Initialize both counters to 19 to test independent increment/reset
      const pityState: GachaPityState = { 
        ...defaultPityState, 
        pullsSinceLastHR: 19,
        pullsSinceLastUR: 19 
      };
      const mockRandom = vi.fn().mockReturnValue(0.99);
      
      const result = GachaEngine.execute(mockConfig, pityState, mockCards, mockCards, 1, mockRandom);

      expect(result.cards[0].rarity).toBe('HR');
      expect(result.newPityState.pullsSinceLastHR).toBe(0);
      expect(result.newPityState.pullsSinceLastUR).toBe(20); // Correctly increments without resetting
    });
  });

  describe('Multi-pull Guarantee', () => {
    it('should guarantee at least 1 SSR in a 10-pull', () => {
      // Force all 10 pulls to be 'R' rarity by returning 0.99
      const mockRandom = vi.fn().mockReturnValue(0.99);
      
      const result = GachaEngine.execute(mockConfig, defaultPityState, mockCards, [], 10, mockRandom);
      
      const highRarities = result.cards.filter(c => ['SSR', 'HR', 'UR'].includes(c.rarity));
      expect(highRarities.length).toBeGreaterThanOrEqual(1);
      expect(highRarities[0].rarity).toBe('SSR'); // Forced by guarantee logic
    });
  });

  describe('Statistical Analysis (Big Numbers)', () => {
    it('should converge to configured rates over 10,000 pulls', () => {
      const simulationCount = 10000;
      const result = GachaEngine.execute(mockConfig, defaultPityState, mockCards, [], simulationCount);
      
      const urCount = result.cards.filter(c => c.rarity === 'UR').length;
      const ssrCount = result.cards.filter(c => c.rarity === 'SSR').length;
      
      // UR base 1% + Pity influence. Expected is around 100.
      // Use a more realistic statistical margin (sigma check)
      expect(urCount).toBeGreaterThan(70); 
      expect(urCount).toBeLessThan(150);
      
      // SSR base 10%. Expected around 1000.
      const ssrRate = (ssrCount / simulationCount);
      expect(ssrRate).toBeGreaterThan(0.08);
      expect(ssrRate).toBeLessThan(0.12);
    });
  });
});
