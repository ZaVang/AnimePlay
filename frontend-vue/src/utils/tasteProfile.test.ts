import { describe, it, expect } from 'vitest';
import {
  buildTasteReport,
  buildTasteRadar,
  recommendFromTaste,
  watchedMilestone,
  WATCHED_TIERS,
  pickNicheGems,
} from './tasteProfile';
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

describe('buildTasteRadar', () => {
  it('5 条轴，全部 0–100 整数，key/顺序稳定', () => {
    const r = buildTasteReport(
      [anime(1, { rating_score: 8, rating_total: 100, synergy_tags: ['百合', '校园'], date: '2015-01-01' })],
      ALL,
    );
    const axes = buildTasteRadar(r);
    expect(axes.map(a => a.key)).toEqual(['niche', 'coverage', 'rating', 'specialization', 'diversity']);
    for (const a of axes) {
      expect(a.value).toBeGreaterThanOrEqual(0);
      expect(a.value).toBeLessThanOrEqual(100);
      expect(Number.isInteger(a.value)).toBe(true);
    }
  });

  it('小众/广度轴直接取 nicheScore/coverage', () => {
    const r = buildTasteReport([anime(1, { rating_total: 100 }), anime(2, { rating_total: 200 })], ALL);
    const axes = buildTasteRadar(r);
    expect(axes.find(a => a.key === 'niche')!.value).toBe(r.nicheScore);
    expect(axes.find(a => a.key === 'coverage')!.value).toBe(r.coverage);
  });

  it('ratingDelta 为 null（无评分样本）→ 高分偏好轴取中性 50', () => {
    // 已看番无 rating_score → avgRating=null → ratingDelta=null
    const r = buildTasteReport([anime(2001, { synergy_tags: ['奇幻'] })], ALL);
    expect(r.ratingDelta).toBeNull();
    const axes = buildTasteRadar(r);
    expect(axes.find(a => a.key === 'rating')!.value).toBe(50);
  });

  it('题材专精轴取首位题材占比，空集取 0', () => {
    const empty = buildTasteReport([], ALL);
    expect(buildTasteRadar(empty).find(a => a.key === 'specialization')!.value).toBe(0);
    const r = buildTasteReport(
      [anime(1, { synergy_tags: ['战斗'] }), anime(2, { synergy_tags: ['战斗'] })],
      ALL,
    );
    expect(buildTasteRadar(r).find(a => a.key === 'specialization')!.value).toBe(r.topTags[0].pct);
  });

  it('空报告所有轴不报错且在 0–100', () => {
    const axes = buildTasteRadar(buildTasteReport([], ALL));
    expect(axes).toHaveLength(5);
    for (const a of axes) {
      expect(a.value).toBeGreaterThanOrEqual(0);
      expect(a.value).toBeLessThanOrEqual(100);
    }
  });
});

