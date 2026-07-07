import { describe, it, expect } from 'vitest';
import {
  pickTapDialogue,
  pickMilestoneDialogue,
  pickEncounterDialogue,
} from './homesteadDialogues';
import { BOND_MILESTONES } from './nurture';

describe('S16-T3 家园情境台词库（纯展示、确定、缺则兜底）', () => {
  it('pickTapDialogue：给好感与已互动取不同池，均非空', () => {
    const greet = pickTapDialogue(true, 0);
    const idle = pickTapDialogue(false, 0);
    expect(greet.length).toBeGreaterThan(0);
    expect(idle.length).toBeGreaterThan(0);
    expect(greet).not.toBe(idle); // 两个池语义不同（问候 vs 闲聊）
  });

  it('pickTapDialogue：同 index 确定复现（纯函数）', () => {
    expect(pickTapDialogue(true, 3)).toBe(pickTapDialogue(true, 3));
    expect(pickTapDialogue(false, 7)).toBe(pickTapDialogue(false, 7));
  });

  it('pickTapDialogue：index 环绕（modulo）+ 容忍负数与非整，永不空白', () => {
    for (const idx of [0, 1, 5, 99, -1, -8, 2.7]) {
      expect(pickTapDialogue(true, idx).length).toBeGreaterThan(0);
      expect(pickTapDialogue(false, idx).length).toBeGreaterThan(0);
    }
    // 环绕：index 与 index+池长 取同一句
    expect(pickTapDialogue(true, 0)).toBe(pickTapDialogue(true, 8)); // TAP_GREET_LINES 长 8
  });

  it('pickMilestoneDialogue：BOND_MILESTONES 每档 id 都有非空台词', () => {
    for (const m of BOND_MILESTONES) {
      expect(pickMilestoneDialogue(m.id, 0).length).toBeGreaterThan(0);
    }
  });

  it('pickMilestoneDialogue：未知/空 id 回落通用池，非空、不报错', () => {
    expect(() => pickMilestoneDialogue('unknown_id', 0)).not.toThrow();
    expect(pickMilestoneDialogue('unknown_id', 0).length).toBeGreaterThan(0);
    expect(pickMilestoneDialogue('', 2).length).toBeGreaterThan(0);
  });

  it('pickMilestoneDialogue：同 (id,index) 确定复现', () => {
    expect(pickMilestoneDialogue('bond_3', 1)).toBe(pickMilestoneDialogue('bond_3', 1));
  });
});

describe('S16-T4 广场偶遇对话（一来一回、缺则通用兜底、纯展示）', () => {
  it('pickEncounterDialogue：opener 与 reply 均非空', () => {
    const d = pickEncounterDialogue('命运石之门', 0);
    expect(d.opener.length).toBeGreaterThan(0);
    expect(d.reply.length).toBeGreaterThan(0);
  });

  it('未知作品 / undefined：回落通用池，非空、不报错', () => {
    expect(() => pickEncounterDialogue('从未见过的作品', 0)).not.toThrow();
    expect(() => pickEncounterDialogue(undefined, 3)).not.toThrow();
    const a = pickEncounterDialogue('从未见过的作品', 0);
    const b = pickEncounterDialogue(undefined, 3);
    expect(a.opener.length).toBeGreaterThan(0);
    expect(a.reply.length).toBeGreaterThan(0);
    expect(b.opener.length).toBeGreaterThan(0);
    expect(b.reply.length).toBeGreaterThan(0);
  });

  it('同 (anime,index) 确定复现（纯函数）', () => {
    const a = pickEncounterDialogue('A', 5);
    const b = pickEncounterDialogue('A', 5);
    expect(a).toEqual(b);
  });

  it('index 环绕 + 容忍负数与非整，永不空白', () => {
    for (const idx of [0, 1, 7, 99, -1, -8, 2.7]) {
      const d = pickEncounterDialogue('X', idx);
      expect(d.opener.length).toBeGreaterThan(0);
      expect(d.reply.length).toBeGreaterThan(0);
    }
  });
});
