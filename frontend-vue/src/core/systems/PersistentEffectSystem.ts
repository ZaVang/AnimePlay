/**
 * 持续效果系统 - 管理跨回合的状态和效果
 */

import { useGameStore, useHistoryStore } from '@/stores/battle';

export interface PersistentEffect {
  id: string;
  playerId: 'playerA' | 'playerB';
  type: string;
  duration: number; // -1 for permanent, 0 for immediate, >0 for temporary
  data: Record<string, any>; // Effect-specific data
  description: string;
  sourceCharacterId?: number; // 效果来源角色的ID（用于生命周期管理）
  onApply?: () => void;
  onExpire?: () => void;
  onTurnStart?: () => void;
  onTurnEnd?: () => void;
}

export interface TemporaryBonus {
  id: string;
  playerId: 'playerA' | 'playerB';
  cardType?: string; // 如 "科幻", "战斗" 等
  bonusType: 'strength' | 'cost' | 'tp_cost';
  amount: number;
  duration: number;
  description: string;
}

/**
 * 持续效果管理器
 * 移除单例模式，支持依赖注入
 */
export class PersistentEffectSystem {
  private effects: Map<string, PersistentEffect> = new Map();
  private bonuses: Map<string, TemporaryBonus> = new Map();
  private restrictions: Map<string, any> = new Map();

  constructor() {
    // 现在是普通构造函数，支持多实例
  }

  /**
   * 添加持续效果
   */
  addEffect(effect: Omit<PersistentEffect, 'id'>): string {
    const id = `effect_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullEffect: PersistentEffect = { ...effect, id };
    
    this.effects.set(id, fullEffect);
    
    // 立即应用效果
    if (fullEffect.onApply) {
      fullEffect.onApply();
    }

    // 移除重复的持续效果激活提示
    // const historyStore = useHistoryStore();
    // historyStore.addLog(`持续效果激活：${fullEffect.description}`, 'info');
    
    return id;
  }

  /**
   * 添加临时加成
   * 修改：duration=0 的加成会立即在下次查询后自动移除
   */
  addTemporaryBonus(bonus: Omit<TemporaryBonus, 'id'>): string {
    const id = `bonus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullBonus: TemporaryBonus = { ...bonus, id };

    // 如果 duration 为 0，标记为"单次使用"加成
    // 将在 getStrengthBonus 查询后自动清理
    if (fullBonus.duration === 0) {
      fullBonus.duration = -999; // 特殊标记，表示"查询后立即删除"
    }

    this.bonuses.set(id, fullBonus);

    // 移除重复的临时加成提示
    // const historyStore = useHistoryStore();
    // historyStore.addLog(`临时加成：${fullBonus.description}`, 'info');
    
    return id;
  }

  /**
   * 回合开始时处理所有效果
   * 修改：只处理当前活跃玩家的效果持续时间
   */
  onTurnStart(playerId: 'playerA' | 'playerB') {
    // 处理当前玩家的持续效果
    for (const [id, effect] of this.effects.entries()) {
      if (effect.playerId === playerId && effect.onTurnStart) {
        effect.onTurnStart();
      }
    }

    // 只减少当前玩家的效果持续时间
    this.decreaseDuration(playerId);
  }

  /**
   * 回合结束时处理所有效果
   * 修改：只处理当前活跃玩家的效果
   */
  onTurnEnd(playerId: 'playerA' | 'playerB') {
    for (const [id, effect] of this.effects.entries()) {
      if (effect.playerId === playerId && effect.onTurnEnd) {
        effect.onTurnEnd();
      }
    }
  }

  /**
   * 获取卡牌强度加成
   * 修改：查询后自动清理 duration=-999 的单次使用加成
   */
  getStrengthBonus(playerId: 'playerA' | 'playerB', cardTypes: string[] = []): number {
    let totalBonus = 0;
    const toRemove: string[] = [];

    for (const [id, bonus] of this.bonuses.entries()) {
      if (bonus.playerId === playerId && bonus.bonusType === 'strength') {
        // 检查卡牌类型匹配
        if (!bonus.cardType || cardTypes.includes(bonus.cardType)) {
          totalBonus += bonus.amount;

          // 标记单次使用的加成待删除
          if (bonus.duration === -999) {
            toRemove.push(id);
          }
        }
      }
    }

    // 清理单次使用的加成
    toRemove.forEach(id => this.bonuses.delete(id));

    return totalBonus;
  }

