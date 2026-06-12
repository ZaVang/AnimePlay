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
  createDefaultPresetSquads,
  createDefaultTowerProgress,
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

/** 任意原始存档 → 当前版本 payload。历史版本之外的形态按"尽力恢复 + 默认兜底"处理。 */
export function migrate(raw: unknown): SavePayload {
  const payload = (raw ?? {}) as any;

  return {
    version: SAVE_VERSION,
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
  };
}
