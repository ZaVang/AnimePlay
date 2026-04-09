/**
 * Nurture System Calculation Engine
 * Pure logic for character growth, exp curves, and attribute distributions.
 */

export interface NurtureAttributes {
  charm: number;
  intelligence: number;
  strength: number;
}

export interface BattleEnhancements {
  hp: number;
  atk: number;
  def: number;
  sp: number;
  spd: number;
}

export const NurtureCalculator = {
  /**
   * Calculate required total experience to reach a specific level.
   * Formula: (level - 1)^2 * 1000
   */
  getRequiredExpForLevel(level: number): number {
    if (level <= 1) return 0;
    return Math.pow(level - 1, 2) * 1000;
  },

  /**
   * Determine the current level based on total experience accumulated.
   */
  getLevelFromExp(totalExp: number, maxLevel: number = 100): number {
    let level = 1;
    // Simple iterative check for level (can be optimized with Math.sqrt if performance is a concern)
    while (level < maxLevel && this.getRequiredExpForLevel(level + 1) <= totalExp) {
      level++;
    }
    return level;
  },

  /**
   * Calculate progress within the current level.
   */
  getLevelProgress(totalExp: number, currentLevel: number) {
    const currentLevelExpStart = this.getRequiredExpForLevel(currentLevel);
    const nextLevelExpStart = this.getRequiredExpForLevel(currentLevel + 1);

    const currentLevelExp = Math.max(0, totalExp - currentLevelExpStart);
    const requiredForNext = nextLevelExpStart - currentLevelExpStart;

    const percentage = requiredForNext > 0 ? (currentLevelExp / requiredForNext) * 100 : 0;

    return {
      current: currentLevelExp,
      required: requiredForNext,
      percentage: Math.min(100, Math.max(0, percentage))
    };
  },

  /**
   * Roll random attributes for a level gain.
   * totalPoints is usually level * 10.
   */
  rollAttributeGain(totalPoints: number): NurtureAttributes {
    const attributes = ['charm', 'intelligence', 'strength'] as const;
    const distribution: NurtureAttributes = { charm: 0, intelligence: 0, strength: 0 };
    let remainingPoints = totalPoints;

    // Phase 1: Guaranteed minimum (10% each)
    for (const attr of attributes) {
      const remainingAttrsCount = attributes.length - attributes.indexOf(attr) - 1;
      const minPoints = Math.floor(totalPoints * 0.1);
      
      // Crucial Fix: Max points must leave enough for remaining attributes' minimums
      const safeMaxPoints = remainingPoints - (remainingAttrsCount * minPoints);
      const businessMaxPoints = Math.floor(totalPoints * 0.6);
      
      const maxPoints = Math.min(safeMaxPoints, businessMaxPoints);
      
      const points = Math.min(
        Math.max(minPoints, Math.floor(Math.random() * (maxPoints - minPoints + 1)) + minPoints),
        remainingPoints - remainingAttrsCount
      );
      
      distribution[attr] = points;
      remainingPoints -= points;
    }

    // Phase 2: Distribute leftovers
    while (remainingPoints > 0) {
      const randomAttr = attributes[Math.floor(Math.random() * attributes.length)];
      distribution[randomAttr]++;
      remainingPoints--;
    }

    return distribution;
  },

  /**
   * Calculate final battle stats after applying percentile enhancements.
   */
  calculateEnhancedStats(baseStats: BattleEnhancements, enhancements: BattleEnhancements): BattleEnhancements {
    return {
      hp: Math.floor(baseStats.hp * (1 + enhancements.hp / 100)),
      atk: Math.floor(baseStats.atk * (1 + enhancements.atk / 100)),
      def: Math.floor(baseStats.def * (1 + enhancements.def / 100)),
      sp: Math.floor(baseStats.sp * (1 + enhancements.sp / 100)),
      spd: Math.floor(baseStats.spd * (1 + enhancements.spd / 100))
    };
  }
};
