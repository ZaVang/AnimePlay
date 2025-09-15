/**
 * Skills Effects System - Modular Structure
 * 
 * This file serves as the main entry point for all skill effects,
 * importing them from individual character files for better maintainability.
 */

import type { EffectContext } from '@/types/effects';
import type { SkillEffect } from './utils/effectHelpers';

// Auto-import all character skills
import { createAutoImportedSkills } from './auto-import';

/**
 * Consolidated skill effects registry
 * Maps skill IDs to their effect functions
 */
export const skillEffects: Record<string, SkillEffect> = {
  // Auto-imported character skills from characters folder
  ...createAutoImportedSkills(),
};

/**
 * Execute a skill effect by ID
 * @param effectId - The skill effect identifier
 * @param context - The effect execution context
 */
export async function runEffect(effectId: string, context: EffectContext): Promise<void> {
  const effect = skillEffects[effectId];
  
  if (!effect) {
    console.warn(`Skill effect "${effectId}" not found`);
    return;
  }
  
  try {
    await effect(context);
  } catch (error) {
    console.error(`Error executing skill effect "${effectId}":`, error);
  }
}

/**
 * Get all available skill effect IDs
 */
export function getAvailableSkillIds(): string[] {
  return Object.keys(skillEffects);
}

/**
 * Check if a skill effect exists
 */
export function hasSkillEffect(effectId: string): boolean {
  return effectId in skillEffects;
}

// Re-export utilities for convenience
export { getEffectHelpers, EffectPatterns } from './utils/effectHelpers';
export type { SkillEffect } from './utils/effectHelpers';

// Utility functions for enhanced PersistentEffectSystem
export const getSkillCacheStats = () => ({ 
  hits: 0, 
  misses: 0, 
  evictions: 0, 
  totalExecutions: 0, 
  hitRate: '0%', 
  cacheSize: 0 
});
export const clearSkillCache = () => console.log('Skill cache cleared');