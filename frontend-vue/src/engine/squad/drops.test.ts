/**
 * 挑战塔掉落纯函数特征测试（S13-C2）。
 * 覆盖：层段→稀有度边界（1/5/6/15/16/30/31/50/51）、50% 概率边界、随机槽、同序列可复现、注入 RNG。
 * 稀有度映射用 config/equipment.ts 的 dropRarityForFloor 注入（engine 自己不知道边界）。
 */
import { describe, it, expect } from 'vitest';
import { rollTowerDrop, rollTowerDropWithPity, createSlotPity, type SlotPity } from './drops';
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

describe('rollTowerDropWithPity 槽位保底（S15-T4）', () => {
  const NEVER = createSequenceRng([0.99]); // chance 恒不过 → 每次判定都是「未掉落」推进各槽 +1
  const HIT_WEAPON = () => createSequenceRng([0.0, 0.0]); // chance 过、pick idx0 → weapon
  const THRESH = 3;

  it('createSlotPity 全零', () => {
    expect(createSlotPity()).toEqual({ weapon: 0, armor: 0, supporter: 0 });
  });

  it('未掉落（chance 未过）：各槽计数 +1，drop=null', () => {
    const r = rollTowerDropWithPity(3, NEVER, dropRarityForFloor, createSlotPity(), THRESH);
    expect(r.drop).toBeNull();
    expect(r.pity).toEqual({ weapon: 1, armor: 1, supporter: 1 });
  });

  it('命中某槽：该槽归零、其余 +1', () => {
    const start: SlotPity = { weapon: 2, armor: 2, supporter: 2 };
    const r = rollTowerDropWithPity(3, HIT_WEAPON(), dropRarityForFloor, start, THRESH);
    expect(r.drop?.slot).toBe('weapon');
    expect(r.pity).toEqual({ weapon: 0, armor: 3, supporter: 3 });
    // 入参未被修改（纯函数返回新副本）
    expect(start).toEqual({ weapon: 2, armor: 2, supporter: 2 });
  });

  it('★ 保底边界：连 N 次判定未出某槽（计数达阈值）→ 下次强制命中该槽（跳过 chance）', () => {
    // 只让 supporter 到阈值（其余 0），验证「连续未出 → 强制命中」的核心保底语义。
    const pity: SlotPity = { weapon: 0, armor: 0, supporter: THRESH };
    // 即便 RNG 恒不命中（0.99），也强制出 supporter（保底跳过 chance）
    const forced = rollTowerDropWithPity(3, NEVER, dropRarityForFloor, pity, THRESH);
    expect(forced.drop?.slot).toBe('supporter');
    expect(forced.pity.supporter).toBe(0); // 触发后归零
    expect(forced.pity).toEqual({ weapon: 1, armor: 1, supporter: 0 }); // 其余 +1

    // 逼近路径：连 THRESH 次未出 supporter（每次命中 weapon）后 supporter 恰好到阈值。
    let acc = createSlotPity();
    for (let i = 0; i < THRESH; i++) {
      acc = rollTowerDropWithPity(3, HIT_WEAPON(), dropRarityForFloor, acc, 999).pity; // 高阈值不触发强制
    }
    expect(acc.supporter).toBe(THRESH); // 连续未出 → 累加到阈值
  });

  it('保底强制命中稀有度仍走层段（不叠稀有度 pity）', () => {
    const pity: SlotPity = { weapon: 0, armor: 5, supporter: 0 };
    const r = rollTowerDropWithPity(60, NEVER, dropRarityForFloor, pity, THRESH);
    expect(r.drop?.slot).toBe('armor');
    expect(r.drop?.rarity).toBe('UR'); // floor 60 → UR（层段决定，非 pity）
  });

  it('多槽同时到阈值：按 weapon→armor→supporter 固定序强制第一个（确定性）', () => {
    const pity: SlotPity = { weapon: 3, armor: 3, supporter: 3 };
    const r = rollTowerDropWithPity(3, NEVER, dropRarityForFloor, pity, THRESH);
    expect(r.drop?.slot).toBe('weapon');
  });

  it('threshold<=0 关闭保底：即便计数巨大也走正常 chance', () => {
    const pity: SlotPity = { weapon: 99, armor: 99, supporter: 99 };
    const r = rollTowerDropWithPity(3, NEVER, dropRarityForFloor, pity, 0);
    expect(r.drop).toBeNull(); // chance 未过，无强制
    expect(r.pity).toEqual({ weapon: 100, armor: 100, supporter: 100 });
  });

  it('序列 RNG 可精确复现（同计数同序列 → 同结果）', () => {
    const a = rollTowerDropWithPity(20, createSequenceRng([0.2, 0.5]), dropRarityForFloor, createSlotPity(), THRESH);
    const b = rollTowerDropWithPity(20, createSequenceRng([0.2, 0.5]), dropRarityForFloor, createSlotPity(), THRESH);
    expect(a).toEqual(b);
  });
});
