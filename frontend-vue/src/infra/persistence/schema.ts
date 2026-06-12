/**
 * 存档协议 —— 显式 schema（S5 建立）。
 * 这里是「存了什么」的唯一权威定义；新增持久化字段必须改这里 + migrations.ts + stores/persistence.ts 三处。
 * v1（无 version 字段）：S5 之前的历史存档，缺 presetSquads/towerProgress（塔进度刷新即丢的根因）。
 * v2：补入 presetSquads / towerProgress / version。
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

export const SAVE_VERSION = 2 as const;

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

export interface SavePayloadV2 {
  version: typeof SAVE_VERSION;
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
}

export function createDefaultPresetSquads(): PresetSquad[] {
  return [
    { id: 1, name: '小队 A', members: [null, null, null, null] },
    { id: 2, name: '小队 B', members: [null, null, null, null] },
    { id: 3, name: '小队 C', members: [null, null, null, null] },
  ];
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