  /**
   * 获取卡牌费用减免
   */
  getCostReduction(playerId: 'playerA' | 'playerB', cardTypes: string[] = []): number {
    let totalReduction = 0;

    for (const bonus of this.bonuses.values()) {
      if (bonus.playerId === playerId && bonus.bonusType === 'cost') {
        if (!bonus.cardType || cardTypes.includes(bonus.cardType)) {
          totalReduction += bonus.amount;
        }
      }
    }

    return totalReduction;
  }

  /**
   * 检查是否有特定限制
   */
  hasRestriction(playerId: 'playerA' | 'playerB', restrictionType: string): boolean {
    return this.restrictions.has(`${playerId}_${restrictionType}`);
  }

  /**
   * 添加限制
   */
  addRestriction(playerId: 'playerA' | 'playerB', restrictionType: string, data: any, duration: number = 1) {
    const key = `${playerId}_${restrictionType}`;
    this.restrictions.set(key, { data, duration });
  }

  /**
   * 移除效果
   */
  removeEffect(effectId: string) {
    const effect = this.effects.get(effectId);
    if (effect) {
      if (effect.onExpire) {
        effect.onExpire();
      }
      this.effects.delete(effectId);
      
      const historyStore = useHistoryStore();
      historyStore.addLog(`持续效果结束：${effect.description}`, 'info');
    }
  }

  /**
   * 减少持续时间并移除过期效果
   * 修改：支持按玩家ID减少持续时间
   */
  private decreaseDuration(playerId?: 'playerA' | 'playerB') {
    const historyStore = useHistoryStore();

    // 处理持续效果
    for (const [id, effect] of this.effects.entries()) {
      // 如果指定了玩家ID，只处理该玩家的效果
      if (playerId && effect.playerId !== playerId) continue;

      if (effect.duration > 0) {
        effect.duration--;
        if (effect.duration === 0) {
          this.removeEffect(id);
        }
      }
    }

    // 处理临时加成
    for (const [id, bonus] of this.bonuses.entries()) {
      // 如果指定了玩家ID，只处理该玩家的加成
      if (playerId && bonus.playerId !== playerId) continue;

      if (bonus.duration > 0) {
        bonus.duration--;
        if (bonus.duration === 0) {
          this.bonuses.delete(id);
          // 移除重复的临时加成结束提示
          // historyStore.addLog(`临时加成结束：${bonus.description}`, 'info');
        }
      }
    }

    // 处理限制
    for (const [key, restriction] of this.restrictions.entries()) {
      // 限制的key格式为 `${playerId}_${restrictionType}`
      // 如果指定了玩家ID，只处理该玩家的限制
      if (playerId && !key.startsWith(`${playerId}_`)) continue;

      if (restriction.duration > 0) {
        restriction.duration--;
        if (restriction.duration === 0) {
          this.restrictions.delete(key);
        }
      }
    }
  }

  /**
   * 获取玩家的所有活跃效果
   */
  getActiveEffects(playerId: 'playerA' | 'playerB'): PersistentEffect[] {
    return Array.from(this.effects.values()).filter(effect => effect.playerId === playerId);
  }

  /**
   * 获取玩家的所有临时加成
   */
  getActiveBonuses(playerId: 'playerA' | 'playerB'): TemporaryBonus[] {
    return Array.from(this.bonuses.values()).filter(bonus => bonus.playerId === playerId);
  }

  /**
   * 清除所有效果 (游戏结束时调用)
   */
  clearAll() {
    this.effects.clear();
    this.bonuses.clear();
    this.restrictions.clear();
  }

