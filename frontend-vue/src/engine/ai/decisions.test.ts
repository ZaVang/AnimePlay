/**
 * AI 决策规则特征测试（S2，原 AIController/BattleController 决策行为锁定）。
 * 用序列 RNG 精确控制每个随机分支。
 */
import { describe, it, expect } from 'vitest';
import { affordableCards, chooseAttackCard, chooseAttackStyle, chooseDefense, chooseActiveSkill } from './decisions';
import { createSequenceRng } from '../rng';
import type { AnimeCard } from '@/types/card';
import type { Skill } from '@/types/skill';

const card = (id: number, points: number, cost: number): AnimeCard =>
  ({ id, points, cost }) as unknown as AnimeCard;

describe('affordableCards', () => {
  it('按 TP 过滤，cost 缺省按 0', () => {
    const hand = [card(1, 3, 2), card(2, 5, 6), { id: 3, points: 1 } as unknown as AnimeCard];
    expect(affordableCards(hand, 3).map(c => c.id)).toEqual([1, 3]);
  });

  it('S8a：注入费用解析器后按实际费用过滤（减费让原本出不起的牌可出）', () => {
    const hand = [card(1, 3, 2), card(2, 5, 6)];
    const costOf = (c: AnimeCard) => Math.max(0, (c.cost || 0) - 3); // 全员减 3 费
    expect(affordableCards(hand, 3, costOf).map(c => c.id)).toEqual([1, 2]);
  });
});

describe('chooseAttackCard', () => {
  const hand = [card(1, 2, 2), card(2, 6, 2), card(3, 4, 2), card(4, 1, 1)];
  // 性价比: card2=3, card3=2, card1=1, card4=1

  it('空手牌 → null', () => {
    expect(chooseAttackCard([], createSequenceRng([0]))).toBeNull();
  });

  it('30% 分支（首个随机 <0.3）→ 取性价比最高', () => {
    const r = chooseAttackCard(hand, createSequenceRng([0.1]));
    expect(r?.id).toBe(2);
  });

  it('70% 分支 → 在前 3 张里按第二个随机数挑', () => {
    // 第一个 0.9 → 进入 top3 分支；第二个 0.99 → floor(0.99*3)=2 → top3 第三张（card1）
    expect(chooseAttackCard(hand, createSequenceRng([0.9, 0.99]))?.id).toBe(1);
    // 第二个 0 → top3 第一张（card2）
    expect(chooseAttackCard(hand, createSequenceRng([0.9, 0]))?.id).toBe(2);
  });

  it('只有一张牌时仍消耗一个随机数并直接返回它（原行为）', () => {
    const rng = createSequenceRng([0.9]);
    expect(chooseAttackCard([card(7, 1, 1)], rng)?.id).toBe(7);
  });
});

describe('chooseAttackStyle', () => {
  it('强度 ≥4 且 TP 够付 +1 时 60% 辛辣点评', () => {
    expect(chooseAttackStyle(card(1, 4, 2), 3, createSequenceRng([0.5]))).toBe('辛辣点评');
    expect(chooseAttackStyle(card(1, 4, 2), 3, createSequenceRng([0.7]))).toBe('友好安利');
  });

  it('强度不足或 TP 不够 → 友好安利（不消耗随机数；0.5 哨兵若被消耗会翻成辛辣）', () => {
    expect(chooseAttackStyle(card(1, 3, 2), 9, createSequenceRng([0.5]))).toBe('友好安利');
    expect(chooseAttackStyle(card(1, 5, 3), 3, createSequenceRng([0.5]))).toBe('友好安利');
  });

  it('S8a：减费让「付不起辛辣」翻转为可辛辣', () => {
    // 卡面 3 费 + 辛辣 1 = 4 > TP3 → 原本友好；减 1 费后 2+1=3 ≤ 3 → 60% 分支生效
    const costOf = (c: AnimeCard) => Math.max(0, (c.cost || 0) - 1);
    expect(chooseAttackStyle(card(1, 5, 3), 3, createSequenceRng([0.5]), costOf)).toBe('辛辣点评');
  });
});

describe('chooseDefense', () => {
  it('无可负担卡 → 不防御', () => {
    expect(chooseDefense([card(1, 3, 5)], 2, 5, createSequenceRng([0.5]))).toEqual({ defend: false });
  });

  it('选性价比最高的卡；对方强度 ≥3 且 TP 够付反驳 → 70% 反驳', () => {
    const hand = [card(1, 2, 2), card(2, 6, 2)];
    const r = chooseDefense(hand, 4, 3, createSequenceRng([0.5]));
    expect(r).toEqual({ defend: true, card: hand[1], style: '反驳' });
  });

  it('对方强度 <3 → 赞同（不消耗风格随机数）', () => {
    const hand = [card(1, 6, 2), card(2, 2, 2), card(3, 2, 2)];
    const r = chooseDefense(hand, 4, 2, createSequenceRng([0.99]));
    // 0.99 被用于 skip 判定?——手牌 3 张不满足 skip 条件，短路不消耗 → 赞同
    expect(r).toEqual({ defend: true, card: hand[0], style: '赞同' });
  });

  it('手牌 ≤2 且选中卡强度 <2 时 30% 放弃防御', () => {
    const weak = [card(1, 1, 1), card(2, 1, 1)];
    // 强度 1<3 → 不进反驳分支；skip 随机 0.1 < 0.3 → 放弃
    const skipped = chooseDefense(weak, 5, 1, createSequenceRng([0.1]));
    expect(skipped.defend).toBe(false);
    // skip 随机 0.5 ≥ 0.3 → 防御
    const kept = chooseDefense(weak, 5, 1, createSequenceRng([0.5]));
    expect(kept.defend).toBe(true);
  });
});

describe('chooseActiveSkill（S6：AI 无牌可出时的自救）', () => {
  const mk = (id: string, type: '主动技能' | '被动光环', cost?: number): Skill =>
    ({ id, name: id, type, description: '', cost }) as Skill;

  it('跳过被动、付不起、冷却中的技能，取第一个可用主动', () => {
    const skills = [
      mk('PASSIVE', '被动光环'),
      mk('EXPENSIVE', '主动技能', 5),
      mk('COOLING', '主动技能', 1),
      mk('OK', '主动技能', 2),
    ];
    expect(chooseActiveSkill(skills, 3, { COOLING: 2 })?.id).toBe('OK');
  });

  it('cost 缺省按 0；无可用 → null；skills 未定义 → null', () => {
    expect(chooseActiveSkill([mk('FREE', '主动技能')], 0, {})?.id).toBe('FREE');
    expect(chooseActiveSkill([mk('A', '主动技能', 9)], 1, {})).toBeNull();
    expect(chooseActiveSkill(undefined, 9, {})).toBeNull();
  });
});
