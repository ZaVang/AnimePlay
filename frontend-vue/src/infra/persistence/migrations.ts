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
  createDefaultEquipment,
  createDefaultFacility,
  createDefaultHomestead,
  createDefaultMiniGames,
  createDefaultPresetSquads,
  createDefaultTowerProgress,
  type DailySave,
  type EquipmentSave,
  type FacilitySave,
  type HomesteadSave,
  type MiniGamesSave,
  type SavePayload,
  type SerializedPlayerState,
} from './schema';
import type { CharacterNurtureData } from '@/types/nurture';
import type { PresetSquad } from '@/types/player';
import { createPityState } from '@/engine/gacha/draw';
import { MAX_BREAKTHROUGH } from '@/engine/nurture/rules';
import { canonicalizePlacedIds, clampFacilityLevel } from '@/config/homestead';
import { sanitizeEquipped, clampEnhance } from '@/config/equipment';
import { canonicalizeSquadMembers } from './schema';

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
    // v14 → v15：扫荡周额度（旧档无此二字段 → 缺省 ''/0）。类型守卫防脏档。
    sweepWeekKey: typeof raw.sweepWeekKey === 'string' ? raw.sweepWeekKey : defaults.sweepWeekKey,
    sweepUsedThisWeek: typeof raw.sweepUsedThisWeek === 'number' ? raw.sweepUsedThisWeek : defaults.sweepUsedThisWeek,
  };
}

/**
 * v6：每日任务/登录，字段级缺省兜底（缺失/损坏 → createDefaultDaily()）。
 * v7：补 weekDate/weeklyProgress/weeklyClaimed/loginStreak（旧 v6 档无此四字段 → 缺省）。
 * v19：补 commissionDate/commissionProgress/commissionClaimed（旧档无此三字段 → 缺省）。
 * 白名单重建（禁 spread，pitfalls S13-C1）——只保留 schema 已知字段。
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
    // v18 → v19：家园日常委托子域（旧档缺 → 缺省，与 weekly 四字段同构）
    commissionDate: typeof raw.commissionDate === 'string' ? raw.commissionDate : defaults.commissionDate,
    commissionProgress:
      raw.commissionProgress && typeof raw.commissionProgress === 'object'
        ? raw.commissionProgress
        : defaults.commissionProgress,
    commissionClaimed: Array.isArray(raw.commissionClaimed) ? raw.commissionClaimed : defaults.commissionClaimed,
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
    // 数字 + 去重 + 截断到槽位上限（脏档防放大收益，见 canonicalizePlacedIds）
    placedCharacterIds: canonicalizePlacedIds(raw.placedCharacterIds),
    lastSettleAt: typeof raw.lastSettleAt === 'number' ? raw.lastSettleAt : defaults.lastSettleAt,
  };
}

/**
 * v17（S14-D SD-T1/SD-T5）：设施域。旧档无此键 → 全设施 Lv.1 缺省（决策-3：禁止 Lv.0 归零挂机）。
 * 白名单重建（禁 spread 浅拷贝，pitfalls S13-C1）：每字段类型守卫 + clampFacilityLevel 到 [1, MAX]
 * （防脏档把设施等级放大 → 放大挂机产出 / 封顶）。
 */
function migrateFacility(raw: any): FacilitySave {
  const defaults = createDefaultFacility();
  if (!raw || typeof raw !== 'object') return defaults;
  return {
    exp: clampFacilityLevel(raw.exp),
    bond: clampFacilityLevel(raw.bond),
    knowledge: clampFacilityLevel(raw.knowledge),
  };
}

/**
 * v14（S13-C1）：养成数据瘦身。保留两轴（affection + 等级/经验），补 statPoints 缺省
 * （旧档无 → 全 0，与瘦身后字段一致——旧投入不退，见 FUTURE.md S13-C），补空 claimedBondMilestones；
 * 丢弃删掉的旧字段（intimacy/attributes/battleEnhancements/levelBonusAttributes/gifts/dialogueHistory/
 * specialEvents/preferences/totalInteractions/trainingCooldowns）。
 */
