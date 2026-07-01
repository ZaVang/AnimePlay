/**
 * 养成配置纯函数测试（SD-T4）：补习递增 + 满级经验溢出转 KP 汇率。
 */
import { describe, it, expect } from 'vitest';
import {
  tutoringExpGain,
  TUTORING_EXP_BASE,
  TUTORING_EXP_PER_LEVEL,
  expOverflowExchange,
  EXP_OVERFLOW_PER_KP,
} from './nurture';

describe('SD-T4 tutoringExpGain（补习产出随等级线性递增）', () => {
  it('base + level × k，level 钳到 ≥1', () => {
    expect(tutoringExpGain(1)).toBe(TUTORING_EXP_BASE + TUTORING_EXP_PER_LEVEL);
    expect(tutoringExpGain(50)).toBe(TUTORING_EXP_BASE + 50 * TUTORING_EXP_PER_LEVEL);
    expect(tutoringExpGain(0)).toBe(tutoringExpGain(1)); // 钳到 1
    expect(tutoringExpGain(-5)).toBe(tutoringExpGain(1));
  });

  it('严格递增', () => {
    for (let lv = 1; lv < 100; lv++) {
      expect(tutoringExpGain(lv + 1)).toBeGreaterThan(tutoringExpGain(lv));
    }
  });
});

describe('SD-T4 expOverflowExchange（满级经验溢出转 KP，带 carry 结转）', () => {
  it('满一份兑 1 KP，余数结转', () => {
    expect(expOverflowExchange(EXP_OVERFLOW_PER_KP, 0)).toEqual({ kp: 1, carry: 0 });
    expect(expOverflowExchange(EXP_OVERFLOW_PER_KP * 2 + 7, 0)).toEqual({ kp: 2, carry: 7 });
  });

  it('carry 累加达阈值才兑', () => {
    expect(expOverflowExchange(EXP_OVERFLOW_PER_KP - 10, 0)).toEqual({ kp: 0, carry: EXP_OVERFLOW_PER_KP - 10 });
    // 上次结转 EXP_OVERFLOW_PER_KP-10，本次补 10 → 满一份
    expect(expOverflowExchange(10, EXP_OVERFLOW_PER_KP - 10)).toEqual({ kp: 1, carry: 0 });
  });

  it('非正 gainedExp 不新增（保留 carry）', () => {
    expect(expOverflowExchange(0, 500)).toEqual({ kp: 0, carry: 500 });
    expect(expOverflowExchange(-100, 500)).toEqual({ kp: 0, carry: 500 });
  });
});
