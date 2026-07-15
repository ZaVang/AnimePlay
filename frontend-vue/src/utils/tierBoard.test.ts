import { describe, expect, it } from 'vitest';
import { findTierItemRow, moveTierItem, removeTierItem, type TierBoard } from './tierBoard';

const emptyBoard = (): TierBoard => ({ pool: [], S: [], A: [], B: [], C: [], D: [] });

describe('Tier 表棋盘移动规则', () => {
  it('覆盖导入、分档、改档、回待评与移除的完整非拖拽路径', () => {
    const initial = emptyBoard();
    const imported = moveTierItem(initial, 42, 'pool');
    const ranked = moveTierItem(imported, 42, 'S');
    const reranked = moveTierItem(ranked, 42, 'C');
    const returned = moveTierItem(reranked, 42, 'pool');
    const removed = removeTierItem(returned, 42);

    expect(findTierItemRow(imported, 42)).toBe('pool');
    expect(findTierItemRow(ranked, 42)).toBe('S');
    expect(findTierItemRow(reranked, 42)).toBe('C');
    expect(findTierItemRow(returned, 42)).toBe('pool');
    expect(findTierItemRow(removed, 42)).toBeNull();
  });

  it('移动会清除脏棋盘中的重复项，且不修改原棋盘', () => {
    const dirty: TierBoard = { pool: [7], S: [7], A: [], B: [], C: [], D: [] };
    const moved = moveTierItem(dirty, 7, 'D');

    expect(dirty.pool).toEqual([7]);
    expect(dirty.S).toEqual([7]);
    expect(moved).toEqual({ pool: [], S: [], A: [], B: [], C: [], D: [7] });
  });
});
