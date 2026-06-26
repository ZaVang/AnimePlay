import { describe, it, expect } from 'vitest';
import { buildContentIndex, recommendFromSeeds, genreTagsOf } from './contentIndex';
import type { AnimeCard, Rarity } from '@/types/card';

function anime(id: number, opts: { synergy_tags?: string[]; rating_score?: number; rarity?: Rarity } = {}): AnimeCard {
  return {
    id,
    name: `番剧${id}`,
    rarity: opts.rarity ?? 'R',
    image_path: '',
    cost: 3,
    rating_score: opts.rating_score,
    synergy_tags: opts.synergy_tags,
  } as AnimeCard;
}

describe('genreTagsOf', () => {
  it('剔除格式/地区/来源噪声并去重', () => {
    const tags = genreTagsOf(anime(1, { synergy_tags: ['日本', 'TV', '漫画改', '百合', '百合', '校园'] }));
    expect(tags.sort()).toEqual(['校园', '百合']);
  });
});

describe('buildContentIndex', () => {
  it('标签→番剧 倒排正确，番剧→题材标签缓存', () => {
    const all = [
      anime(1, { synergy_tags: ['百合', '校园'] }),
      anime(2, { synergy_tags: ['百合'] }),
      anime(3, { synergy_tags: ['战斗', 'TV'] }), // TV 噪声剔除
    ];
    const idx = buildContentIndex(all);
    expect(idx.tagToAnime.get('百合')!.map(a => a.id).sort()).toEqual([1, 2]);
    expect(idx.tagToAnime.get('校园')!.map(a => a.id)).toEqual([1]);
    expect(idx.tagToAnime.has('TV')).toBe(false);
    expect(idx.animeGenreTags.get(3)).toEqual(['战斗']);
  });
});

describe('recommendFromSeeds', () => {
  const all = [
    anime(1, { synergy_tags: ['百合', '校园'] }),
    anime(2, { synergy_tags: ['百合'] }),
    anime(101, { synergy_tags: ['百合', '校园'], rating_score: 7 }), // 命中两标签
    anime(102, { synergy_tags: ['战斗'], rating_score: 9 }),         // 零命中
    anime(103, { synergy_tags: ['校园'], rating_score: 8 }),         // 命中一标签
  ];
  const idx = buildContentIndex(all);

  it('空种子 → 无推荐', () => {
    expect(recommendFromSeeds([], idx)).toEqual([]);
  });

  it('按题材契合度推荐、排除种子、零命中不出现、带命中理由', () => {
    const seeds = [all[0], all[1]]; // id 1,2（百合×2 + 校园×1）
    const recs = recommendFromSeeds(seeds, idx, 5);
    const ids = recs.map(r => r.anime.id);
    expect(ids).not.toContain(1); // 种子排除
    expect(ids).not.toContain(2);
    expect(ids).not.toContain(102); // 零命中
    expect(ids[0]).toBe(101); // 命中两高偏好标签 → 第一
    expect(recs[0].reasonTags).toContain('百合');
  });

  it('与 recommendFromTaste 同口径：题材无有效标签的种子 → 无推荐', () => {
    const seeds = [anime(900, { synergy_tags: ['日本', 'TV', '漫画改'] })];
    expect(recommendFromSeeds(seeds, buildContentIndex([...all, seeds[0]]))).toEqual([]);
  });

  it('limit 截断', () => {
    const many = [anime(900, { synergy_tags: ['奇幻'] }), ...Array.from({ length: 10 }, (_, i) => anime(1000 + i, { synergy_tags: ['奇幻'], rating_score: 7 + i * 0.1 }))];
    const idx2 = buildContentIndex(many);
    expect(recommendFromSeeds([many[0]], idx2, 3)).toHaveLength(3);
  });

  // I2-T1：excludeIds 修复破契约——种子是「已拥有/已看」子集，候选里其它「已拥有/已看」番也须排除。
  it('excludeIds 跳过非种子的已拥有/已看番', () => {
    const seeds = [all[0]]; // id 1（百合 + 校园）作种子
    // exclude 101（已拥有/已看），它本应是命中两标签的第一推荐——排除后不应出现。
    const recs = recommendFromSeeds(seeds, idx, 5, new Set([101]));
    const ids = recs.map(r => r.anime.id);
    expect(ids).not.toContain(101); // 被 excludeIds 排除
    expect(ids).not.toContain(1);   // 种子仍排除
    expect(ids).toContain(2);       // 百合候选仍在
    expect(ids).toContain(103);     // 校园候选仍在
  });

  it('excludeIds 默认空集时行为与旧签名一致（不排除非种子）', () => {
    const seeds = [all[0]];
    const withDefault = recommendFromSeeds(seeds, idx, 5).map(r => r.anime.id);
    const withEmpty = recommendFromSeeds(seeds, idx, 5, new Set()).map(r => r.anime.id);
    expect(withDefault).toEqual(withEmpty);
    expect(withDefault).toContain(101); // 未排除时已拥有/已看番仍会出现（旧行为）
  });
});
