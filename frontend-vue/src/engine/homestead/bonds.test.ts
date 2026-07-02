/**
 * 入住羁绊纯函数特征测试（S15-T3）。
 * 覆盖：命中/不命中、缺失容忍、去重、确定排序、硬上限（防 C(n,2) 爆炸）、0/1 入住不除零。
 */
import { describe, it, expect } from 'vitest';
import {
  computeBondBonus,
  BOND_SAME_ANIME_PCT,
  BOND_BONUS_CAP,
} from './bonds';

describe('computeBondBonus：同作品集合羁绊', () => {
  it('0 入住：不命中、不加成、不除零', () => {
    const r = computeBondBonus([]);
    expect(r.hits).toEqual([]);
    expect(r.bonusPct).toBe(0);
  });

  it('1 入住：单人不成羁绊', () => {
    const r = computeBondBonus([['作品A', '作品B']]);
    expect(r.hits).toEqual([]);
    expect(r.bonusPct).toBe(0);
  });

  it('同作品 2 人：命中一条，给固定档', () => {
    const r = computeBondBonus([['命运石之门'], ['命运石之门']]);
    expect(r.hits).toHaveLength(1);
    expect(r.hits[0]).toMatchObject({ anime: '命运石之门', members: 2, pct: BOND_SAME_ANIME_PCT });
    expect(r.bonusPct).toBeCloseTo(BOND_SAME_ANIME_PCT, 10);
  });

  it('不同作品各 1 人：不命中', () => {
    const r = computeBondBonus([['A'], ['B'], ['C']]);
    expect(r.hits).toEqual([]);
    expect(r.bonusPct).toBe(0);
  });

  it('anime_names 缺失 / null / 空数组：容忍不抛错、不命中', () => {
    const r = computeBondBonus([undefined, null, [], ['孤独']]);
    expect(r.hits).toEqual([]);
    expect(r.bonusPct).toBe(0);
  });

  it('同一角色重复列同作品：只计一次成员（不自我凑数）', () => {
    // 单角色列了两次「X」，不应把自己算成 2 人。
    const r = computeBondBonus([['X', 'X']]);
    expect(r.hits).toEqual([]);
    expect(r.bonusPct).toBe(0);
  });

  it('一个角色跨多作品：可同时参与多条羁绊', () => {
    // 角色1 同时属于 A、B；角色2 属于 A；角色3 属于 B → A 与 B 各 2 人，命中两条。
    const r = computeBondBonus([['A', 'B'], ['A'], ['B']]);
    expect(r.hits.map(h => h.anime).sort()).toEqual(['A', 'B']);
    expect(r.bonusPct).toBeCloseTo(2 * BOND_SAME_ANIME_PCT, 10);
  });

  it('确定性排序：人数降序，人数相同按作品名字典序', () => {
    // A: 3 人；B: 2 人；C: 2 人 → 期望 [A, B, C]（B/C 字典序）。
    const r = computeBondBonus([
      ['A', 'C'],
      ['A', 'B'],
      ['A', 'B', 'C'],
    ]);
    expect(r.hits.map(h => h.anime)).toEqual(['A', 'B', 'C']);
    expect(r.hits[0].members).toBe(3);
  });

  it('硬上限：6 人全同作品 + 多条羁绊不组合爆炸，封顶在 BOND_BONUS_CAP', () => {
    // 6 人全属同一作品「大作」，且都属另一作品「联动」→ 两条命中，各 6 人。
    const six = Array.from({ length: 6 }, () => ['大作', '联动']);
    const r = computeBondBonus(six);
    // 两条命中（各贡献 6%），未封顶前 12%；仍 ≤ cap（18%）。
    expect(r.hits).toHaveLength(2);
    expect(r.hits.every(h => h.members === 6)).toBe(true);
    expect(r.bonusPct).toBeCloseTo(Math.min(BOND_BONUS_CAP, 2 * BOND_SAME_ANIME_PCT), 10);
    expect(r.bonusPct).toBeLessThanOrEqual(BOND_BONUS_CAP);
  });

  it('硬上限：命中足够多条时 bonusPct 恰好夹到 cap（不超过）', () => {
    // 构造 6 条独立同作品羁绊（6 个角色，两两共享不同作品对）→ 原始和 > cap。
    // 6 人：每人属 3 个作品，凑出 ≥4 条 2 人羁绊，rawSum > 18% → 必被夹到 cap。
    const r = computeBondBonus([
      ['a', 'b', 'c'],
      ['a', 'b', 'c'],
      ['d', 'e', 'f'],
      ['d', 'e', 'f'],
      ['g', 'h', 'i'],
      ['g', 'h', 'i'],
    ]);
    // 9 条命中（a..i 各 2 人），rawSum = 54% 远超 cap → 夹到 18%。
    expect(r.hits.length).toBe(9);
    expect(r.bonusPct).toBe(BOND_BONUS_CAP);
  });

  it('非字符串 / 空白作品名：忽略不计', () => {
    const r = computeBondBonus([
      ['  ', '正片' as string],
      [123 as unknown as string, '正片'],
    ]);
    // 只有「正片」两个角色共享 → 命中一条。
    expect(r.hits).toHaveLength(1);
    expect(r.hits[0].anime).toBe('正片');
  });
});