  /**
   * 处理特定类型的效果逻辑
   */
  processEffectType(effect: PersistentEffect, context?: any): boolean {
    switch (effect.type) {
      // 技能冷却相关
      case 'skill_cooldown_reset':
        console.log(`重置 ${effect.playerId} 的技能冷却`);
        return true;
      
      case 'leadership_cooldown_reduction':
        console.log(`${effect.playerId} 全队技能冷却-${effect.data.cooldownReduction}`);
        return true;
      
      // 卡牌费用相关
      case 'first_card_discount':
      case 'skill_cost_reduction':
      case 'next_card_cost_reduction':
        console.log(`${effect.playerId} 卡牌成本减少: ${effect.description}`);
        return true;
      
      // 强制行动
      case 'forced_action':
      case 'forced_friendly_recommendation':
      case 'forced_stop_discussion':
        console.log(`${effect.playerId} 被强制: ${effect.data.forcedAction || effect.data.actionType}`);
        return true;
      
      // 保护和免疫
      case 'skill_immunity':
      case 'hand_protection':
      case 'angel_protection':
        console.log(`${effect.playerId} 获得保护: ${effect.description}`);
        return true;
      
      // 胜利奖励
      case 'victory_bonus':
      case 'flash_strike_victory':
        if (context?.isVictory && context?.playerId === effect.playerId) {
          console.log(`${effect.playerId} 获得胜利奖励: ${effect.data.tpReward}TP`);
          return true;
        }
        return false;
      
      // 出牌限制
      case 'play_limit':
        console.log(`${effect.playerId} 本回合限制出牌: ${effect.data.maxPlays}张`);
        return true;
      
      // 声望保护
      case 'reputation_protection':
        if (context?.reputationLoss && Math.random() < effect.data.reductionChance) {
          console.log(`${effect.playerId} 声望损失减少`);
          return true;
        }
        return false;
      
      // 音乐和节奏效果
      case 'bass_rhythm':
      case 'music_frenzy_basic':
      case 'musical_family':
      case 'music_practice_bonus':
        console.log(`${effect.playerId} 音乐效果: ${effect.description}`);
        return true;
      
      // 魔法和奇幻效果
      case 'fantasy_combo':
      case 'spiral_power':
      case 'gem_magic_bonus':
      case 'magician_bloodline':
        console.log(`${effect.playerId} 魔法效果: ${effect.description}`);
        return true;
      
      // 战斗和攻击效果
      case 'tsundere_counter':
      case 'time_stop_priority':
      case 'cybernetic_enhancement':
      case 'chika_game_bonus':
        console.log(`${effect.playerId} 战斗效果: ${effect.description}`);
        return true;
      
      // 社交和互动效果
      case 'spy_network':
      case 'data_analysis':
      case 'twin_sense':
      case 'perfectionist_bonus':
      case 'observation_skills':
      case 'flash_strike_prepare':
      case 'angel_blessing':
        console.log(`${effect.playerId} 社交效果: ${effect.description}`);
        return true;
      
      // 时间和知识效果
      case 'time_warning_cost_increase':
      case 'future_knowledge':
      case 'reincarnation_memory':
        console.log(`${effect.playerId} 时间效果: ${effect.description}`);
        return true;
      
      // 卡牌强化和增强效果
      case 'card_strength_boost':
      case 'next_card_strength':
      case 'double_next_card':
      case 'noble_bloodline_bonus':
        console.log(`${effect.playerId} 卡牌增强: ${effect.description}`);
        return true;
      
      // 特殊状态效果
      case 'destiny_detection':
      case 'natural_black_hole':
      case 'magic_collection':
      case 'magic_mastery':
        console.log(`${effect.playerId} 特殊状态: ${effect.description}`);
        return true;
      
      // 技能相关效果
      case 'otaku_knowledge':
      case 'president_leadership':
      case 'trend_following':
      case 'perfectionism_check':
      case 'class_president_duty':
        console.log(`${effect.playerId} 技能效果: ${effect.description}`);
        return true;
      
      // 战术和策略效果
      case 'mad_dog_assault':
      case 'enhanced_bass_rhythm':
      case 'enhanced_music_frenzy':
        console.log(`${effect.playerId} 战术效果: ${effect.description}`);
        return true;
      
      // 默认情况：基础效果
      default:
        console.log(`处理通用效果: ${effect.type} - ${effect.description}`);
        return true;
    }
  }

