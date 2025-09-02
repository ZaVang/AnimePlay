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
 */
export class PersistentEffectSystem {
  private static instance: PersistentEffectSystem;
  private effects: Map<string, PersistentEffect> = new Map();
  private bonuses: Map<string, TemporaryBonus> = new Map();
  private restrictions: Map<string, any> = new Map();

  static getInstance(): PersistentEffectSystem {
    if (!PersistentEffectSystem.instance) {
      PersistentEffectSystem.instance = new PersistentEffectSystem();
    }
    return PersistentEffectSystem.instance;
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

    const historyStore = useHistoryStore();
    historyStore.addLog(`持续效果激活：${fullEffect.description}`, 'info');
    
    return id;
  }

  /**
   * 添加临时加成
   */
  addTemporaryBonus(bonus: Omit<TemporaryBonus, 'id'>): string {
    const id = `bonus_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullBonus: TemporaryBonus = { ...bonus, id };
    
    this.bonuses.set(id, fullBonus);

    const historyStore = useHistoryStore();
    historyStore.addLog(`临时加成：${fullBonus.description}`, 'info');
    
    return id;
  }

  /**
   * 回合开始时处理所有效果
   */
  onTurnStart(playerId: 'playerA' | 'playerB') {
    // 处理持续效果
    for (const [id, effect] of this.effects.entries()) {
      if (effect.onTurnStart) {
        effect.onTurnStart();
      }
    }

    // 减少所有效果的持续时间
    this.decreaseDuration();
  }

  /**
   * 回合结束时处理所有效果
   */
  onTurnEnd(playerId: 'playerA' | 'playerB') {
    for (const [id, effect] of this.effects.entries()) {
      if (effect.onTurnEnd) {
        effect.onTurnEnd();
      }
    }
  }

  /**
   * 获取卡牌强度加成
   */
  getStrengthBonus(playerId: 'playerA' | 'playerB', cardTypes: string[] = []): number {
    let totalBonus = 0;

    for (const bonus of this.bonuses.values()) {
      if (bonus.playerId === playerId && bonus.bonusType === 'strength') {
        // 检查卡牌类型匹配
        if (!bonus.cardType || cardTypes.includes(bonus.cardType)) {
          totalBonus += bonus.amount;
        }
      }
    }

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
   */
  private decreaseDuration() {
    const historyStore = useHistoryStore();

    // 处理持续效果
    for (const [id, effect] of this.effects.entries()) {
      if (effect.duration > 0) {
        effect.duration--;
        if (effect.duration === 0) {
          this.removeEffect(id);
        }
      }
    }

    // 处理临时加成
    for (const [id, bonus] of this.bonuses.entries()) {
      if (bonus.duration > 0) {
        bonus.duration--;
        if (bonus.duration === 0) {
          this.bonuses.delete(id);
          historyStore.addLog(`临时加成结束：${bonus.description}`, 'info');
        }
      }
    }

    // 处理限制
    for (const [key, restriction] of this.restrictions.entries()) {
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
}