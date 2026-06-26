/**
 * 番剧品味画像（小游戏 #5）——纯分析函数。
 *
 * 输入：用户勾选「看过」的番剧子集 + 全量番剧库；输出一份可视化报告所需的派生数据
 * （题材偏好 / 年代分布 / 改编来源 / 稀有度构成 / 评分对比 / 小众指数 / 人格标签）。
 * 全部基于已有 Bangumi 元数据（synergy_tags / date / rating_score / rating_total），
 * 无随机、无 IO、无 Vue 依赖——可单测。
 */
import type { AnimeCard, Rarity } from '@/types/card';

/** synergy_tags 里的「格式/地区」噪声标签——对题材画像无意义，从题材统计中剔除。 */
const FORMAT_REGION_NOISE = new Set([
  '日本', '中国', '美国', '韩国', 'TV', 'WEB', 'OVA', '剧场版', '短片', 'PV', '其他', '动态漫画',
]);

/** 改编来源标签——单列「原作来源」统计，不混入题材。 */
const SOURCE_TAGS = ['漫画改', '小说改', '原创', '游戏改'] as const;
const SOURCE_TAG_SET = new Set<string>(SOURCE_TAGS);

const TOP_TAGS_LIMIT = 8;
const ERA_ORDER = ['2000年前', '2000年代', '2010年代', '2020年代'] as const;

/** 某番剧的「题材标签」：去重 + 剔除格式/地区噪声与来源标签。 */
function genreTagsOf(a: AnimeCard): string[] {
  return [...new Set(a.synergy_tags ?? [])].filter(t => !FORMAT_REGION_NOISE.has(t) && !SOURCE_TAG_SET.has(t));
}

export interface TagCount {
  tag: string;
  count: number;
  /** 含该标签的番剧占已看数的百分比（0-100，四舍五入）。一部番可含多标签，故各项之和可 >100。 */
  pct: number;
}
export interface EraBucket {
  label: string;
  count: number;
  pct: number;
}
export interface SourceCount {
  source: string;
  count: number;
  pct: number;
}
export interface RarityCount {
  rarity: Rarity;
  count: number;
}
export interface TastePersona {
  emoji: string;
  title: string;
  description: string;
}
export interface TasteReport {
  /** 已看番剧数。 */
  count: number;
  /** 占全库的比例（0-100，四舍五入）。 */
  coverage: number;
  /** 题材偏好 Top N（已剔除格式/地区/来源噪声）。 */
  topTags: TagCount[];
  /** 年代分布（仅含有数据的桶，按时间序）。 */
  eras: EraBucket[];
  /** 原作来源构成。 */
  sourceMix: SourceCount[];
  /** 稀有度构成（按 UR→N 序，仅含 count>0）。 */
  rarityMix: RarityCount[];
  /** 已看番平均分（无有效评分时 null）。 */
  avgRating: number | null;
  /** 全库平均分。 */
  globalAvgRating: number;
  /** 已看均分 − 全库均分（null 当 avgRating 为 null）。 */
  ratingDelta: number | null;
  /** 小众指数 0-100：越高说明你的口味越冷门（评价人数越少）。 */
  nicheScore: number;
  /** 代表作高亮。 */
  highlights: {
    highestRated: AnimeCard | null;
    oldest: AnimeCard | null;
    newest: AnimeCard | null;
    mostNiche: AnimeCard | null;
  };
  /** 一句话人格标签（由各信号确定性推导）。 */
  persona: TastePersona;
}

const RARITY_ORDER: Rarity[] = ['UR', 'HR', 'SSR', 'SR', 'R', 'N'];

function yearOf(a: AnimeCard): number | null {
  const d = a.date;
  if (typeof d !== 'string' || !/^\d{4}/.test(d)) return null;
  const y = parseInt(d.slice(0, 4), 10);
  return isFinite(y) ? y : null;
}

function eraLabel(year: number): string {
  if (year < 2000) return '2000年前';
  if (year < 2010) return '2000年代';
  if (year < 2020) return '2010年代';
  return '2020年代';
}

function ratingScoreOf(a: AnimeCard): number | null {
  const v = a.rating_score;
  return typeof v === 'number' && isFinite(v) ? v : null;
}

