/**
 * 家园「回访新鲜 + 收藏陈列」的纯派生逻辑（S16-T9/T10/T11）。
 *
 * 全部 **纯函数 / date-seeded 派生 / 零存档**（本轮维持零升档纪律）：
 *  - `todayKey()`：与 daily.ts / nurture.ts 内联同款 `YYYY-M-D` 本地日期键（各处内联已是项目既有范式，
 *    见 Scout C-6；此处收敛成一个可测纯函数供 view 复用，不改 daily.ts 导出面）。
 *  - `pickTodaySpecialId()`：`todayKey + 入住名单 → mulberry32 → 取一个入住 id`。同一天恒定、
 *    次日自动换人、改入住名单当天也可能换。**零字段进存档**（S16-T10 核心）。
 *  - `pickShowcaseRarity()` / `showcaseIsEmpty()`：收藏陈列的「已拥有最高稀有度」降级选择（S16-T9 空态命门）——
 *    0 UR 玩家绝不看空墙，降级到确实拥有的最高稀有度；一张都没有则走引导态。
 *  - `currentSeason()`：`month → 季节`（S16-T11 可选季节浮层）。
 *
 * 这些都是 view 层的派生逻辑（无 Vue/Pinia/DOM 依赖），抽成纯函数只为可测 + 单一真相源。
 * `mulberry32` 是 engine 纯函数（view/config 调它是正常向下依赖，engine 铁律只禁 engine 内部 Math.random）。
 */
import { mulberry32 } from '@/engine/rng';
import type { Rarity } from '@/types/card';

/**
 * 本地日期键（`YYYY-M-D`），与 `daily.ts:27` / `nurture.ts` 内联同款格式——跨天判定一致。
 * date-seed 的「今日」以此为准；同一自然日恒定，跨天即变。
 */
export function todayKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/** 字符串折叠成 uint32 seed（简单确定性哈希；同串同 seed）。 */
function foldSeed(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/**
 * ★ S16-T10 今日特殊角色：由 `dayKey + 入住名单` date-seeded 派生选一个入住角色 id。
 *  - 同一天 + 同入住名单 → **恒定**（同 seed 同结果）。
 *  - 跨天（dayKey 变）→ **自动换人**。
 *  - 改入住名单 → 当天也可能换（可接受）。
 *  - 空入住名单 → `null`（0 入住不硬造今日特殊，空态优雅）。
 * **零存储**：不记「今天选了谁」，每次由输入确定性重算。
 */
export function pickTodaySpecialId(placedIds: readonly number[], dayKey: string): number | null {
  if (placedIds.length === 0) return null;
  // 入住名单纳入 seed，且从**排序后的稳定副本**里取——结果只取决于「哪天 + 哪些人入住」，
  // 与入住顺序无关（改名单成员当天可能换人，仅调整顺序不换人）。
  const sorted = [...placedIds].sort((a, b) => a - b);
  const seed = foldSeed(`${dayKey}|${sorted.join(',')}`);
  const r = mulberry32(seed)();
  const idx = Math.min(sorted.length - 1, Math.floor(r * sorted.length));
  return sorted[idx];
}

/** 稀有度从高到低（收藏陈列降级墙按此次序找「已拥有的最高稀有度」）。 */
export const SHOWCASE_RARITY_ORDER: readonly Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

/**
 * ★ S16-T9 空态命门：收藏陈列展示哪一档稀有度的头像墙。
 * 优先 UR；0 UR 时**降级**到玩家确实拥有的最高稀有度（读同一 byRarity 次高档，绝不空墙）。
 * 一张卡都没拥有 → `null`（调用方走引导态「抽到第一张会陈列在这里」）。
 *
 * @param ownedByRarity 各稀有度已拥有数（来自 codex.characterCompletion.byRarity 的 owned）
 */
export function pickShowcaseRarity(
  ownedByRarity: Partial<Record<Rarity, number>>,
): Rarity | null {
  for (const r of SHOWCASE_RARITY_ORDER) {
    if ((ownedByRarity[r] ?? 0) > 0) return r;
  }
  return null;
}

/** 收藏陈列是否为空态（玩家一张卡都没拥有 → 走引导态，不显头像墙）。 */
export function showcaseIsEmpty(ownedByRarity: Partial<Record<Rarity, number>>): boolean {
  return pickShowcaseRarity(ownedByRarity) === null;
}

/** 季节（S16-T11）：由真实月份派生。北半球四季，纯展示。 */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonTheme {
  season: Season;
  /** 氛围浮层飘落的 emoji 粒子（纯 CSS 动画驱动，零素材）。 */
  particles: readonly string[];
  /** 无障碍/tooltip 用的季节名。 */
  label: string;
}

const SEASON_THEMES: Record<Season, SeasonTheme> = {
  spring: { season: 'spring', particles: ['🌸', '🌸', '🌼'], label: '春' },
  summer: { season: 'summer', particles: ['🌻', '☀️', '🌿'], label: '夏' },
  autumn: { season: 'autumn', particles: ['🍂', '🍁', '🍂'], label: '秋' },
  winter: { season: 'winter', particles: ['❄️', '❄️', '🌨️'], label: '冬' },
};

/** month（0-11）→ 季节。3-5 春 / 6-8 夏 / 9-11 秋 / 12-2 冬（北半球）。 */
export function seasonForMonth(month: number): Season {
  const m = ((Math.floor(month) % 12) + 12) % 12; // 容错任意整数
  if (m >= 2 && m <= 4) return 'spring'; // 3-5 月
  if (m >= 5 && m <= 7) return 'summer'; // 6-8 月
  if (m >= 8 && m <= 10) return 'autumn'; // 9-11 月
  return 'winter'; // 12-2 月
}

/** 当前季节主题（由真实日期派生，零存档零素材）。 */
export function currentSeason(now: Date = new Date()): SeasonTheme {
  return SEASON_THEMES[seasonForMonth(now.getMonth())];
}
