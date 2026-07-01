/**
 * 家园设施域 store（S14-D SD-T1/SD-T5）。
 * 只持有三设施等级（exp/bond/knowledge）。升级要扣 KP + 存档，由门面 userStore.upgradeFacility 编排
 * （本 store 的 levelUp 只纯改状态、不碰货币、不触发保存——货币只走 profile.spend）。
 * 设施乘区/成本/封顶抬升的纯计算权威在 config/homestead.ts，与 computeIdleYield 同源。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  type FacilityKey,
  type FacilityLevels,
  FACILITY_KEYS,
  FACILITY_MAX_LEVEL,
  clampFacilityLevel,
  defaultFacilityLevels,
  facilityBonusPct,
  facilityUpgradeCost,
} from '@/config/homestead';
import type { FacilitySave } from '@/infra/persistence/schema';

export const useFacilityStore = defineStore('facility', () => {
  /** 三设施等级（初始全 Lv.1 = +0% 乘区）。 */
  const levels = ref<FacilityLevels>(defaultFacilityLevels());

  /** 当前设施等级。 */
  function getLevel(key: FacilityKey): number {
    return levels.value[key];
  }

  /** 结算/UI 同源取整份设施等级（喂进 computeIdleYield 的口径命脉）。 */
  function getLevels(): FacilityLevels {
    return { exp: levels.value.exp, bond: levels.value.bond, knowledge: levels.value.knowledge };
  }

  /** 该设施升到下一级的 KP 花费（指数递增；满级 Infinity）。 */
  function upgradeCost(key: FacilityKey): number {
    return facilityUpgradeCost(levels.value[key]);
  }

  /** 该设施当前等级对应产出乘区（Lv.1=0）。 */
  function bonusPct(key: FacilityKey): number {
    return facilityBonusPct(levels.value[key]);
  }

  /** 是否已满级（无可升级出口）。 */
  function isMaxLevel(key: FacilityKey): boolean {
    return levels.value[key] >= FACILITY_MAX_LEVEL;
  }

  /**
   * 纯提级（+1，钳到上限）。已满级返回 false。
   * 不扣 KP、不存档——由 userStore.upgradeFacility 先 profile.spend 成功再调本函数。
   */
  function levelUp(key: FacilityKey): boolean {
    if (levels.value[key] >= FACILITY_MAX_LEVEL) return false;
    levels.value[key] = clampFacilityLevel(levels.value[key] + 1);
    return true;
  }

  // --- 持久化装配 ---
  function serialize(): FacilitySave {
    return { exp: levels.value.exp, bond: levels.value.bond, knowledge: levels.value.knowledge };
  }
  function deserialize(data: FacilitySave): void {
    // 二次兜底 clamp（迁移已归一，反序列化再保险一道，杜绝脏档放大乘区/封顶）。
    levels.value = {
      exp: clampFacilityLevel(data?.exp),
      bond: clampFacilityLevel(data?.bond),
      knowledge: clampFacilityLevel(data?.knowledge),
    };
  }
  function reset(): void {
    levels.value = defaultFacilityLevels();
  }

  return {
    levels,
    FACILITY_KEYS,
    getLevel,
    getLevels,
    upgradeCost,
    bonusPct,
    isMaxLevel,
    levelUp,
    serialize,
    deserialize,
    reset,
  };
});
