/**
 * 每日任务静态定义（evolution-1）。
 * 只放不变的任务元数据；当日进度/已领状态在 stores/daily.ts（进存档 v6）。
 * 任务类型必须命中现有玩法成功点（埋点见 userStore 编排函数 + battleFlow.endGame）。
 */
import type { CurrencyKey } from '@/types/player';

/** 任务进度的事件类型 —— 与埋点处 markProgress(taskType) 的参数一一对应。 */
export type DailyTaskType = 'gacha' | 'battleWin' | 'watch' | 'nurture';

export interface DailyReward {
  currency: CurrencyKey;
  amount: number;
}

export interface DailyTaskDef {
  id: string;
  type: DailyTaskType;
  title: string;
  description: string;
  /** 完成所需进度。 */
  target: number;
  /** 发奖以券为主、知识点为辅（本轮经济只进的缓解策略，见 plan.md）。 */
  rewards: DailyReward[];
}

/** 当日任务集（固定 4 条，全部命中现有成功点）。 */
export const DAILY_TASKS: DailyTaskDef[] = [
  {
    id: 'daily_gacha',
    type: 'gacha',
    title: '今日一抽',
    description: '进行 1 次抽卡',
    target: 1,
    rewards: [{ currency: 'knowledgePoints', amount: 30 }],
  },
  {
    id: 'daily_battle',
    type: 'battleWin',
    title: '理论高手',
    description: '赢得 1 场宅理论战',
    target: 1,
    rewards: [{ currency: 'animeGachaTickets', amount: 1 }],
  },
  {
    id: 'daily_watch',
    type: 'watch',
    title: '追番日常',
    description: '收取 1 次观看奖励',
    target: 1,
    rewards: [{ currency: 'characterGachaTickets', amount: 1 }],
  },
  {
    id: 'daily_nurture',
    type: 'nurture',
    title: '心意相通',
    description: '进行 1 次养成互动',
    target: 1,
    rewards: [{ currency: 'knowledgePoints', amount: 30 }],
  },
];

/** 每日登录奖励（一次性，跨天再发）。 */
export const DAILY_LOGIN_REWARDS: DailyReward[] = [
  { currency: 'animeGachaTickets', amount: 1 },
  { currency: 'characterGachaTickets', amount: 1 },
];

/**
 * 周任务静态定义（B1）。复用 DailyTaskType 与现有 6 个埋点（markProgress 同时遍历日/周任务，
 * 零新埋点）。target 比日任务高一档（赢 5 场 / 抽 20 张 / 追番 7 次），命中现有玩法成功点。
 * 周进度/已领状态在 stores/daily.ts（weekDate + ensureThisWeek 跨周归零，进存档 v7）。
 */
export const WEEKLY_TASKS: DailyTaskDef[] = [
  {
    id: 'weekly_gacha',
    type: 'gacha',
    title: '本周抽卡狂',
    description: '本周累计抽卡 20 次',
    target: 20,
    rewards: [{ currency: 'animeGachaTickets', amount: 3 }],
  },
  {
    id: 'weekly_battle',
    type: 'battleWin',
    title: '理论战常胜',
    description: '本周赢得 5 场宅理论战',
    target: 5,
    rewards: [{ currency: 'characterGachaTickets', amount: 3 }],
  },
  {
    id: 'weekly_watch',
    type: 'watch',
    title: '追番周计划',
    description: '本周收取 7 次观看奖励',
    target: 7,
    rewards: [{ currency: 'knowledgePoints', amount: 200 }],
  },
];

/**
 * 连续登录递增奖励表（B1）。按 loginStreak 取「不超过当前天数的最高档」。
 * 第 1 天起每天有奖，里程碑（3/7/14/30）越往后越厚，鼓励长期回流。
 */
export interface LoginStreakReward {
  /** 达到该连签天数即套用此档（取 ≤streak 的最大 day）。 */
  day: number;
  rewards: DailyReward[];
}

export const LOGIN_STREAK_REWARDS: LoginStreakReward[] = [
  { day: 1, rewards: [{ currency: 'animeGachaTickets', amount: 1 }, { currency: 'characterGachaTickets', amount: 1 }] },
  { day: 3, rewards: [{ currency: 'animeGachaTickets', amount: 1 }, { currency: 'characterGachaTickets', amount: 1 }, { currency: 'knowledgePoints', amount: 50 }] },
  { day: 7, rewards: [{ currency: 'animeGachaTickets', amount: 2 }, { currency: 'characterGachaTickets', amount: 2 }, { currency: 'knowledgePoints', amount: 100 }] },
  { day: 14, rewards: [{ currency: 'animeGachaTickets', amount: 3 }, { currency: 'characterGachaTickets', amount: 3 }, { currency: 'knowledgePoints', amount: 150 }] },
  { day: 30, rewards: [{ currency: 'animeGachaTickets', amount: 5 }, { currency: 'characterGachaTickets', amount: 5 }, { currency: 'knowledgePoints', amount: 300 }] },
];

/** 按连签天数取对应奖励档（取 day ≤ streak 的最大档；streak<1 回落第 1 天档）。 */
export function loginStreakRewardFor(streak: number): DailyReward[] {
  let chosen = LOGIN_STREAK_REWARDS[0];
  for (const tier of LOGIN_STREAK_REWARDS) {
    if (streak >= tier.day) chosen = tier;
  }
  return chosen.rewards;
}

export function getDailyTaskById(id: string): DailyTaskDef | undefined {
  return DAILY_TASKS.find(t => t.id === id);
}

export function getWeeklyTaskById(id: string): DailyTaskDef | undefined {
  return WEEKLY_TASKS.find(t => t.id === id);
}