  /**
   * 检查是否可以使用技能
   */
  canUseSkill(playerId: 'playerA' | 'playerB', skillId: string): boolean {
    for (const restriction of this.restrictions.values()) {
      if (restriction.data.skillId === skillId) {
        return false;
      }
    }
    return true;
  }

  /**
   * 获取强制行动
   */
  getForcedAction(playerId: 'playerA' | 'playerB'): string | null {
    const key = `${playerId}_forced_action`;
    const restriction = this.restrictions.get(key);
    return restriction?.data.actionType || null;
  }

  /**
   * 获取出牌限制
   */
  getPlayLimit(playerId: 'playerA' | 'playerB'): number | null {
    for (const effect of this.effects.values()) {
      if (effect.playerId === playerId && effect.type === 'play_limit') {
        return effect.data.maxPlays;
      }
    }
    return null;
  }

  /**
   * 处理胜利时效果
   */
  onVictory(playerId: 'playerA' | 'playerB'): void {
    for (const effect of this.effects.values()) {
      if (effect.playerId === playerId) {
        this.processEffectType(effect, { isVictory: true, playerId });
      }
    }
  }

  /**
   * 添加预定义的常用效果
   */
  
  // 卡牌类型强度加成 (如科幻+2强度)
  addCardTypeStrengthBonus(playerId: 'playerA' | 'playerB', cardType: string, amount: number, duration: number = 1) {
    return this.addTemporaryBonus({
      playerId,
      cardType,
      bonusType: 'strength',
      amount,
      duration,
      description: `${cardType}类卡牌+${amount}强度 (${duration}回合)`
    });
  }

  // 卡牌费用减免
  addCardTypeCostReduction(playerId: 'playerA' | 'playerB', cardType: string, amount: number, duration: number = 1) {
    return this.addTemporaryBonus({
      playerId,
      cardType,
      bonusType: 'cost',
      amount,
      duration,
      description: `${cardType}类卡牌-${amount}费用 (${duration}回合)`
    });
  }

  // 技能禁用
  addSkillDisable(playerId: 'playerA' | 'playerB', skillId: string, duration: number = 1) {
    return this.addRestriction(playerId, 'skill_disabled', { skillId }, duration);
  }

  // 强制行动类型
  addForcedAction(playerId: 'playerA' | 'playerB', actionType: string, duration: number = 1) {
    return this.addRestriction(playerId, 'forced_action', { actionType }, duration);
  }

  /**
   * 获取技能费用减免
   */
  getSkillCostReduction(playerId: 'playerA' | 'playerB'): number {
    let totalReduction = 0;
    for (const effect of this.effects.values()) {
      if (effect.playerId === playerId && effect.type === 'skill_cost_reduction') {
        totalReduction += effect.data.costReduction || 0;
      }
    }
    return totalReduction;
  }

  /**
   * 获取卡牌强度加成 (来自效果)
   */
  getCardStrengthBonus(playerId: 'playerA' | 'playerB', cardType?: string): number {
    let totalBonus = 0;
    
    // 从效果中获取
    for (const effect of this.effects.values()) {
      if (effect.playerId === playerId) {
        switch (effect.type) {
          case 'card_strength_boost':
          case 'next_card_strength':
          case 'chika_game_bonus':
          case 'noble_bloodline_bonus':
            totalBonus += effect.data.strengthBonus || 0;
            break;
        }
      }
    }
    
    return totalBonus;
  }

  /**
   * 检查是否有手牌保护
   */
  hasHandProtection(playerId: 'playerA' | 'playerB'): boolean {
    return this.getActiveEffects(playerId).some(effect => 
      effect.type === 'hand_protection' || effect.type === 'angel_protection'
    );
  }

  /**
   * 检查是否有技能免疫
   */
  hasSkillImmunity(playerId: 'playerA' | 'playerB'): boolean {
    return this.getActiveEffects(playerId).some(effect => effect.type === 'skill_immunity');
  }

  /**
   * 处理卡牌打出时的效果
   */
  onCardPlayed(playerId: 'playerA' | 'playerB', card: any): void {
    for (const effect of this.effects.values()) {
      if (effect.playerId === playerId) {
        this.processEffectType(effect, { 
          event: 'onCardPlayed', 
          card, 
          playerId 
        });
      }
    }
  }

