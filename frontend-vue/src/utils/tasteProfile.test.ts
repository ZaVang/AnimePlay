import { describe, it, expect } from 'vitest';
import { buildTasteReport, recommendFromTaste } from './tasteProfile';
import type { AnimeCard, Rarity } from '@/types/card';

function anime(
  id: number,
  opts: Partial<AnimeCard> & { date?: string; rating_score?: number; rating_total?: number; synergy_tags?: string[]; rarity?: Rarity } = {},
): AnimeCard {
  return {
    id,
    name: `番剧${id}`,
    rarity: opts.rarity ?? 'R',
    image_path: '',
    cost: 3,
    date: opts.date,
    rating_score: opts.rating_score,
    rating_total: opts.rating_total,
    synergy_tags: opts.synergy_tags,
  } as AnimeCard;
}

// 全库：评价人数从 100 到 1000，便于小众指数百分位计算
const ALL: AnimeCard[] = Array.from({ length: 10 }, (_, i) =>
  anime(i + 1, { rating_score: 7 + (i % 3) * 0.5, rating_total: (i + 1) * 100, date: `20${10 + i}-01-01` }),
);

describe('buildTasteReport', () => {
  it('空集合返回零值报告 + 萌芽人格', () => {
    const r = buildTasteReport([], ALL);
    expect(r.count).toBe(0);
    expect(r.coverage).toBe(0);
    expect(r.topTags).toEqual([]);
    expect(r.avgRating).toBeNull();
    expect(r.persona.title).toBe('画像萌芽中');
    expect(r.globalAvgRating).toBeGreaterThan(0);
  });

  it('剔除格式/地区/来源噪声，只统计题材标签', () => {
    const watched = [
      anime(101, { synergy_tags: ['日本', 'TV', '漫画改', '百合', '校园'] }),
      anime(102, { synergy_tags: ['日本', 'TV', '百合', '恋爱'] }),
      anime(103, { synergy_tags: ['日本', '百合'] }),
    ];
    const r = buildTasteReport(watched, ALL);
    const tags = r.topTags.map(t => t.tag);
    expect(tags).not.toContain('日本');
    expect(tags).not.toContain('TV');
    expect(tags).not.toContain('漫画改'); // 来源标签单列
    expect(tags[0]).toBe('百合'); // 3/3 出现，最高
    expect(r.topTags[0].pct).toBe(100);
    // 来源标签进入 sourceMix
    expect(r.sourceMix.find(s => s.source === '漫画改')?.count).toBe(1);
  });

  it('主导题材 ≥40% → 浓度爆表人格', () => {
    const watched = [
      anime(201, { synergy_tags: ['战斗'] }),
      anime(202, { synergy_tags: ['战斗'] }),
      anime(203, { synergy_tags: ['战斗'] }),
      anime(204, { synergy_tags: ['日常'] }),
    ];
    const r = buildTasteReport(watched, ALL);
    expect(r.topTags[0].tag).toBe('战斗');
    expect(r.persona.title).toContain('战斗');
  });

  it('小众指数：全选低评价人数番 → nicheScore 高', () => {
    const watched = [
      anime(1, { rating_total: 100 }),
      anime(2, { rating_total: 200 }),
      anime(3, { rating_total: 300 }),
    ];
    const r = buildTasteReport(watched, ALL);
    expect(r.nicheScore).toBeGreaterThanOrEqual(70);
    expect(r.persona.title).toBe('小众考古学家');
    expect(r.highlights.mostNiche?.id).toBe(1);
  });

  it('小众指数：全选最热门番 → nicheScore 低', () => {
    const watched = [anime(9, { rating_total: 900 }), anime(10, { rating_total: 1000 })];
    const r = buildTasteReport(watched, ALL);
    expect(r.nicheScore).toBeLessThan(30);
  });

  it('评分高于大盘 → 高分鉴赏家 + ratingDelta 为正', () => {
    const watched = [
      anime(301, { rating_score: 9.5, rating_total: 500, synergy_tags: ['奇幻'] }),
      anime(302, { rating_score: 9.3, rating_total: 600, synergy_tags: ['科幻'] }),
      anime(303, { rating_score: 9.4, rating_total: 550, synergy_tags: ['悬疑'] }),
    ];
    const r = buildTasteReport(watched, ALL);
    expect(r.ratingDelta).not.toBeNull();
    expect(r.ratingDelta!).toBeGreaterThan(0);
    expect(r.avgRating).toBeGreaterThan(r.globalAvgRating);
  });

  it('年代分布按时间序，覆盖率正确', () => {
    const watched = [
      anime(401, { date: '1998-04-01' }),
      anime(402, { date: '2015-04-01' }),
      anime(403, { date: '2023-04-01' }),
      anime(404, { date: '2024-04-01' }),
    ];
    const r = buildTasteReport(watched, ALL);
    expect(r.eras.map(e => e.label)).toEqual(['2000年前', '2010年代', '2020年代']);
    expect(r.eras.find(e => e.label === '2020年代')?.count).toBe(2);
    expect(r.coverage).toBe(Math.round((4 / ALL.length) * 100));
  });

  it('稀有度构成按 UR→N 序且仅含出现项', () => {
    const watched = [
      anime(501, { rarity: 'UR' }),
      anime(502, { rarity: 'SR' }),
      anime(503, { rarity: 'SR' }),
    ];
    const r = buildTasteReport(watched, ALL);
    expect(r.rarityMix).toEqual([
      { rarity: 'UR', count: 1 },
      { rarity: 'SR', count: 2 },
    ]);
  });
});

