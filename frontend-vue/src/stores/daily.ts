/**
 * daily 领域 store（evolution-1）：每日任务进度 + 每日登录奖励。
 * 跨天判定复用 shop 的 todayKey 模式（读取时比对 date，过期归零，不存定时器）。
 * 不触发存档（由门面统一控制）；发奖走 profile.earn（券为主、知识点为辅）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  DAILY_TASKS,
  DAILY_LOGIN_REWARDS,
  getDailyTaskById,
  type DailyTaskType,
} from '@/config/dailyTasks';
import type { DailySave } from '@/infra/persistence';
import { useProfileStore } from './profile';

/** 与 shop.ts 同款本地日期键（YYYY-M-D）。复制而非横向 import，保持领域 store 自包含。 */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export const useDailyStore = defineStore('daily', () => {
  /** 当日任务集所属日期。 */
  const date = ref<string>('');
  /** taskId → 进度计数。 */
  const progress = ref<Record<string, number>>({});
  /** 当日已领取的 taskId。 */
  const claimed = ref<string[]>([]);
  /** 每日登录奖励最近发放日期。 */
  const lastLoginDate = ref<string>('');

  /** 若已跨天，重置当日任务进度与领取状态（读时判定，幂等）。 */
  function ensureToday() {
    const today = todayKey();
    if (date.value !== today) {
      date.value = today;
      progress.value = {};
      claimed.value = [];
    }
  }

  /** 某任务当前进度（钳到 target 上限）。 */
  function progressOf(taskId: string): number {
    ensureToday();
    return progress.value[taskId] || 0;
  }

  function isComplete(taskId: string): boolean {
    const task = getDailyTaskById(taskId);
    if (!task) return false;
    return progressOf(taskId) >= task.target;
  }

  function isClaimed(taskId: string): boolean {
    ensureToday();
    return claimed.value.includes(taskId);
  }

  /**
   * 推进某类型任务的进度（埋点处调用）。
   * 命中该类型的所有任务都 +amount（当前每类型只有一条，仍按类型遍历以便扩展）。
   */
  function markProgress(taskType: DailyTaskType, amount = 1) {
    if (amount <= 0) return;
    ensureToday();
    for (const task of DAILY_TASKS) {
      if (task.type !== taskType) continue;
      const current = progress.value[task.id] || 0;
      // 已达上限不再累加（避免无谓增长）。
      if (current >= task.target) continue;
      progress.value[task.id] = Math.min(task.target, current + amount);
    }
  }

  /** 领取已完成任务的奖励。返回是否成功领取（决定调用方是否存档）。 */
  function claim(taskId: string): boolean {
    ensureToday();
    const task = getDailyTaskById(taskId);
    if (!task) return false;
    if (!isComplete(taskId) || claimed.value.includes(taskId)) return false;

    const profile = useProfileStore();
    claimed.value.push(taskId);
    for (const r of task.rewards) {
      profile.earn(r.currency, r.amount);
    }
    const rewardText = task.rewards
      .map(r => `${r.amount} ${profile.currencyName(r.currency)}`)
      .join('、');
    profile.addLog(`完成每日任务「${task.title}」，获得 ${rewardText}！`, 'success');
    return true;
  }

  /**
   * 每日登录奖励。今日尚未发放 → 发放并返回 true（决定调用方是否存档）。
   * 跨天再次调用会再发一次。
   */
  function claimLoginReward(): boolean {
    const today = todayKey();
    if (lastLoginDate.value === today) return false;

    const profile = useProfileStore();
    lastLoginDate.value = today;
    for (const r of DAILY_LOGIN_REWARDS) {
      profile.earn(r.currency, r.amount);
    }
    const rewardText = DAILY_LOGIN_REWARDS
      .map(r => `${r.amount} ${profile.currencyName(r.currency)}`)
      .join('、');
    profile.addLog(`每日登录奖励到账：${rewardText}！`, 'success');
    return true;
  }

  // --- 持久化装配 ---

  function serialize(): DailySave {
    return {
      date: date.value,
      progress: progress.value,
      claimed: claimed.value,
      lastLoginDate: lastLoginDate.value,
    };
  }

  function deserialize(data: DailySave | null | undefined) {
    date.value = data?.date ?? '';
    progress.value = data?.progress ?? {};
    claimed.value = Array.isArray(data?.claimed) ? data!.claimed : [];
    lastLoginDate.value = data?.lastLoginDate ?? '';
    // 加载后立即做一次跨天判定：旧日期的进度直接归零（读时一致）。
    ensureToday();
  }

  function reset() {
    date.value = '';
    progress.value = {};
    claimed.value = [];
    lastLoginDate.value = '';
  }

  return {
    date,
    progress,
    claimed,
    lastLoginDate,
    progressOf,
    isComplete,
    isClaimed,
    markProgress,
    claim,
    claimLoginReward,
    serialize,
    deserialize,
    reset,
  };
});
