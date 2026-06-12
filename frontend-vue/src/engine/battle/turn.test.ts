/**
 * 回合规则与胜负判定特征测试（S2）。
 */
import { describe, it, expect } from 'vitest';
import {
  maxTpForTurn,
  checkVictory,
  judgeFinal,
  isTurnLimitReached,
  nextRotationIndex,
  TURN_LIMIT,
} from './turn';

describe('maxTpForTurn', () => {
  it('第 1 回合 2 点，逐回合 +1，无上限（第 12 回合 13 点）', () => {
    expect(maxTpForTurn(1)).toBe(2);
    expect(maxTpForTurn(2)).toBe(3);
    expect(maxTpForTurn(9)).toBe(10);
    expect(maxTpForTurn(10)).toBe(11); // 文档曾误称 10 上限——规则上没有
    expect(maxTpForTurn(12)).toBe(13);
  });
});

describe('checkVictory', () => {
  const base = { reputationA: 30, reputationB: 30, topicBias: 0 };

  it('无人达成条件 → null', () => {
    expect(checkVictory(base)).toBeNull();
  });

  it('A 声望归零 → B 声望胜', () => {
    expect(checkVictory({ ...base, reputationA: 0 })).toEqual({ winner: 'playerB', reason: 'reputation' });
    expect(checkVictory({ ...base, reputationA: -3 })).toEqual({ winner: 'playerB', reason: 'reputation' });
  });

  it('B 声望归零 → A 声望胜', () => {
    expect(checkVictory({ ...base, reputationB: 0 })).toEqual({ winner: 'playerA', reason: 'reputation' });
  });

  it('双方同时归零 → 先检查 A → B 胜（沿袭原实现顺序）', () => {
    expect(checkVictory({ reputationA: 0, reputationB: 0, topicBias: 0 })).toEqual({
      winner: 'playerB',
      reason: 'reputation',
    });
  });

  it('议题偏向 ±10 → 对应方议题胜；±9 不触发', () => {
    expect(checkVictory({ ...base, topicBias: 10 })).toEqual({ winner: 'playerA', reason: 'topic_bias' });
    expect(checkVictory({ ...base, topicBias: -10 })).toEqual({ winner: 'playerB', reason: 'topic_bias' });
    expect(checkVictory({ ...base, topicBias: 9 })).toBeNull();
    expect(checkVictory({ ...base, topicBias: -9 })).toBeNull();
  });

  it('声望优先于议题偏向', () => {
    expect(checkVictory({ reputationA: 0, reputationB: 30, topicBias: 10 })).toEqual({
      winner: 'playerB',
      reason: 'reputation',
    });
  });
});

describe('judgeFinal（12 回合打满）', () => {
  it('声望高者胜', () => {
    expect(judgeFinal(20, 10)).toEqual({ winner: 'playerA', reason: 'final_decision' });
    expect(judgeFinal(5, 6)).toEqual({ winner: 'playerB', reason: 'final_decision' });
  });
  it('相同 → 平局', () => {
    expect(judgeFinal(15, 15)).toEqual({ winner: 'draw', reason: 'draw' });
  });
});

describe('回合上限与轮换', () => {
  it('TURN_LIMIT=12：第 12 回合结束触发终局', () => {
    expect(TURN_LIMIT).toBe(12);
    expect(isTurnLimitReached(11)).toBe(false);
    expect(isTurnLimitReached(12)).toBe(true);
  });

  it('轮换索引循环', () => {
    expect(nextRotationIndex(0, 4)).toBe(1);
    expect(nextRotationIndex(3, 4)).toBe(0);
  });
});
