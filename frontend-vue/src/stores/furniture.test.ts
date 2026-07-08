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
    f.deserialize({ ownedIds: [idA, idB, 'fn_nope'], placedIds: [idA, idB], placedPositions: {} });
    expect(f.ownedIds).toEqual([idA, idB]);
    expect(f.serialize()).toEqual({ ownedIds: [idA, idB], placedIds: [idA, idB], placedPositions: {} });
    // 摆放含未拥有项 → 收敛为拥有子集
    f.deserialize({ ownedIds: [idA], placedIds: [idA, idB], placedPositions: {} });
    expect(f.serialize()).toEqual({ ownedIds: [idA], placedIds: [idA], placedPositions: {} });
  });

  it('★ v21 自定义摆位：setPosition 钳位/未知丢弃 + getPosition + 序列化往返 + 脏档归一', () => {
    const f = useFurnitureStore();
    // 未知 defId → false 不变更
    expect(f.setPosition('fn_nope', 50, 50)).toBe(false);
    // 已知 defId → 存自定坐标
    expect(f.setPosition(idA, 30, 40)).toBe(true);
    expect(f.getPosition(idA)).toEqual({ x: 30, y: 40 });
    // 越界坐标被钳到可落区（x>96→96, y<14→14）
    expect(f.setPosition(idB, 200, -5)).toBe(true);
    expect(f.getPosition(idB)).toEqual({ x: 96, y: 14 });
    // 未拖过的家具 → undefined（渲染层回落固定槽位）
    expect(f.getPosition(FURNITURE_CATALOG[2].id)).toBeUndefined();

    // 序列化含 placedPositions；往返保真。
    const snap = JSON.parse(JSON.stringify(f.serialize()));
    expect(snap.placedPositions[idA]).toEqual({ x: 30, y: 40 });
    f.reset();
    expect(f.getPosition(idA)).toBeUndefined();
    f.deserialize(snap);
    expect(f.getPosition(idA)).toEqual({ x: 30, y: 40 });

    // 反序列化脏档：未知 id / 非法坐标丢弃、越界钳位。
    f.deserialize({
      ownedIds: [idA],
      placedIds: [idA],
      placedPositions: { [idA]: { x: 999, y: 50 }, fn_nope: { x: 10, y: 10 }, [idB]: { x: 'bad' } } as unknown as Record<string, { x: number; y: number }>,
    });
    expect(f.getPosition(idA)).toEqual({ x: 96, y: 50 }); // 越界钳位
    expect(f.getPosition('fn_nope')).toBeUndefined(); // 未知 id 丢弃
    expect(f.getPosition(idB)).toBeUndefined(); // 非法坐标丢弃
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
