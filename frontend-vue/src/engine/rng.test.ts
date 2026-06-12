import { describe, it, expect } from 'vitest';
import { createSeededRng, createSequenceRng, createRng, mulberry32, defaultRng } from './rng';

describe('engine/rng', () => {
  it('同一种子产生完全相同的序列（可回放性）', () => {
    const a = createSeededRng(42);
    const b = createSeededRng(42);
    const seqA = Array.from({ length: 20 }, () => a.next());
    const seqB = Array.from({ length: 20 }, () => b.next());
    expect(seqA).toEqual(seqB);
  });

  it('不同种子产生不同序列', () => {
    const a = createSeededRng(1);
    const b = createSeededRng(2);
    const seqA = Array.from({ length: 10 }, () => a.next());
    const seqB = Array.from({ length: 10 }, () => b.next());
    expect(seqA).not.toEqual(seqB);
  });

  it('next() 始终落在 [0, 1)', () => {
    const rng = createSeededRng(7);
    for (let i = 0; i < 1000; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('int(n) 返回 [0, n) 的整数，永不返回 n', () => {
    const rng = createSeededRng(99);
    for (let i = 0; i < 1000; i++) {
      const v = rng.int(10);
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(10);
    }
  });

  it('chance(0) 恒 false，chance(1) 恒 true', () => {
    const rng = createSeededRng(5);
    for (let i = 0; i < 100; i++) {
      expect(rng.chance(0)).toBe(false);
      expect(rng.chance(1)).toBe(true);
    }
  });

  it('pick 返回数组内元素；空数组返回 undefined', () => {
    const rng = createSeededRng(3);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 50; i++) {
      expect(arr).toContain(rng.pick(arr));
    }
    expect(rng.pick([])).toBeUndefined();
  });

  it('shuffle 保持元素多重集不变，且不修改原数组', () => {
    const rng = createSeededRng(11);
    const original = [1, 2, 3, 4, 5, 6, 7, 8];
    const copy = [...original];
    const shuffled = rng.shuffle(original);
    expect(original).toEqual(copy); // 原数组未被修改
    expect([...shuffled].sort()).toEqual([...original].sort());
  });

  it('shuffle 种子化后顺序确定（可回放）', () => {
    const a = createSeededRng(123).shuffle([1, 2, 3, 4, 5]);
    const b = createSeededRng(123).shuffle([1, 2, 3, 4, 5]);
    expect(a).toEqual(b);
  });

  it('createSequenceRng 依次返回给定值并循环', () => {
    const rng = createSequenceRng([0.1, 0.5, 0.9]);
    expect(rng.next()).toBe(0.1);
    expect(rng.next()).toBe(0.5);
    expect(rng.next()).toBe(0.9);
    expect(rng.next()).toBe(0.1); // 循环
    expect(() => createSequenceRng([])).toThrow();
  });

  it('mulberry32 输出 [0,1) 且大样本均值接近 0.5', () => {
    const f = mulberry32(2024);
    let sum = 0;
    const n = 10000;
    for (let i = 0; i < n; i++) {
      const v = f();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
      sum += v;
    }
    expect(sum / n).toBeGreaterThan(0.48);
    expect(sum / n).toBeLessThan(0.52);
  });

  it('defaultRng 可用（冒烟）', () => {
    const v = defaultRng.next();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
    expect(createRng(() => 0.5).int(10)).toBe(5);
  });
});
