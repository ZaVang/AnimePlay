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
    for (const t of a.synergy_tags ?? []) {
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
