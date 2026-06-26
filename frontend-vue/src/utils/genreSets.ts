/**
 * 题材集册 Genre Sets（I4-T1）——纯派生、零存档、可单测。
 *
 * 每个干净题材标签 = 一个集册：显示该题材的拥有/总数完成度 + 纯派生段位称号 + 「还差 N 部」。
 * 复用 codex.completionFor 的「全量分母 + collection 计数判 owned」同构蓝图，只把切桶维度从
 * `byRarity` 换成 `byGenre`（桶 keys = 剔噪后的题材标签集，来自 contentIndex.tagToAnime）。
 *
 * **集册零存档护栏（成败分水岭）**：完成度与段位**全纯派生**——不发奖、不记已领、不持久化，
 * **绝不复用 codex 里程碑的「领取制」**（领取/记已领 = 进存档 = 升 schema，本轮禁止）。
 * 段位仿 tasteProfile.watchedMilestone（注释明写「纯展示不发奖不持久化」）。
 *
 * 桶维度必须用**剔噪后**的题材标签集（contentIndex.tagToAnime.keys()），不能用裸 synergy_tags
 * （含 TV/日本/漫画改噪声会冒「TV 集册」「日本集册」废桶）。
 *
 * 无随机、无 IO、无 Vue/Pinia/DOM 依赖——延续 contentIndex.ts / tasteProfile.ts 的纯函数风格。
 */
import type { AnimeCard } from '@/types/card';
import type { ContentIndex } from '@/utils/contentIndex';

/**
 * 集册段位静态阈值表（纯派生展示用，不发奖、不进存档）。
 * 阈值是「完成度百分比」（owned/total×100）——青铜 25% / 白银 50% / 黄金 75% / 大师 100%。
 * 0% 也有一个起步段位（未开荒），保证任何桶都有称号、不出现空段位。
 * 阈值写在这里 + 特征测试覆盖，避免 UI 层各算各的。
 */
export const GENRE_SET_TIERS = [
  { threshold: 0, emoji: '🗺️', title: '待开荒' },
  { threshold: 25, emoji: '🥉', title: '青铜收藏' },
  { threshold: 50, emoji: '🥈', title: '白银收藏' },
  { threshold: 75, emoji: '🥇', title: '黄金收藏' },
  { threshold: 100, emoji: '👑', title: '题材征服者' },
] as const;

export interface GenreSetTier {
  /** 当前段位 emoji。 */
  emoji: string;
  /** 当前段位标题。 */
  title: string;
  /** 完成度 100% → true（纯派生角标「已征服」）。 */
  conquered: boolean;
}

/**
 * 由完成度百分比纯派生段位（不发奖、不持久化）。
 * 取「不超过 pct 的最高阈值」段位（pct 已落 0–100）。
 */
export function genreSetTier(pct: number): GenreSetTier {
  const p = Math.max(0, Math.min(100, pct));
  let idx = 0;
  for (let i = GENRE_SET_TIERS.length - 1; i >= 0; i--) {
    if (p >= GENRE_SET_TIERS[i].threshold) { idx = i; break; }
  }
  const cur = GENRE_SET_TIERS[idx];
  return { emoji: cur.emoji, title: cur.title, conquered: p >= 100 };
}

/** 单个题材集册（纯派生快照）。 */
export interface GenreSet {
  /** 题材标签（桶 key，剔噪后）。 */
  tag: string;
  /** 该题材已拥有番数。 */
  owned: number;
  /** 该题材总番数（桶规模，分母）。 */
  total: number;
  /** 完成度百分比 0–100（owned/total，四舍五入）。 */
  pct: number;
  /** 还差 N 部集满（total − owned，已满则 0）。 */
  remaining: number;
  /** 纯派生段位（不发奖、不持久化）。 */
  tier: GenreSetTier;
}

/** buildGenreSets 的可调参数。 */
export interface GenreSetsOptions {
  /**
   * 桶最小规模——桶内番数 < minBucketSize 不出集册（剔噪后约 35 个题材，≥20 得 15 集册 /
   * ≥10 得 22 集册）。温和小集，无需复杂稀疏长尾过滤。
   */
  minBucketSize: number;
  /**
   * persona 专精轴顺序（玩家最强题材在前）——来自 buildTasteReport().topTags 的 tag 列表。
   * 命中此列表的集册按列表顺序顶到前面（「我在意的自设目标」），其余按桶规模降序。
   */
  personaOrder: readonly string[];
}

