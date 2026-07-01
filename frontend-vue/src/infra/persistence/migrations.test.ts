/**
 * 存档迁移测试（S5）：任意历史形态 → SavePayloadV2。
 * 重点锁定 v1（无 version、无 presetSquads/towerProgress、收藏裸数量）的真实形态。
 */
import { describe, it, expect } from 'vitest';
import { migrate } from './migrations';
import { SAVE_VERSION, createDefaultDaily, createDefaultEquipment, createDefaultHomestead, createDefaultMiniGames, createDefaultPresetSquads, createDefaultTowerProgress } from './schema';

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

  it('保底/历史/喜爱原样保留；养成两轴保留 + 补缺省（瘦身）', () => {
    expect(v2.animePity).toEqual({ totalPulls: 88, pullsSinceLastHR: 12 });
    expect(v2.animeHistory).toHaveLength(1);
    expect(v2.favoriteAnime).toEqual([326]);
    expect(v2.characterNurtureData).toHaveLength(1);
    // v14：旧档 { affection, level } 保留两轴 + 补 statPoints/里程碑缺省
    const [, slim] = v2.characterNurtureData[0];
    expect(slim.affection).toBe(10);
    expect(slim.level).toBe(2);
    expect(slim.statPoints).toEqual({ hp: 0, atk: 0, def: 0, sp: 0, spd: 0 });
    expect(slim.claimedBondMilestones).toEqual([]);
  });

  it('★ 缺失的 presetSquads / towerProgress 补默认值（修复刷新丢进度的根基）', () => {
    expect(v2.presetSquads).toEqual(createDefaultPresetSquads());
    expect(v2.towerProgress).toEqual(createDefaultTowerProgress());
  });

  it('预设小队脏档：成员按位去重 + 截到 5 槽（防单角色克隆满全队放大战力）', () => {
    const out = migrate({
      version: 14,
      presetSquads: [{ id: 1, name: 'X', members: [7, 7, 7, 7, 7] }],
    } as unknown);
    // 同 id 仅首槽保留，其余置 null；恰 5 槽
    expect(out.presetSquads[0].members).toEqual([7, null, null, null, null]);
  });

  it('旧 4 槽预设小队迁移：前 4 位保留，第 5 位补 null', () => {
    const out = migrate({
      version: 14,
      presetSquads: [{ id: 1, name: '旧队', members: [101, 102, 103, 104] }],
    } as unknown);
    expect(out.presetSquads[0].members).toEqual([101, 102, 103, 104, null]);
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

  it('v7 新键：daily 补 weekDate / weeklyProgress / weeklyClaimed / loginStreak 缺省', () => {
    expect(v2.daily.weekDate).toBe('');
    expect(v2.daily.weeklyProgress).toEqual({});
    expect(v2.daily.weeklyClaimed).toEqual([]);
    expect(v2.daily.loginStreak).toBe(0);
  });

  it('v8 新键：minigames 缺失补默认（高低牌战绩 + 每日封顶记账）', () => {
    expect(v2.minigames).toEqual(createDefaultMiniGames());
  });

  it('v9 新键：minigames.quiz 缺失补默认（番剧问答战绩）', () => {
    expect(v2.minigames.quiz).toEqual({ highScore: 0, bestStreak: 0, playCount: 0 });
  });

  it('v10/v11 新键：minigames.dailyChallenge 缺失补默认（每日挑战战绩 + 连续天数）', () => {
    expect(v2.minigames.dailyChallenge).toEqual({ lastDate: '', lastScore: 0, bestScore: 0, streakDays: 0, bestStreakDays: 0 });
  });

  it('v12 新键：minigames.tasteProfile 缺失补默认（品味画像已看番空集）', () => {
    expect(v2.minigames.tasteProfile).toEqual({ watchedAnimeIds: [] });
  });

  it('v13 新键：homestead 缺失补默认（空入住 + 结算基线 0）', () => {
    expect(v2.homestead).toEqual(createDefaultHomestead());
  });

  it('v14 新键：equipment 缺失补默认（空背包 + 空配装）', () => {
    expect(v2.equipment).toEqual(createDefaultEquipment());
  });
});

