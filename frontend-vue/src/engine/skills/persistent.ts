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
  /** S8c：只对指定卡生效（射击精准/宝石魔术这类点名卡牌的效果）。 */
  cardId?: number;
  bonusType: 'strength' | 'cost' | 'tp_cost';
  /** 正 = 增益；负 = 减益（负 cost 加成 = 费用增加，负 strength = 削弱，受护盾拦截）。 */
  amount: number;
  duration: number;
  /**
   * S8b 一次性语义：
   *  - 'next-play'：下一次出牌后即失效（无论是否匹配，「下张卡牌」类效果）；
   *  - 'next-match'：保留到首次匹配的出牌（「下次X类卡牌」类效果）。
   * 缺省 = 持续整段 duration。消费时机见 consumeOneShotBonuses。
   */
  oneShot?: 'next-play' | 'next-match';
  description: string;
}

/** 敌对限制类型：写入时受 effect_shield 拦截（自我施加的限制不在此列）。 */
const HOSTILE_RESTRICTIONS = new Set(['skill_disabled', 'forced_action', 'forced_card_type', 'harsh_penalty']);

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
    // S8c 护盾闸：负向加成（削弱/加费）是敌对写入，目标带效果护盾时整体拦下
    if (bonus.amount < 0 && this.hasRestriction(bonus.playerId, 'effect_shield')) {
      this.onLog(`✨ 效果护盾挡下了敌对效果：${bonus.description}`);
      return '';
    }
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

  /** 加成是否匹配该次取值（玩家 + 种类 + 类型标签 + 点名卡牌）。 */
  private bonusMatches(
    bonus: TemporaryBonus,
    playerId: PlayerId,
    kind: TemporaryBonus['bonusType'],
    cardTypes: string[],
    cardId?: number,
  ): boolean {
    if (bonus.playerId !== playerId || bonus.bonusType !== kind) return false;
    if (bonus.cardType && !cardTypes.includes(bonus.cardType)) return false;
    if (bonus.cardId !== undefined && bonus.cardId !== cardId) return false;
    return true;
  }

  /** 卡牌强度加成合计（按归属玩家 + 卡牌类型 + 可选点名卡牌匹配）。 */
  getStrengthBonus(playerId: PlayerId, cardTypes: string[] = [], cardId?: number): number {
    let totalBonus = 0;
    for (const bonus of this.bonuses.values()) {
      if (this.bonusMatches(bonus, playerId, 'strength', cardTypes, cardId)) {
        totalBonus += bonus.amount;
      }
    }
    return totalBonus;
  }

  /** 卡牌费用减免合计（负值 = 费用增加，由 effectiveCardCost 透传）。 */
  getCostReduction(playerId: PlayerId, cardTypes: string[] = [], cardId?: number): number {
    let totalReduction = 0;
    for (const bonus of this.bonuses.values()) {
      if (this.bonusMatches(bonus, playerId, 'cost', cardTypes, cardId)) {
        totalReduction += bonus.amount;
      }
    }
    return totalReduction;
  }

  /** 技能 TP 费减免合计（bonusType 'tp_cost'，黄前久美子/藤原千花 这类「下次技能-1费」）。 */
  getSkillCostReduction(playerId: PlayerId): number {
    let total = 0;
    for (const bonus of this.bonuses.values()) {
      if (bonus.playerId === playerId && bonus.bonusType === 'tp_cost') total += bonus.amount;
    }
    return total;
  }

  /**
   * S8b：消费一次性加成。出牌（或用技能）完成后调用——
   * 移除「匹配本次」的 next-match 加成 + 该玩家该种类的全部 next-play 加成。
   */
  consumeOneShotBonuses(
    playerId: PlayerId,
    kind: TemporaryBonus['bonusType'],
    cardTypes: string[] = [],
    cardId?: number,
  ) {
    for (const [id, bonus] of this.bonuses.entries()) {
      if (bonus.playerId !== playerId || bonus.bonusType !== kind || !bonus.oneShot) continue;
      const matched = this.bonusMatches(bonus, playerId, kind, cardTypes, cardId);
      if (bonus.oneShot === 'next-play' || (bonus.oneShot === 'next-match' && matched)) {
        this.bonuses.delete(id);
      }
    }
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
    // S8c 护盾闸：敌对限制（禁技/强制行动/强制卡类型/辛辣惩罚）被效果护盾拦下
    if (HOSTILE_RESTRICTIONS.has(restrictionType) && this.hasRestriction(playerId, 'effect_shield')) {
      this.onLog('✨ 效果护盾挡下了敌对限制');
      return;
    }
    this.restrictions.set(`${playerId}_${restrictionType}`, { data, duration });
  }

  /** 显式移除限制（额外回合等一次性限制消费后调用）。 */
  removeRestriction(playerId: PlayerId, restrictionType: string) {
    this.restrictions.delete(`${playerId}_${restrictionType}`);
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
