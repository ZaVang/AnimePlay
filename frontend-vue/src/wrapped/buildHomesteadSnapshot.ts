/**
 * 家园快照聚合（S16-T13「基地身份卡」晒图）—— 纯函数，零 Vue/Pinia/DOM 依赖。
 *
 * 输入是从各 store 读出的家园快照（plain object），输出是可直接喂 Canvas 的「基地身份卡」视图模型。
 * 抽成纯函数是为了可单测（特征测试覆盖满配 / 0 入住 / 0 收藏三态 + 正着念计数 + 空态优雅）；
 * `HomesteadShareCard.vue` 负责把 live store 喂进来并手绘 Canvas。
 *
 * 设计红线（与 plan.md S16-T13 / pitfalls 一致）：
 *  - **晒身份不晒缺口**（反 completionist）：只正着念「陈列 X/7」「入住 N」「拥有 UR 12/48」，
 *    绝不产出「还差 Y」「UR 0/N」「完成度 13%」这类缺口 / 焦虑指标。
 *  - **空态优雅**：0 入住 / 0 收藏 / 空基地不崩、不出 NaN / undefined，`isEmpty=true` 时调用方
 *    用愿景文案软化（「我的家园刚起步 · 快来一起玩」），不显缺口条 / 不晒羞辱空卡。
 *  - **只读派生零副作用**：不触发存档、不写状态、零 claim/earn/spend。
 */
import type { Rarity } from '@/types/card';

/** 一条命中的入住羁绊（来自 hourlyYield.bondHits，只取展示需要的字段）。 */
export interface HomesteadBondHitInput {
  /** 命中作品名（社交货币：带出真实追番信息）。 */
  anime: string;
  /** 同住该作品的人数（≥2）。 */
  members: number;
}

/** 聚合输入：从家园相关 store 读出的原始快照（plain object，零 Vue/Pinia）。 */
export interface HomesteadSnapshotInput {
  /** 玩家名（profile.currentUser）——卡片主标题「XX 的家园」的归属核心。 */
  username: string;
  /** 玩家等级。 */
  level: number;
  /** 入住角色名（真实番剧角色名，social currency）；顺序 = 入住名单顺序。 */
  placedCharacterNames: string[];
  /** 已摆放家具数（furnitureStore 已摆放数）。 */
  furniturePlacedCount: number;
  /** 家具目录总数（FURNITURE_CATALOG.length）。 */
  furnitureTotal: number;
  /**
   * 陈列展示的稀有度 + 已拥有 / 总数（来自 codex.characterCompletion 的降级选择，
   * 0 收藏 → null，卡面不晒空墙）。owned 正着念，绝不念缺口。
   */
  showcaseRarity: { rarity: Rarity; owned: number; total: number } | null;
  /** 命中的入住羁绊（作品名 × 人数）；空 = 无羁绊，卡面不显该行。 */
  bondHits: HomesteadBondHitInput[];
  /** 今日特殊角色名（date-seeded；0 入住 → null）——传播钩子（每天生成的图不同）。 */
  todaySpecialName: string | null;
  /** 基地舒适度（homeEffect.comfort）。 */
  comfort: number;
}

/** 「基地身份卡」视图模型：Canvas 手绘直接读这里（全部正向、无缺口指标）。 */
export interface HomesteadSnapshot {
  /** 卡片主标题「XX 的家园」（username 缺省时软兜底为「我」的家园）。 */
  title: string;
  /** 玩家名（原样，供副标题）。 */
  username: string;
  level: number;
  /** 入住角色名（已去空、已裁上限，供脸位 / 名字带）。 */
  residentNames: string[];
  /** 入住人数（正着念）。 */
  residentCount: number;
  /** 陈列「X/7」的当前数（正着念，不念差多少）。 */
  furniturePlaced: number;
  /** 家具目录总数（分母，正向计数「陈列 X/7」用，非缺口）。 */
  furnitureTotal: number;
  /**
   * 收藏陈列展示：稀有度 + 已拥有 / 总数（正着念「拥有 UR 12/48」）。
   * 0 收藏 → null（卡面不晒「UR 0/N」缺口条）。
   */
  showcase: { rarity: Rarity; owned: number; total: number } | null;
  /** 命中的羁绊作品名（去重、裁上限，供卡面「《XX》羁绊」带）。 */
  bondAnimes: string[];
  /** 命中羁绊条数（正着念）。 */
  bondCount: number;
  /** 今日特殊角色名（null = 不显该行）。 */
  todaySpecialName: string | null;
  comfort: number;
  /**
   * 空态标志：0 入住 且 0 收藏 且 0 家具 且 0 羁绊 → true。
   * 调用方据此切到愿景文案软化（不晒羞辱空卡），不显任何缺口条。
   */
  isEmpty: boolean;
}

