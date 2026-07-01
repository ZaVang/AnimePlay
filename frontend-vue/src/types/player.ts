/**
 * 玩家档案相关的共享类型（S5 自 stores/userStore 上移到类型层）。
 * infra/persistence 的存档 schema 依赖这些定义；userStore 转发导出以兼容旧 import 路径。
 */
import type { Rarity } from './card';

export interface Deck {
  name: string;
  anime: number[]; // Store only anime card IDs
  character: number[]; // Store only character card IDs
  cover: {
    id: number;
    type: 'anime' | 'character';
  } | null;
  createdAt: string;
  version: number;
}

export interface ViewingQueueSlot {
  animeId: number;
  startTime: number; // 时间戳（毫秒）
}

export interface ViewingStats {
  totalWatchTime: number; // 总观看时间（分钟）
  genreProgress: Record<string, number>; // 各类型观看数量
  consecutiveDays: number; // 连续观看天数
  lastWatchDate: string; // 最后观看日期
}

export interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'warning' | 'gacha';
  timestamp: number;
}

export interface GachaHistoryItem {
  id: number;
  rarity: Rarity;
  timestamp: number;
}

export interface PresetSquad {
  id: number;
  name: string;
  members: (number | null)[]; // 5个位置，null表示空位
  lastUsed?: string;
}

export interface TowerProgress {
  currentFloor: number; // 当前可挑战层数
  maxFloor: number; // 历史最高层数
  floorRewards: { [floor: number]: boolean }; // 已领取的层数奖励
  todayAttempts: number; // 今日尝试次数
  lastAttemptDate: string; // 上次尝试日期
}

/** 货币种类（profile.spend/earn 的唯一入口键）。 */
export type CurrencyKey = 'knowledgePoints' | 'animeGachaTickets' | 'characterGachaTickets';
