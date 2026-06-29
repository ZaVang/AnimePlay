/**
 * 存档迁移 —— 纯函数：任意历史形态的原始存档 → 当前 SavePayloadV2。
 * 规则：
 *  - v1（无 version）：收藏裸数量 number → { count }；缺失的 presetSquads/towerProgress 用默认值补齐；
 *  - 缺失键一律补默认（容忍手改/损坏存档的局部缺失）；
 *  - 不识别的多余键丢弃（以 schema 为准）。
 */
import {
  SAVE_VERSION,
  createDefaultAppearance,
  createDefaultDaily,
  createDefaultHomestead,
  createDefaultMiniGames,
  createDefaultPresetSquads,
  createDefaultTowerProgress,
  type DailySave,
  type HomesteadSave,
  type MiniGamesSave,
  type SavePayload,
  type SerializedPlayerState,
} from './schema';
import { createPityState } from '@/engine/gacha/draw';

/* eslint-disable @typescript-eslint/no-explicit-any -- 迁移层的输入天然是未知形态 JSON */

function migratePlayerState(raw: any): SerializedPlayerState {
  const state = raw ?? {};
  return {
    level: state.level ?? 1,
    exp: state.exp ?? 0,
    animeGachaTickets: state.animeGachaTickets ?? 0,
    characterGachaTickets: state.characterGachaTickets ?? 0,
    knowledgePoints: state.knowledgePoints ?? 0,
    savedDecks: state.savedDecks ?? {},
    viewingQueue: Array.isArray(state.viewingQueue) ? state.viewingQueue : [],
    watchedAnime: Array.isArray(state.watchedAnime) ? state.watchedAnime : [],
    viewingStats: {
      totalWatchTime: state.viewingStats?.totalWatchTime ?? 0,
      genreProgress: state.viewingStats?.genreProgress ?? {},
      consecutiveDays: state.viewingStats?.consecutiveDays ?? 0,
      lastWatchDate: state.viewingStats?.lastWatchDate ?? '',
    },
  };
}

/** 旧存档兼容：早期收藏条目是裸数量 number，统一为 { count }。 */
function migrateCollection(entries: any): [number, { count: number }][] {
  if (!Array.isArray(entries)) return [];
  return entries.map(([id, data]: [number, number | { count: number }]) => [
    id,
    typeof data === 'number' ? { count: data } : { count: data?.count ?? 1 },
  ]);
}

function migratePity(raw: any) {
  const pity = createPityState();
  if (raw && typeof raw.totalPulls === 'number') pity.totalPulls = raw.totalPulls;
  if (raw && typeof raw.pullsSinceLastHR === 'number') pity.pullsSinceLastHR = raw.pullsSinceLastHR;
  return pity;
}

function migrateTowerProgress(raw: any) {
  const defaults = createDefaultTowerProgress();
  if (!raw || typeof raw !== 'object') return defaults;
  return {
    currentFloor: raw.currentFloor ?? defaults.currentFloor,
    maxFloor: raw.maxFloor ?? defaults.maxFloor,
    floorRewards: raw.floorRewards ?? defaults.floorRewards,
    todayAttempts: raw.todayAttempts ?? defaults.todayAttempts,
    lastAttemptDate: raw.lastAttemptDate ?? defaults.lastAttemptDate,
  };
}

/**
 * v6：每日任务/登录，字段级缺省兜底（缺失/损坏 → createDefaultDaily()）。
 * v7：补 weekDate/weeklyProgress/weeklyClaimed/loginStreak（旧 v6 档无此四字段 → 缺省）。
 */
function migrateDaily(raw: any): DailySave {
  const defaults = createDefaultDaily();
  if (!raw || typeof raw !== 'object') return defaults;
  return {
    date: typeof raw.date === 'string' ? raw.date : defaults.date,
    progress: raw.progress && typeof raw.progress === 'object' ? raw.progress : defaults.progress,
    claimed: Array.isArray(raw.claimed) ? raw.claimed : defaults.claimed,
    lastLoginDate: typeof raw.lastLoginDate === 'string' ? raw.lastLoginDate : defaults.lastLoginDate,
    // v6 → v7：周任务 + 连签（旧档缺省）
    weekDate: typeof raw.weekDate === 'string' ? raw.weekDate : defaults.weekDate,
    weeklyProgress:
      raw.weeklyProgress && typeof raw.weeklyProgress === 'object' ? raw.weeklyProgress : defaults.weeklyProgress,
    weeklyClaimed: Array.isArray(raw.weeklyClaimed) ? raw.weeklyClaimed : defaults.weeklyClaimed,
    loginStreak: typeof raw.loginStreak === 'number' ? raw.loginStreak : defaults.loginStreak,
  };
}

/**
 * v8/v9：小游戏域，字段级缺省兜底（旧档无 minigames 键 → createDefaultMiniGames()）。
 * 各游戏战绩三项数值缺失各自回落 0；防刷字段缺失回落默认；v9 旧档无 quiz → 默认空态。
 */
