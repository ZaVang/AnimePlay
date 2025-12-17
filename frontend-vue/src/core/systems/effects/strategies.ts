/**
 * Concrete Effect Strategy Implementations
 * Each strategy handles a category of effects
 */

import { BaseEffectStrategy } from './EffectStrategy';
import type { PersistentEffect } from '../PersistentEffectSystem';

/**
 * Skill-related effects (cooldowns, resets)
 */
export class SkillEffectStrategy extends BaseEffectStrategy {
  process(effect: PersistentEffect, context?: any): boolean {
    switch (effect.type) {
      case 'skill_cooldown_reset':
        this.log(effect.playerId, '的技能冷却重置');
        return true;

      case 'leadership_cooldown_reduction':
        this.log(effect.playerId, `全队技能冷却-${effect.data.cooldownReduction}`);
        return true;

      default:
        return false;
    }
  }

  getCategory() {
    return 'skill';
  }
}

/**
 * Cost-related effects (discounts, reductions)
 */
export class CostEffectStrategy extends BaseEffectStrategy {
  process(effect: PersistentEffect, context?: any): boolean {
    const costTypes = [
      'first_card_discount',
      'skill_cost_reduction',
      'next_card_cost_reduction',
      'time_warning_cost_increase'
    ];

    if (costTypes.includes(effect.type)) {
      this.log(effect.playerId, `卡牌成本效果: ${effect.description}`);
      return true;
    }

    return false;
  }

  getCategory() {
    return 'cost';
  }
}

/**
 * Forced action effects
 */
export class ForcedActionStrategy extends BaseEffectStrategy {
  process(effect: PersistentEffect, context?: any): boolean {
    const forcedTypes = [
      'forced_action',
      'forced_friendly_recommendation',
      'forced_stop_discussion'
    ];

    if (forcedTypes.includes(effect.type)) {
      const action = effect.data.forcedAction || effect.data.actionType;
      this.log(effect.playerId, `被强制: ${action}`);
      return true;
    }

    return false;
  }

  getCategory() {
    return 'forced';
  }
}

/**
 * Protection and immunity effects
 */
export class ProtectionStrategy extends BaseEffectStrategy {
  process(effect: PersistentEffect, context?: any): boolean {
    const protectionTypes = [
      'skill_immunity',
      'hand_protection',
      'angel_protection',
      'reputation_protection'
    ];

    if (protectionTypes.includes(effect.type)) {
      if (effect.type === 'reputation_protection' && context?.reputationLoss) {
        if (Math.random() < effect.data.reductionChance) {
          this.log(effect.playerId, '声望损失减少');
          return true;
        }
        return false;
      }

      this.log(effect.playerId, `获得保护: ${effect.description}`);
      return true;
    }

    return false;
  }

  getCategory() {
    return 'protection';
  }
}

/**
 * Victory and reward effects
 */
export class VictoryBonusStrategy extends BaseEffectStrategy {
  process(effect: PersistentEffect, context?: any): boolean {
    const victoryTypes = ['victory_bonus', 'flash_strike_victory'];

    if (victoryTypes.includes(effect.type)) {
      if (context?.isVictory && context?.playerId === effect.playerId) {
        this.log(effect.playerId, `获得胜利奖励: ${effect.data.tpReward}TP`);
        return true;
      }
      return false;
    }

    return false;
  }

  getCategory() {
    return 'victory';
  }
}

/**
 * Music and rhythm effects
 */
export class MusicEffectStrategy extends BaseEffectStrategy {
  process(effect: PersistentEffect, context?: any): boolean {
    const musicTypes = [
      'bass_rhythm',
      'music_frenzy_basic',
      'musical_family',
      'music_practice_bonus'
    ];

    if (musicTypes.includes(effect.type)) {
      this.log(effect.playerId, `音乐效果: ${effect.description}`);
      return true;
    }

    return false;
  }

  getCategory() {
    return 'music';
  }
}

/**
 * Magic and fantasy effects
 */
export class MagicEffectStrategy extends BaseEffectStrategy {
  process(effect: PersistentEffect, context?: any): boolean {
    const magicTypes = [
      'fantasy_combo',
      'spiral_power',
      'gem_magic_bonus',
      'magician_bloodline',
      'magic_collection',
      'magic_mastery',
      'card_type_override'
    ];

    if (magicTypes.includes(effect.type)) {
      this.log(effect.playerId, `魔法效果: ${effect.description}`);
      return true;
    }

    return false;
  }

  getCategory() {
    return 'magic';
  }
}

/**
 * Combat and battle effects
 */
export class CombatEffectStrategy extends BaseEffectStrategy {
  process(effect: PersistentEffect, context?: any): boolean {
    const combatTypes = [
      'tsundere_counter',
      'time_stop_priority',
      'cybernetic_enhancement',
      'chika_game_bonus',
      'flash_strike_prepare'
    ];

    if (combatTypes.includes(effect.type)) {
      this.log(effect.playerId, `战斗效果: ${effect.description}`);
      return true;
    }

    return false;
  }

  getCategory() {
    return 'combat';
  }
}

/**
 * Social and interaction effects
 */
export class SocialEffectStrategy extends BaseEffectStrategy {
  process(effect: PersistentEffect, context?: any): boolean {
    const socialTypes = [
      'spy_network',
      'data_analysis',
      'twin_sense',
      'perfectionist_bonus',
      'observation_skills',
      'angel_blessing'
    ];

    if (socialTypes.includes(effect.type)) {
      this.log(effect.playerId, `社交效果: ${effect.description}`);
      return true;
    }

    return false;
  }

  getCategory() {
    return 'social';
  }
}

/**
 * Card enhancement effects
 */
export class CardEnhancementStrategy extends BaseEffectStrategy {
  process(effect: PersistentEffect, context?: any): boolean {
    const enhancementTypes = [
      'card_strength_boost',
      'next_card_strength',
      'double_next_card',
      'noble_bloodline_bonus',
      'copy_card_effect'
    ];

    if (enhancementTypes.includes(effect.type)) {
      this.log(effect.playerId, `卡牌增强: ${effect.description}`);
      return true;
    }

    return false;
  }

  getCategory() {
    return 'enhancement';
  }
}

/**
 * Special state effects
 */
export class SpecialStateStrategy extends BaseEffectStrategy {
  process(effect: PersistentEffect, context?: any): boolean {
    const specialTypes = [
      'destiny_detection',
      'natural_black_hole',
      'future_knowledge',
      'reincarnation_memory',
      'play_limit',
      'energy_saving'
    ];

    if (specialTypes.includes(effect.type)) {
      this.log(effect.playerId, `特殊状态: ${effect.description}`);
      return true;
    }

    return false;
  }

  getCategory() {
    return 'special';
  }
}

/**
 * Default/Fallback strategy for unknown effect types
 */
export class DefaultEffectStrategy extends BaseEffectStrategy {
  process(effect: PersistentEffect, context?: any): boolean {
    console.warn(`未处理的效果类型: ${effect.type} - ${effect.description}`);
    return false;
  }

  getCategory() {
    return 'default';
  }
}
