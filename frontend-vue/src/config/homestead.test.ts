/**
 * 家园挂机经济纯计算测试（S13-B）。锁定离线收益口径：经验/好感 flat、知识点按稀有度加权、封顶。
 */
import { describe, it, expect } from 'vitest';
import {
  computeIdleYield,
  cappedIdleHours,
  canonicalizePlacedIds,
  HOMESTEAD_SLOTS,
  OFFLINE_CAP_HOURS,
  IDLE_EXP_PER_HOUR,
  IDLE_AFFECTION_PER_HOUR,
} from './homestead';

const H = 3600_000;

describe('cappedIdleHours', () => {
  it('0 / 负数 → 0', () => {
    expect(cappedIdleHours(0)).toBe(0);
    expect(cappedIdleHours(-5)).toBe(0);
  });
  it('正常时长按小时换算', () => {
    expect(cappedIdleHours(2 * H)).toBeCloseTo(2);
  });
  it('超过封顶钳到 OFFLINE_CAP_HOURS', () => {
    expect(cappedIdleHours(99 * H)).toBe(OFFLINE_CAP_HOURS);
  });
});

describe('computeIdleYield', () => {
  it('空入住 → 全零', () => {
    expect(computeIdleYield([], 5 * H)).toEqual({
      hours: 0, expEach: 0, affectionEach: 0, knowledge: 0, characterCount: 0,
    });
  });

  it('0 时长 → 全零（但保留 characterCount）', () => {
    expect(computeIdleYield(['UR', 'SR'], 0)).toEqual({
      hours: 0, expEach: 0, affectionEach: 0, knowledge: 0, characterCount: 2,
    });
  });

  it('2 小时 / [UR, SR]：经验好感 flat，知识点按稀有度加权', () => {
    const y = computeIdleYield(['UR', 'SR'], 2 * H);
    expect(y.hours).toBeCloseTo(2);
    expect(y.expEach).toBe(IDLE_EXP_PER_HOUR * 2); // 400
    expect(y.affectionEach).toBe(IDLE_AFFECTION_PER_HOUR * 2); // 10
    expect(y.knowledge).toBe(16); // base2 ×(UR3 + SR1) ×2h
    expect(y.characterCount).toBe(2);
  });

  it('超 12h 封顶：24h 当 12h 算', () => {
    const y = computeIdleYield(['UR'], 24 * H);
    expect(y.hours).toBe(OFFLINE_CAP_HOURS);
    expect(y.expEach).toBe(IDLE_EXP_PER_HOUR * OFFLINE_CAP_HOURS); // 2400
    expect(y.knowledge).toBe(2 * 3 * OFFLINE_CAP_HOURS); // 72
  });

  it('未知稀有度的系数回落 1（不抛错）', () => {
    const y = computeIdleYield(['???' as unknown as 'UR'], 1 * H);
    expect(y.knowledge).toBe(2 * 1 * 1); // base2 ×fallback1 ×1h
  });
});

describe('canonicalizePlacedIds（存档边界规整入住名单）', () => {
  it('非数组 → 空', () => {
    expect(canonicalizePlacedIds(null)).toEqual([]);
    expect(canonicalizePlacedIds('x' as unknown)).toEqual([]);
    expect(canonicalizePlacedIds(undefined)).toEqual([]);
  });
  it('去重 + 只收有限数字（滤掉重复/字符串/NaN）', () => {
    expect(canonicalizePlacedIds([3, 3, 5, '7' as unknown, NaN, 5, 9])).toEqual([3, 5, 9]);
  });
  it('截断到 HOMESTEAD_SLOTS（脏档超额不放大收益）', () => {
    const many = Array.from({ length: HOMESTEAD_SLOTS + 4 }, (_, i) => i + 1);
    const out = canonicalizePlacedIds(many);
    expect(out).toHaveLength(HOMESTEAD_SLOTS);
    expect(out).toEqual(many.slice(0, HOMESTEAD_SLOTS));
  });
});