/** 卡面脸位 / 名字带最多展示的入住角色数（满配优雅承载：多了用聚合数字，不逐条铺开）。 */
export const SNAPSHOT_MAX_RESIDENTS = 6;
/** 卡面最多展示的羁绊作品名数（满配收束）。 */
export const SNAPSHOT_MAX_BOND_ANIMES = 4;

/** 安全整数：非有限 / 负数兜底为 0（防 NaN / undefined 溢进 Canvas）。 */
function safeCount(n: number | undefined | null): number {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** 去空白 + 去空串的名字清洗（防 undefined / 空名混进卡面）。 */
function cleanNames(names: readonly (string | undefined | null)[] | undefined | null): string[] {
  if (!Array.isArray(names)) return [];
  return names.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map(s => s.trim());
}

/**
 * 把家园 store 快照聚合成「基地身份卡」视图模型（纯函数）。
 * 对空 / 缺 / 脏输入全部安全兜底：不崩、不出 NaN / undefined、正着念计数、空态标志优雅。
 */
export function buildHomesteadSnapshot(input: HomesteadSnapshotInput): HomesteadSnapshot {
  const username = typeof input.username === 'string' && input.username.trim().length > 0
    ? input.username.trim()
    : '';
  const title = username ? `${username} 的家园` : '我的家园';

  const allResidents = cleanNames(input.placedCharacterNames);
  const residentCount = allResidents.length;
  const residentNames = allResidents.slice(0, SNAPSHOT_MAX_RESIDENTS);

  const furniturePlaced = safeCount(input.furniturePlacedCount);
  const furnitureTotal = Math.max(furniturePlaced, safeCount(input.furnitureTotal));

  // 收藏陈列：只在 owned>0 且 total>0 时保留（0 收藏 → null，卡面不晒空墙 / 不念「UR 0/N」）。
  const sc = input.showcaseRarity;
  const showcase =
    sc && safeCount(sc.owned) > 0 && safeCount(sc.total) > 0
      ? { rarity: sc.rarity, owned: safeCount(sc.owned), total: safeCount(sc.total) }
      : null;

  // 羁绊作品名去重 + 裁上限（社交货币；空 = 卡面不显该行）。
  const seen = new Set<string>();
  const bondAnimes: string[] = [];
  for (const hit of Array.isArray(input.bondHits) ? input.bondHits : []) {
    const anime = typeof hit?.anime === 'string' ? hit.anime.trim() : '';
    if (!anime || seen.has(anime)) continue;
    seen.add(anime);
    bondAnimes.push(anime);
    if (bondAnimes.length >= SNAPSHOT_MAX_BOND_ANIMES) break;
  }

  const todaySpecialName =
    typeof input.todaySpecialName === 'string' && input.todaySpecialName.trim().length > 0
      ? input.todaySpecialName.trim()
      : null;

  const isEmpty =
    residentCount === 0 && showcase === null && furniturePlaced === 0 && bondAnimes.length === 0;

  return {
    title,
    username,
    level: safeCount(input.level),
    residentNames,
    residentCount,
    furniturePlaced,
    furnitureTotal,
    showcase,
    bondAnimes,
    bondCount: bondAnimes.length,
    todaySpecialName,
    comfort: safeCount(input.comfort),
    isEmpty,
  };
}
