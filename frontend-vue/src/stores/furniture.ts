/**
 * 家具域 store（S15-T2，存档 v20）。
 * 只持有「已拥有家具 ownedIds + 已摆放家具 placedIds」两份 id 清单。买/摆/收要扣 KP + 存档，
 * 由门面 userStore.buyFurniture/placeFurniture/unplaceFurniture 编排
 * （本 store 的 buy/place/unplace 只纯改状态、不碰货币、不触发保存——货币只走 profile.spend）。
 * 家具 comfort 合计（getComfort）供 settle/UI 同源喂进 computeIdleYield 的 effect.comfort，
 * 走既有 comfort 软加成轴（零新增收益口径，拍板-A）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  canonicalizeFurnitureIds,
  canonicalizeFurniturePositions,
  clampFurniturePos,
  getFurnitureDef,
  sumFurnitureComfort,
  FURNITURE_PLACED_MAX,
  type FurnitureSlot,
} from '@/config/homestead';
import type { FurnitureSave } from '@/infra/persistence/schema';

export const useFurnitureStore = defineStore('furniture', () => {
  /** 已拥有的家具 defId（KP 买断入库）。 */
  const ownedIds = ref<string[]>([]);
  /** 当前摆放中的家具 defId（子集于 ownedIds；只有摆放的贡献 comfort）。 */
  const placedIds = ref<string[]>([]);
  /** ★ v21 自定义摆位：defId → 自定 % 坐标（拖拽落点，覆盖固定槽位）。纯展示位置，不影响 comfort。 */
  const placedPositions = ref<Record<string, FurnitureSlot>>({});

  function owns(id: string): boolean {
    return ownedIds.value.includes(id);
  }

  /** 取某家具的自定义摆位（未拖过 → undefined，渲染层回落固定槽位 getFurnitureSlot）。 */
  function getPosition(id: string): FurnitureSlot | undefined {
    return placedPositions.value[id];
  }
  /** 设自定义摆位（钳到可落区；未知 defId / 非法坐标 → false 不变更）。纯位置、不碰 comfort。 */
  function setPosition(id: string, x: number, y: number): boolean {
    if (!getFurnitureDef(id)) return false;
    const pos = clampFurniturePos(x, y);
    if (!pos) return false;
    placedPositions.value = { ...placedPositions.value, [id]: pos };
    return true;
  }
  function isPlaced(id: string): boolean {
    return placedIds.value.includes(id);
  }

  /**
   * 纯购入一件家具（入 ownedIds）。已拥有或目录无此 id 返回 false 不变更。
   * 不扣 KP、不摆放、不存档——由 userStore.buyFurniture 先 profile.spend 成功再调本函数。
   */
  function buy(id: string): boolean {
    if (!getFurnitureDef(id)) return false;
    if (owns(id)) return false;
    ownedIds.value.push(id);
    return true;
  }

  /** 摆放一件已拥有家具（进 placedIds 贡献 comfort）。未拥有/已摆放/已达摆放上限 → false。 */
  function place(id: string): boolean {
    if (!owns(id) || isPlaced(id)) return false;
    if (placedIds.value.length >= FURNITURE_PLACED_MAX) return false;
    placedIds.value.push(id);
    return true;
  }

  /** 收纳一件已摆放家具（移出 placedIds，仍保留在 ownedIds）。未摆放 → false。 */
  function unplace(id: string): boolean {
    const i = placedIds.value.indexOf(id);
    if (i < 0) return false;
    placedIds.value.splice(i, 1);
    return true;
  }

  /** 已摆放家具 comfort 合计（供 settle/UI 同源喂进 computeIdleYield 的 effect.comfort）。 */
  function getComfort(): number {
    return sumFurnitureComfort(placedIds.value);
  }

  // --- 持久化装配 ---
  function serialize(): FurnitureSave {
    return {
      ownedIds: [...ownedIds.value],
      placedIds: [...placedIds.value],
      placedPositions: { ...placedPositions.value },
    };
  }
  function deserialize(data: FurnitureSave): void {
    // 二次兜底归一（迁移已归一，反序列化再保险一道，杜绝脏档给未拥有/未知 id 放大 comfort）。
    const owned = canonicalizeFurnitureIds(data?.ownedIds);
    const ownedSet = new Set(owned);
    ownedIds.value = owned;
    placedIds.value = canonicalizeFurnitureIds(data?.placedIds).filter(id => ownedSet.has(id));
    // v21 自定义摆位：只收已知家具的合法坐标、越界钳位（旧档无此键 → {}）。
    placedPositions.value = canonicalizeFurniturePositions(data?.placedPositions);
  }
  function reset(): void {
    ownedIds.value = [];
    placedIds.value = [];
    placedPositions.value = {};
  }

  return {
    ownedIds,
    placedIds,
    placedPositions,
    owns,
    isPlaced,
    getPosition,
    setPosition,
    buy,
    place,
    unplace,
    getComfort,
    serialize,
    deserialize,
    reset,
  };
});
