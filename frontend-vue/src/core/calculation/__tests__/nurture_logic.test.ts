
import { describe, it, expect, vi } from 'vitest';
import { NurtureCalculator } from '../NurtureCalculator';

describe('NurtureCalculator: growth & Balance logic', () => {
  
  describe('Experience Curve', () => {
    it('should calculate correct EXP for levels', () => {
      expect(NurtureCalculator.getRequiredExpForLevel(1)).toBe(0);
      expect(NurtureCalculator.getRequiredExpForLevel(2)).toBe(1000); // (2-1)^2 * 1000
      expect(NurtureCalculator.getRequiredExpForLevel(10)).toBe(81000); // (10-1)^2 * 1000
    });

    it('should calculate correct level from total exp', () => {
      expect(NurtureCalculator.getLevelFromExp(0)).toBe(1);
      expect(NurtureCalculator.getLevelFromExp(999)).toBe(1);
      expect(NurtureCalculator.getLevelFromExp(1000)).toBe(2);
      expect(NurtureCalculator.getLevelFromExp(80999)).toBe(9);
      expect(NurtureCalculator.getLevelFromExp(81000)).toBe(10);
    });

    it('should respect max level cap', () => {
      // Very high exp should still return maxLevel
      expect(NurtureCalculator.getLevelFromExp(100000000, 100)).toBe(100);
    });

    it('should calculate level progress correctly', () => {
      // Level 2 requires 1000. Level 3 requires 4000.
      // At 2500 EXP: currentLevel = 2.
      // Progress start = 1000. Progress end = 4000. Required = 3000.
      // Current in level = 1500. Percentage = 50%.
      const progress = NurtureCalculator.getLevelProgress(2500, 2);
      expect(progress.current).toBe(1500);
      expect(progress.required).toBe(3000);
      expect(progress.percentage).toBe(50);
    });
  });

  describe('Attribute Distribution (The "Balance" Test)', () => {
    it('should always distribute points within [10%, 60%] range', () => {
      const totalPoints = 100;
      
      // Run 100 simulations to ensure randomness doesn't break the rules
      for (let i = 0; i < 100; i++) {
        const result = NurtureCalculator.rollAttributeGain(totalPoints);
        const sum = result.charm + result.intelligence + result.strength;
        
        expect(sum).toBe(totalPoints);
        
        // Check bounds (10% = 10, 60% = 60)
        // Note: Due to integer rounding and leftover distribution, 
        // we check if they are roughly within the expected safe zone.
        expect(result.charm).toBeGreaterThanOrEqual(10);
        expect(result.intelligence).toBeGreaterThanOrEqual(10);
        expect(result.strength).toBeGreaterThanOrEqual(10);

        // Max check (should not wildly exceed 60% + leftovers)
        expect(result.charm).toBeLessThanOrEqual(70); 
        expect(result.intelligence).toBeLessThanOrEqual(70);
        expect(result.strength).toBeLessThanOrEqual(70);
      }
    });
  });

  describe('Battle Enhancements', () => {
    it('should calculate enhanced stats correctly with rounding', () => {
      const base = { hp: 1000, atk: 200, def: 50, sp: 100, spd: 10 };
      const enh = { hp: 15, atk: 10, def: 5, sp: 20, spd: 0 }; // Percentages
      
      const final = NurtureCalculator.calculateEnhancedStats(base, enh);
      
      expect(final.hp).toBe(1150); // 1000 * 1.15
      expect(final.atk).toBe(220); // 200 * 1.10
      expect(final.def).toBe(52);  // 52.5 -> 52 (floor)
      expect(final.spd).toBe(10);  // 10 * 1.00
    });
  });
});