describe('recommendFromTaste', () => {
  it('空已看集 → 无推荐', () => {
    expect(recommendFromTaste([], ALL)).toEqual([]);
  });

  it('按题材契合度推荐未看番，已看的不出现，带命中标签理由', () => {
    const watched = [anime(601, { synergy_tags: ['百合', '校园'] }), anime(602, { synergy_tags: ['百合'] })];
    const pool = [
      ...watched,
      anime(701, { synergy_tags: ['百合', '校园'], rating_score: 7 }), // 命中 百合+校园 → 最高
      anime(702, { synergy_tags: ['战斗'], rating_score: 9 }),         // 无命中 → 不推荐
      anime(703, { synergy_tags: ['校园'], rating_score: 8 }),         // 命中 校园
    ];
    const recs = recommendFromTaste(watched, pool, 5);
    const ids = recs.map(r => r.anime.id);
    expect(ids).not.toContain(601); // 已看
    expect(ids).not.toContain(602);
    expect(ids).not.toContain(702); // 零命中不推荐
    expect(ids[0]).toBe(701);       // 命中两个高偏好标签，排第一
    expect(recs[0].reasonTags).toContain('百合');
  });

  it('已看番题材无有效标签 → 无推荐', () => {
    const watched = [anime(801, { synergy_tags: ['日本', 'TV', '漫画改'] })]; // 全是噪声/来源
    const recs = recommendFromTaste(watched, [...watched, anime(802, { synergy_tags: ['奇幻'] })]);
    expect(recs).toEqual([]);
  });

  it('同一部番的重复标签只算一次（理由不重复）', () => {
    const watched = [anime(1101, { synergy_tags: ['恋爱'] })];
    const pool = [watched[0], anime(1102, { synergy_tags: ['恋爱', '恋爱', '日常'], rating_score: 8 })];
    const recs = recommendFromTaste(watched, pool);
    expect(recs[0].reasonTags).toEqual(['恋爱']); // 不是 ['恋爱','恋爱']
  });

  it('limit 截断', () => {
    const watched = [anime(901, { synergy_tags: ['奇幻'] })];
    const pool = [watched[0], ...Array.from({ length: 10 }, (_, i) => anime(1000 + i, { synergy_tags: ['奇幻'], rating_score: 7 + i * 0.1 }))];
    expect(recommendFromTaste(watched, pool, 3)).toHaveLength(3);
  });
});
