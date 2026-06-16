/**
 * 存档迁移测试（S5）：任意历史形态 → SavePayloadV2。
 * 重点锁定 v1（无 version、无 presetSquads/towerProgress、收藏裸数量）的真实形态。
 */
import { describe, it, expect } from 'vitest';
import { migrate } from './migrations';
import { SAVE_VERSION, createDefaultDaily, createDefaultPresetSquads, createDefaultTowerProgress } from './schema';

/** 模拟 S5 之前服务器上的真实 v1 存档形态。 */
function buildV1Payload() {
  return {
    state: {
      level: 7,
      exp: 130,
      animeGachaTickets: 42,
      characterGachaTickets: 17,
      knowledgePoints: 980,
      savedDecks: { 主力: { name: '主力', anime: [1, 2], character: [3], cover: null, createdAt: 'x', version: 1 } },
      viewingQueue: [null, { animeId: 326, startTime: 1700000000000 }, null],
      watchedAnime: [326, 876],
      viewingStats: { totalWatchTime: 300, genreProgress: { 科幻: 2 }, consecutiveDays: 3, lastWatchDate: '2026-06-10' },
    },
    animeCollection: [
      [326, 3], // 早期裸数量形态
      [876, { count: 2 }],
    ],
    characterCollection: [[12393, 1]],
    animePity: { totalPulls: 88, pullsSinceLastHR: 12 },
    characterPity: { totalPulls: 30, pullsSinceLastHR: 30 },
    animeHistory: [{ id: 326, rarity: 'UR', timestamp: 1 }],
    characterHistory: [],
    favoriteAnime: [326],
    favoriteCharacters: [],
    characterNurtureData: [[12393, { affection: 10, level: 2 }]],
    // v1 没有 version / presetSquads / towerProgress
  };
}

describe('v1 → v2 迁移', () => {
  const v2 = migrate(buildV1Payload());

  it('打上当前版本号', () => {
    expect(v2.version).toBe(SAVE_VERSION);
  });

  it('playerState 字段原样保留', () => {
    expect(v2.state.level).toBe(7);
    expect(v2.state.knowledgePoints).toBe(980);
    expect(v2.state.savedDecks['主力'].anime).toEqual([1, 2]);
    expect(v2.state.viewingQueue[1]).toEqual({ animeId: 326, startTime: 1700000000000 });
    expect(v2.state.watchedAnime).toEqual([326, 876]);
    expect(v2.state.viewingStats.consecutiveDays).toBe(3);
  });

  it('收藏裸数量迁移为 { count }', () => {
    expect(v2.animeCollection).toEqual([
      [326, { count: 3 }],
      [876, { count: 2 }],
    ]);
    expect(v2.characterCollection).toEqual([[12393, { count: 1 }]]);
  });

  it('保底/历史/喜爱/养成原样保留', () => {
    expect(v2.animePity).toEqual({ totalPulls: 88, pullsSinceLastHR: 12 });
    expect(v2.animeHistory).toHaveLength(1);
    expect(v2.favoriteAnime).toEqual([326]);
    expect(v2.characterNurtureData).toHaveLength(1);
  });

  it('★ 缺失的 presetSquads / towerProgress 补默认值（修复刷新丢进度的根基）', () => {
    expect(v2.presetSquads).toEqual(createDefaultPresetSquads());
    expect(v2.towerProgress).toEqual(createDefaultTowerProgress());
  });

  it('v3 新键：shopPurchases / guess 缺失补默认', () => {
    expect(v2.shopPurchases).toEqual({});
    expect(v2.guess).toEqual({ highScore: 0 });
  });

  it('v4 新键：appearance 缺失补默认皮肤', () => {
    expect(v2.appearance).toEqual({ skinId: 'warm' });
  });

  it('v5 新键：saveVersion 缺失补 0（旧档从 0 起算）', () => {
    expect(v2.saveVersion).toBe(0);
  });

  it('v6 新键：daily / codexMilestones / achievements 缺失补默认', () => {
    expect(v2.daily).toEqual(createDefaultDaily());
    expect(v2.codexMilestones).toEqual([]);
    expect(v2.achievements).toEqual([]);
  });
});

