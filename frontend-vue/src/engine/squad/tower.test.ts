/**
 * 挑战塔与 AI 小队生成规则测试（S3）。
 */
import { describe, it, expect } from 'vitest';
import {
  getTowerRarityConfig,
  towerAttributeBonus,
  selectCharactersForTower,
  applyTowerAttributeBonus,
  generateTowerFloorEnemies,
  generateMatchedAISquad,
  generateStatsForTier,
  SQUAD_THEMES,
} from './tower';
import { calculateBattlePower, type BattleStats } from './combat';
import { createSeededRng, createSequenceRng } from '../rng';
import type { CharacterCard } from '@/types/card';

const IMG = ['/img/a.jpg', '/img/b.jpg'];

const mkChar = (id: number, rarity: string, stats?: Partial<BattleStats>): CharacterCard =>
  ({
    id,
    name: `角色${id}`,
    rarity,
    image_path: '',
    activeSkillId: '',
    passiveSkillId: '',
    battle_stats: { hp: 100, atk: 60, def: 40, sp: 50, spd: 70, ...stats },
  }) as unknown as CharacterCard;

/** 每稀有度 5 人的角色池（共 20 人，>10 走真实角色路径）。 */
function buildRoster(): CharacterCard[] {
  const roster: CharacterCard[] = [];
  (['UR', 'HR', 'SSR', 'SR'] as const).forEach((rarity, t) => {
    for (let i = 0; i < 5; i++) roster.push(mkChar(t * 100 + i + 1, rarity));
  });
  return roster;
}

describe('5 层循环稀有度阵容表', () => {
  it.each([
    [1, ['HR', 'HR', 'HR', 'HR', 'HR']],
    [2, ['UR', 'HR', 'HR', 'HR', 'HR']],
    [3, ['UR', 'UR', 'HR', 'HR', 'HR']],
    [4, ['UR', 'UR', 'UR', 'HR', 'HR']],
    [5, ['UR', 'UR', 'UR', 'UR', 'UR']], // 守关层 5 UR
  ])('循环位 %i → %j', (pos, expected) => {
    expect(getTowerRarityConfig(pos as number)).toEqual(expected);
  });
});

describe('塔层属性加成（每过 5 层 +5%）', () => {
  it('1-5 层 0%，6-10 层 5%，11 层 10%，51 层 50%', () => {
    expect(towerAttributeBonus(1)).toBe(0);
    expect(towerAttributeBonus(5)).toBe(0);
    expect(towerAttributeBonus(6)).toBeCloseTo(0.05, 10);
    expect(towerAttributeBonus(10)).toBeCloseTo(0.05, 10);
    expect(towerAttributeBonus(11)).toBeCloseTo(0.1, 10);
    expect(towerAttributeBonus(51)).toBeCloseTo(0.5, 10);
  });

  it('applyTowerAttributeBonus 按比例放大并追加描述标记；0 加成原样返回', () => {
    const chars = [mkChar(1, 'UR', { hp: 100, atk: 60, def: 40, sp: 50, spd: 70 })];
    const boosted = applyTowerAttributeBonus(chars, 0.1);
    expect(boosted[0].battle_stats).toEqual({ hp: 110, atk: 66, def: 44, sp: 55, spd: 77 });
    expect(boosted[0].description).toContain('[塔层强化 +10%]');

    const same = applyTowerAttributeBonus(chars, 0);
    expect(same[0].battle_stats).toEqual(chars[0].battle_stats);
  });
});

describe('selectCharactersForTower', () => {
  it('按稀有度配置选 5 人且不重复', () => {
    const roster = buildRoster();
    const picked = selectCharactersForTower(roster, ['UR', 'UR', 'UR', 'UR', 'UR'], createSeededRng(7));
    expect(picked).toHaveLength(5);
    expect(new Set(picked.map(c => c.id)).size).toBe(5);
    expect(picked.every(c => c.rarity === 'UR')).toBe(true);
  });

  it('该稀有度不足时只在 HR/UR 内兜底，不拉低稀有度进小队战', () => {
    const roster = [mkChar(1, 'UR'), mkChar(2, 'SR'), mkChar(3, 'SR'), mkChar(4, 'SR'), mkChar(5, 'SR')];
    const picked = selectCharactersForTower(roster, ['UR', 'UR', 'UR', 'UR', 'UR'], createSeededRng(7));
    expect(picked).toHaveLength(5);
    expect(picked.every(c => c.rarity === 'UR')).toBe(true);
  });
});

