/**
 * daily 领域 store（evolution-1 + B1）：每日任务进度 + 每日登录奖励 + 周任务 + 连续登录递增。
 * 跨天判定复用 shop 的 todayKey 模式（读取时比对 date，过期归零，不存定时器）；
 * 周任务同款用 weekKey（年+ISO 周序号）读时跨周归零。
 * 不触发存档（由门面统一控制）；发奖走 profile.earn（券为主、知识点为辅）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  DAILY_TASKS,
  WEEKLY_TASKS,
  DAILY_LOGIN_REWARDS,
  loginStreakRewardFor,
  getDailyTaskById,
  getWeeklyTaskById,
  type DailyTaskType,
} from '@/config/dailyTasks';
import type { DailySave } from '@/infra/persistence';
import { useProfileStore } from './profile';

/** 与 shop.ts 同款本地日期键（YYYY-M-D）。复制而非横向 import，保持领域 store 自包含。 */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

/**
 * ISO 周键（YYYY-Www）。跨年稳定：按 ISO-8601（周一为周首，归属含周四的年份）。
 * 同一自然周内任意一天得到相同键，跨周即变，用于周任务读时归零。
 */
function weekKey(date = new Date()): string {
  // 复制并归一到当天 00:00，避免时区/时分影响。
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  // ISO 周：以周四定年。把日期挪到本周周四。
  const day = (d.getDay() + 6) % 7; // 周一=0 … 周日=6
  d.setDate(d.getDate() - day + 3); // 本周周四
  const isoYear = d.getFullYear();
  // 本年第一个周四
  const firstThursday = new Date(isoYear, 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  const weekNo = 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000));
  return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
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
  /** 周任务集所属周键（weekKey）。 */
  const weekDate = ref<string>('');
  /** weeklyTaskId → 进度计数。 */
  const weeklyProgress = ref<Record<string, number>>({});
  /** 本周已领取的 weeklyTaskId。 */
  const weeklyClaimed = ref<string[]>([]);
  /** 连续登录天数（断签归 1）。 */
  const loginStreak = ref<number>(0);

  /** 若已跨天，重置当日任务进度与领取状态（读时判定，幂等）。 */
  function ensureToday() {
    const today = todayKey();
    if (date.value !== today) {
      date.value = today;
      progress.value = {};
      claimed.value = [];
    }
  }

  /** 若已跨周，重置周任务进度与领取状态（读时判定，幂等）。 */
  function ensureThisWeek() {
    const wk = weekKey();
    if (weekDate.value !== wk) {
      weekDate.value = wk;
      weeklyProgress.value = {};
      weeklyClaimed.value = [];
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

  /** 周任务当前进度。 */
  function weeklyProgressOf(taskId: string): number {
    ensureThisWeek();
    return weeklyProgress.value[taskId] || 0;
  }

  function isWeeklyComplete(taskId: string): boolean {
    const task = getWeeklyTaskById(taskId);
    if (!task) return false;
    return weeklyProgressOf(taskId) >= task.target;
  }

  function isWeeklyClaimed(taskId: string): boolean {
    ensureThisWeek();
    return weeklyClaimed.value.includes(taskId);
  }

  /**
   * 推进某类型任务的进度（埋点处调用）。
   * 同一次埋点同时推进命中该类型的日任务与周任务（零新埋点；6 个埋点一行不用改）。
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
    ensureThisWeek();
    for (const task of WEEKLY_TASKS) {
      if (task.type !== taskType) continue;
      const current = weeklyProgress.value[task.id] || 0;
      if (current >= task.target) continue;
      weeklyProgress.value[task.id] = Math.min(task.target, current + amount);
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

  /** 领取已完成周任务的奖励。返回是否成功领取（决定调用方是否存档）。 */
  function claimWeekly(taskId: string): boolean {
    ensureThisWeek();
    const task = getWeeklyTaskById(taskId);
    if (!task) return false;
    if (!isWeeklyComplete(taskId) || weeklyClaimed.value.includes(taskId)) return false;

    const profile = useProfileStore();
    weeklyClaimed.value.push(taskId);
    for (const r of task.rewards) {
      profile.earn(r.currency, r.amount);
    }
    const rewardText = task.rewards
      .map(r => `${r.amount} ${profile.currencyName(r.currency)}`)
      .join('、');
    profile.addLog(`完成周任务「${task.title}」，获得 ${rewardText}！`, 'success');
    return true;
  }

  /**
   * 每日登录奖励 + 连续登录递增。今日尚未发放 → 维护 loginStreak 并按档发奖，返回 true。
   * - 今日已领（lastLoginDate === today）：不变，返回 false。
   * - 昨日登录过：streak += 1。
   * - 断签（既非昨日也非今日）或首次：streak = 1。
   * 奖励 = 每日固定 DAILY_LOGIN_REWARDS + 连签档 loginStreakRewardFor(streak)。
   */
  function claimLoginReward(): boolean {
    const today = todayKey();
    if (lastLoginDate.value === today) return false;

    // 连签维护：用 toDateString() 比对昨日（与 viewing.ts 同款本地日判定）。
    const todayStr = new Date().toDateString();
    const yesterdayStr = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();
    const lastStr = lastLoginDate.value ? parseLocalKey(lastLoginDate.value)?.toDateString() : undefined;
    if (lastStr === yesterdayStr) {
      loginStreak.value += 1;
    } else if (lastStr === todayStr) {
      // 理论上已被上面的 today 早退拦截，保险起见不重复累加。
    } else {
      loginStreak.value = 1; // 首次或断签
    }

    const profile = useProfileStore();
    lastLoginDate.value = today;
    const rewards = [...DAILY_LOGIN_REWARDS, ...loginStreakRewardFor(loginStreak.value)];
    for (const r of rewards) {
      profile.earn(r.currency, r.amount);
    }
    const rewardText = rewards
      .map(r => `${r.amount} ${profile.currencyName(r.currency)}`)
      .join('、');
    profile.addLog(`连续登录第 ${loginStreak.value} 天，登录奖励到账：${rewardText}！`, 'success');
    return true;
  }

  // --- 持久化装配 ---

  function serialize(): DailySave {
    return {
      date: date.value,
      progress: progress.value,
      claimed: claimed.value,
      lastLoginDate: lastLoginDate.value,
      weekDate: weekDate.value,
      weeklyProgress: weeklyProgress.value,
      weeklyClaimed: weeklyClaimed.value,
      loginStreak: loginStreak.value,
    };
  }

  function deserialize(data: DailySave | null | undefined) {
    date.value = data?.date ?? '';
    progress.value = data?.progress ?? {};
    claimed.value = Array.isArray(data?.claimed) ? data!.claimed : [];
    lastLoginDate.value = data?.lastLoginDate ?? '';
    weekDate.value = data?.weekDate ?? '';
    weeklyProgress.value = data?.weeklyProgress ?? {};
    weeklyClaimed.value = Array.isArray(data?.weeklyClaimed) ? data!.weeklyClaimed : [];
    loginStreak.value = typeof data?.loginStreak === 'number' ? data!.loginStreak : 0;
    // 加载后立即做一次跨天/跨周判定：旧日期/旧周的进度直接归零（读时一致）。
    ensureToday();
    ensureThisWeek();
  }

  function reset() {
    date.value = '';
    progress.value = {};
    claimed.value = [];
    lastLoginDate.value = '';
    weekDate.value = '';
    weeklyProgress.value = {};
    weeklyClaimed.value = [];
    loginStreak.value = 0;
  }

  return {
    date,
    progress,
    claimed,
    lastLoginDate,
    weekDate,
    weeklyProgress,
    weeklyClaimed,
    loginStreak,
    progressOf,
    isComplete,
    isClaimed,
    weeklyProgressOf,
    isWeeklyComplete,
    isWeeklyClaimed,
    markProgress,
    claim,
    claimWeekly,
    claimLoginReward,
    serialize,
    deserialize,
    reset,
  };
});

/** 把 todayKey 形态（YYYY-M-D）解析回 Date（用于连签昨日判定）。非法返回 undefined。 */
function parseLocalKey(key: string): Date | undefined {
  const parts = key.split('-').map(Number);
  if (parts.length !== 3 || parts.some(n => Number.isNaN(n))) return undefined;
  const [y, m, d] = parts;
  return new Date(y, m - 1, d);
}