describe('v14 养成瘦身迁移（丢旧训练字段、保留两轴、补 statPoints/里程碑缺省）', () => {
  it('旧 v13 养成数据（含训练/属性/强化等已删字段）→ 只剩两轴 + 加点 + 里程碑', () => {
    const out = migrate({
      version: 13,
      characterNurtureData: [
        [
          12393,
          {
            affection: 1200,
            level: 5,
            experience: 300,
            totalExperience: 16300,
            lastInteraction: '2026-06-10',
            // —— 以下全是 v14 删掉的旧字段，迁移后应被丢弃 ——
            intimacy: 80,
            totalInteractions: 42,
            dialogueHistory: ['d1', 'd2'],
            gifts: ['flower', 'book'],
            specialEvents: ['campus_walk_1'],
            attributes: { charm: 70, intelligence: 60, strength: 90, mood: 88 },
            levelBonusAttributes: { charm: 12, intelligence: 8, strength: 20 },
            battleEnhancements: { hp: 30, atk: 10, def: 5, sp: 0, spd: 15 },
            preferences: { favoriteTopics: ['x'], dislikedTopics: [], favoriteGifts: [] },
            trainingCooldowns: { charm_training: 1893456000000 },
          },
        ],
      ],
    } as unknown);

    const [id, slim] = out.characterNurtureData[0];
    expect(id).toBe(12393);
    // 两轴 + 等级/经验保留
    expect(slim.affection).toBe(1200);
    expect(slim.level).toBe(5);
    expect(slim.experience).toBe(300);
    expect(slim.totalExperience).toBe(16300);
    expect(slim.lastInteraction).toBe('2026-06-10');
    // 旧投入不退：statPoints 补全 0
    expect(slim.statPoints).toEqual({ hp: 0, atk: 0, def: 0, sp: 0, spd: 0 });
    expect(slim.claimedBondMilestones).toEqual([]);
    // 已删字段被丢弃
    expect(slim).not.toHaveProperty('intimacy');
    expect(slim).not.toHaveProperty('attributes');
    expect(slim).not.toHaveProperty('battleEnhancements');
    expect(slim).not.toHaveProperty('levelBonusAttributes');
    expect(slim).not.toHaveProperty('gifts');
    expect(slim).not.toHaveProperty('dialogueHistory');
    expect(slim).not.toHaveProperty('trainingCooldowns');
    expect(slim).not.toHaveProperty('preferences');
  });

  it('已有 statPoints / claimedBondMilestones 原样保留（往返保真）', () => {
    const out = migrate({
      version: 14,
      characterNurtureData: [
        [77, { affection: 500, level: 3, experience: 0, totalExperience: 4000, lastInteraction: '', statPoints: { hp: 12, atk: 8, def: 5, sp: 3, spd: 2 }, claimedBondMilestones: ['bond_1', 'bond_2'] }],
      ],
    } as unknown);
    const [, slim] = out.characterNurtureData[0];
    expect(slim.statPoints).toEqual({ hp: 12, atk: 8, def: 5, sp: 3, spd: 2 });
    expect(slim.claimedBondMilestones).toEqual(['bond_1', 'bond_2']);
  });

  it('characterNurtureData 非数组 → 空', () => {
    expect(migrate({ version: 13, characterNurtureData: 'oops' } as unknown).characterNurtureData).toEqual([]);
  });
});