describe('generateTowerFloorEnemies', () => {
  it('真实角色路径：命名/难度/战力与公式一致，同种子可复现', () => {
    const roster = buildRoster();
    const a = generateTowerFloorEnemies(roster, 7, createSeededRng(42), IMG);
    const b = generateTowerFloorEnemies(roster, 7, createSeededRng(42), IMG);

    expect(a.name).toBe('第7层 挑战者小队'); // (7-1)/5=1 → 主题表第 2 个
    expect(a.difficulty).toBe('中等'); // cycleCount 1 → 中等
    expect(a.members).toHaveLength(5);
    expect(a.members.every(m => m.rarity === 'HR' || m.rarity === 'UR')).toBe(true);
    expect(a.members.map(m => m.id)).toEqual(b.members.map(m => m.id)); // 种子可复现

    // 第 7 层处于第 2 循环 → +5%；战力 = 成员战力之和
    const expectedPower = Math.floor(
      a.members.reduce((s, m) => s + calculateBattlePower(m.battle_stats as BattleStats), 0),
    );
    expect(a.floorPower).toBe(expectedPower);
    expect(a.description).toContain('属性提升：5%');
  });

  it('HR/UR 数据不足 5 人时回退 AI 生成（5 名负 ID 守护者）', () => {
    const tiny = [mkChar(1, 'UR'), mkChar(2, 'SR')];
    const r = generateTowerFloorEnemies(tiny, 3, createSeededRng(1), IMG);
    expect(r.name).toBe('第3层 AI守护者');
    expect(r.members).toHaveLength(5);
    expect(r.members.every(m => m.id < 0)).toBe(true);
    expect(r.members.every(m => m.rarity === 'HR')).toBe(true);
    expect(r.members.every(m => IMG.includes(m.image_path))).toBe(true);
  });

  it('第 1 层难度为简单且无属性提升', () => {
    const r = generateTowerFloorEnemies(buildRoster(), 1, createSeededRng(5), IMG);
    expect(r.difficulty).toBe('简单');
    expect(r.description).toContain('属性提升：0%');
  });
});

describe('generateMatchedAISquad（战力分档选主题）', () => {
  it('低战力（<500）只会遇到弱/平衡主题', () => {
    for (let seed = 0; seed < 10; seed++) {
      const r = generateMatchedAISquad(300, createSeededRng(seed), IMG);
      const theme = SQUAD_THEMES.find(t => t.name === r.name)!;
      expect(['weak', 'balanced']).toContain(theme.tier);
      expect(r.members).toHaveLength(5);
    }
  });

  it('高战力（>1200）只会遇到强/平衡主题', () => {
    for (let seed = 0; seed < 10; seed++) {
      const r = generateMatchedAISquad(2000, createSeededRng(seed), IMG);
      const theme = SQUAD_THEMES.find(t => t.name === r.name)!;
      expect(['strong', 'balanced']).toContain(theme.tier);
    }
  });

  it('狂战士团主题攻击力 ×1.35（向下取整）', () => {
    // 主题表强/平衡过滤后 [均衡战术队, 精英突击队, 守护者联盟, 疾风小队, 魔法师团, 狂战士团] 共 6 个
    // 第一个随机数选主题：5/6 ≈ 0.84 → 狂战士团（index 5）
    const seq = [0.84, ...Array(40).fill(0.5)];
    const r = generateMatchedAISquad(2000, createSequenceRng(seq), IMG);
    expect(r.name).toBe('狂战士团');
    expect(r.teamBonus).toContain('攻击力');
    // 0.5 浮动 → 属性 = floor(base*1.2)，atk 再 ×1.35：floor(floor(60*1.2)*1.35)=floor(72*1.35)=97
    expect((r.members[0].battle_stats as BattleStats).atk).toBe(97);
  });

  it('难度系数等比缩放属性', () => {
    const base = generateMatchedAISquad(800, createSeededRng(9), IMG, 1.0);
    const hard = generateMatchedAISquad(800, createSeededRng(9), IMG, 1.2);
    const b = base.members[0].battle_stats as BattleStats;
    const h = hard.members[0].battle_stats as BattleStats;
    expect(h.hp).toBe(Math.floor(b.hp * 1.2));
    expect(h.atk).toBe(Math.floor(b.atk * 1.2));
  });
});

describe('generateStatsForTier', () => {
  it('weak/strong 档基准 0.8×/1.2×，浮动 ±5%；同种子可复现', () => {
    const w = generateStatsForTier('weak', createSequenceRng([0.5])); // 浮动因子 = 1
    expect(w).toEqual({ hp: 80, atk: 48, def: 32, sp: 40, spd: 56 });
    const s = generateStatsForTier('strong', createSequenceRng([0.5]));
    expect(s).toEqual({ hp: 120, atk: 72, def: 48, sp: 60, spd: 84 });
  });
});
