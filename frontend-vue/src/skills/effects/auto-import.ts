/**
 * Advanced Auto-Import System for Character Skills
 * Uses Vite's glob import feature for true "import *" functionality
 */

import type { SkillEffect } from './utils/effectHelpers';

/**
 * Automatically import all character skill files using Vite glob imports
 * This targets the characters directory specifically
 */
const namedCharacterModules = import.meta.glob('./characters/*.ts', {
  eager: true
}) as Record<string, any>;

/**
 * Automatically combine all character skills from glob imports
 */
export function createAutoImportedSkills(): Record<string, SkillEffect> {
  const combinedSkills: Record<string, SkillEffect> = {};
  
  // Process modules with named exports (xxxSkills pattern)
  for (const [path, module] of Object.entries(namedCharacterModules)) {
    // Look for exports that end with "Skills"
    for (const [exportName, exportValue] of Object.entries(module)) {
      if (exportName.endsWith('Skills') && typeof exportValue === 'object') {
        Object.assign(combinedSkills, exportValue);
      }
    }
  }
  
  return combinedSkills;
}

/**
 * Get information about auto-imported modules
 */
export function getAutoImportInfo() {
  return {
    moduleCount: Object.keys(namedCharacterModules).length,
    modulePaths: Object.keys(namedCharacterModules),
    skillCount: Object.keys(createAutoImportedSkills()).length
  };
}