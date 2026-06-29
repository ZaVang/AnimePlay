/**
 * 挑战塔掉落纯函数特征测试（S13-C2）。
 * 覆盖：层段→稀有度边界（1/5/6/15/16/30/31/50/51）、50% 概率边界、随机槽、同序列可复现、注入 RNG。
 * 稀有度映射用 config/equipment.ts 的 dropRarityForFloor 注入（engine 自己不知道边界）。
 */
import { describe, it, expect } from 'vitest';
import { rollTowerDrop } from './drops';
import { createSequenceRng } from '../rng';
import { dropRarityForFloor } from '@/config/equipment';

describe('dropRarityForFloor 层段边界', () => {
  it('1-5 → R', () => {
    expect(dropRarityForFloor(1)).toBe('R');
    expect(dropRarityForFloor(5)).toBe('R');
  });
  it('6-15 → SR', () => {
    expect(dropRarityForFloor(6)).toBe('SR');
    expect(dropRarityForFloor(15)).toBe('SR');
  });
  it('16-30 → SSR', () => {
    expect(dropRarityForFloor(16)).toBe('SSR');
    expect(dropRarityForFloor(30)).toBe('SSR');
  });
  it('31-50 → HR', () => {
    expect(dropRarityForFloor(31)).toBe('HR');
    expect(dropRarityForFloor(50)).toBe('HR');
  });
  it('51+ → UR', () => {
    expect(dropRarityForFloor(51)).toBe('UR');
    expect(dropRarityForFloor(999)).toBe('UR');
  });
});

describe('rollTowerDrop 概率与槽位', () => {
  it('概率掷 >= 0.5 → 不掉落（chance(0.5) 为 false）', () => {
    // 第一个值用于 chance：0.5 不 < 0.5 → false
    const rng = createSequenceRng([0.5]);
    expect(rollTowerDrop(3, rng, dropRarityForFloor)).toBeNull();
  });

  it('概率掷 < 0.5 → 命中，按层段定稀有度', () => {
    // chance 用 0.0（命中），pick 槽用第二个值
    const rng = createSequenceRng([0.0, 0.0]); // 槽 idx0 → weapon
    const drop = rollTowerDrop(3, rng, dropRarityForFloor);
    expect(drop).not.toBeNull();
    expect(drop!.rarity).toBe('R'); // floor 3 → R
    expect(drop!.slot).toBe('weapon');
  });

  it('随机槽：pick 值落入不同区间得不同槽', () => {
    // 3 槽：idx = floor(v*3)。v=0→weapon, v=0.4→armor(idx1), v=0.7→supporter(idx2)
    const weapon = rollTowerDrop(3, createSequenceRng([0.1, 0.0]), dropRarityForFloor);
    const armor = rollTowerDrop(3, createSequenceRng([0.1, 0.4]), dropRarityForFloor);
    const supporter = rollTowerDrop(3, createSequenceRng([0.1, 0.7]), dropRarityForFloor);
    expect(weapon!.slot).toBe('weapon');
    expect(armor!.slot).toBe('armor');
    expect(supporter!.slot).toBe('supporter');
  });

  it('高层段命中给 UR', () => {
    const drop = rollTowerDrop(60, createSequenceRng([0.0, 0.0]), dropRarityForFloor);
    expect(drop!.rarity).toBe('UR');
  });

  it('同序列可复现（同种子 → 同结果）', () => {
    const a = rollTowerDrop(20, createSequenceRng([0.2, 0.5]), dropRarityForFloor);
    const b = rollTowerDrop(20, createSequenceRng([0.2, 0.5]), dropRarityForFloor);
    expect(a).toEqual(b);
    expect(a!.rarity).toBe('SSR'); // floor 20 → SSR
  });

  it('自定义 dropChance 生效', () => {
    // dropChance=1：0.9 < 1 → 命中
    const drop = rollTowerDrop(3, createSequenceRng([0.9, 0.0]), dropRarityForFloor, 1);
    expect(drop).not.toBeNull();
  });
});