function migrateNurtureData(entries: any): [number, CharacterNurtureData][] {
  if (!Array.isArray(entries)) return [];
  return entries
    .filter((e: any) => Array.isArray(e) && e.length === 2)
    .map(([id, raw]: [number, any]) => {
      const data = raw && typeof raw === 'object' ? raw : {};
      const sp = data.statPoints && typeof data.statPoints === 'object' ? data.statPoints : {};
      const slim: CharacterNurtureData = {
        affection: typeof data.affection === 'number' ? data.affection : 0,
        lastInteraction: typeof data.lastInteraction === 'string' ? data.lastInteraction : '',
        level: typeof data.level === 'number' ? data.level : 1,
        experience: typeof data.experience === 'number' ? data.experience : 0,
        totalExperience: typeof data.totalExperience === 'number' ? data.totalExperience : 0,
        statPoints: {
          hp: typeof sp.hp === 'number' ? sp.hp : 0,
          atk: typeof sp.atk === 'number' ? sp.atk : 0,
          def: typeof sp.def === 'number' ? sp.def : 0,
          sp: typeof sp.sp === 'number' ? sp.sp : 0,
          spd: typeof sp.spd === 'number' ? sp.spd : 0,
        },
        claimedBondMilestones: Array.isArray(data.claimedBondMilestones)
          ? data.claimedBondMilestones.filter((x: unknown): x is string => typeof x === 'string')
          : [],
        // v15 → v16（SC-T3）：星级/突破次数（旧档无 → 0）。clamp 到 [0, MAX_BREAKTHROUGH] 防脏档放大战力。
        breakthrough:
          typeof data.breakthrough === 'number'
            ? Math.min(MAX_BREAKTHROUGH, Math.max(0, Math.floor(data.breakthrough)))
            : 0,
        // v15 → v16（SC-T4）：每日好感互动日期键（旧档无 → ''）。
        lastBondInteractionDate: typeof data.lastBondInteractionDate === 'string' ? data.lastBondInteractionDate : '',
      };
      return [id, slim] as [number, CharacterNurtureData];
    });
}

/**
 * v14（S13-C1）：装备域（C1 空占位）。旧档无此键 → 默认空域；
 * 局部损坏按字段补默认。inventory 只收 {uid,defId} 形态；equipped 逐角色补三槽缺省。
 * v18（S14-E SE-T1）：白名单重建 {uid, defId, enhance}——旧档实例无 enhance → 补 0，
 * 脏档 enhance 经 clampEnhance 钳到 [0, MAX_ENHANCE]（防放大战力）；不识别的多余字段一律丢弃（pitfalls S13-C1）。
 */
function migrateEquipment(raw: any): EquipmentSave {
  const defaults = createDefaultEquipment();
  if (!raw || typeof raw !== 'object') return defaults;

  const seenUid = new Set<string>();
  const inventory = Array.isArray(raw.inventory)
    ? raw.inventory
        .filter((it: any) => it && typeof it.uid === 'string' && typeof it.defId === 'string')
        // v18：白名单重建三字段，enhance 缺失补 0、脏档 clamp（禁 spread 漏进脏字段）
        .map((it: any) => ({ uid: it.uid as string, defId: it.defId as string, enhance: clampEnhance(it.enhance) }))
        // uid 去重保留首条（与运行期 getItem = inventory.find 取首条一致；同 uid 双 defId 不再解释错位）
        .filter((it: { uid: string }) => {
          if (seenUid.has(it.uid)) return false;
          seenUid.add(it.uid);
          return true;
        })
    : defaults.inventory;

  // 三槽配装收口运行期 equip() 的不变式（在库 + 单件单戴 + 同槽），迁移与反序列化共用 sanitizeEquipped。
  const equipped = sanitizeEquipped(inventory, raw.equipped);

  return { inventory, equipped };
}

/**
 * v1→v2：预设小队。每队成员走 canonicalizeSquadMembers（5 槽 + 同队去重），保留 id/name/lastUsed。
 * 把配队 UI 的不变式收口到载入边界；旧 4 槽档迁移时前 4 位保留，第 5 位补 null。
 */
function migratePresetSquads(raw: any): PresetSquad[] {
  const defaults = createDefaultPresetSquads();
  if (!Array.isArray(raw) || raw.length === 0) return defaults;
  return raw.map((sq: any, i: number): PresetSquad => {
    const fb = defaults[i] ?? defaults[0];
    const out: PresetSquad = {
      id: typeof sq?.id === 'number' ? sq.id : fb.id,
      name: typeof sq?.name === 'string' ? sq.name : fb.name,
      members: canonicalizeSquadMembers(sq?.members),
    };
    if (typeof sq?.lastUsed === 'string') out.lastUsed = sq.lastUsed;
    return out;
  });
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
    // v13 → v14：养成数据瘦身（丢旧训练字段、保留两轴、补 statPoints/里程碑缺省）
    characterNurtureData: migrateNurtureData(payload.characterNurtureData),
    // ★ v1 → v2：此前根本不在存档里的两块，缺失即默认
    presetSquads: migratePresetSquads(payload.presetSquads),
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
    // v13 → v14：装备域（C1 空占位；旧档无此键 → 默认空域）
    equipment: migrateEquipment(payload.equipment),
    // v16 → v17：设施域（旧档无此键 → 全 Lv.1 缺省；脏档 clamp 到 [1, MAX]）
    facility: migrateFacility(payload.facility),
  };
}
