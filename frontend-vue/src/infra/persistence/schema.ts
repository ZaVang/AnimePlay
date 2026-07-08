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
 * v10（evolution-8）：minigames 域加 dailyChallenge（每日挑战，固定种子全员同题，每日一次）。
 * v11（evolution-9）：dailyChallenge 加 streakDays/bestStreakDays（连续挑战天数，断签归 1）。
 * v12（evolution-10）：minigames 域加 tasteProfile（番剧品味画像——用户勾选「看过」的番剧 id 集，持久化）。
 * v13（S13-B）：新增 homestead 域——家园挂机（placedCharacterIds 入住角色 + lastSettleAt 离线结算基线时间戳）。
 *   挂机产出的成长（经验/好感）写进既有 characterNurtureData，故 homestead 域本身极小。
 * v14（S13-C1）：养成精简——characterNurtureData 瘦身为两轴（affection + 等级/加点；删训练/属性/强化/对话/礼物等字段，
 *   迁移丢弃旧字段、补 statPoints 缺省）+ 新增**空** equipment 域占位（inventory + equipped per character，C2 接配装）。
 * v15（S14-A SA-T5）：TowerProgress 新增扫荡周额度两字段——sweepWeekKey（weekKey，跨周读时归零）+ sweepUsedThisWeek（本周已用次数）。
 *   扁平定长（非 Record<floor,count>，随层数不膨胀，仿 DailyChallengeSave 紧凑范式）。旧档迁移补缺省（''/0）。
 * v16（S14-C SC-T3/SC-T4）：characterNurtureData 加第三/回归轴两字段——breakthrough（星级/突破次数 0..MAX_BREAKTHROUGH，消化重复角色卡换永久小加成）
 *   + lastBondInteractionDate（每日好感互动日期键，跨天读时可再互动）。存计数不存派生（永久加成由 engine 现算）。
 *   旧档迁移每条角色补缺省（breakthrough:0 clamp、lastBondInteractionDate:''），nurture 域全量 Map 序列化天然覆盖新字段。
 * v17（S14-D SD-T1/SD-T5）：新增 facility 域——三设施等级（exp 训练区 / bond 休息区 / knowledge 资料室）。
 *   设施用 KP 可升级（profile.spend），每级 +8% 对应产出乘区、封顶随总级数抬升、成本指数递增无硬上限
 *   （= 无底 KP sink 主体）。独立于 homestead 域（单一职责）。旧档迁移全设施补 Lv.1（+0%），杜绝挂机归零回归。
 * v18（S14-E SE-T1）：EquipmentItemSave 加 enhance（强化等级 0..MAX_ENHANCE，缺省 0）——装备毕业曲线从「拿到即满」
 *   拉长为「拿到 → KP+燃料强化到满」。每级按比例抬升该实例五维加成（config/equipment.ts enhancedBonus，
 *   经既有 resolveEquipBonus 单一 seam 进战力）。旧档实例补 enhance:0、clamp [0,MAX_ENHANCE]（脏档防放大）。
 * v19（S14-F SF-T8）：daily 扩字段——commissionDate/commissionProgress/commissionClaimed（家园日常委托，
 *   与 daily task 平行的 commission 子域，复用 todayKey 跨天读时归零）。commissionClaimed 兼存全清 bonus 特殊 key
 *   （COMMISSION_BONUS_KEY，不单开第 4 字段）。旧档迁移补缺省（''/{}/[]）。
 * v20（S15-T2）：新增 furniture 域——轻量家具 / 布局（家具 id 的「已拥有 ownedIds + 已摆放 placedIds」清单）。
 *   摆放家具各贡献小额 comfort，合计并入既有 comfort 软加成轴（经 computeIdleYield 的 effect.comfort，无新口径）。
 *   目录/comfort/cost/归一权威在 config/homestead.ts（FURNITURE_CATALOG / canonicalizeFurnitureIds）。
 *   独立于 homestead/facility 域（单一职责）。旧档无此键 → 补空家具（ownedIds:[]、placedIds:[]），不影响既有挂机。
 *   本 Sprint 唯一存档变更（v19→v20 一次性 bump）。
 *   v20（S15-T4，复用同一 bump，绝不升 v21）：TowerProgress 加 slotPity（槽位定向掉落保底计数，定长 3 键 weapon/armor/supporter）。
 *   连续 N 次通新层掉落判定未出某槽 → 强制命中该槽（稀有度仍走层段）。旧档无此字段 → 补全零 + clamp [0, 阈值]（脏档防放大获取）。
 * v21（S16 偶遇图鉴）：HomesteadSave 加 seenEncounterKeys（看过的同作品偶遇对键 "min-max"，纯展示收集数据）。
 *   去重优先未见 + 图鉴显形；不接任何数值奖励（名字≠行为红线）。旧档无此键 → 补空 []。归一/上限权威在
 *   config/homestead.ts（canonicalizeSeenEncounterKeys / SEEN_ENCOUNTER_MAX），杜绝脏档畸形键/无限膨胀。S16 唯一 bump。
 */