describe('v2 存档过迁移层', () => {
  it('已有 presetSquads / towerProgress 原样保留', () => {
    const v2in = {
      ...buildV1Payload(),
      version: 2,
      presetSquads: [{ id: 1, name: '我的队', members: [101, 102, null, null] }],
      towerProgress: { currentFloor: 13, maxFloor: 12, floorRewards: { 1: true }, todayAttempts: 2, lastAttemptDate: 'x' },
    };
    const out = migrate(v2in);
    expect(out.presetSquads[0].name).toBe('我的队');
    expect(out.towerProgress.currentFloor).toBe(13);
  });

  it('v3 存档的 shopPurchases / guess 原样保留', () => {
    const out = migrate({
      version: 3,
      shopPurchases: { anime_ticket_1: { date: '2026-6-12', count: 3 } },
      guess: { highScore: 85 },
    });
    expect(out.shopPurchases.anime_ticket_1.count).toBe(3);
    expect(out.guess.highScore).toBe(85);
  });

  it('v4 存档的 appearance 原样保留（含未来未知皮肤 id，合法性由应用层把关）', () => {
    expect(migrate({ version: 4, appearance: { skinId: 'neon' } }).appearance.skinId).toBe('neon');
    expect(migrate({ version: 4, appearance: { skinId: 'limited_2027' } }).appearance.skinId).toBe('limited_2027');
  });

  it('v5 存档的 saveVersion 原样保留', () => {
    expect(migrate({ version: 5, saveVersion: 42 }).saveVersion).toBe(42);
    // 非数字/缺失回落 0
    expect(migrate({ version: 5, saveVersion: 'oops' }).saveVersion).toBe(0);
    expect(migrate({ version: 5 }).saveVersion).toBe(0);
  });

  it('v6 存档的 daily / codexMilestones / achievements 原样保留', () => {
    const out = migrate({
      version: 6,
      daily: { date: '2026-6-16', progress: { daily_gacha: 1 }, claimed: ['daily_gacha'], lastLoginDate: '2026-6-16' },
      codexMilestones: ['char_owned_50', 'anime_ur_complete'],
      achievements: ['ach_first_ur', 'ach_first_win'],
    });
    expect(out.daily).toEqual({ date: '2026-6-16', progress: { daily_gacha: 1 }, claimed: ['daily_gacha'], lastLoginDate: '2026-6-16' });
    expect(out.codexMilestones).toEqual(['char_owned_50', 'anime_ur_complete']);
    expect(out.achievements).toEqual(['ach_first_ur', 'ach_first_win']);
  });

  it('v6 daily 局部损坏时按字段补默认', () => {
    const out = migrate({ version: 6, daily: { date: '2026-6-16' }, codexMilestones: 'oops', achievements: null });
    expect(out.daily).toEqual({ date: '2026-6-16', progress: {}, claimed: [], lastLoginDate: '' });
    expect(out.codexMilestones).toEqual([]);
    expect(out.achievements).toEqual([]);
  });

  it('appearance 形态损坏时回落默认皮肤', () => {
    expect(migrate({ version: 4, appearance: { skinId: 42 } }).appearance).toEqual({ skinId: 'warm' });
    expect(migrate({ version: 4, appearance: 'oops' }).appearance).toEqual({ skinId: 'warm' });
  });
});

describe('损坏/缺失字段兜底', () => {
  it('空对象 → 全默认 payload（不抛错）', () => {
    const out = migrate({});
    expect(out.version).toBe(SAVE_VERSION);
    expect(out.state.level).toBe(1);
    expect(out.animeCollection).toEqual([]);
    expect(out.animePity).toEqual({ totalPulls: 0, pullsSinceLastHR: 0 });
    expect(out.presetSquads).toHaveLength(3);
    expect(out.towerProgress.currentFloor).toBe(1);
  });

  it('null / 非对象输入同样兜底', () => {
    expect(migrate(null).version).toBe(SAVE_VERSION);
    expect(migrate(undefined).state.exp).toBe(0);
  });

  it('towerProgress 局部缺失时按字段补默认', () => {
    const out = migrate({ towerProgress: { currentFloor: 5 } });
    expect(out.towerProgress.currentFloor).toBe(5);
    expect(out.towerProgress.maxFloor).toBe(1);
    expect(out.towerProgress.floorRewards).toEqual({});
  });
});
