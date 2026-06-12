/**
 * 资源规则特征测试（S2，原 ResourceManager 行为锁定）。
 */
import { describe, it, expect } from 'vitest';
import { drawCards, discardCard, shuffleDeck, spendTp, gainTp, restoreTpForNewTurn, effectiveCardCost, MAX_HAND_SIZE } from './resources';
import { createSeededRng } from '../rng';
import type { PlayerState } from '@/types';
import type { AnimeCard } from '@/types/card';

const card = (id: number): AnimeCard => ({ id, points: 1 }) as unknown as AnimeCard;

function player(over: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'playerA',
    name: 'T',
    reputation: 30,
    tp: 2,
    maxTp: 2,
    hand: [],
    deck: [],
    discardPile: [],
    characters: [],
    activeCharacterIndex: 0,
    skillCooldowns: {},
    needsRotation: false,
    rotationsUsedThisTurn: 0,
    ...over,
  };
}

describe('drawCards', () => {
  it('从牌库顶（数组尾）抽到手牌', () => {
    const p = player({ deck: [card(1), card(2), card(3)] });
    const r = drawCards(p, 2);
    expect(r.hand.map(c => c.id)).toEqual([3, 2]);
    expect(r.deck.map(c => c.id)).toEqual([1]);
  });

  it('牌库不足 count 张时整次抽牌不发生（原行为）', () => {
    const p = player({ deck: [card(1)] });
    const r = drawCards(p, 2);
    expect(r).toBe(p); // 状态原样返回
  });

  it('手牌到达上限 10 张后中止', () => {
    const fullHand = Array.from({ length: MAX_HAND_SIZE }, (_, i) => card(100 + i));
    const p = player({ hand: fullHand, deck: [card(1), card(2)] });
    const r = drawCards(p, 2);
    expect(r.hand.length).toBe(MAX_HAND_SIZE);
    expect(r.deck.length).toBe(2); // 没抽走
  });
});

describe('discardCard', () => {
  it('弃牌进弃牌堆', () => {
    const p = player({ hand: [card(1), card(2)] });
    const r = discardCard(p, '1');
    expect(r.hand.map(c => c.id)).toEqual([2]);
    expect(r.discardPile.map(c => c.id)).toEqual([1]);
  });

  it('手牌中不存在该卡 → 状态原样返回', () => {
    const p = player({ hand: [card(1)] });
    expect(discardCard(p, '99')).toBe(p);
    expect(discardCard(p, 'abc')).toBe(p);
  });
});

describe('shuffleDeck', () => {
  it('同种子结果一致，不同种子打乱不同，且不丢牌', () => {
    const deck = Array.from({ length: 20 }, (_, i) => card(i));
    const p = player({ deck });
    const a = shuffleDeck(p, createSeededRng(42));
    const b = shuffleDeck(p, createSeededRng(42));
    const c = shuffleDeck(p, createSeededRng(7));
    expect(a.deck.map(x => x.id)).toEqual(b.deck.map(x => x.id));
    expect(a.deck.map(x => x.id)).not.toEqual(c.deck.map(x => x.id));
    expect([...a.deck.map(x => x.id)].sort((x, y) => x - y)).toEqual(deck.map(x => x.id));
  });
});

describe('effectiveCardCost（S8a 减费消费；S8c 起负减免 = 费用增加）', () => {
  it('卡面费用 − 减免，下限 0；负减免透传为加费', () => {
    expect(effectiveCardCost(3, 1)).toBe(2);
    expect(effectiveCardCost(2, 5)).toBe(0); // 减免超过费用 → 0
    expect(effectiveCardCost(undefined, 1)).toBe(0); // 无费用卡
    expect(effectiveCardCost(3, 0)).toBe(3);
    // S8c 语义变更：负减免 = 敌对加费（射击精准/时间警告），不再钳 0
    expect(effectiveCardCost(3, -2)).toBe(5);
    expect(effectiveCardCost(0, -2)).toBe(2); // 0 费卡也能被加费
  });
});

describe('TP', () => {
  it('spendTp 不足返回 null', () => {
    expect(spendTp(player({ tp: 3 }), 2)).toBe(1);
    expect(spendTp(player({ tp: 1 }), 2)).toBeNull();
  });

  it('gainTp 封顶于 maxTp', () => {
    expect(gainTp(player({ tp: 1, maxTp: 3 }), 5)).toBe(3);
    expect(gainTp(player({ tp: 1, maxTp: 3 }), 1)).toBe(2);
  });

  it('restoreTpForNewTurn：第 1 回合用初始值，此后每回合 maxTp+1 并回满', () => {
    expect(restoreTpForNewTurn(player({ tp: 0, maxTp: 2 }), 1)).toEqual({ newTp: 2, newMaxTp: 2 });
    expect(restoreTpForNewTurn(player({ tp: 0, maxTp: 5 }), 6)).toEqual({ newTp: 6, newMaxTp: 6 });
  });
});
