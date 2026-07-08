/**
 * buildHomesteadSnapshot 特征测试（S16-T13）：家园「基地身份卡」晒图数据聚合纯函数。
 * 覆盖：满配聚合 / 0 入住 / 0 收藏 / 空基地三态 + 正着念计数（不晒缺口）+ 空态优雅（不 NaN/undefined）
 *      + 上限裁剪（满配优雅承载）+ 羁绊去重 + 脏输入兜底。
 */
import { describe, it, expect } from 'vitest';
import {
  buildHomesteadSnapshot,
  type HomesteadSnapshotInput,
  SNAPSHOT_MAX_RESIDENTS,
  SNAPSHOT_MAX_BOND_ANIMES,
} from './buildHomesteadSnapshot';

function baseInput(over: Partial<HomesteadSnapshotInput> = {}): HomesteadSnapshotInput {
  return {
    username: 'tester',
    level: 12,
    placedCharacterNames: [],
    furniturePlacedCount: 0,
    furnitureTotal: 7,
    showcaseRarity: null,
    bondHits: [],
    todaySpecialName: null,
    comfort: 0,
    ...over,
  };
}

describe('主标题「XX 的家园」（走 username，零基地名字段）', () => {
  it('有 username → 「XX 的家园」', () => {
    const s = buildHomesteadSnapshot(baseInput({ username: 'Zavang' }));
    expect(s.title).toBe('Zavang 的家园');
    expect(s.username).toBe('Zavang');
  });

  it('空 / 纯空白 username → 软兜底「我的家园」（不崩、不 undefined）', () => {
    expect(buildHomesteadSnapshot(baseInput({ username: '' })).title).toBe('我的家园');
    expect(buildHomesteadSnapshot(baseInput({ username: '   ' })).title).toBe('我的家园');
  });
});

describe('满配聚合（正着念计数 + 满配优雅承载）', () => {
  const full = baseInput({
    username: '阿宅',
    level: 40,
    placedCharacterNames: ['凉宫春日', '长门有希', '朝比奈实玖瑠', '阿虚', '古泉一树', '朝仓凉子'],
    furniturePlacedCount: 7,
    furnitureTotal: 7,
    showcaseRarity: { rarity: 'UR', owned: 12, total: 48 },
    bondHits: [
      { anime: '凉宫春日的忧郁', members: 4 },
      { anime: 'Fate/stay night', members: 2 },
    ],
    todaySpecialName: '长门有希',
    comfort: 85,
  });

  it('入住 / 陈列 / 收藏 / 羁绊全部正着念（拥有数，非缺口）', () => {
    const s = buildHomesteadSnapshot(full);
    expect(s.residentCount).toBe(6);
    expect(s.furniturePlaced).toBe(7);
    expect(s.furnitureTotal).toBe(7);
    expect(s.showcase).toEqual({ rarity: 'UR', owned: 12, total: 48 });
    expect(s.bondCount).toBe(2);
    expect(s.bondAnimes).toEqual(['凉宫春日的忧郁', 'Fate/stay night']);
    expect(s.todaySpecialName).toBe('长门有希');
    expect(s.comfort).toBe(85);
    expect(s.isEmpty).toBe(false);
  });

  it('入住脸位裁到上限（多了用聚合数字，不逐条铺开）', () => {
    const many = Array.from({ length: 10 }, (_, i) => `角色${i + 1}`);
    const s = buildHomesteadSnapshot(baseInput({ placedCharacterNames: many }));
    expect(s.residentCount).toBe(10); // 计数是全量
    expect(s.residentNames.length).toBe(SNAPSHOT_MAX_RESIDENTS); // 脸位裁上限
  });

  it('羁绊作品名裁到上限', () => {
    const manyBonds = Array.from({ length: 8 }, (_, i) => ({ anime: `作品${i + 1}`, members: 2 }));
    const s = buildHomesteadSnapshot(baseInput({ bondHits: manyBonds }));
    expect(s.bondAnimes.length).toBe(SNAPSHOT_MAX_BOND_ANIMES);
  });
});

describe('空态优雅（命门级：0 入住 / 0 收藏 / 空基地不羞辱新人）', () => {
  it('全空 → isEmpty=true，不出 NaN / undefined，不晒缺口', () => {
    const s = buildHomesteadSnapshot(baseInput());
    expect(s.isEmpty).toBe(true);
    expect(s.residentCount).toBe(0);
    expect(s.residentNames).toEqual([]);
    expect(s.furniturePlaced).toBe(0);
    expect(s.showcase).toBeNull(); // 绝不晒「UR 0/N」缺口条
    expect(s.bondCount).toBe(0);
    expect(s.todaySpecialName).toBeNull();
    // 无 NaN / undefined 溢出
    expect(Number.isNaN(s.level)).toBe(false);
    expect(Number.isNaN(s.comfort)).toBe(false);
  });

  it('0 收藏（showcaseRarity=null）→ showcase 为 null，绝不「UR 0/N」', () => {
    const s = buildHomesteadSnapshot(baseInput({ placedCharacterNames: ['某角色'], showcaseRarity: null }));
    expect(s.showcase).toBeNull();
    expect(s.isEmpty).toBe(false); // 有入住就不算空基地
  });

  it('showcaseRarity 传入 owned=0 也视为无收藏（不晒空墙）', () => {
    const s = buildHomesteadSnapshot(baseInput({ showcaseRarity: { rarity: 'UR', owned: 0, total: 48 } }));
    expect(s.showcase).toBeNull();
  });

  it('有家具但 0 入住 0 收藏 → 不算空基地（有可晒身份）', () => {
    const s = buildHomesteadSnapshot(baseInput({ furniturePlacedCount: 3 }));
    expect(s.isEmpty).toBe(false);
    expect(s.furniturePlaced).toBe(3);
  });
});

describe('脏输入兜底（不崩、不 NaN）', () => {
  it('负数 / 非有限计数兜底为 0', () => {
    const s = buildHomesteadSnapshot(
      baseInput({ level: -5, furniturePlacedCount: NaN as unknown as number, comfort: Infinity }),
    );
    expect(s.level).toBe(0);
    expect(s.furniturePlaced).toBe(0);
    expect(s.comfort).toBe(0);
  });

  it('入住名单含空串 / 空白被清洗', () => {
    const s = buildHomesteadSnapshot(
      baseInput({ placedCharacterNames: ['真名', '', '   ', '另一个'] as string[] }),
    );
    expect(s.residentNames).toEqual(['真名', '另一个']);
    expect(s.residentCount).toBe(2);
  });

  it('羁绊作品名去重（同作品多条只留一条）', () => {
    const s = buildHomesteadSnapshot(
      baseInput({
        bondHits: [
          { anime: '同一作品', members: 3 },
          { anime: '同一作品', members: 2 },
          { anime: '另一作品', members: 2 },
        ],
      }),
    );
    expect(s.bondAnimes).toEqual(['同一作品', '另一作品']);
  });

  it('furnitureTotal < placed 时分母兜底到 placed（防「陈列 8/7」荒谬）', () => {
    const s = buildHomesteadSnapshot(baseInput({ furniturePlacedCount: 8, furnitureTotal: 7 }));
    expect(s.furnitureTotal).toBe(8);
    expect(s.furniturePlaced).toBe(8);
  });
});
