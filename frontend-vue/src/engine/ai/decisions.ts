/**
 * 宅理论战 AI 决策规则 —— 纯函数（随机源注入）。
 * 只回答「出哪张牌、什么方式」；何时出牌（定时器/回合调度）由 stores/battleFlow.ts 负责。
 * 概率与判断阈值原样取自旧 AIController / BattleController，行为不变。
 */
import type { AnimeCard } from '@/types/card';
import type { Skill } from '@/types/skill';
import type { RNG } from '../rng';

export type AttackStyle = '友好安利' | '辛辣点评';
export type DefenseStyle = '赞同' | '反驳';

export interface DefenseDecision {
  defend: boolean;
  card?: AnimeCard;
  style?: DefenseStyle;
}

/**
 * 费用解析器（S8a）：调用方可注入「考虑持续效果减费后的实际费用」；
 * 缺省取卡面费用，保持旧行为。engine 不读追踪器，事实由 store 层换算后传入。
 */
export type CostResolver = (card: AnimeCard) => number;
const faceCost: CostResolver = card => card.cost || 0;

/** 当前 TP 出得起的牌。 */
export function affordableCards(
  hand: readonly AnimeCard[],
  tp: number,
  costOf: CostResolver = faceCost,
): AnimeCard[] {
  return hand.filter(card => costOf(card) <= tp);
}

/** 性价比 = 强度 / 费用（防除零）。 */
function valueScore(card: AnimeCard): number {
  return (card.points || 1) / Math.max(card.cost || 1, 1);
}

/**
 * 选攻击卡：按性价比排序，30% 取最优，70% 在前 3 张里随机（保留变化性）。
 */
export function chooseAttackCard(playable: readonly AnimeCard[], rng: RNG): AnimeCard | null {
  if (playable.length === 0) return null;

  const scored = playable.map(card => ({ card, score: valueScore(card) }));
  scored.sort((a, b) => b.score - a.score);

  if (rng.next() < 0.3 || scored.length === 1) {
    return scored[0].card;
  }
  const top = scored.slice(0, Math.min(3, scored.length));
  return top[Math.floor(rng.next() * top.length)].card;
}

/** 选攻击方式：TP 够付 +1 且强度 ≥4 时 60% 辛辣点评，否则友好安利。 */
export function chooseAttackStyle(
  card: AnimeCard,
  tp: number,
  rng: RNG,
  costOf: CostResolver = faceCost,
): AttackStyle {
  const cardStrength = card.points || 1;
  const canAffordHarsh = costOf(card) + 1 <= tp;

  if (canAffordHarsh && cardStrength >= 4) {
    return rng.next() < 0.6 ? '辛辣点评' : '友好安利';
  }
  return '友好安利';
}

/**
 * 选可用的主动技能（S6：AI 无牌可出时回费/抽牌自救）。
 * 规则：第一个「主动技能 && TP 够付 && 不在冷却」的技能；没有则 null。
 */
export function chooseActiveSkill(
  skills: readonly Skill[] | undefined,
  tp: number,
  cooldowns: Readonly<Record<string, number>>,
): Skill | null {
  if (!skills) return null;
  for (const skill of skills) {
    if (skill.type !== '主动技能') continue;
    if ((skill.cost || 0) > tp) continue;
    if ((cooldowns[skill.id] || 0) > 0) continue;
    return skill;
  }
  return null;
}

/**
 * 防御决策：
 * - 无可负担卡 → 不防御；
 * - 选性价比最高的卡；TP 够付反驳费且对方强度 ≥3 时 70% 反驳；
 * - 手牌 ≤2 且选中卡强度 <2 时 30% 概率放弃防御。
 */
export function chooseDefense(
  hand: readonly AnimeCard[],
  tp: number,
  attackerStrength: number,
  rng: RNG,
  costOf: CostResolver = faceCost,
): DefenseDecision {
  const affordable = affordableCards(hand, tp, costOf);
  if (affordable.length === 0) return { defend: false };

  const bestDefenseCard = affordable.reduce((best, card) =>
    valueScore(card) > valueScore(best) ? card : best,
  );

  const canAffordRebuttal = costOf(bestDefenseCard) + 1 <= tp;
  const shouldRebuttal = canAffordRebuttal && attackerStrength >= 3;
  const style: DefenseStyle = shouldRebuttal && rng.next() < 0.7 ? '反驳' : '赞同';

  const shouldSkip = hand.length <= 2 && (bestDefenseCard.points || 0) < 2 && rng.next() < 0.3;

  return { defend: !shouldSkip, card: bestDefenseCard, style };
}
