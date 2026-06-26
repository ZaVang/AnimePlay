/**
 * 题材集册 Genre Sets 特征测试（I4-T1/T2）：
 * 切桶完成度 / 段位阈值 / persona 排序 / 缺口差集，纯函数零存档。
 */
import { describe, it, expect } from 'vitest';
import {
  buildGenreSets,
  genreSetTier,
  genreGapAnime,
  GENRE_SET_TIERS,
} from './genreSets';
import { buildContentIndex } from './contentIndex';
import type { AnimeCard, Rarity } from '@/types/card';

function anime(id: number, tags: string[], rarity: Rarity = 'R'): AnimeCard {
  return {
    id,
    name: `番剧${id}`,
    rarity,
    image_path: '',
    cost: 3,
    synergy_tags: tags,
  } as AnimeCard;
}

/** 构造一个题材桶：n 部都带 tag（外加噪声标签验证剔噪），id 从 base 起。 */
function bucket(tag: string, n: number, base: number): AnimeCard[] {
  return Array.from({ length: n }, (_, i) => anime(base + i, [tag, '日本', 'TV']));
}

describe('genreSetTier 段位阈值（纯派生）', () => {
  it('0% → 待开荒，未征服', () => {
    const t = genreSetTier(0);
    expect(t.title).toBe('待开荒');
    expect(t.conquered).toBe(false);
  });
  it('阈值边界取该段位（25/50/75/100）', () => {
    expect(genreSetTier(24).title).toBe('待开荒');
    expect(genreSetTier(25).title).toBe('青铜收藏');
    expect(genreSetTier(49).title).toBe('青铜收藏');
    expect(genreSetTier(50).title).toBe('白银收藏');
    expect(genreSetTier(74).title).toBe('白银收藏');
    expect(genreSetTier(75).title).toBe('黄金收藏');
    expect(genreSetTier(99).title).toBe('黄金收藏');
    expect(genreSetTier(100).title).toBe('题材征服者');
  });
  it('100% → conquered=true', () => {
    expect(genreSetTier(100).conquered).toBe(true);
    expect(genreSetTier(99).conquered).toBe(false);
  });
  it('越界 pct 钳制到 0–100', () => {
    expect(genreSetTier(-10).title).toBe(GENRE_SET_TIERS[0].title);
    expect(genreSetTier(999).title).toBe('题材征服者');
  });
});

describe('buildGenreSets 切桶完成度', () => {
  // 三个题材桶：奇幻 20 部 / 校园 12 部 / 悬疑 5 部
  const all: AnimeCard[] = [
    ...bucket('奇幻', 20, 100),
    ...bucket('校园', 12, 200),
    ...bucket('悬疑', 5, 300),
  ];
  const index = buildContentIndex(all);

  it('按 minBucketSize 过滤小桶（悬疑 5<10 被剔）', () => {
    const sets = buildGenreSets(index, () => 0, { minBucketSize: 10 });
    const tags = sets.map(s => s.tag);
    expect(tags).toContain('奇幻');
    expect(tags).toContain('校园');
    expect(tags).not.toContain('悬疑'); // 桶规模 5 < 10
  });

  it('桶维度用剔噪题材集——无 TV/日本 废桶', () => {
    const sets = buildGenreSets(index, () => 0, { minBucketSize: 1 });
    const tags = sets.map(s => s.tag);
    expect(tags).not.toContain('TV');
    expect(tags).not.toContain('日本');
  });

  it('owned 完成度：奇幻拥有前 10 部 → 50% 白银', () => {
    const owned = new Set<number>(Array.from({ length: 10 }, (_, i) => 100 + i));
    const sets = buildGenreSets(index, id => (owned.has(id) ? 1 : 0), { minBucketSize: 10 });
    const fantasy = sets.find(s => s.tag === '奇幻')!;
    expect(fantasy.owned).toBe(10);
    expect(fantasy.total).toBe(20);
    expect(fantasy.pct).toBe(50);
    expect(fantasy.remaining).toBe(10);
    expect(fantasy.tier.title).toBe('白银收藏');
  });

  it('全拥有 → 100% 征服、remaining=0', () => {
    const sets = buildGenreSets(index, () => 1, { minBucketSize: 10 });
    const campus = sets.find(s => s.tag === '校园')!;
    expect(campus.pct).toBe(100);
    expect(campus.remaining).toBe(0);
    expect(campus.tier.conquered).toBe(true);
  });
});

describe('buildGenreSets persona 专精排序（分水岭）', () => {
  // 奇幻 20（大桶）/ 悬疑 12（中桶）。persona 把悬疑顶到前面。
  const all: AnimeCard[] = [
    ...bucket('奇幻', 20, 100),
    ...bucket('悬疑', 12, 200),
  ];
  const index = buildContentIndex(all);

  it('无 persona → 按桶规模降序（奇幻在前）', () => {
    const sets = buildGenreSets(index, () => 0, { minBucketSize: 10 });
    expect(sets[0].tag).toBe('奇幻');
  });

  it('persona 命中题材顶到最前（悬疑 > 奇幻，即便桶更小）', () => {
    const sets = buildGenreSets(index, () => 0, {
      minBucketSize: 10,
      personaOrder: ['悬疑'],
    });
    expect(sets[0].tag).toBe('悬疑'); // persona 专精轴优先于桶规模
    expect(sets[1].tag).toBe('奇幻');
  });
});

describe('genreGapAnime 缺口差集（未拥有 ∧ 未看）', () => {
  const all: AnimeCard[] = bucket('奇幻', 6, 100); // id 100..105
  const index = buildContentIndex(all);

  it('排除已拥有与已看，只留缺口番', () => {
    const owned = new Set<number>([100, 101]);     // 已拥有
    const watched = new Set<number>([102]);          // 已看
    const gap = genreGapAnime(index, '奇幻', id => (owned.has(id) ? 1 : 0), watched);
    const ids = gap.map(a => a.id);
    expect(ids).not.toContain(100);
    expect(ids).not.toContain(101);
    expect(ids).not.toContain(102);
    expect(ids).toEqual([103, 104, 105]);
  });

  it('limit 截断', () => {
    const gap = genreGapAnime(index, '奇幻', () => 0, new Set(), 2);
    expect(gap).toHaveLength(2);
  });

  it('未知 tag → 空数组', () => {
    expect(genreGapAnime(index, '不存在', () => 0, new Set())).toEqual([]);
  });
});
