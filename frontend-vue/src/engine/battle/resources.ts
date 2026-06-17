/**
 * 玩家资源规则（TP / 抽牌 / 弃牌 / 洗牌）—— 无状态纯函数，操作传入的 PlayerState 并返回新状态。
 * 原 core/systems/ResourceManager；洗牌改为注入 RNG（铁律 3）。
 */
import type { PlayerState } from '@/types';
import type { RNG } from '../rng';

/** 手牌上限：超过后抽牌中止。 */
export const MAX_HAND_SIZE = 10;

/** 回合开始时回复 TP：第 1 回合用初始 maxTp，之后每回合 +1，回满。 */
export function restoreTpForNewTurn(player: PlayerState, turn: number): { newTp: number; newMaxTp: number } {
  const newMaxTp = turn > 1 ? player.maxTp + 1 : player.maxTp;
  return { newTp: newMaxTp, newMaxTp };
}

/** 花费 TP；不足时返回 null。 */
export function spendTp(player: PlayerState, amount: number): number | null {
  if (player.tp >= amount) return player.tp - amount;
  return null;
}

/**
 * 实际出牌费用 = 卡面费用 − 持续效果减费，下限 0（S8a：减费首次被真实消费）。
 * S8c 起 reduction 允许为负（= 费用增加，射击精准/时间警告类敌对效果），不再钳到 0。
 */
export function effectiveCardCost(baseCost: number | undefined, reduction: number): number {
  return Math.max(0, (baseCost || 0) - reduction);
}

/** 获得 TP，封顶于 maxTp。 */
export function gainTp(player: PlayerState, amount: number): number {
  return Math.min(player.tp + amount, player.maxTp);
}

/**
 * 从牌库抽 count 张到手牌。
 * - 牌库抽空时把弃牌堆洗回牌库续抽（传入 rng 则洗牌，否则按原顺序续上）；
 * - 牌库 + 弃牌堆都空时停止——「能抽几张抽几张」，不再「不足 count 就整次静默作废」；
 * - 抽牌中手牌到达上限 MAX_HAND_SIZE 则中止。
 * 实际抽到张数由调用方按 hand 长度差判断（牌真抽空时据此提示）。
 */
export function drawCards(player: PlayerState, count: number, rng?: RNG): PlayerState {
  const deck = [...player.deck];
  const hand = [...player.hand];
  let discardPile = [...player.discardPile];
  for (let i = 0; i < count; i++) {
    if (hand.length >= MAX_HAND_SIZE) break;
    if (deck.length === 0) {
      if (discardPile.length === 0) break; // 牌库与弃牌堆都空，无牌可抽
      deck.push(...(rng ? rng.shuffle(discardPile) : discardPile));
      discardPile = [];
    }
    const card = deck.pop();
    if (card) hand.push(card);
  }
  return { ...player, deck, hand, discardPile };
}

/** 从手牌弃一张到弃牌堆；找不到该卡时状态原样返回。 */
export function discardCard(player: PlayerState, cardId: string): PlayerState {
  const numericCardId = parseInt(cardId, 10);
  if (isNaN(numericCardId)) return player;

  const discardedCard = player.hand.find(c => c.id === numericCardId);
  if (!discardedCard) return player;

  const hand = player.hand.filter(c => c.id !== numericCardId);
  const discardPile = [...player.discardPile, discardedCard];
  return { ...player, hand, discardPile };
}

/** 洗牌（Fisher-Yates，随机源注入）。 */
export function shuffleDeck(player: PlayerState, rng: RNG): PlayerState {
  return { ...player, deck: rng.shuffle(player.deck) };
}
