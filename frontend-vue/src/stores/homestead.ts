/**
 * 家园挂机域 store（S13-B）。
 * 只持有「谁入住 + 上次结算基线」；离线结算逻辑在门面 userStore.settleHomestead
 * （需跨域写 nurture/profile，下一切片）。本 store 自己不触发保存——保存由门面统一调。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  HOMESTEAD_SLOTS,
  canonicalizePlacedIds,
  canonicalizeSeenEncounterKeys,
  SEEN_ENCOUNTER_MAX,
} from '@/config/homestead';
import type { HomesteadSave } from '@/infra/persistence/schema';

export const useHomesteadStore = defineStore('homestead', () => {
  /** 入住家园（挂机产出）的角色 id。 */
  const placedCharacterIds = ref<number[]>([]);
  /** 上次离线结算的墙钟时间戳(ms)；0 = 尚未建立基线。 */
  const lastSettleAt = ref<number>(0);
  /** ★ v21 偶遇图鉴：看过的同作品偶遇对键集合（"min-max"）。纯展示收集数据，不接数值奖励。 */
  const seenEncounterKeys = ref<Set<string>>(new Set());

  /** 该偶遇对是否已看过（去重优先未见 + 图鉴显形共用）。 */
  function hasSeenEncounter(key: string): boolean {
    return seenEncounterKeys.value.has(key);
  }
  /** 记录一场偶遇已看过；新增返回 true（供门面决定是否存档），已存在/已达上限返回 false。 */
  function markEncounterSeen(key: string): boolean {
    if (seenEncounterKeys.value.has(key)) return false;
    if (seenEncounterKeys.value.size >= SEEN_ENCOUNTER_MAX) return false;
    seenEncounterKeys.value.add(key);
    return true;
  }

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
      seenEncounterKeys: [...seenEncounterKeys.value],
    };
  }
  function deserialize(data: HomesteadSave): void {
    // 二次兜底规整：去重 + 截断到槽位上限（迁移已归一，反序列化再保险一道，杜绝脏档放大挂机收益）。
    placedCharacterIds.value = canonicalizePlacedIds(data.placedCharacterIds);
    lastSettleAt.value = data.lastSettleAt;
    // v21 偶遇图鉴：反序列化再规整一道（畸形键/重复/超上限归一），旧档无此键 → 空集。
    seenEncounterKeys.value = new Set(canonicalizeSeenEncounterKeys(data.seenEncounterKeys));
  }
  function reset(): void {
    placedCharacterIds.value = [];
    lastSettleAt.value = 0;
    seenEncounterKeys.value = new Set();
  }

  return {
    placedCharacterIds,
    lastSettleAt,
    seenEncounterKeys,
    hasSeenEncounter,
    markEncounterSeen,
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
