/**
 * Effect Strategy Interface
 * Defines the contract for all effect handlers
 */

import type { PersistentEffect } from '../PersistentEffectSystem';

export interface EffectStrategy {
  /**
   * Process the effect logic
   * @param effect - The effect to process
   * @param context - Optional context data
   * @returns true if effect was applied successfully
   */
  process(effect: PersistentEffect, context?: any): boolean;

  /**
   * Optional: Get effect category/type
   */
  getCategory?(): string;
}

/**
 * Base Effect Strategy with common functionality
 */
export abstract class BaseEffectStrategy implements EffectStrategy {
  protected log(playerId: string, message: string): void {
    console.log(`${playerId} ${message}`);
  }

  abstract process(effect: PersistentEffect, context?: any): boolean;
}
