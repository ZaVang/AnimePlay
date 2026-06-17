/**
 * 存档协议 —— 显式 schema（S5 建立）。
 * 这里是「存了什么」的唯一权威定义；新增持久化字段必须改这里 + migrations.ts + stores/persistence.ts 三处。
 * v1（无 version 字段）：S5 之前的历史存档，缺 presetSquads/towerProgress（塔进度刷新即丢的根因）。
 * v2：补入 presetSquads / towerProgress / version。
 * v3（S6）：补入 shopPurchases（商店每日限购计数）/ guess（猜角色最高分）。
 * v4（S7）：补入 appearance（皮肤装扮，皮肤随账号走；将来点数兑换的 ownedSkins 也挂这里）。
 * v5（S10）：补入 saveVersion（保存计数，乐观并发用）。
 *   注意：saveVersion（第几次保存，单调递增）≠ 本 version（协议版本=5），是两个字段，别混。
 *   saveVersion 由后端权威维护（POST 返回新值），前端只是携带基线，旧档迁移默认 0。
 * v6（evolution-1）：补入 daily（每日任务进度+日期+登录领取标记）/ codexMilestones（已领里程碑 id）/ achievements（已解锁 id）。
 * v7（B1）：daily 扩字段——weekDate/weeklyProgress/weeklyClaimed（周任务，weekKey 跨周归零）+ loginStreak（连续登录天数，断签归 1，递增登录奖励）。旧档迁移补缺省。
 * v8（evolution-5）：新增 minigames 域——高低牌 higherLower（highScore/bestStreak/playCount）+ 每日发奖封顶防刷（awardDate/awardedToday，跨天读时归零）。不动 v7 guess 域。
 * v9（evolution-6）：minigames 域加 quiz（番剧问答战绩）；每日封顶跨游戏共享。
 */
import type { PityState } from '@/engine/gacha/draw';
import type { CharacterNurtureData } from '@/types/nurture';
import type {
  Deck,
  ViewingQueueSlot,
  ViewingStats,
  GachaHistoryItem,
  PresetSquad,
  TowerProgress,
} from '@/types/player';

export const SAVE_VERSION = 9 as const;

/** 商店单品的当日购买记录（跨天读取时自动视为 0）。 */
export interface ShopPurchaseRecord {
  date: string;
  count: number;
}

/** 每日任务/登录（v6）+ 周任务/连签（v7）。进度按 date/weekDate 判定，跨天/跨周读取归零（逻辑在 stores/daily.ts）。 */
export interface DailySave {
  /** 当日任务集所属日期（todayKey：YYYY-M-D）。 */
  date: string;
  /** taskId → 进度计数。 */
  progress: Record<string, number>;
  /** 当日已领取的 taskId。 */
  claimed: string[];
  /** 每日登录奖励最近发放日期（todayKey）。 */
  lastLoginDate: string;
  /** ★ v7：周任务集所属周键（weekKey：YYYY-Www）。 */
  weekDate: string;
  /** ★ v7：weeklyTaskId → 进度计数。 */
  weeklyProgress: Record<string, number>;
  /** ★ v7：本周已领取的 weeklyTaskId。 */
  weeklyClaimed: string[];
  /** ★ v7：连续登录天数（断签归 1，今日已领不变）。 */
  loginStreak: number;
}

export interface GuessGameSave {
  highScore: number;
}

/** 单个小游戏的持久化战绩（各游戏通用）。 */
export interface MiniGameRecord {
  /** 历史最高单局得分。 */
  highScore: number;
  /** 历史最佳连胜（最长 streak）。 */
  bestStreak: number;
  /** 累计游玩局数。 */
  playCount: number;
}

/** 兼容别名（v8 时命名）。 */
export type HigherLowerSave = MiniGameRecord;

/**
 * 小游戏域。各游戏战绩 + 每日发奖封顶（跨游戏共享，防刷）。
 * awardDate（todayKey：YYYY-M-D）跨天读时归零 awardedToday，仿 daily 的 ensureToday 模式。
 * v8：higherLower（高低牌）。v9：quiz（番剧问答）。
 */