describe('pickNicheGems', () => {
  // 全库：评分 6~9.5，评价人数 10~2000（覆盖无效样本 / 冷门佳作 / 大众番）
  // 全库评价人数（含字段者）升序：[30,55,65,70,90,1500,1800,2000]，length=8。
  // 人气百分位 = (≤total 的部数)/8；maxPopularityPct 默认 0.6 → 百分位 > 0.6（即 ≥5/8）剔除为大众。
  const POOL: AnimeCard[] = [
    anime(1, { rating_score: 9.0, rating_total: 30 }),   // 高分但评价人数 < 50 → 剔除（无效样本）
    anime(2, { rating_score: 9.2, rating_total: 55 }),   // 高分 + 最冷门(pct=2/8) → 应入选
    anime(3, { rating_score: 8.5, rating_total: 65 }),   // 高分 + 冷门(pct=3/8) → 应入选
    anime(4, { rating_score: 6.5, rating_total: 70 }),   // 低分 → 剔除（非佳作）
    anime(5, { rating_score: 9.4, rating_total: 1800 }), // 高分但大众(pct=7/8) → 剔除
    anime(6, { rating_score: 8.0, rating_total: 90 }),   // 中高分 + 偏冷门(pct=5/8=0.625>0.6) → 剔除（大众边界）
    anime(7, { rating_score: 8.8, rating_total: 1500 }), // 高分但大众(pct=6/8) → 剔除
    anime(8, { rating_score: 7.5, rating_total: 2000 }), // 高分但最大众(pct=8/8) → 剔除
  ];

  it('排除已拥有/已看，剔除无效样本/烂番/大众番', () => {
    const gems = pickNicheGems(POOL, new Set<number>());
    const ids = gems.map(g => g.anime.id);
    expect(ids).not.toContain(1); // 评价人数不足
    expect(ids).not.toContain(4); // 低分
    expect(ids).not.toContain(5); // 大众
    expect(ids).not.toContain(7); // 大众
    expect(ids).toContain(2);
    expect(ids).toContain(3);
  });

  it('excludeIds（已拥有∪已看）里的番不出现', () => {
    const gems = pickNicheGems(POOL, new Set<number>([2, 3]));
    const ids = gems.map(g => g.anime.id);
    expect(ids).not.toContain(2);
    expect(ids).not.toContain(3);
  });

  it('按 rating_score × (1 − 人气百分位) 降序', () => {
    const gems = pickNicheGems(POOL, new Set<number>());
    for (let i = 1; i < gems.length; i++) {
      expect(gems[i - 1].score).toBeGreaterThanOrEqual(gems[i].score);
    }
    // 最冷门高分的 2 号应排在大众化的前面
    expect(gems[0].anime.id).toBe(2);
  });

  it('limit 截断、空库不报错', () => {
    expect(pickNicheGems(POOL, new Set<number>(), { limit: 2 })).toHaveLength(2);
    expect(pickNicheGems([], new Set<number>())).toEqual([]);
  });

  it('缺评分/评价人数字段的番被跳过', () => {
    const withMissing = [...POOL, anime(99, { synergy_tags: ['x'] })]; // 无 rating_score/total
    const gems = pickNicheGems(withMissing, new Set<number>());
    expect(gems.map(g => g.anime.id)).not.toContain(99);
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

describe('watchedMilestone', () => {
  it('0 部 → 萌新段位，下一段位为第二档阈值', () => {
    const m = watchedMilestone(0);
    expect(m.count).toBe(0);
    expect(m.title).toBe(WATCHED_TIERS[0].title);
    expect(m.nextThreshold).toBe(WATCHED_TIERS[1].threshold);
    expect(m.toNext).toBe(WATCHED_TIERS[1].threshold);
    expect(m.progressPct).toBe(0);
  });

  it('正好到某档阈值 → 进阶该档，区间进度归零', () => {
    const t2 = WATCHED_TIERS[2]; // 30
    const m = watchedMilestone(t2.threshold);
    expect(m.title).toBe(t2.title);
    expect(m.nextThreshold).toBe(WATCHED_TIERS[3].threshold);
    expect(m.progressPct).toBe(0);
  });

  it('段位区间内进度百分比正确', () => {
    // 入坑(10) → 资深(30) 区间，看了 20 部 = 50%
    const m = watchedMilestone(20);
    expect(m.title).toBe(WATCHED_TIERS[1].title);
    expect(m.toNext).toBe(10);
    expect(m.progressPct).toBe(50);
  });

  it('到顶段位 → nextThreshold null、进度 100、toNext 0', () => {
    const top = WATCHED_TIERS[WATCHED_TIERS.length - 1];
    const m = watchedMilestone(top.threshold + 50);
    expect(m.title).toBe(top.title);
    expect(m.nextThreshold).toBeNull();
    expect(m.toNext).toBe(0);
    expect(m.progressPct).toBe(100);
  });

  it('负数/小数防御：归一为非负整数', () => {
    expect(watchedMilestone(-5).count).toBe(0);
    expect(watchedMilestone(12.9).count).toBe(12);
    expect(watchedMilestone(12.9).title).toBe(WATCHED_TIERS[1].title);
  });
});
