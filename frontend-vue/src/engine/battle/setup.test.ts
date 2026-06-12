/**
 * 开局构筑规则测试（S2）：技能解析优先级链 + 卡组装配容错。
 */
import { describe, it, expect } from 'vitest';
import {
  resolveCharacterSkillIds,
  injectSkills,
  buildCardsFromIds,
  randomAnimeDeck,
  DECK_SIZE,
} from './setup';
import { createSeededRng } from '../rng';
import type { AnimeCard, CharacterCard } from '@/types/card';
import type { Skill } from '@/types/skill';

const char = (over: Partial<CharacterCard> = {}): CharacterCard =>
  ({
    id: 1,
    name: 'C',
    rarity: 'R',
    activeSkillId: '',
    passiveSkillId: '',
    image_path: '',
    ...over,
  }) as unknown as CharacterCard;

const SKILLS: Record<string, Skill> = {
  A1: { id: 'A1', name: '主动', type: '主动技能', description: '' },
  P1: { id: 'P1', name: '被动', type: '被动光环', description: '' },
  TPL_GAIN_TP_2: { id: 'TPL_GAIN_TP_2', name: '模板', type: '主动技能', description: '' },
  AURA_GENRE_EXPERT: { id: 'AURA_GENRE_EXPERT', name: '类型专家', type: '被动光环', description: '' },
};
const getSkill = (id: string) => SKILLS[id];

describe('resolveCharacterSkillIds 优先级链', () => {
  it('1) 数据层字段优先', () => {
    const c = { ...char({}), activeSkillId: 'A1', passiveSkillId: 'P1' };
    expect(resolveCharacterSkillIds(c, { 1: ['LEGACY'] })).toEqual(['A1', 'P1']);
  });

  it('2) 无数据层字段 → 遗留映射表', () => {
    const c = char({});
    expect(resolveCharacterSkillIds(c, { 1: ['LEGACY_X', 'LEGACY_Y'] })).toEqual(['LEGACY_X', 'LEGACY_Y']);
  });

  it('3) 都没有 → 稀有度兜底模板（R: TPL_GAIN_TP_2 + AURA_GENRE_EXPERT）', () => {
    expect(resolveCharacterSkillIds(char({}))).toEqual(['TPL_GAIN_TP_2', 'AURA_GENRE_EXPERT']);
  });

  it('SSR/HR/UR 无兜底模板 → 空', () => {
    const c = { ...char({}), rarity: 'UR' as const };
    expect(resolveCharacterSkillIds(c)).toEqual([]);
  });
});

describe('injectSkills', () => {
  it('查得到的技能注入，查不到的静默跳过；不改原对象', () => {
    const c = { ...char({}), activeSkillId: 'A1', passiveSkillId: 'MISSING' };
    const injected = injectSkills(c, getSkill);
    expect(injected.skills?.map(s => s.id)).toEqual(['A1']);
    expect(c.skills).toBeUndefined();
  });
});

describe('卡组装配', () => {
  it('buildCardsFromIds 跳过查不到的 ID', () => {
    const pool: Record<number, AnimeCard> = {
      1: { id: 1 } as unknown as AnimeCard,
      3: { id: 3 } as unknown as AnimeCard,
    };
    const r = buildCardsFromIds([1, 2, 3], id => pool[id]);
    expect(r.map(c => c.id)).toEqual([1, 3]);
  });

  it('randomAnimeDeck 默认 30 张、同种子可复现、无重复', () => {
    const all = Array.from({ length: 60 }, (_, i) => ({ id: i }) as unknown as AnimeCard);
    const a = randomAnimeDeck(all, createSeededRng(1));
    const b = randomAnimeDeck(all, createSeededRng(1));
    expect(a.length).toBe(DECK_SIZE);
    expect(a.map(c => c.id)).toEqual(b.map(c => c.id));
    expect(new Set(a.map(c => c.id)).size).toBe(DECK_SIZE);
  });
});
