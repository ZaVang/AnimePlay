/**
 * 跨回合持续效果追踪器（原 core/systems/PersistentEffectSystem）。
 * S4 纯化：去除 store 依赖（日志经构造注入的回调发出）、
 * ID 改单调计数器（原版用 Date.now + Math.random，engine 内禁用且无必要）。
 * 实例由调用方持有（skills/systems.ts），对局结束 clearAll。
 */
import type { PlayerId } from '@/types/battle';

export interface PersistentEffect {
  id: string;
  playerId: PlayerId;
  type: string;
  /** -1 永久；0 立即；>0 持续回合数。 */
  duration: number;
  data: Record<string, unknown>;
  description: string;
  onApply?: () => void;
  onExpire?: () => void;
  onTurnStart?: () => void;
  onTurnEnd?: () => void;
}

export interface TemporaryBonus {
  id: string;
  playerId: PlayerId;
  cardType?: string; // 如 "科幻"、"战斗"；缺省对全部卡生效
  bonusType: 'strength' | 'cost' | 'tp_cost';
  amount: number;
  duration: number;
  description: string;
}

interface Restriction {
  data: unknown;
  duration: number;
}

export class PersistentEffectTracker {
  private effects = new Map<string, PersistentEffect>();
  private bonuses = new Map<string, TemporaryBonus>();
  private restrictions = new Map<string, Restriction>();
  private seq = 0;

  /** 日志回调由调用方注入（store 层接战斗日志）；engine 自身不做 I/O。 */
  constructor(private onLog: (message: string) => void = () => {}) {}

  addEffect(effect: Omit<PersistentEffect, 'id'>): string {
    const id = `effect_${++this.seq}`;
    const fullEffect: PersistentEffect = { ...effect, id };
    this.effects.set(id, fullEffect);

    fullEffect.onApply?.();
    this.onLog(`持续效果激活：${fullEffect.description}`);
    return id;
  }

  addTemporaryBonus(bonus: Omit<TemporaryBonus, 'id'>): string {
    const id = `bonus_${++this.seq}`;
    const fullBonus: TemporaryBonus = { ...bonus, id };
    this.bonuses.set(id, fullBonus);

    this.onLog(`临时加成：${fullBonus.description}`);
    return id;
  }

  onTurnStart(_playerId: PlayerId) {
    for (const effect of this.effects.values()) {
      effect.onTurnStart?.();
    }
    this.decreaseDuration();
  }

  onTurnEnd(_playerId: PlayerId) {
    for (const effect of this.effects.values()) {
      effect.onTurnEnd?.();
    }
  }

  /** 卡牌强度加成合计（按归属玩家 + 卡牌类型匹配）。 */
  getStrengthBonus(playerId: PlayerId, cardTypes: string[] = []): number {
    let totalBonus = 0;
    for (const bonus of this.bonuses.values()) {
      if (bonus.playerId === playerId && bonus.bonusType === 'strength') {
        if (!bonus.cardType || cardTypes.includes(bonus.cardType)) {
          totalBonus += bonus.amount;
        }
      }
    }
    return totalBonus;
  }

  /** 卡牌费用减免合计。 */
  getCostReduction(playerId: PlayerId, cardTypes: string[] = []): number {
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

  hasRestriction(playerId: PlayerId, restrictionType: string): boolean {
    return this.restrictions.has(`${playerId}_${restrictionType}`);
  }

  /** 读取限制的附加数据（S8a：供消费端取 skillId/actionType 等；无该限制返回 undefined）。 */
  getRestriction(playerId: PlayerId, restrictionType: string): unknown | undefined {
    return this.restrictions.get(`${playerId}_${restrictionType}`)?.data;
  }

  /** 技能是否被禁用（S8a 消费端谓词）：skillId 为 '*' 表示全体技能禁用。 */
  isSkillDisabled(playerId: PlayerId, skillId: string): boolean {
    const data = this.getRestriction(playerId, 'skill_disabled') as { skillId?: string } | undefined;
    return !!data && (data.skillId === '*' || data.skillId === skillId);
  }

  /** 被强制的行动类型（S8a 消费端谓词；如 'friendly_only' = 只能友好安利），无则 undefined。 */
  getForcedAction(playerId: PlayerId): string | undefined {
    const data = this.getRestriction(playerId, 'forced_action') as { actionType?: string } | undefined;
    return data?.actionType;
  }

  addRestriction(playerId: PlayerId, restrictionType: string, data: unknown, duration: number = 1) {
    this.restrictions.set(`${playerId}_${restrictionType}`, { data, duration });
  }

  removeEffect(effectId: string) {
    const effect = this.effects.get(effectId);
    if (effect) {
      effect.onExpire?.();
      this.effects.delete(effectId);
      this.onLog(`持续效果结束：${effect.description}`);
    }
  }

  private decreaseDuration() {
    for (const [id, effect] of this.effects.entries()) {
      if (effect.duration > 0) {
        effect.duration--;
        if (effect.duration === 0) {
          this.removeEffect(id);
        }
      }
    }

    for (const [id, bonus] of this.bonuses.entries()) {
      if (bonus.duration > 0) {
        bonus.duration--;
        if (bonus.duration === 0) {
          this.bonuses.delete(id);
          this.onLog(`临时加成结束：${bonus.description}`);
        }
      }
    }

    for (const [key, restriction] of this.restrictions.entries()) {
      if (restriction.duration > 0) {
        restriction.duration--;
        if (restriction.duration === 0) {
          this.restrictions.delete(key);
        }
      }
    }
  }

  getActiveEffects(playerId: PlayerId): PersistentEffect[] {
    return Array.from(this.effects.values()).filter(e => e.playerId === playerId);
  }

  getActiveBonuses(playerId: PlayerId): TemporaryBonus[] {
    return Array.from(this.bonuses.values()).filter(b => b.playerId === playerId);
  }

  clearAll() {
    this.effects.clear();
    this.bonuses.clear();
    this.restrictions.clear();
  }

  // --- 预定义的常用效果 ---

  /** 卡牌类型强度加成（如 科幻+2强度，1 回合）。 */
  addCardTypeStrengthBonus(playerId: PlayerId, cardType: string, amount: number, duration: number = 1) {
    return this.addTemporaryBonus({
      playerId,
      cardType,
      bonusType: 'strength',
      amount,
      duration,
      description: `${cardType}类卡牌+${amount}强度 (${duration}回合)`,
    });
  }

  /** 卡牌类型费用减免。 */
  addCardTypeCostReduction(playerId: PlayerId, cardType: string, amount: number, duration: number = 1) {
    return this.addTemporaryBonus({
      playerId,
      cardType,
      bonusType: 'cost',
      amount,
      duration,
      description: `${cardType}类卡牌-${amount}费用 (${duration}回合)`,
    });
  }

  addSkillDisable(playerId: PlayerId, skillId: string, duration: number = 1) {
    return this.addRestriction(playerId, 'skill_disabled', { skillId }, duration);
  }

  addForcedAction(playerId: PlayerId, actionType: string, duration: number = 1) {
    return this.addRestriction(playerId, 'forced_action', { actionType }, duration);
  }
}