import type { PityState } from '@/engine/gacha/draw';
import { defaultFacilityLevels } from '@/config/homestead';
import { SQUAD_MEMBER_COUNT } from '@/engine/squad/eligibility';
import type { CharacterNurtureData } from '@/types/nurture';
import type {
  Deck,
  ViewingQueueSlot,
  ViewingStats,
  GachaHistoryItem,
  PresetSquad,
  TowerProgress,
} from '@/types/player';

export const SAVE_VERSION = 21 as const;

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
  /** ★ v19：家园日常委托集所属日期（todayKey：YYYY-M-D，跨天读时归零，与 daily task 独立日期桶）。 */
  commissionDate: string;
  /** ★ v19：commissionId → 进度计数（家园委托，与 daily progress 平行）。 */
  commissionProgress: Record<string, number>;
  /** ★ v19：当日已领取的 commissionId（兼存全清 bonus 特殊 key COMMISSION_BONUS_KEY）。 */
  commissionClaimed: string[];
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

/** 每日挑战战绩（v10；v11 加连续天数 streak）：固定种子全员同题，每日一次。 */
export interface DailyChallengeSave {
  /** 最近完成的日期（todayKey）；== 今日则当日已完成、不再发奖。 */
  lastDate: string;
  /** 最近一次完成的得分（答对题数）。 */
  lastScore: number;
  /** 历史最高得分。 */
  bestScore: number;
  /** v11：连续完成天数（昨日完成过则 +1，断签归 1）。 */
  streakDays: number;
  /** v11：历史最长连续天数。 */
  bestStreakDays: number;
}

/** 番剧品味画像（v12）：用户勾选「看过」的番剧 id 集（无战绩，纯收藏式状态）。 */
export interface TasteProfileSave {
  /** 已勾选「看过」的番剧 id。 */
  watchedAnimeIds: number[];
}

/**
 * 小游戏域。各游戏战绩 + 每日发奖封顶（跨游戏共享，防刷）。
 * awardDate（todayKey：YYYY-M-D）跨天读时归零 awardedToday，仿 daily 的 ensureToday 模式。
 * v8：higherLower（高低牌）。v9：quiz（番剧问答）。v10：dailyChallenge（每日挑战）。v12：tasteProfile（品味画像）。
 */
export interface MiniGamesSave {
  higherLower: MiniGameRecord;
  /** v9 新增：番剧问答 Quiz 战绩。 */
  quiz: MiniGameRecord;
  /** v10 新增：每日挑战战绩（每日一次，固定种子）。 */
  dailyChallenge: DailyChallengeSave;
  /** v12 新增：番剧品味画像（已看番剧 id 集）。 */
  tasteProfile: TasteProfileSave;
  /** 当日已发奖知识点所属日期（todayKey）。 */
  awardDate: string;
  /** 当日已发放的知识点累计（达每日封顶后不再发奖，只更新战绩）。 */
  awardedToday: number;
}

/** 外观装扮（v4）。皮肤 id 对应 config/skins.ts 注册表；未知 id 由应用层回落默认。 */
export interface AppearanceSave {
  skinId: string;
}

