/**
 * Effect Strategy Registry
 * Manages registration and lookup of effect strategies
 */

import type { EffectStrategy } from './EffectStrategy';
import {
  SkillEffectStrategy,
  CostEffectStrategy,
  ForcedActionStrategy,
  ProtectionStrategy,
  VictoryBonusStrategy,
  MusicEffectStrategy,
  MagicEffectStrategy,
  CombatEffectStrategy,
  SocialEffectStrategy,
  CardEnhancementStrategy,
  SpecialStateStrategy,
  DefaultEffectStrategy
} from './strategies';

export class EffectStrategyRegistry {
  private strategies: EffectStrategy[] = [];
  private defaultStrategy: EffectStrategy;

  constructor() {
    this.defaultStrategy = new DefaultEffectStrategy();
    this.registerDefaultStrategies();
  }

  /**
   * Register default effect strategies
   */
  private registerDefaultStrategies(): void {
    this.register(new SkillEffectStrategy());
    this.register(new CostEffectStrategy());
    this.register(new ForcedActionStrategy());
    this.register(new ProtectionStrategy());
    this.register(new VictoryBonusStrategy());
    this.register(new MusicEffectStrategy());
    this.register(new MagicEffectStrategy());
    this.register(new CombatEffectStrategy());
    this.register(new SocialEffectStrategy());
    this.register(new CardEnhancementStrategy());
    this.register(new SpecialStateStrategy());
  }

  /**
   * Register a new effect strategy
   */
  register(strategy: EffectStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Get strategy for an effect (tries all strategies in order)
   * Returns default strategy if none match
   */
  getStrategy(effectType: string): EffectStrategy {
    // Try each strategy until one can handle the effect
    // Strategies determine if they can handle an effect in their process() method
    return this.defaultStrategy;
  }

  /**
   * Process effect using registered strategies
   */
  processEffect(effect: any, context?: any): boolean {
    // Try each strategy in order
    for (const strategy of this.strategies) {
      if (strategy.process(effect, context)) {
        return true;
      }
    }

    // Fall back to default strategy
    return this.defaultStrategy.process(effect, context);
  }

  /**
   * Get all registered strategies
   */
  getAllStrategies(): EffectStrategy[] {
    return [...this.strategies];
  }
}