/** buildGenreSets 的默认参数（无 persona 输入时退化为按桶规模降序）。 */
export const GENRE_SETS_DEFAULTS: GenreSetsOptions = {
  minBucketSize: 10,
  personaOrder: [],
};

/**
 * 由「全量番剧库的剔噪题材索引」+「owned 判定」纯派生题材集册列表（I4-T1）。
 *
 *  - 桶 keys = index.tagToAnime.keys()（**剔噪后**的题材标签集，非裸 synergy_tags）。
 *  - 每桶 owned = 桶内 getCount(id)>0 的番数；total = 桶规模。
 *  - 过滤 total < minBucketSize 的小桶（温和小集，无需复杂稀疏过滤）。
 *  - 排序：persona 专精题材在前（按 personaOrder 顺序），其余按桶规模降序、完成度降序、tag 名兜底。
 *
 * **纯派生零存档**：只读 index + getCount，不写任何状态、不发奖、不记已领。
 * 性能：在已记忆化的 contentIndex 之上单遍聚合 O(库+桶)，调用方在 store/组件 computed 记忆化，
 * 别每个集册卡片各自全扫全库。
 */
export function buildGenreSets(
  index: ContentIndex,
  getCount: (id: number) => number,
  opts: Partial<GenreSetsOptions> = {},
): GenreSet[] {
  const { minBucketSize, personaOrder } = { ...GENRE_SETS_DEFAULTS, ...opts };

  const sets: GenreSet[] = [];
  for (const [tag, bucket] of index.tagToAnime) {
    const total = bucket.length;
    if (total < minBucketSize) continue; // 小桶折叠不展示（温和小集）
    let owned = 0;
    for (const a of bucket) {
      if (getCount(a.id) > 0) owned++;
    }
    const pct = total > 0 ? Math.round((owned / total) * 100) : 0;
    sets.push({
      tag,
      owned,
      total,
      pct,
      remaining: Math.max(0, total - owned),
      tier: genreSetTier(pct),
    });
  }

  // persona 专精排序：玩家最强题材在前（research 明确这是「自设目标 vs 待办地狱」的分水岭）。
  const rank = new Map<string, number>();
  personaOrder.forEach((t, i) => { if (!rank.has(t)) rank.set(t, i); });
  const INF = Number.MAX_SAFE_INTEGER;

  sets.sort((a, b) => {
    const ra = rank.has(a.tag) ? rank.get(a.tag)! : INF;
    const rb = rank.has(b.tag) ? rank.get(b.tag)! : INF;
    if (ra !== rb) return ra - rb;              // persona 专精轴优先
    if (b.total !== a.total) return b.total - a.total; // 其次桶规模降序（大桶=长线主菜）
    if (b.pct !== a.pct) return b.pct - a.pct;         // 再次完成度降序（接近满的勾引在前）
    return a.tag.localeCompare(b.tag, 'zh-Hans-CN');
  });

  return sets;
}

/** 某题材集册的「还差 N 部」缺口番（未拥有 ∧ 未看，供「就地一步收下」）。 */
export interface GenreGapAnime {
  anime: AnimeCard;
}

/**
 * 取某题材桶内的「缺口番」——未拥有且未看的番（I4-T2 集册缺口一步收下用）。
 * 纯派生差集：bucket.filter(未拥有 ∧ 未看)。按稀有度/评分无关，调用方决定截断条数。
 *
 *  - `getCount`：拥有判定（>0 = 已拥有）。
 *  - `watchedIds`：已看并集（与全站统一口径一致，由调用方传 useWatchedAnime 的并集）。
 */
export function genreGapAnime(
  index: ContentIndex,
  tag: string,
  getCount: (id: number) => number,
  watchedIds: ReadonlySet<number>,
  limit = 12,
): AnimeCard[] {
  const bucket = index.tagToAnime.get(tag);
  if (!bucket) return [];
  const gap: AnimeCard[] = [];
  for (const a of bucket) {
    if (getCount(a.id) > 0) continue;     // 已拥有
    if (watchedIds.has(a.id)) continue;   // 已看
    gap.push(a);
    if (gap.length >= limit) break;
  }
  return gap;
}
