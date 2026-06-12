/**
 * 整场结算奖励测试（S6）。
 */
import { describe, it, expect } from 'vitest';
import { calculateMatchRewards, VICTORY_REASON_TEXT } from './matchRewards';

describe('calculateMatchRewards（playerA 视角）', () => {
  it('胜 60/30，平 30/15，负 15/5', () => {
    expect(calculateMatchRewards({ winner: 'playerA', reason: 'reputation' })).toEqual({ exp: 60, knowledge: 30 });
    expect(calculateMatchRewards({ winner: 'draw', reason: 'draw' })).toEqual({ exp: 30, knowledge: 15 });
    expect(calculateMatchRewards({ winner: 'playerB', reason: 'topic_bias' })).toEqual({ exp: 15, knowledge: 5 });
  });

  it('返回新对象（表不可被调用方污染）', () => {
    const a = calculateMatchRewards({ winner: 'playerA', reason: 'reputation' });
    a.exp = 9999;
    expect(calculateMatchRewards({ winner: 'playerA', reason: 'final_decision' }).exp).toBe(60);
  });

  it('每种结算原因都有展示文案', () => {
    for (const reason of ['reputation', 'topic_bias', 'final_decision', 'draw', 'concede'] as const) {
      expect(VICTORY_REASON_TEXT[reason]).toBeTruthy();
    }
  });
});