/**
 * 家园挂机域（v13 / S13-B）。本域只存"谁入住 + 上次结算到什么时候"；
 * 角色的实际成长（经验/好感）由结算逻辑写进既有 characterNurtureData，不在这里重复。
 */
export interface HomesteadSave {
  /** 入住家园（挂机产出）的角色 id；上限见 config/homestead.ts HOMESTEAD_SLOTS。 */
  placedCharacterIds: number[];
  /** 上次离线结算的墙钟时间戳(ms)；0 = 尚未建立基线（首次进家园即以"现在"为准，不补发历史）。 */
  lastSettleAt: number;
  /**
   * ★ v21 偶遇图鉴：看过的同作品偶遇对键（"min-max"，config/homestead.ts encounterPairKey 生成）。
   * 纯展示收集数据——去重优先未见 + 图鉴显形；**不接任何数值奖励**（名字≠行为红线）。
   * 归一/上限见 canonicalizeSeenEncounterKeys / SEEN_ENCOUNTER_MAX。旧档无此键 → []。
   */
  seenEncounterKeys: string[];
}

/**
 * 装备域（v14 / S13-C1 占位，C2 接配装）。本阶段恒为空：
 *  - inventory：背包里的装备实例（uid 用 crypto.randomUUID()，defId 指向 config/equipment.ts 目录）。
 *  - equipped：每个角色 id → 3 槽（weapon/armor/supporter）各放一个 inventory uid 或 null。
 * C1 不产出/不消费装备，只保证存档三处同改 + 往返保真，C2 直接长出内容。
 */
export interface EquipmentItemSave {
  uid: string;
  defId: string;
  /**
   * ★ v18（SE-T1）：强化等级（0..MAX_ENHANCE）。缺省 0 = 未强化（数值恒等 def 静态值）。
   * 每级按 config/equipment.ts enhancedBonus 比例抬升该实例五维加成，经 resolveEquipBonus 单一 seam 进战力。
   */
  enhance: number;
}

export interface EquippedSlots {
  weapon: string | null;
  armor: string | null;
  supporter: string | null;
}

export interface EquipmentSave {
  inventory: EquipmentItemSave[];
  /** charId → 三槽装备（值为 inventory uid 或 null）。 */
  equipped: Record<number, EquippedSlots>;
}

/** v14：装备域默认空态（新档/旧档迁移补默认）。 */
export function createDefaultEquipment(): EquipmentSave {
  return {
    inventory: [],
    equipped: {},
  };
}

/**
 * 设施域（v17 / S14-D SD-T1/SD-T5）。三设施各一等级（KP 可升级，每级抬升对应产出乘区）。
 * 独立于 homestead 域（HomesteadSave 只管入住，单一职责）。初始/旧档缺省全 Lv.1（+0% 乘区）。
 * 设施 key / 等级边界 / 默认值权威在 config/homestead.ts（FacilityKey / defaultFacilityLevels）。
 */
export interface FacilitySave {
  /** 训练区等级（↑经验产出）。 */
  exp: number;
  /** 休息区等级（↑好感产出）。 */
  bond: number;
  /** 资料室等级（↑知识点产出）。 */
  knowledge: number;
}

/** v17：设施域默认态（全 Lv.1 = +0% 乘区；新档/旧档迁移补默认，决策-3）。 */
export function createDefaultFacility(): FacilitySave {
  return defaultFacilityLevels();
}

/**
 * 家具域（v20 / S15-T2）。两份家具 id 清单：
 *  - ownedIds：已拥有（KP 买断入库）的家具 defId（指向 config/homestead.ts FURNITURE_CATALOG）。
 *  - placedIds：当前摆放中的家具 defId（须是 ownedIds 的子集；摆放的家具各贡献 comfort，合计并入 effect.comfort）。
 * 家具目录/comfort/cost/归一权威在 config/homestead.ts。独立于 homestead/facility 域（单一职责）。
 * 初始/旧档缺省全空（ownedIds:[]、placedIds:[]），杜绝对既有挂机产生任何回归。
 */
export interface FurnitureSave {
  /** 已拥有的家具 defId。 */
  ownedIds: string[];
  /** 当前摆放中的家具 defId（子集于 ownedIds；只有摆放的给 comfort）。 */
  placedIds: string[];
}