export interface MiniGamesSave {
  higherLower: MiniGameRecord;
  /** v9 新增：番剧问答 Quiz 战绩。 */
  quiz: MiniGameRecord;
  /** 当日已发奖知识点所属日期（todayKey）。 */
  awardDate: string;
  /** 当日已发放的知识点累计（达每日封顶后不再发奖，只更新战绩）。 */
  awardedToday: number;
}

/** 外观装扮（v4）。皮肤 id 对应 config/skins.ts 注册表；未知 id 由应用层回落默认。 */
export interface AppearanceSave {
  skinId: string;
}

/** playerState 的序列化形态（watchedAnime Set → 数组）。 */
export interface SerializedPlayerState {
  level: number;
  exp: number;
  animeGachaTickets: number;
  characterGachaTickets: number;
  knowledgePoints: number;
  savedDecks: Record<string, Deck>;
  viewingQueue: (ViewingQueueSlot | null)[];
  watchedAnime: number[];
  viewingStats: ViewingStats;
}

export interface SavePayload {
  version: typeof SAVE_VERSION;
  /**
   * ★ v5 新增：保存计数（乐观并发）。后端权威维护：POST 返回 saveVersion+1。
   * 这是「第几次保存」的单调计数，与 version（协议版本）是两个不同的字段。旧档迁移默认 0。
   */
  saveVersion: number;
  state: SerializedPlayerState;
  animeCollection: [number, { count: number }][];
  characterCollection: [number, { count: number }][];
  animePity: PityState;
  characterPity: PityState;
  animeHistory: GachaHistoryItem[];
  characterHistory: GachaHistoryItem[];
  favoriteAnime: number[];
  favoriteCharacters: number[];
  characterNurtureData: [number, CharacterNurtureData][];
  /** ★ v2 新增：预设小队（此前刷新即丢）。 */
  presetSquads: PresetSquad[];
  /** ★ v2 新增：爬塔进度（此前刷新即丢）。 */
  towerProgress: TowerProgress;
  /** v3 新增：商店每日限购计数。 */
  shopPurchases: Record<string, ShopPurchaseRecord>;
  /** v3 新增：猜角色最高分。 */
  guess: GuessGameSave;
  /** v4 新增：皮肤装扮（随账号漫游）。 */
  appearance: AppearanceSave;
  /** v6 新增：每日任务/登录进度。 */
  daily: DailySave;
  /** v6 新增：已领图鉴里程碑 id。 */
  codexMilestones: string[];
  /** v6 新增：已解锁成就 id。 */
  achievements: string[];
  /** v8 新增：小游戏域（高低牌战绩 + 每日发奖封顶）。 */
  minigames: MiniGamesSave;
}

/** 兼容别名（S5 时代命名）。 */
export type SavePayloadV2 = SavePayload;

export function createDefaultPresetSquads(): PresetSquad[] {
  return [
    { id: 1, name: '小队 A', members: [null, null, null, null] },
    { id: 2, name: '小队 B', members: [null, null, null, null] },
    { id: 3, name: '小队 C', members: [null, null, null, null] },
  ];
}

/** 默认皮肤 id 与 config/skins.ts 的 DEFAULT_SKIN_ID 一致；未知 id 由 theme store 回落，故这里不依赖 config。 */
export function createDefaultAppearance(): AppearanceSave {
  return { skinId: 'warm' };
}

/** v6/v7：每日任务/登录 + 周任务/连签默认空态（新档/旧档迁移补默认）。 */
export function createDefaultDaily(): DailySave {
  return {
    date: '',
    progress: {},
    claimed: [],
    lastLoginDate: '',
    weekDate: '',
    weeklyProgress: {},
    weeklyClaimed: [],
    loginStreak: 0,
  };
}

/** v8/v9：小游戏域默认空态（新档/旧档迁移补默认）。 */
export function createDefaultMiniGames(): MiniGamesSave {
  return {
    higherLower: { highScore: 0, bestStreak: 0, playCount: 0 },
    quiz: { highScore: 0, bestStreak: 0, playCount: 0 },
    awardDate: '',
    awardedToday: 0,
  };
}

export function createDefaultTowerProgress(): TowerProgress {
  return {
    currentFloor: 1,
    maxFloor: 1,
    floorRewards: {},
    todayAttempts: 0,
    lastAttemptDate: '',
  };
}
