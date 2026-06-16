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

export function getDailyTaskById(id: string): DailyTaskDef | undefined {
  return DAILY_TASKS.find(t => t.id === id);
}
