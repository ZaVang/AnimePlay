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
