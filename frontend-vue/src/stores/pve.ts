/**
 * pve 领域 store（S5 自 userStore 拆出）：预设小队 + 挑战塔进度。
 * ★ S5 起这两块进入存档协议 v2 —— 修复「刷新即丢小队/塔进度」。
 * 不触发存档（由门面统一控制）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PresetSquad, TowerProgress } from '@/types/player';
import { createDefaultPresetSquads, createDefaultTowerProgress, canonicalizeSquadMembers } from '@/infra/persistence';
import { useProfileStore } from './profile';

export const usePveStore = defineStore('pve', () => {
  const presetSquads = ref<PresetSquad[]>(createDefaultPresetSquads());
  const towerProgress = ref<TowerProgress>(createDefaultTowerProgress());

  // --- 预设小队 ---

  function updateSquadMember(squadId: number, position: number, characterId: number | null) {
    const squad = presetSquads.value.find(s => s.id === squadId);
    if (squad && position >= 0 && position < 4) {
      squad.members[position] = characterId;
      squad.lastUsed = new Date().toISOString();
    }
  }

  function updateSquadName(squadId: number, newName: string) {
    const squad = presetSquads.value.find(s => s.id === squadId);
    if (squad) {
      squad.name = newName;
    }
  }

  function getSquadMembers(squadId: number): (number | null)[] {
    const squad = presetSquads.value.find(s => s.id === squadId);
    return squad ? [...squad.members] : [null, null, null, null];
  }

  // --- 挑战塔 ---

  function getCurrentChallengeFloor(): number {
    return towerProgress.value.currentFloor;
  }

  /** 通过某层。返回是否推进了进度（决定调用方是否存档）。 */
  function completeFloor(floor: number): boolean {
    if (floor !== towerProgress.value.currentFloor) return false;
    if (floor >= 999) return false; // 已达封顶层，不再推进（防顶层重复结算/掉落）
    towerProgress.value.currentFloor = Math.min(floor + 1, 999); // 最高999层
    towerProgress.value.maxFloor = Math.max(towerProgress.value.maxFloor, floor);
    useProfileStore().addLog(`成功通过第${floor}层！`, 'success');
    return true;
  }

  function hasCompletedFloor(floor: number): boolean {
    return floor < towerProgress.value.currentFloor;
  }

  // 每日挑战次数限制已移除，保留接口兼容
  function canAttemptToday(): boolean {
    return true;
  }

  function recordTowerAttempt() {
    return;
  }

  // --- 持久化装配 ---

  function serialize() {
    return {
      presetSquads: presetSquads.value,
      towerProgress: towerProgress.value,
    };
  }

  function deserialize(data: { presetSquads: PresetSquad[]; towerProgress: TowerProgress }) {
    // 二次兜底：每队成员去重 + 4 槽（对齐运行期配队不变式，杜绝克隆放大），与家园/装备双层范式一致。
    presetSquads.value = data.presetSquads.map(sq => ({ ...sq, members: canonicalizeSquadMembers(sq.members) }));
    towerProgress.value = data.towerProgress;
  }

  function reset() {
    presetSquads.value = createDefaultPresetSquads();
    towerProgress.value = createDefaultTowerProgress();
  }

  return {
    presetSquads,
    towerProgress,
    updateSquadMember,
    updateSquadName,
    getSquadMembers,
    getCurrentChallengeFloor,
    completeFloor,
    hasCompletedFloor,
    canAttemptToday,
    recordTowerAttempt,
    serialize,
    deserialize,
    reset,
  };
});