describe('v14 装备域迁移', () => {
  it('v13 旧档（无 equipment 键）→ 默认空域', () => {
    expect(migrate({ version: 13 } as unknown).equipment).toEqual(createDefaultEquipment());
  });

  it('保留已有背包与配装（只收合法形态）', () => {
    const out = migrate({
      version: 14,
      equipment: {
        inventory: [{ uid: 'a', defId: 'wpn_ur_longinus' }, { uid: 'bad' }, 'oops'],
        equipped: { 12393: { weapon: 'a', armor: null, supporter: null }, bad: { weapon: 'x' } },
      },
    } as unknown);
    expect(out.equipment.inventory).toEqual([{ uid: 'a', defId: 'wpn_ur_longinus' }]);
    expect(out.equipment.equipped[12393]).toEqual({ weapon: 'a', armor: null, supporter: null });
  });

  it('单件单戴：同一 uid 被多角色/多槽引用 → 仅首处保留，其余归 null（防战力放大）', () => {
    const out = migrate({
      version: 14,
      equipment: {
        inventory: [{ uid: 'X', defId: 'wpn_ur_longinus' }],
        equipped: {
          1: { weapon: 'X', armor: null, supporter: null },
          2: { weapon: 'X', armor: null, supporter: null },
          3: { weapon: 'X', armor: null, supporter: null },
        },
      },
    } as unknown);
    // 数字键按升序遍历 → 最小 charId(1) 保留，其余清空
    expect(out.equipment.equipped[1].weapon).toBe('X');
    expect(out.equipment.equipped[2].weapon).toBeNull();
    expect(out.equipment.equipped[3].weapon).toBeNull();
  });

  it('异槽戴：武器 uid 放进 armor/supporter 槽 → 该槽清空（载入边界补 equip 同槽校验）', () => {
    const out = migrate({
      version: 14,
      equipment: {
        inventory: [{ uid: 'W', defId: 'wpn_ur_longinus' }], // 武器（slot=weapon）
        equipped: { 1: { weapon: null, armor: 'W', supporter: 'W' } },
      },
    } as unknown);
    expect(out.equipment.equipped[1]).toEqual({ weapon: null, armor: null, supporter: null });
  });

  it('重复 uid 取首条解释：同 uid 双 defId → 背包去重留首条，定槽与算 bonus 同源（堵错位绕过）', () => {
    const out = migrate({
      version: 14,
      equipment: {
        // 同 uid 两条：首条武器、次条防具
        inventory: [{ uid: 'X', defId: 'wpn_ur_longinus' }, { uid: 'X', defId: 'arm_r_uniform' }],
        equipped: { 1: { weapon: null, armor: 'X', supporter: null } },
      },
    } as unknown);
    // 背包去重留首条（武器）
    expect(out.equipment.inventory).toEqual([{ uid: 'X', defId: 'wpn_ur_longinus' }]);
    // 'X' 实为武器（首条）→ 放进 armor 槽按首条 def.slot 校验被拒，不再让校验按防具过、加成按武器生效
    expect(out.equipment.equipped[1].armor).toBeNull();
  });

  it('清洗孤儿 uid：equipped 指向已不在背包的实例 → 该槽归 null', () => {
    const out = migrate({
      version: 14,
      equipment: {
        inventory: [{ uid: 'a', defId: 'wpn_ur_longinus' }],
        // weapon 'a' 合法保留；armor 'ghost' 不在背包 → 清成 null
        equipped: { 12393: { weapon: 'a', armor: 'ghost', supporter: null } },
      },
    } as unknown);
    expect(out.equipment.equipped[12393]).toEqual({ weapon: 'a', armor: null, supporter: null });
  });

  it('equipment 局部损坏按字段补默认', () => {
    const out = migrate({ version: 14, equipment: { inventory: 'oops', equipped: 'nope' } } as unknown);
    expect(out.equipment).toEqual({ inventory: [], equipped: {} });
  });
});

describe('v15 towerProgress 扫荡周额度迁移（SA-T5）', () => {
  it('v14 旧档（towerProgress 无 sweep 字段）→ 补缺省 sweepWeekKey=""/sweepUsedThisWeek=0', () => {
    const out = migrate({
      version: 14,
      towerProgress: { currentFloor: 8, maxFloor: 7, floorRewards: {}, todayAttempts: 0, lastAttemptDate: '' },
    } as unknown);
    expect(out.towerProgress.currentFloor).toBe(8);
    expect(out.towerProgress.sweepWeekKey).toBe('');
    expect(out.towerProgress.sweepUsedThisWeek).toBe(0);
  });

  it('★ 往返保真：已存扫荡周额度 → 迁移后原样保留（存回一致）', () => {
    const saved = {
      version: 15,
      towerProgress: {
        currentFloor: 20, maxFloor: 19, floorRewards: { 1: true },
        todayAttempts: 0, lastAttemptDate: '',
        sweepWeekKey: '2026-W27', sweepUsedThisWeek: 4,
      },
    };
    const out = migrate(saved as unknown);
    expect(out.towerProgress.sweepWeekKey).toBe('2026-W27');
    expect(out.towerProgress.sweepUsedThisWeek).toBe(4);
    // 再过一次迁移（模拟存→读往返）仍一致
    const roundTrip = migrate(out as unknown);
    expect(roundTrip.towerProgress.sweepWeekKey).toBe('2026-W27');
    expect(roundTrip.towerProgress.sweepUsedThisWeek).toBe(4);
  });

  it('脏档：sweep 字段类型错误 → 回落缺省', () => {
    const out = migrate({
      version: 15,
      towerProgress: { currentFloor: 3, sweepWeekKey: 42, sweepUsedThisWeek: 'oops' },
    } as unknown);
    expect(out.towerProgress.sweepWeekKey).toBe('');
    expect(out.towerProgress.sweepUsedThisWeek).toBe(0);
  });
});