  /**
   * 处理技能使用时的效果
   */
  onSkillUsed(playerId: 'playerA' | 'playerB', skillId: string): void {
    for (const effect of this.effects.values()) {
      if (effect.playerId === playerId) {
        this.processEffectType(effect, { 
          event: 'onSkillUsed', 
          skillId, 
          playerId 
        });
      }
    }
    
    // 消耗技能费用减免效果
    for (const [id, effect] of this.effects.entries()) {
      if (effect.playerId === playerId && effect.type === 'skill_cost_reduction') {
        this.removeEffect(id);
        break; // 只消耗一个
      }
    }
  }

  /**
   * 获取下张卡牌的费用修正
   */
  getNextCardCostModification(playerId: 'playerA' | 'playerB'): number {
    let modification = 0;
    for (const effect of this.effects.values()) {
      if (effect.playerId === playerId) {
        switch (effect.type) {
          case 'first_card_discount':
          case 'next_card_cost_reduction':
            modification -= effect.data.costReduction || 0;
            break;
        }
      }
    }
    return modification;
  }

  /**
   * 应用下张卡牌的费用修正并消耗效果
   */
  applyAndConsumeNextCardCostReduction(playerId: 'playerA' | 'playerB'): number {
    let totalReduction = 0;
    const toRemove: string[] = [];
    
    for (const [id, effect] of this.effects.entries()) {
      if (effect.playerId === playerId) {
        switch (effect.type) {
          case 'first_card_discount':
          case 'next_card_cost_reduction':
            totalReduction += effect.data.costReduction || 0;
            toRemove.push(id);
            break;
        }
      }
    }
    
    // 移除已消耗的效果
    toRemove.forEach(id => this.removeEffect(id));
    
    return totalReduction;
  }

  /**
   * 检查回合结束时的效果处理
   */
  processEndOfTurnEffects(playerId: 'playerA' | 'playerB'): void {
    for (const effect of this.effects.values()) {
      if (effect.playerId === playerId) {
        // 重置某些状态
        switch (effect.type) {
          case 'musical_family':
            if (effect.data.firstSchoolCardPlayed) {
              effect.data.firstSchoolCardPlayed = false;
            }
            break;
        }
      }
    }
  }

  /**
   * 获取所有活跃的限制类型
   */
  getActiveRestrictions(playerId: 'playerA' | 'playerB'): string[] {
    const restrictions: string[] = [];
    for (const [key, restriction] of this.restrictions.entries()) {
      if (key.startsWith(`${playerId}_`)) {
        restrictions.push(key.substring(key.indexOf('_') + 1));
      }
    }
    return restrictions;
  }

  /**
   * 获取指定玩家的所有活跃效果
   */
  getPlayerEffects(playerId: 'playerA' | 'playerB'): PersistentEffect[] {
    return Array.from(this.effects.values()).filter(effect => effect.playerId === playerId);
  }

  /**
   * 获取所有活跃效果
   */
  getAllEffects(): PersistentEffect[] {
    return Array.from(this.effects.values());
  }

  /**
   * 获取指定玩家的效果数量
   */
  getPlayerEffectCount(playerId: 'playerA' | 'playerB'): number {
    return this.getPlayerEffects(playerId).length;
  }

  /**
   * 移除指定角色的所有效果
   * 用于角色替换/死亡时清理
   */
  removeCharacterEffects(playerId: 'playerA' | 'playerB', characterId: number): void {
    const toRemove: string[] = [];

    // 查找并标记该角色的所有效果
    for (const [id, effect] of this.effects.entries()) {
      if (effect.playerId === playerId && effect.data.characterId === characterId) {
        toRemove.push(id);
      }
    }

    // 移除效果
    toRemove.forEach(id => this.removeEffect(id));

    if (toRemove.length > 0) {
      const historyStore = useHistoryStore();
      historyStore.addLog(`角色替换：移除了 ${toRemove.length} 个效果`, 'info');
    }
  }

  /**
   * 清理系统资源
   */
  cleanup(): void {
    this.effects.clear();
    this.bonuses.clear();
    this.restrictions.clear();
  }
}