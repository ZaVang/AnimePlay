/**
 * 家具域 store + 门面编排测试（S15-T2）。
 * - store：buy/place/unplace 纯改状态（不碰货币、不存档）；getComfort 合计；serialize/deserialize 归一。
 * - 门面 userStore.buyFurniture：走 profile.spend，余额不足不发货、成功才入库（照 upgradeFacility/兑换范式）。
 * buyFurniture/placeFurniture 会 saveToServer → pushUserSave，mock 掉传输层。
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
import { useFurnitureStore } from './furniture';
import { FURNITURE_CATALOG, getFurnitureDef } from '@/config/homestead';

const idA = FURNITURE_CATALOG[0].id;
const idB = FURNITURE_CATALOG[1].id;
const defA = getFurnitureDef(idA)!;

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('furniture store 纯状态', () => {
  it('buy：入 ownedIds；重复/未知 id → false 不变更', () => {
    const f = useFurnitureStore();
    expect(f.buy(idA)).toBe(true);
    expect(f.owns(idA)).toBe(true);
    expect(f.buy(idA)).toBe(false); // 重复
    expect(f.buy('fn_nope')).toBe(false); // 未知
    expect(f.ownedIds).toEqual([idA]);
  });

  it('place/unplace：只有已拥有可摆；getComfort 只算已摆放', () => {
    const f = useFurnitureStore();
    expect(f.place(idA)).toBe(false); // 未拥有不可摆
    f.buy(idA);
    expect(f.getComfort()).toBe(0); // 拥有但未摆 → 不给 comfort
    expect(f.place(idA)).toBe(true);
    expect(f.getComfort()).toBe(defA.comfort);
    expect(f.place(idA)).toBe(false); // 已摆
    expect(f.unplace(idA)).toBe(true);
    expect(f.getComfort()).toBe(0);
    expect(f.owns(idA)).toBe(true); // 收纳后仍拥有
    expect(f.unplace(idA)).toBe(false); // 未摆
  });

  it('serialize/deserialize：往返保真 + 脏档归一（未拥有的摆放项丢弃）', () => {
    const f = useFurnitureStore();
    f.deserialize({ ownedIds: [idA, idB, 'fn_nope'], placedIds: [idA, idB] });
    expect(f.ownedIds).toEqual([idA, idB]);
    expect(f.serialize()).toEqual({ ownedIds: [idA, idB], placedIds: [idA, idB] });
    // 摆放含未拥有项 → 收敛为拥有子集
    f.deserialize({ ownedIds: [idA], placedIds: [idA, idB] });
    expect(f.serialize()).toEqual({ ownedIds: [idA], placedIds: [idA] });
  });
});

describe('门面 buyFurniture 编排（走 profile.spend）', () => {
  it('余额充足：扣 KP 成功才入库', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = defA.cost + 500;
    const userStore = useUserStore();
    const f = useFurnitureStore();

    expect(userStore.buyFurniture(idA)).toBe(true);
    expect(f.owns(idA)).toBe(true);
    expect(profile.core.knowledgePoints).toBe(500);
  });

  it('余额不足：不发货、不扣费', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = defA.cost - 1;
    const userStore = useUserStore();
    const f = useFurnitureStore();

    expect(userStore.buyFurniture(idA)).toBe(false);
    expect(f.owns(idA)).toBe(false);
    expect(profile.core.knowledgePoints).toBe(defA.cost - 1);
  });

  it('未登录 / 未知 id → false 不变更', () => {
    const userStore = useUserStore();
    expect(userStore.buyFurniture(idA)).toBe(false); // 未登录

    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = 99999;
    expect(userStore.buyFurniture('fn_nope')).toBe(false); // 未知 id
  });

  it('已拥有再买 → false（一次性买断，不重复扣费）', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = defA.cost * 3;
    const userStore = useUserStore();
    expect(userStore.buyFurniture(idA)).toBe(true);
    const balAfterFirst = profile.core.knowledgePoints;
    expect(userStore.buyFurniture(idA)).toBe(false);
    expect(profile.core.knowledgePoints).toBe(balAfterFirst); // 未再扣费
  });

  it('placeFurniture/unplaceFurniture：先结清 → 改摆放（getComfort 随之变化）', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = defA.cost + 100;
    const userStore = useUserStore();
    const f = useFurnitureStore();

    userStore.buyFurniture(idA);
    expect(f.getComfort()).toBe(0);
    expect(userStore.placeFurniture(idA)).toBe(true);
    expect(f.getComfort()).toBe(defA.comfort);
    expect(userStore.unplaceFurniture(idA)).toBe(true);
    expect(f.getComfort()).toBe(0);
  });
});