describe('v12 minigames.tasteProfile 迁移', () => {
  it('保留旧档已记录的已看番 id（只收数字）', () => {
    const out = migrate({ minigames: { tasteProfile: { watchedAnimeIds: [326, 10380, 'bad', null] } } } as unknown);
    expect(out.minigames.tasteProfile.watchedAnimeIds).toEqual([326, 10380]);
  });

  it('v11 旧档（minigames 有但无 tasteProfile）→ 空集，不丢其它战绩', () => {
    const out = migrate({ minigames: { higherLower: { highScore: 5, bestStreak: 3, playCount: 9 } } } as unknown);
    expect(out.minigames.tasteProfile).toEqual({ watchedAnimeIds: [] });
    expect(out.minigames.higherLower).toEqual({ highScore: 5, bestStreak: 3, playCount: 9 });
  });
});

describe('v13 homestead 迁移', () => {
  it('保留旧档已入住角色 + 结算基线（只收数字 id）', () => {
    const out = migrate({ version: 13, homestead: { placedCharacterIds: [12393, 77, 'bad', null], lastSettleAt: 1700000000000 } } as unknown);
    expect(out.homestead).toEqual({ placedCharacterIds: [12393, 77], lastSettleAt: 1700000000000 });
  });

  it('v12 旧档（无 homestead 键）→ 默认空态', () => {
    const out = migrate({ version: 12 } as unknown);
    expect(out.homestead).toEqual(createDefaultHomestead());
  });

  it('homestead 局部损坏按字段补默认', () => {
    const out = migrate({ version: 13, homestead: { placedCharacterIds: 'oops', lastSettleAt: 'x' } } as unknown);
    expect(out.homestead).toEqual({ placedCharacterIds: [], lastSettleAt: 0 });
  });

  it('脏档入住名单：去重 + 截断到槽位上限（防放大挂机收益）', () => {
    const out = migrate({
      version: 13,
      homestead: { placedCharacterIds: [5, 5, 1, 2, 3, 4, 6, 7, 8], lastSettleAt: 0 },
    } as unknown);
    // 去重后 [5,1,2,3,4,6,7,8] 截断到前 6 个
    expect(out.homestead.placedCharacterIds).toEqual([5, 1, 2, 3, 4, 6]);
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
    expect(out.presetSquads[0].members).toEqual([101, 102, null, null, null]);
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

  it('v6 存档的 daily（无 v7 字段）保留日字段 + 补周/连签缺省', () => {
    const out = migrate({
      version: 6,
      daily: { date: '2026-6-16', progress: { daily_gacha: 1 }, claimed: ['daily_gacha'], lastLoginDate: '2026-6-16' },
      codexMilestones: ['char_owned_50', 'anime_ur_complete'],
      achievements: ['ach_first_ur', 'ach_first_win'],
    });
    // v6 → v7：日字段原样保留，周任务/连签四字段补缺省
    expect(out.daily).toEqual({
      date: '2026-6-16',
      progress: { daily_gacha: 1 },
      claimed: ['daily_gacha'],
      lastLoginDate: '2026-6-16',
      weekDate: '',
      weeklyProgress: {},
      weeklyClaimed: [],
      loginStreak: 0,
    });
    expect(out.codexMilestones).toEqual(['char_owned_50', 'anime_ur_complete']);
    expect(out.achievements).toEqual(['ach_first_ur', 'ach_first_win']);
  });

  it('v7 存档的 daily（含周任务/连签）原样保留', () => {
    const out = migrate({
      version: 7,
      daily: {
        date: '2026-6-16',
        progress: { daily_gacha: 1 },
        claimed: ['daily_gacha'],
        lastLoginDate: '2026-6-16',
        weekDate: '2026-W25',
        weeklyProgress: { weekly_gacha: 12 },
        weeklyClaimed: ['weekly_battle'],
        loginStreak: 9,
      },
    });
    expect(out.daily).toEqual({
      date: '2026-6-16',
      progress: { daily_gacha: 1 },
      claimed: ['daily_gacha'],
      lastLoginDate: '2026-6-16',
      weekDate: '2026-W25',
      weeklyProgress: { weekly_gacha: 12 },
      weeklyClaimed: ['weekly_battle'],
      loginStreak: 9,
    });
  });

  it('v7 daily 局部损坏时按字段补默认（含周/连签字段）', () => {
    const out = migrate({
      version: 7,
      daily: { date: '2026-6-16', weeklyProgress: 'oops', weeklyClaimed: null, loginStreak: 'x' },
      codexMilestones: 'oops',
      achievements: null,
    });
    expect(out.daily).toEqual({
      date: '2026-6-16',
      progress: {},
      claimed: [],
      lastLoginDate: '',
      weekDate: '',
      weeklyProgress: {},
      weeklyClaimed: [],
      loginStreak: 0,
    });
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
