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
  todayAttempts: number; // 今日尝试次数（历史遗留 stub，扫荡不复用）
  lastAttemptDate: string; // 上次尝试日期（历史遗留 stub）
  // ★ v15（SA-T5）：扫荡（已通层重复挑战）周额度。扁平定长（非 Record<floor,count>，随层数不膨胀）。
  sweepWeekKey: string; // 当前额度所属周键（weekKey：YYYY-Www），跨周读时归零
  sweepUsedThisWeek: number; // 本周已用扫荡次数（受 SWEEP_WEEKLY_CAP 封顶）
  // ★ v20（S15-T4）：槽位定向掉落保底计数（每槽 = 连续多少次通新层掉落判定未出该槽）。
  // 定长 3 键（weapon/armor/supporter），随层数/次数不膨胀；各值 clamp 到 [0, SLOT_PITY_THRESHOLD]。复用 v20 存档，不升 v21。
  slotPity: { weapon: number; armor: number; supporter: number };
}

/** 货币种类（profile.spend/earn 的唯一入口键）。 */
export type CurrencyKey = 'knowledgePoints' | 'animeGachaTickets' | 'characterGachaTickets';
