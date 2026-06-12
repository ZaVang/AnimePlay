/**
 * UP 轮换日期规则测试（S3）。
 */
import { describe, it, expect } from 'vitest';
import { upPoolIndices, pickUpPool, toRotationDate, timeUntilNextRotation } from './rotation';

describe('upPoolIndices（UR: day+month / HR: day*2+month*3，对池大小取模）', () => {
  it('固定日期的索引可复算', () => {
    // 6 月 12 日（month=5）：UR (12+5)%N，HR (24+15)%M
    expect(upPoolIndices({ day: 12, month: 5 }, 10, 7)).toEqual({ urIndex: 7, hrIndex: 4 });
    expect(upPoolIndices({ day: 1, month: 0 }, 10, 7)).toEqual({ urIndex: 1, hrIndex: 2 });
  });

  it('同日同池恒定（轮换是日期决定性的，不是随机）', () => {
    const a = upPoolIndices({ day: 25, month: 11 }, 13, 9);
    const b = upPoolIndices({ day: 25, month: 11 }, 13, 9);
    expect(a).toEqual(b);
  });
});

describe('pickUpPool', () => {
  const urs = [{ id: 101 }, { id: 102 }, { id: 103 }];
  const hrs = [{ id: 201 }, { id: 202 }];

  it('按索引规则取出当日 UP 组合', () => {
    // day=1, month=0 → urIndex (1)%3=1, hrIndex (2)%2=0
    expect(pickUpPool(urs, hrs, { day: 1, month: 0 })).toEqual({ urId: 102, hrId: 201 });
  });

  it('任一池为空 → null（由调用方兜底）', () => {
    expect(pickUpPool([], hrs, { day: 1, month: 0 })).toBeNull();
    expect(pickUpPool(urs, [], { day: 1, month: 0 })).toBeNull();
  });
});

describe('timeUntilNextRotation（到次日 0 点）', () => {
  it('23:30 → 0 小时 30 分钟', () => {
    const r = timeUntilNextRotation(new Date(2026, 5, 12, 23, 30, 0));
    expect(r).toEqual({ hours: 0, minutes: 30 });
  });

  it('00:00 → 24 小时 0 分钟', () => {
    const r = timeUntilNextRotation(new Date(2026, 5, 12, 0, 0, 0));
    expect(r).toEqual({ hours: 24, minutes: 0 });
  });

  it('toRotationDate 提取 day/month', () => {
    expect(toRotationDate(new Date(2026, 5, 12))).toEqual({ day: 12, month: 5 });
  });
});