function migrateMiniGames(raw: any): MiniGamesSave {
  const defaults = createDefaultMiniGames();
  if (!raw || typeof raw !== 'object') return defaults;
  const rec = (src: any, def: { highScore: number; bestStreak: number; playCount: number }) => {
    const o = src && typeof src === 'object' ? src : {};
    return {
      highScore: typeof o.highScore === 'number' ? o.highScore : def.highScore,
      bestStreak: typeof o.bestStreak === 'number' ? o.bestStreak : def.bestStreak,
      playCount: typeof o.playCount === 'number' ? o.playCount : def.playCount,
    };
  };
  const dc = raw.dailyChallenge && typeof raw.dailyChallenge === 'object' ? raw.dailyChallenge : {};
  const tp = raw.tasteProfile && typeof raw.tasteProfile === 'object' ? raw.tasteProfile : {};
  return {
    higherLower: rec(raw.higherLower, defaults.higherLower),
    quiz: rec(raw.quiz, defaults.quiz),
    dailyChallenge: {
      lastDate: typeof dc.lastDate === 'string' ? dc.lastDate : defaults.dailyChallenge.lastDate,
      lastScore: typeof dc.lastScore === 'number' ? dc.lastScore : defaults.dailyChallenge.lastScore,
      bestScore: typeof dc.bestScore === 'number' ? dc.bestScore : defaults.dailyChallenge.bestScore,
      streakDays: typeof dc.streakDays === 'number' ? dc.streakDays : defaults.dailyChallenge.streakDays,
      bestStreakDays: typeof dc.bestStreakDays === 'number' ? dc.bestStreakDays : defaults.dailyChallenge.bestStreakDays,
    },
    // v11 → v12：品味画像（旧档无此键 → 空集）。只收数字 id。
    tasteProfile: {
      watchedAnimeIds: Array.isArray(tp.watchedAnimeIds)
        ? tp.watchedAnimeIds.filter((x: unknown): x is number => typeof x === 'number')
        : defaults.tasteProfile.watchedAnimeIds,
    },
    awardDate: typeof raw.awardDate === 'string' ? raw.awardDate : defaults.awardDate,
    awardedToday: typeof raw.awardedToday === 'number' ? raw.awardedToday : defaults.awardedToday,
  };
}

/**
 * v13：家园挂机域，字段级缺省兜底（旧档无 homestead 键 → createDefaultHomestead()）。
 * placedCharacterIds 只收数字 id；lastSettleAt 非数字回落 0。
 */
function migrateHomestead(raw: any): HomesteadSave {
  const defaults = createDefaultHomestead();
  if (!raw || typeof raw !== 'object') return defaults;
  return {
    placedCharacterIds: Array.isArray(raw.placedCharacterIds)
      ? raw.placedCharacterIds.filter((x: unknown): x is number => typeof x === 'number')
      : defaults.placedCharacterIds,
    lastSettleAt: typeof raw.lastSettleAt === 'number' ? raw.lastSettleAt : defaults.lastSettleAt,
  };
}

/** 任意原始存档 → 当前版本 payload。历史版本之外的形态按"尽力恢复 + 默认兜底"处理。 */
export function migrate(raw: unknown): SavePayload {
  const payload = (raw ?? {}) as any;

  return {
    version: SAVE_VERSION,
    // v4 → v5：保存计数（乐观并发）。旧档无此字段 → 默认 0；保留已有数值。
    saveVersion: typeof payload.saveVersion === 'number' ? payload.saveVersion : 0,
    state: migratePlayerState(payload.state),
    animeCollection: migrateCollection(payload.animeCollection),
    characterCollection: migrateCollection(payload.characterCollection),
    animePity: migratePity(payload.animePity),
    characterPity: migratePity(payload.characterPity),
    animeHistory: Array.isArray(payload.animeHistory) ? payload.animeHistory : [],
    characterHistory: Array.isArray(payload.characterHistory) ? payload.characterHistory : [],
    favoriteAnime: Array.isArray(payload.favoriteAnime) ? payload.favoriteAnime : [],
    favoriteCharacters: Array.isArray(payload.favoriteCharacters) ? payload.favoriteCharacters : [],
    characterNurtureData: Array.isArray(payload.characterNurtureData) ? payload.characterNurtureData : [],
    // ★ v1 → v2：此前根本不在存档里的两块，缺失即默认
    presetSquads: Array.isArray(payload.presetSquads) && payload.presetSquads.length > 0
      ? payload.presetSquads
      : createDefaultPresetSquads(),
    towerProgress: migrateTowerProgress(payload.towerProgress),
    // v2 → v3：商店限购计数 + 猜角色最高分
    shopPurchases: payload.shopPurchases && typeof payload.shopPurchases === 'object' ? payload.shopPurchases : {},
    guess: { highScore: typeof payload.guess?.highScore === 'number' ? payload.guess.highScore : 0 },
    // v3 → v4：皮肤装扮（未知/缺失回落默认；id 合法性由应用层把关）
    appearance:
      typeof payload.appearance?.skinId === 'string'
        ? { skinId: payload.appearance.skinId }
        : createDefaultAppearance(),
    // v5 → v6：每日任务/登录 + 图鉴里程碑 + 成就（缺失补默认）
    daily: migrateDaily(payload.daily),
    codexMilestones: Array.isArray(payload.codexMilestones) ? payload.codexMilestones : [],
    achievements: Array.isArray(payload.achievements) ? payload.achievements : [],
    // v7 → v8：小游戏域（旧档无此键 → 默认空态）
    minigames: migrateMiniGames(payload.minigames),
    // v12 → v13：家园挂机域（旧档无此键 → 默认空态）
    homestead: migrateHomestead(payload.homestead),
  };
}
