/**
 * 内容关联索引（I1-T4）——纯派生、可单测、供发现引擎/详情/下游复用。
 *
 * 目标：把「标签 → 番剧」「番剧 → 同题材番剧」这类关联预计算成索引，
 * 避免每个消费端（推荐出口、详情「相似作品」）每次渲染都对全量库（968 番）做 O(N·T) 重扫。
 * 在 store 层用 computed 记忆化一次，多个出口共享同一份索引。
 *
 * 无随机、无 IO、无 Vue 依赖——延续 tasteProfile.ts 的纯函数风格。
 */
import type { AnimeCard } from '@/types/card';

/** 与 tasteProfile 一致的格式/地区噪声标签——索引按题材建，剔除这些。 */
const FORMAT_REGION_NOISE = new Set([
  '日本', '中国', '美国', '韩国', 'TV', 'WEB', 'OVA', '剧场版', '短片', 'PV', '其他', '动态漫画',
]);
const SOURCE_TAG_SET = new Set<string>(['漫画改', '小说改', '原创', '游戏改']);

/** 某番的题材标签（去重 + 剔除格式/地区/来源噪声）——与 tasteProfile 的 genreTagsOf 同口径。 */
export function genreTagsOf(a: AnimeCard): string[] {
  return [...new Set(a.synergy_tags ?? [])].filter(t => !FORMAT_REGION_NOISE.has(t) && !SOURCE_TAG_SET.has(t));
}

export interface ContentIndex {
  /** 题材标签 → 含该标签的番剧列表。 */
  tagToAnime: Map<string, AnimeCard[]>;
  /** 番剧 id → 该番的题材标签（缓存，避免重复过滤）。 */
  animeGenreTags: Map<number, string[]>;
}

/**
 * 由全量番剧库构建关联索引。建议在 store 层用 computed 记忆化（随 allAnime 变化才重建）。
 */
export function buildContentIndex(allAnime: readonly AnimeCard[]): ContentIndex {
  const tagToAnime = new Map<string, AnimeCard[]>();
  const animeGenreTags = new Map<number, string[]>();
  for (const a of allAnime) {
    const tags = genreTagsOf(a);
    animeGenreTags.set(a.id, tags);
    for (const t of tags) {
      const arr = tagToAnime.get(t);
      if (arr) arr.push(a);
      else tagToAnime.set(t, [a]);
    }
  }
  return { tagToAnime, animeGenreTags };
}

function ratingScoreOf(a: AnimeCard): number {
  const v = a.rating_score;
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

export interface AnimeRecommendation {
  anime: AnimeCard;
  score: number;
  reasonTags: string[];
}

/**
 * 用关联索引做基于种子番剧的内容推荐（content-based）。
 * 与 recommendFromTaste 同口径（题材契合主导、评分次级、排除种子），
 * 但借索引把候选限定在「与种子共享题材标签」的番上——不必扫全库，O(命中候选) 而非 O(全库)。
 *
 * seeds 可以是「已看的番」（品味输入）或「已拥有的番」（收藏代理输入）。
 * 空种子 / 无题材信号 → 返回 []（由 UI 展示空态）。
 *
 * excludeIds（I2-T1）：从候选中额外剔除的番剧 id（如「已拥有 ∪ 已看」全集）。
 * 修复破契约 bug——图鉴出口的种子只是已拥有/已看的一个子集，候选池里其它已拥有/已看的番
 * 此前照样被推回。「为你推荐」的隐含契约是「你还没有的」，故调用方应把全部已拥有/已看集传入。
 * 种子始终被排除（无需重复列入 excludeIds）。
 */
export function recommendFromSeeds(
  seeds: readonly AnimeCard[],
  index: ContentIndex,
  limit = 8,
  excludeIds: ReadonlySet<number> = new Set(),
): AnimeRecommendation[] {
  if (seeds.length === 0) return [];
  const seedIds = new Set(seeds.map(s => s.id));

  // 偏好向量：种子番题材标签计数。
  const affinity = new Map<string, number>();
  for (const s of seeds) {
    const tags = index.animeGenreTags.get(s.id) ?? genreTagsOf(s);
    for (const t of tags) affinity.set(t, (affinity.get(t) ?? 0) + 1);
  }
  if (affinity.size === 0) return [];
  const maxAff = Math.max(...affinity.values());

  // 候选：偏好标签覆盖到的番（去重），累计命中强度。
  const sumByCand = new Map<number, { anime: AnimeCard; sum: number; matched: string[] }>();
  for (const [tag, aff] of affinity) {
    const bucket = index.tagToAnime.get(tag);
    if (!bucket) continue;
    for (const cand of bucket) {
      if (seedIds.has(cand.id) || excludeIds.has(cand.id)) continue;
      const cur = sumByCand.get(cand.id);
      if (cur) { cur.sum += aff; cur.matched.push(tag); }
      else sumByCand.set(cand.id, { anime: cand, sum: aff, matched: [tag] });
    }
  }

  const scored: AnimeRecommendation[] = [];
  for (const { anime, sum, matched } of sumByCand.values()) {
    if (sum <= 0) continue;
    const score = sum / maxAff + ratingScoreOf(anime) / 100;
    matched.sort((a, b) => (affinity.get(b) ?? 0) - (affinity.get(a) ?? 0) || a.localeCompare(b, 'zh-Hans-CN'));
    scored.push({ anime, score, reasonTags: matched.slice(0, 3) });
  }
  scored.sort((a, b) => b.score - a.score || ratingScoreOf(b.anime) - ratingScoreOf(a.anime));
  return scored.slice(0, limit);
}