/**
 * v20：家具域默认空态（新档/旧档迁移补默认）。
 * ★ C-4：直接内联空态，不从 config import——避免 schema→config→engine 循环依赖环
 * （空态无须目录信息；FURNITURE_CATALOG 只供 store/UI/迁移归一用，schema 默认工厂不依赖它）。
 */
export function createDefaultFurniture(): FurnitureSave {
  return {
    ownedIds: [],
    placedIds: [],
  };
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
  /** v13 新增：家园挂机域（入住角色 + 离线结算基线）。 */
  homestead: HomesteadSave;
  /** v14 新增：装备域（C1 空占位，C2 接配装）。 */
  equipment: EquipmentSave;
  /** v17 新增：设施域（三设施等级，KP 可升级产出乘区 + 无底 sink）。 */
  facility: FacilitySave;
  /** v20 新增：家具域（已拥有/已摆放家具 id；摆放的贡献 comfort，经既有软加成轴汇入）。 */
  furniture: FurnitureSave;
}

/** 兼容别名（S5 时代命名）。 */
export type SavePayloadV2 = SavePayload;

export function createDefaultPresetSquads(): PresetSquad[] {
  const emptyMembers = () => Array.from({ length: SQUAD_MEMBER_COUNT }, () => null);
  return [
    { id: 1, name: '小队 A', members: emptyMembers() },
    { id: 2, name: '小队 B', members: emptyMembers() },
    { id: 3, name: '小队 C', members: emptyMembers() },
  ];
}

/**
 * 规整一支预设小队的 5 槽成员：恰 5 槽、按位去重（同 id 仅首次保留、其余置 null）、非有限数字置 null。
 * 把配队 UI 的「同队不重复 + 5 槽」不变式收口到载入边界，杜绝脏档把单角色克隆满全队放大战力
 * （与 canonicalizePlacedIds / sanitizeEquipped 同型）。已拥有校验留给战斗入口作纵深。
 */
export function canonicalizeSquadMembers(raw: unknown): (number | null)[] {
  const out: (number | null)[] = Array.from({ length: SQUAD_MEMBER_COUNT }, () => null);
  if (!Array.isArray(raw)) return out;
  const seen = new Set<number>();
  for (let i = 0; i < SQUAD_MEMBER_COUNT; i++) {
    const v = raw[i];
    if (typeof v === 'number' && Number.isFinite(v) && !seen.has(v)) {
      seen.add(v);
      out[i] = v;
    }
  }
  return out;
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
    // v19：家园日常委托子域缺省
    commissionDate: '',
    commissionProgress: {},
    commissionClaimed: [],
  };
}

/** v8/v9：小游戏域默认空态（新档/旧档迁移补默认）。 */
export function createDefaultMiniGames(): MiniGamesSave {
  return {
    higherLower: { highScore: 0, bestStreak: 0, playCount: 0 },
    quiz: { highScore: 0, bestStreak: 0, playCount: 0 },
    dailyChallenge: { lastDate: '', lastScore: 0, bestScore: 0, streakDays: 0, bestStreakDays: 0 },
    tasteProfile: { watchedAnimeIds: [] },
    awardDate: '',
    awardedToday: 0,
  };
}

/** v13：家园挂机域默认空态（新档/旧档迁移补默认）。v21 起含空偶遇图鉴。 */
export function createDefaultHomestead(): HomesteadSave {
  return {
    placedCharacterIds: [],
    lastSettleAt: 0,
    seenEncounterKeys: [],
  };
}

export function createDefaultTowerProgress(): TowerProgress {
  return {
    currentFloor: 1,
    maxFloor: 1,
    floorRewards: {},
    todayAttempts: 0,
    lastAttemptDate: '',
    // v15：扫荡周额度（新档/旧档迁移补缺省）
    sweepWeekKey: '',
    sweepUsedThisWeek: 0,
    // v20（S15-T4）：槽位保底计数（新档全零；内联缺省，避免 schema → engine 依赖环）
    slotPity: { weapon: 0, armor: 0, supporter: 0 },
  };
}
