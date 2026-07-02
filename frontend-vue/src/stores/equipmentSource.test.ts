/**
 * 装备来源编排测试（S13-C2 / C2-T4）：塔通层掉落 + 知识点兑换。
 * - 掉落：挂在 completeFloor 推进进度为真的分支（重复挑战低层不掉落）；RNG 注入可复现。
 * - 兑换：走 profile.spend，余额不足不发货、成功才入库（照图鉴解锁范式）。
 * completeFloor / purchaseEquipment 会 saveToServer → pushUserSave，mock 掉传输层。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/infra/persistence/api', () => ({
  pushUserSave: vi.fn(() => Promise.resolve({ saveVersion: 1 })),
  fetchUserSave: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  loginRequest: vi.fn(),
}));

import { useUserStore } from './userStore';
import { useProfileStore } from './profile';
import { useEquipmentStore } from './equipment';
import { usePveStore } from './pve';
import { createSequenceRng } from '@/engine';
import { getEquipmentPrice, getEquipmentDef } from '@/config/equipment';

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('塔通层掉落（completeFloor 注入 RNG）', () => {
  it('命中（chance<0.5）：推进进度的层入库一件，稀有度按层段', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const eq = useEquipmentStore();
    const userStore = useUserStore();

    // 当前层 1（默认）。chance=0.0 命中、pick=0.0 → weapon；floor 1 → R
    const r = userStore.completeFloor(1, createSequenceRng([0.0, 0.0]));

    expect(r.completed).toBe(true);
    expect(r.drop).not.toBeNull();
    expect(eq.list()).toHaveLength(1);
    expect(getEquipmentDef(eq.list()[0].defId)?.rarity).toBe('R');
    expect(getEquipmentDef(eq.list()[0].defId)?.slot).toBe('weapon');
  });

  it('同槽同稀有度有多个候选时，第三个 RNG 值决定具体掉落件', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const eq = useEquipmentStore();
    const userStore = useUserStore();

    // chance=0 命中，slot=0 → weapon，candidate pick=0.99 → 第 3 件 R 武器
    const r = userStore.completeFloor(1, createSequenceRng([0.0, 0.0, 0.99]));

    expect(r.completed).toBe(true);
    expect(r.drop?.id).toBe('wpn_r_stage_mic');
    expect(eq.list()[0].defId).toBe('wpn_r_stage_mic');
  });


  it('未命中（chance>=0.5）：通层但不掉落', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const eq = useEquipmentStore();
    const userStore = useUserStore();

    userStore.completeFloor(1, createSequenceRng([0.5])); // 0.5 不 < 0.5 → 不掉
    expect(eq.list()).toHaveLength(0);
  });

  it('重复挑战已过低层：不推进进度 → 不掉落（防刷）', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const pve = usePveStore();
    const eq = useEquipmentStore();
    const userStore = useUserStore();

    // 先推进到第 2 层（通过第 1 层）
    userStore.completeFloor(1, createSequenceRng([0.9])); // 不掉落（0.9>=0.5）
    expect(pve.getCurrentChallengeFloor()).toBe(2);
    expect(eq.list()).toHaveLength(0);

    // 再次「通过」第 1 层（已过低层）：completeFloor 返回 false，不该掉落
    userStore.completeFloor(1, createSequenceRng([0.0, 0.0])); // 即便 RNG 必中也不掉
    expect(eq.list()).toHaveLength(0);
  });

  it('高层段掉 UR', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const pve = usePveStore();
    pve.towerProgress.currentFloor = 60;
    const eq = useEquipmentStore();
    const userStore = useUserStore();

    userStore.completeFloor(60, createSequenceRng([0.0, 0.0]));
    expect(getEquipmentDef(eq.list()[0].defId)?.rarity).toBe('UR');
  });

  it('封顶层 999：completeFloor → completed:false（不推进、不掉落，调用方据此不发奖）', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const pve = usePveStore();
    pve.towerProgress.currentFloor = 999;
    const eq = useEquipmentStore();
    const userStore = useUserStore();

    // 即便 RNG 必中（0.0）也不掉：封顶层不推进进度
    const r = userStore.completeFloor(999, createSequenceRng([0.0, 0.0]));
    expect(r.completed).toBe(false);
    expect(r.drop).toBeNull();
    expect(pve.getCurrentChallengeFloor()).toBe(999);
    expect(eq.list()).toHaveLength(0);
  });

  it('重复挑战已过低层：completed:false（不发奖来源）', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const pve = usePveStore();
    const userStore = useUserStore();
    userStore.completeFloor(1, createSequenceRng([0.9])); // 推进到第 2 层
    expect(pve.getCurrentChallengeFloor()).toBe(2);
    const r = userStore.completeFloor(1, createSequenceRng([0.0, 0.0])); // 再「通过」已过的第 1 层
    expect(r.completed).toBe(false);
    expect(r.drop).toBeNull();
  });
});

describe('槽位保底 slotPity 编排（S15-T4：只在 completeFloor 真掉落判定推进）', () => {
  it('通新层未掉落（chance 未过）：各槽计数 +1', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const pve = usePveStore();
    const userStore = useUserStore();

    userStore.completeFloor(1, createSequenceRng([0.99])); // 不掉落
    expect(pve.towerProgress.slotPity).toEqual({ weapon: 1, armor: 1, supporter: 1 });
  });

  it('通新层命中某槽：该槽归零、其余 +1', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const pve = usePveStore();
    const userStore = useUserStore();
    pve.towerProgress.slotPity = { weapon: 3, armor: 3, supporter: 3 };

    userStore.completeFloor(1, createSequenceRng([0.0, 0.0])); // 命中 weapon
    expect(pve.towerProgress.slotPity).toEqual({ weapon: 0, armor: 4, supporter: 4 });
  });

  it('★ 保底触发：某槽到阈值 → 下次通新层强制该槽（即便 RNG 不命中）', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const pve = usePveStore();
    const eq = useEquipmentStore();
    const userStore = useUserStore();
    // supporter 计数已到阈值（10）
    pve.towerProgress.slotPity = { weapon: 0, armor: 0, supporter: 10 };

    // RNG 恒不命中（0.99）也强制出 supporter
    const r = userStore.completeFloor(1, createSequenceRng([0.99, 0.99]));
    expect(r.completed).toBe(true);
    expect(r.drop?.slot).toBe('supporter');
    expect(eq.list()).toHaveLength(1);
    expect(pve.towerProgress.slotPity.supporter).toBe(0); // 触发后归零
  });

  it('重复挑战已过低层：不推进进度 → slotPity 不动（防刷保底）', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const pve = usePveStore();
    const userStore = useUserStore();
    userStore.completeFloor(1, createSequenceRng([0.99])); // 推进到第 2 层，各槽 →1
    const before = { ...pve.towerProgress.slotPity };
    // 再「通过」已过的第 1 层：completeFloor 返 false，slotPity 一动不动
    userStore.completeFloor(1, createSequenceRng([0.99, 0.99]));
    expect(pve.towerProgress.slotPity).toEqual(before);
  });

  it('封顶层 999：不推进 → slotPity 不动', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const pve = usePveStore();
    const userStore = useUserStore();
    pve.towerProgress.currentFloor = 999;
    pve.towerProgress.slotPity = { weapon: 5, armor: 5, supporter: 5 };
    userStore.completeFloor(999, createSequenceRng([0.99, 0.99]));
    expect(pve.towerProgress.slotPity).toEqual({ weapon: 5, armor: 5, supporter: 5 });
  });

  it('扫荡已通层：独立路径 → slotPity 不动（毕业玩家不能靠扫荡刷保底）', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const pve = usePveStore();
    const userStore = useUserStore();
    // 先推进到第 3 层（通过 1、2），slotPity 各 →2
    userStore.completeFloor(1, createSequenceRng([0.99]));
    userStore.completeFloor(2, createSequenceRng([0.99]));
    const before = { ...pve.towerProgress.slotPity };
    // 扫荡第 1 层（已通层）：不掉装备、不推进 pity
    const outcome = userStore.sweepFloor(1, 1);
    expect(outcome.ok).toBe(true);
    expect(pve.towerProgress.slotPity).toEqual(before);
  });

  it('getSlotPityStatus 显形：remaining = 阈值 - 最高计数，ready 满即真', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const pve = usePveStore();
    const userStore = useUserStore();
    pve.towerProgress.slotPity = { weapon: 2, armor: 7, supporter: 1 };
    const s = userStore.getSlotPityStatus();
    expect(s.slot).toBe('armor'); // 最高计数
    expect(s.remaining).toBe(3); // 10 - 7
    expect(s.ready).toBe(false);

    pve.towerProgress.slotPity = { weapon: 10, armor: 0, supporter: 0 };
    expect(userStore.getSlotPityStatus().ready).toBe(true);
  });
});

describe('知识点兑换 purchaseEquipment', () => {
  const SR_WEAPON = 'wpn_sr_zangetsu';

  it('成功：精确扣费 + 入库', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const price = getEquipmentPrice('SR'); // 1200
    profile.core.knowledgePoints = price + 500;

    const eq = useEquipmentStore();
    const userStore = useUserStore();
    const result = userStore.purchaseEquipment(SR_WEAPON);

    expect(result.ok).toBe(true);
    expect(profile.core.knowledgePoints).toBe(500);
    expect(eq.list()).toHaveLength(1);
    expect(eq.list()[0].defId).toBe(SR_WEAPON);
  });

  it('余额不足：不扣费、不入库', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const price = getEquipmentPrice('SR');
    profile.core.knowledgePoints = price - 1;

    const eq = useEquipmentStore();
    const userStore = useUserStore();
    const result = userStore.purchaseEquipment(SR_WEAPON);

    expect(result.ok).toBe(false);
    expect(result.error).toContain('知识点不足');
    expect(profile.core.knowledgePoints).toBe(price - 1);
    expect(eq.list()).toHaveLength(0);
  });

  it('未登录：拒绝', () => {
    const userStore = useUserStore();
    const result = userStore.purchaseEquipment(SR_WEAPON);
    expect(result.ok).toBe(false);
    expect(result.error).toContain('登录');
  });

  it('未知装备：拒绝', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = 999999;
    const userStore = useUserStore();
    const result = userStore.purchaseEquipment('nope');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('不存在');
  });
});
