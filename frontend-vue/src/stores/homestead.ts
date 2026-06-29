/**
 * 家园挂机域 store（S13-B）。
 * 只持有「谁入住 + 上次结算基线」；离线结算逻辑在门面 userStore.settleHomestead
 * （需跨域写 nurture/profile，下一切片）。本 store 自己不触发保存——保存由门面统一调。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { HOMESTEAD_SLOTS } from '@/config/homestead';
import type { HomesteadSave } from '@/infra/persistence/schema';

export const useHomesteadStore = defineStore('homestead', () => {
  /** 入住家园（挂机产出）的角色 id。 */
  const placedCharacterIds = ref<number[]>([]);
  /** 上次离线结算的墙钟时间戳(ms)；0 = 尚未建立基线。 */
  const lastSettleAt = ref<number>(0);

  function isPlaced(id: number): boolean {
    return placedCharacterIds.value.includes(id);
  }
  function canPlaceMore(): boolean {
    return placedCharacterIds.value.length < HOMESTEAD_SLOTS;
  }

  /** 入住一个角色；已入住或槽位已满则返回 false 不变更。 */
  function place(id: number): boolean {
    if (isPlaced(id) || !canPlaceMore()) return false;
    placedCharacterIds.value.push(id);
    return true;
  }

  /** 让一个角色离开家园；不在家园则返回 false。 */
  function unplace(id: number): boolean {
    const i = placedCharacterIds.value.indexOf(id);
    if (i < 0) return false;
    placedCharacterIds.value.splice(i, 1);
    return true;
  }

  /** 记录结算基线时间戳（结算逻辑在门面，不在此处发奖）。 */
  function setLastSettleAt(ts: number): void {
    lastSettleAt.value = ts;
  }

  // --- 持久化装配 ---
  function serialize(): HomesteadSave {
    return {
      placedCharacterIds: [...placedCharacterIds.value],
      lastSettleAt: lastSettleAt.value,
    };
  }
  function deserialize(data: HomesteadSave): void {
    // 输入已由 migrate() 归一，这里信任其形态（与 nurture 等域一致）。
    placedCharacterIds.value = [...data.placedCharacterIds];
    lastSettleAt.value = data.lastSettleAt;
  }
  function reset(): void {
    placedCharacterIds.value = [];
    lastSettleAt.value = 0;
  }

  return {
    placedCharacterIds,
    lastSettleAt,
    isPlaced,
    canPlaceMore,
    place,
    unplace,
    setLastSettleAt,
    serialize,
    deserialize,
    reset,
  };
});
