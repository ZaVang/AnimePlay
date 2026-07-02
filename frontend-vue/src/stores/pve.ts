/**
 * pve 领域 store（S5 自 userStore 拆出）：预设小队 + 挑战塔进度。
 * ★ S5 起这两块进入存档协议 v2 —— 修复「刷新即丢小队/塔进度」。
 * 不触发存档（由门面统一控制）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PresetSquad, TowerProgress } from '@/types/player';
import { createDefaultPresetSquads, createDefaultTowerProgress, canonicalizeSquadMembers } from '@/infra/persistence';
import { SQUAD_MEMBER_COUNT, calculateSweepReward, type SweepReward } from '@/engine';
import { clampSlotPity, SLOT_PITY_THRESHOLD } from '@/config/equipment';
import { useProfileStore } from './profile';

/**
 * SA-T5：扫荡周额度封顶（明日方舟剿灭式周上限：随便哪天领满，天然防通胀 + 免点击疲劳）。
 * 数字小到不破坏塔主线产出主导地位（一周满配总量 ≈ 一趟主线推进量级）。边界留 store，engine 只管缩水纯函数。
 */
export const SWEEP_WEEKLY_CAP = 10;

/** 与 daily.ts 同款 ISO 周键（YYYY-Www）。复制而非横向 import，保持领域 store 自包含。 */
function weekKey(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day + 3);
  const isoYear = d.getFullYear();
  const firstThursday = new Date(isoYear, 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const weekNo = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
}

/** 扫荡一次的结果（供门面/UI 一键结算飘字消费）。 */
export interface SweepOutcome {
  ok: boolean;
  reward: SweepReward | null;
  remaining: number; // 本周剩余可扫荡次数
  reason?: 'notCompleted' | 'capReached';
}

export const usePveStore = defineStore('pve', () => {
  const presetSquads = ref<PresetSquad[]>(createDefaultPresetSquads());
  const towerProgress = ref<TowerProgress>(createDefaultTowerProgress());

  // --- 预设小队 ---

  function updateSquadMember(squadId: number, position: number, characterId: number | null) {
    const squad = presetSquads.value.find(s => s.id === squadId);
    if (squad && position >= 0 && position < SQUAD_MEMBER_COUNT) {
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
    return squad ? [...canonicalizeSquadMembers(squad.members)] : canonicalizeSquadMembers([]);
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

  // --- SA-T5：扫荡（已通层重复挑战，独立路径，绝不调 completeFloor）---

  /**
   * 若已跨周，重置扫荡周额度（读时判定，幂等，不存定时器，仿 daily.ensureThisWeek）。
   * 墙钟廉价钳位：只比对周键是否相等；跨周（含回拨到别的周键）都视为「新一周」归零一次即可——
   * 回拨白刷的风险由「周键相等即不重置」天然覆盖（同周内回拨不会凭空多出额度）。
   */
  function ensureThisSweepWeek() {
    const wk = weekKey();
    if (towerProgress.value.sweepWeekKey !== wk) {
      towerProgress.value.sweepWeekKey = wk;
      towerProgress.value.sweepUsedThisWeek = 0;
    }
  }

  function getSweepUsedThisWeek(): number {
    ensureThisSweepWeek();
    return towerProgress.value.sweepUsedThisWeek;
  }

  function getSweepRemaining(): number {
    return Math.max(0, SWEEP_WEEKLY_CAP - getSweepUsedThisWeek());
  }

  /** 是否可扫荡某层：该层已通过（floor < currentFloor）且本周额度未用尽。 */
  function canSweep(floor: number): boolean {
    return hasCompletedFloor(floor) && getSweepRemaining() > 0;
  }

  /**
   * 扫荡一次已通层：独立 action——只读 hasCompletedFloor 判资格、记周计数、返回缩水奖励，
   * **绝不调用 completeFloor**（不推进 currentFloor / 不触发成就 / 不掉装备）。发奖由门面用返回的 reward 落 earn/addCharacterExp。
   */
  function sweepFloor(floor: number): SweepOutcome {
    ensureThisSweepWeek();
    if (!hasCompletedFloor(floor)) {
      return { ok: false, reward: null, remaining: getSweepRemaining(), reason: 'notCompleted' };
    }
    if (getSweepRemaining() <= 0) {
      return { ok: false, reward: null, remaining: 0, reason: 'capReached' };
    }
    towerProgress.value.sweepUsedThisWeek += 1;
    const reward = calculateSweepReward(floor);
    useProfileStore().addLog(
      `扫荡第 ${floor} 层：知识点 +${reward.sweepKnowledge}、经验 +${reward.sweepCharacterExp}（本周剩余 ${getSweepRemaining()} 次）`,
      'success',
    );
    return { ok: true, reward, remaining: getSweepRemaining() };
  }

  /**
   * ★ S15-T4 UI 显形：距「下次槽位保底触发」还差多少次掉落判定，及最接近的槽位。
   * remaining = 阈值 - 当前最高计数（就近取整、clamp >=0）；ready 表示已到阈值下次必触发。
   * 纯读，不改状态；供爬塔/探索面板显形（拍板-F，显形非选做而是验收项）。
   */
  function getSlotPityStatus(): { slot: 'weapon' | 'armor' | 'supporter'; count: number; remaining: number; ready: boolean } {
    const p = towerProgress.value.slotPity;
    const entries: Array<['weapon' | 'armor' | 'supporter', number]> = [
      ['weapon', p.weapon],
      ['armor', p.armor],
      ['supporter', p.supporter],
    ];
    // 取计数最高（最接近保底）的槽；并列取 weapon→armor→supporter 固定序（与 engine 强制命中序一致）。
    let best = entries[0];
    for (const e of entries) if (e[1] > best[1]) best = e;
    const remaining = Math.max(0, SLOT_PITY_THRESHOLD - best[1]);
    return { slot: best[0], count: best[1], remaining, ready: remaining <= 0 };
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
    // 二次兜底：每队成员去重 + 5 槽（对齐运行期配队不变式，杜绝克隆放大），与家园/装备双层范式一致。
    presetSquads.value = data.presetSquads.map(sq => ({ ...sq, members: canonicalizeSquadMembers(sq.members) }));
    towerProgress.value = data.towerProgress;
    // v20（S15-T4）二次兜底：槽位保底计数再 clamp 一遍（迁移已归一，反序列化再保险，杜绝脏档放大，仿装备强化双层）。
    const p = towerProgress.value.slotPity;
    towerProgress.value.slotPity = {
      weapon: clampSlotPity(p?.weapon),
      armor: clampSlotPity(p?.armor),
      supporter: clampSlotPity(p?.supporter),
    };
    // 加载后立即做一次跨周判定：旧周的扫荡额度直接归零（读时一致，仿 daily.deserialize）。
    ensureThisSweepWeek();
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
    getSweepUsedThisWeek,
    getSweepRemaining,
    canSweep,
    sweepFloor,
    getSlotPityStatus,
    serialize,
    deserialize,
    reset,
  };
});
