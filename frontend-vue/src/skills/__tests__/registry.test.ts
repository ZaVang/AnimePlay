/**
 * Skill Registry Unit Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import {
  runEffect,
  hasSkillEffect,
  getAvailableSkillIds,
  getSkillCacheStats,
  clearSkillCache,
  resetSkillStats
} from '../registry';
import type { EffectContext } from '@/types/effects';
import { systemRegistry } from '@/core/di/registry';

// Mock systems for DI
const mockPersistentEffectSystem = {
  addEffect: vi.fn(),
  addTemporaryBonus: vi.fn(),
  addCardTypeStrengthBonus: vi.fn(), // 添加这个方法
  addRestriction: vi.fn(),
  getEffects: vi.fn(() => []),
  getBonuses: vi.fn(() => []),
  getRestrictions: vi.fn(() => []),
  removeEffect: vi.fn(),
  removeBonus: vi.fn(),
  removeRestriction: vi.fn(),
  processTurnStart: vi.fn(),
  processTurnEnd: vi.fn(),
  clear: vi.fn(),
};

const mockInteractionSystem = {
  requestCardSelection: vi.fn(),
  requestTypeSelection: vi.fn(),
  showHandToOpponent: vi.fn(),
  viewOpponentHand: vi.fn(), // 添加这个方法
  reset: vi.fn(),
};

const mockDialogueSystem = {
  addDialogue: vi.fn(),
  generateAttackDialogue: vi.fn(),
  generateClashDialogue: vi.fn(),
  clear: vi.fn(),
};

describe('Skill Registry', () => {
  beforeEach(() => {
    // Initialize Pinia for skills that use stores
    setActivePinia(createPinia());

    // Register mock systems for DI
    systemRegistry.registerSystems({
      persistent: mockPersistentEffectSystem as any,
      interaction: mockInteractionSystem as any,
      dialogue: mockDialogueSystem as any,
    });

    clearSkillCache();
    resetSkillStats();
  });

  describe('runEffect', () => {
    it('should execute existing skill effect', async () => {
      const mockContext: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        card: null,
        role: null,
        addStrengthBonus: null,
      };

      // This should not throw for any registered skill
      await expect(runEffect('牧濑红莉栖_时间理论', mockContext)).resolves.toBeUndefined();
    });

    it('should handle non-existent skill gracefully', async () => {
      const mockContext: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        card: null,
        role: null,
        addStrengthBonus: null,
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await runEffect('非存在的技能', mockContext);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('未找到'));
      consoleSpy.mockRestore();
    });

    it('should cache skill effects after first execution', async () => {
      const mockContext: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        card: null,
        role: null,
        addStrengthBonus: null,
      };

      // First execution
      await runEffect('牧濑红莉栖_时间理论', mockContext);

      // Second execution should use cache
      await runEffect('牧濑红莉栖_时间理论', mockContext);

      const stats = getSkillCacheStats();
      expect(stats.cacheHits).toBeGreaterThan(0);
    });

    it('should track execution statistics', async () => {
      const mockContext: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        card: null,
        role: null,
        addStrengthBonus: null,
      };

      await runEffect('牧濑红莉栖_时间理论', mockContext);

      const stats = getSkillCacheStats();
      expect(stats.totalExecutions).toBeGreaterThan(0);
      expect(stats.successfulExecutions).toBeGreaterThan(0);
    });
  });

  describe('hasSkillEffect', () => {
    it('should return true for registered skills', () => {
      expect(hasSkillEffect('牧濑红莉栖_时间理论')).toBe(true);
    });

    it('should return false for non-existent skills', () => {
      expect(hasSkillEffect('非存在的技能')).toBe(false);
    });
  });

  describe('getAvailableSkillIds', () => {
    it('should return array of skill IDs', () => {
      const skillIds = getAvailableSkillIds();

      expect(Array.isArray(skillIds)).toBe(true);
      expect(skillIds.length).toBeGreaterThan(0);
    });

    it('should include known skills', () => {
      const skillIds = getAvailableSkillIds();

      expect(skillIds).toContain('牧濑红莉栖_时间理论');
    });
  });

  describe('Cache Statistics', () => {
    it('should track cache performance', async () => {
      const mockContext: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        card: null,
        role: null,
        addStrengthBonus: null,
      };

      // Execute same skill multiple times
      await runEffect('牧濑红莉栖_时间理论', mockContext);
      await runEffect('牧濑红莉栖_时间理论', mockContext);
      await runEffect('牧濑红莉栖_时间理论', mockContext);

      const stats = getSkillCacheStats();

      expect(stats.cacheHits).toBe(2); // First is miss, next 2 are hits
      expect(stats.cacheMisses).toBe(1);
      expect(stats.totalExecutions).toBe(3);
    });

    it('should calculate hit rate correctly', async () => {
      const mockContext: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        card: null,
        role: null,
        addStrengthBonus: null,
      };

      await runEffect('牧濑红莉栖_时间理论', mockContext); // miss
      await runEffect('牧濑红莉栖_时间理论', mockContext); // hit
      await runEffect('牧濑红莉栖_时间理论', mockContext); // hit

      const stats = getSkillCacheStats();
      expect(stats.cacheHitRate).toBe('66.67%');
    });

    it('should reset statistics correctly', async () => {
      const mockContext: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        card: null,
        role: null,
        addStrengthBonus: null,
      };

      await runEffect('牧濑红莉栖_时间理论', mockContext);
      resetSkillStats();

      const stats = getSkillCacheStats();
      expect(stats.totalExecutions).toBe(0);
      expect(stats.cacheHits).toBe(0);
      expect(stats.cacheMisses).toBe(0);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache', async () => {
      const mockContext: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        card: null,
        role: null,
        addStrengthBonus: null,
      };

      await runEffect('牧濑红莉栖_时间理论', mockContext);
      clearSkillCache();

      // Next execution should be a cache miss
      await runEffect('牧濑红莉栖_时间理论', mockContext);

      const stats = getSkillCacheStats();
      // After clear, first execution is a miss
      expect(stats.cacheMisses).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle skill execution errors gracefully', async () => {
      const mockContext: EffectContext = {
        playerId: 'playerA',
        event: 'onPlay',
        card: null,
        role: null,
        addStrengthBonus: null,
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Skill that might throw should not crash
      await expect(runEffect('一些可能抛错的技能', mockContext)).resolves.toBeUndefined();

      consoleSpy.mockRestore();
    });
  });
});