function ratingTotalOf(a: AnimeCard): number | null {
  const v = a.rating_total;
  return typeof v === 'number' && isFinite(v) ? v : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function pctOf(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

/** 选定人格标签：按显著信号优先级取第一个命中的。 */
function pickPersona(r: Omit<TasteReport, 'persona'>): TastePersona {
  if (r.count < 3) {
    return { emoji: '🌱', title: '画像萌芽中', description: '再多勾几部看过的番，画像会更准。' };
  }
  const top = r.topTags[0];
  const era2020 = r.eras.find(e => e.label === '2020年代');
  const eraOld = r.eras.filter(e => e.label === '2000年前' || e.label === '2000年代').reduce((s, e) => s + e.pct, 0);

  if (r.nicheScore >= 70) {
    return { emoji: '🔍', title: '小众考古学家', description: '你的雷达专挑冷门作品，大众榜单困不住你。' };
  }
  if (top && top.pct >= 40) {
    return { emoji: '🎯', title: `${top.tag}浓度爆表`, description: `近半数选择都带「${top.tag}」标签，旗帜鲜明的${top.tag}信徒。` };
  }
  if (r.ratingDelta !== null && r.ratingDelta >= 0.4) {
    return { emoji: '💎', title: '高分鉴赏家', description: '你的片单平均分明显高于大盘，眼光毒辣。' };
  }
  if (era2020 && era2020.pct >= 55) {
    return { emoji: '🌱', title: '新番追逐者', description: '你紧跟当季新番，旧番在你这儿存在感不强。' };
  }
  if (eraOld >= 40) {
    return { emoji: '📼', title: '时代眼泪收藏家', description: '你偏爱有年代感的作品，经典才是你的菜。' };
  }
  if (top && top.pct < 20) {
    return { emoji: '🍱', title: '杂食型阅片家', description: '什么题材你都来者不拒，口味极广。' };
  }
  return { emoji: '🎬', title: '均衡型观众', description: '你的口味分布均衡，是稳健的全面型观众。' };
}

/**
 * 由「已看番剧子集」+「全量番剧库」构建品味报告。
 * watched 为空时返回零值报告（count=0），由 UI 展示空态。
 */
export function buildTasteReport(watched: readonly AnimeCard[], allAnime: readonly AnimeCard[]): TasteReport {
  const count = watched.length;
  const globalScores = allAnime.map(ratingScoreOf).filter((v): v is number => v !== null);
  const globalAvgRating = globalScores.length > 0 ? round1(globalScores.reduce((s, v) => s + v, 0) / globalScores.length) : 0;

  // 全库评价人数升序，用于小众指数的百分位查询。
  const allTotalsSorted = allAnime.map(ratingTotalOf).filter((v): v is number => v !== null).sort((a, b) => a - b);

  const empty: Omit<TasteReport, 'persona'> = {
    count: 0,
    coverage: 0,
    topTags: [],
    eras: [],
    sourceMix: [],
    rarityMix: [],
    avgRating: null,
    globalAvgRating,
    ratingDelta: null,
    nicheScore: 0,
    highlights: { highestRated: null, oldest: null, newest: null, mostNiche: null },
  };
  if (count === 0) {
    return { ...empty, persona: pickPersona(empty) };
  }

  // 题材偏好（剔除噪声/来源标签）
  const tagCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  for (const a of watched) {
    // 按番去重——同一部番的重复标签只算一次。
    for (const t of new Set(a.synergy_tags ?? [])) {
      if (SOURCE_TAG_SET.has(t)) {
        sourceCounts.set(t, (sourceCounts.get(t) ?? 0) + 1);
      } else if (!FORMAT_REGION_NOISE.has(t)) {
        tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
      }
    }
  }
  const topTags: TagCount[] = [...tagCounts.entries()]
    .map(([tag, c]) => ({ tag, count: c, pct: pctOf(c, count) }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-Hans-CN'))
    .slice(0, TOP_TAGS_LIMIT);

  const sourceMix: SourceCount[] = SOURCE_TAGS
    .map(source => ({ source, count: sourceCounts.get(source) ?? 0, pct: pctOf(sourceCounts.get(source) ?? 0, count) }))
    .filter(s => s.count > 0)
    .sort((a, b) => b.count - a.count);

  // 年代分布
  const eraCounts = new Map<string, number>();
  for (const a of watched) {
    const y = yearOf(a);
    if (y !== null) eraCounts.set(eraLabel(y), (eraCounts.get(eraLabel(y)) ?? 0) + 1);
  }
  const eras: EraBucket[] = ERA_ORDER
    .filter(label => (eraCounts.get(label) ?? 0) > 0)
    .map(label => ({ label, count: eraCounts.get(label)!, pct: pctOf(eraCounts.get(label)!, count) }));

  // 稀有度构成
  const rarityCounts = new Map<Rarity, number>();
  for (const a of watched) rarityCounts.set(a.rarity, (rarityCounts.get(a.rarity) ?? 0) + 1);
  const rarityMix: RarityCount[] = RARITY_ORDER
    .filter(r => (rarityCounts.get(r) ?? 0) > 0)
    .map(r => ({ rarity: r, count: rarityCounts.get(r)! }));

  // 评分对比
  const watchedScores = watched.map(ratingScoreOf).filter((v): v is number => v !== null);
  const avgRating = watchedScores.length > 0 ? round1(watchedScores.reduce((s, v) => s + v, 0) / watchedScores.length) : null;
  const ratingDelta = avgRating !== null ? round1(avgRating - globalAvgRating) : null;

  // 小众指数：每部已看番在全库「评价人数」分布里的百分位，平均后取补。
  let nicheScore = 0;
  if (allTotalsSorted.length > 0) {
    let pctSum = 0;
    let n = 0;
    for (const a of watched) {
      const v = ratingTotalOf(a);
      if (v === null) continue;
      // 有多少部 <= v（含自身）→ 人气百分位
      let lo = 0, hi = allTotalsSorted.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (allTotalsSorted[mid] <= v) lo = mid + 1; else hi = mid;
      }
      pctSum += lo / allTotalsSorted.length;
      n++;
    }
    if (n > 0) nicheScore = Math.round((1 - pctSum / n) * 100);
  }

  // 高亮代表作
  let highestRated: AnimeCard | null = null;
  let oldest: AnimeCard | null = null;
  let newest: AnimeCard | null = null;
  let mostNiche: AnimeCard | null = null;
  for (const a of watched) {
    const score = ratingScoreOf(a);
    if (score !== null && (highestRated === null || score > (ratingScoreOf(highestRated) ?? -Infinity))) highestRated = a;
    const y = yearOf(a);
    if (y !== null) {
      if (oldest === null || y < (yearOf(oldest) ?? Infinity)) oldest = a;
      if (newest === null || y > (yearOf(newest) ?? -Infinity)) newest = a;
    }
    const tot = ratingTotalOf(a);
    if (tot !== null && (mostNiche === null || tot < (ratingTotalOf(mostNiche) ?? Infinity))) mostNiche = a;
  }

  const base: Omit<TasteReport, 'persona'> = {
    count,
    coverage: pctOf(count, allAnime.length),
    topTags,
    eras,
    sourceMix,
    rarityMix,
    avgRating,
    globalAvgRating,
    ratingDelta,
    nicheScore,
    highlights: { highestRated, oldest, newest, mostNiche },
  };
  return { ...base, persona: pickPersona(base) };
}

/** 「看过」段位静态阈值表（纯派生展示用，不发奖、不进存档）。按 count 升序。 */
export const WATCHED_TIERS = [
  { threshold: 0, emoji: '🌱', title: '观影萌新' },
  { threshold: 10, emoji: '📺', title: '入坑观众' },
  { threshold: 30, emoji: '🎬', title: '资深影迷' },
  { threshold: 60, emoji: '🍿', title: '阅片无数' },
  { threshold: 120, emoji: '🏆', title: '番剧大师' },
] as const;

export interface WatchedMilestone {
  /** 已看番剧数。 */
  count: number;
  /** 当前段位的 emoji。 */
  emoji: string;
  /** 当前段位标题。 */
  title: string;
  /** 下一段位阈值（已到顶则 null）。 */
  nextThreshold: number | null;
  /** 距下一段位还差几部（已到顶则 0）。 */
  toNext: number;
  /** 当前段位区间内的进度百分比 0-100（已到顶则 100）。 */
  progressPct: number;
}

/**
 * 由「看过」数量纯派生当前段位 + 距下一段位进度。
 * 纯展示——不发奖、不持久化（与 codex 里程碑的「领取制」区分开）。
 */
export function watchedMilestone(count: number): WatchedMilestone {
  const n = Math.max(0, Math.floor(count));
  let idx = 0;
  for (let i = WATCHED_TIERS.length - 1; i >= 0; i--) {
    if (n >= WATCHED_TIERS[i].threshold) { idx = i; break; }
  }
  const cur = WATCHED_TIERS[idx];
  const next = idx < WATCHED_TIERS.length - 1 ? WATCHED_TIERS[idx + 1] : null;
  const nextThreshold = next ? next.threshold : null;
  const toNext = next ? Math.max(0, next.threshold - n) : 0;
  const span = next ? next.threshold - cur.threshold : 0;
  const progressPct = next && span > 0 ? Math.min(100, Math.round(((n - cur.threshold) / span) * 100)) : 100;
  return { count: n, emoji: cur.emoji, title: cur.title, nextThreshold, toNext, progressPct };
}

/** 小众佳作单项（I3-T3）：高分 ∧ 低人气 ∧ 玩家未拥有未看。 */
export interface NicheGem {
  anime: AnimeCard;
  /** 排序分 = rating_score × (1 − 人气百分位)。越高 = 越「高分且冷门」。 */
  score: number;
  /** 该番在全库评价人数分布里的人气百分位（0–1，越小越冷门）。 */
  popularityPct: number;
}

/** pickNicheGems 的可调参数（评价人数下限防极冷门无效样本；可注入便于测试）。 */
export interface NicheGemsOptions {
  /** 评价人数下限——低于此视为无效样本（数据噪声 / 极冷门未成型），剔除。 */
  minRatingTotal: number;
  /** 评分下限——低于此不算「佳作」（避免冷门烂番混入）。 */
  minRatingScore: number;
  /** 人气百分位上限——高于此视为大众番，不算「小众」。 */
  maxPopularityPct: number;
  /** 返回条数上限。 */
  limit: number;
}

/** pickNicheGems 的默认参数。 */
export const NICHE_GEMS_DEFAULTS: NicheGemsOptions = {
  minRatingTotal: 50,
  minRatingScore: 7,
  maxPopularityPct: 0.6,
  limit: 12,
};

/**
 * 小众佳作排序（I3-T3，纯派生）：从全库选「评分高 ∧ 人气低 ∧ 玩家未拥有未看」的番，
 * 按 `rating_score × (1 − 人气百分位)` 降序。人气百分位抄 buildTasteReport 的二分查百分位逻辑。
 *
 *  - 排除 `excludeIds`（玩家已拥有 ∪ 已看的全集）。
 *  - 剔除 `rating_total < minRatingTotal`（无效样本）。
 *  - 剔除 `rating_score < minRatingScore`（非佳作）。
 *  - 剔除人气百分位 > `maxPopularityPct`（大众番）。
 *
 * 纯函数：无 DOM / 无 store / 无随机；调用方在组件层 computed 记忆化（对全库排序不每帧重算）。
 */
export function pickNicheGems(
  allAnime: readonly AnimeCard[],
  excludeIds: ReadonlySet<number>,
  opts: Partial<NicheGemsOptions> = {},
): NicheGem[] {
  const { minRatingTotal, minRatingScore, maxPopularityPct, limit } = { ...NICHE_GEMS_DEFAULTS, ...opts };

  // 全库评价人数升序，用于人气百分位的二分查询。
  const allTotalsSorted = allAnime
    .map(ratingTotalOf)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b);
  if (allTotalsSorted.length === 0) return [];

  function popularityPercentile(total: number): number {
    // 有多少部 <= total（含自身）→ 人气百分位（越小越冷门）。
    let lo = 0, hi = allTotalsSorted.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (allTotalsSorted[mid] <= total) lo = mid + 1; else hi = mid;
    }
    return lo / allTotalsSorted.length;
  }

  const gems: NicheGem[] = [];
  for (const a of allAnime) {
    if (excludeIds.has(a.id)) continue;
    const score = ratingScoreOf(a);
    const total = ratingTotalOf(a);
    if (score === null || total === null) continue;
    if (total < minRatingTotal) continue;       // 无效样本
    if (score < minRatingScore) continue;        // 非佳作
    const pct = popularityPercentile(total);
    if (pct > maxPopularityPct) continue;        // 大众番
    gems.push({ anime: a, score: score * (1 - pct), popularityPct: pct });
  }
  gems.sort((a, b) => b.score - a.score
    || (ratingScoreOf(b.anime) ?? 0) - (ratingScoreOf(a.anime) ?? 0)
    || a.anime.name.localeCompare(b.anime.name, 'zh-Hans-CN'));
  return gems.slice(0, limit);
}

/** 人格雷达单轴（I3-T2）：0–100 归一后的一个维度。 */
export interface TasteRadarAxis {
  /** 轴标识（稳定 key，便于测试/复用）。 */
  key: 'niche' | 'coverage' | 'rating' | 'specialization' | 'diversity';
  /** 轴中文标签（雷达顶点显示）。 */
  label: string;
  /** 归一到 0–100 的轴值（四舍五入整数）。 */
  value: number;
}

function clamp0to100(n: number): number {
  if (!isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * 把品味报告里 5 个已算好的信号各折成 0–100 的人格轴（I3-T2，纯派生）。
 *  - 小众度       = nicheScore（已 0–100，直用）
 *  - 阅片广度     = coverage（已 0–100，直用）
 *  - 高分偏好     = clamp((ratingDelta+2)/4*100)；ratingDelta 为 null（无评分样本）时取 50（中性）
 *  - 题材专精     = topTags[0].pct（首位题材集中度，已 0–100；空集取 0）
 *  - 来源/年代多样性 = (sourceMix 非空桶数/4 + eras 非空桶数/4) / 2 × 100（两类多样性平均）
 *
 * 轴顺序固定，保证雷达多边形稳定、便于未来 affinity 对比复用同一编码。
 */
export function buildTasteRadar(report: TasteReport): TasteRadarAxis[] {
  const ratingValue = report.ratingDelta === null
    ? 50
    : clamp0to100(((report.ratingDelta + 2) / 4) * 100);
  const specialization = report.topTags.length > 0 ? clamp0to100(report.topTags[0].pct) : 0;
  // 来源(4 桶上限) 与 年代(ERA_ORDER=4 桶) 各自的非空桶占比，取平均。
  const sourceDiversity = report.sourceMix.length / SOURCE_TAGS.length;
  const eraDiversity = report.eras.length / ERA_ORDER.length;
  const diversity = clamp0to100(((sourceDiversity + eraDiversity) / 2) * 100);

  return [
    { key: 'niche', label: '小众度', value: clamp0to100(report.nicheScore) },
    { key: 'coverage', label: '阅片广度', value: clamp0to100(report.coverage) },
    { key: 'rating', label: '高分偏好', value: ratingValue },
    { key: 'specialization', label: '题材专精', value: specialization },
    { key: 'diversity', label: '来源/年代', value: diversity },
  ];
}

export interface AnimeRecommendation {
  anime: AnimeCard;
  /** 排序分（题材契合度为主，评分次之）。 */
  score: number;
  /** 命中的题材标签（按你的偏好强度排序，最多 3 个）——推荐理由。 */
  reasonTags: string[];
}

/**
 * 基于「已看番剧」的内容推荐（content-based）：
 * 由已看番的题材标签构建偏好向量，给未看番按「命中偏好标签的强度之和」打分，
 * 评分作次级 tiebreak。已看的不再推荐。无题材信号（空集/全无标签）时返回空。
 *
 * 注：候选池就是传入的 allAnime——当卡池扩充更多小众番后，推荐会自动覆盖到它们（发现性）。
 */
export function recommendFromTaste(
  watched: readonly AnimeCard[],
  allAnime: readonly AnimeCard[],
  limit = 8,
): AnimeRecommendation[] {
  if (watched.length === 0) return [];
  const watchedIds = new Set(watched.map(a => a.id));
  const affinity = new Map<string, number>();
  for (const a of watched) {
    for (const t of genreTagsOf(a)) affinity.set(t, (affinity.get(t) ?? 0) + 1);
  }
  if (affinity.size === 0) return [];
  const maxAff = Math.max(...affinity.values());

  const scored: AnimeRecommendation[] = [];
  for (const cand of allAnime) {
    if (watchedIds.has(cand.id)) continue;
    let sum = 0;
    const matched: string[] = [];
    for (const t of genreTagsOf(cand)) {
      const aff = affinity.get(t);
      if (aff) {
        sum += aff;
        matched.push(t);
      }
    }
    if (sum <= 0) continue;
    const rating = ratingScoreOf(cand) ?? 0;
    // 题材契合主导（归一到偏好峰值），评分仅作 ±1 内的次级影响。
    const score = sum / maxAff + rating / 100;
    matched.sort((a, b) => (affinity.get(b) ?? 0) - (affinity.get(a) ?? 0) || a.localeCompare(b, 'zh-Hans-CN'));
    scored.push({ anime: cand, score, reasonTags: matched.slice(0, 3) });
  }
  scored.sort((a, b) => b.score - a.score || (ratingScoreOf(b.anime) ?? 0) - (ratingScoreOf(a.anime) ?? 0));
  return scored.slice(0, limit);
}
