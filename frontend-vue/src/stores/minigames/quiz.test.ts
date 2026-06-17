/**
 * 番剧问答 Quiz 特征测试（evolution-6）：题目生成（4 类、注入 RNG 确定性、防御兜底）+ 判定。
 */
import { describe, it, expect } from 'vitest';
import { createSeededRng } from '@/engine';
import { generateQuestion, isCorrect, type QuizQuestion } from './quiz';
import type { AnimeCard, CharacterCard } from '@/types/card';

const anime = (id: number, name: string, date?: string, rating_score?: number): AnimeCard =>
  ({ id, name, rarity: 'R', image_path: '', date, rating_score }) as unknown as AnimeCard;
const char = (id: number, name: string, anime_names?: string[], popularity_score?: number): CharacterCard =>
  ({ id, name, rarity: 'R', image_path: '', anime_names, popularity_score }) as unknown as CharacterCard;

const richAnime = Array.from({ length: 12 }, (_, i) =>
  anime(100 + i, `番剧${i}`, `${2000 + i}-04-01`, 7 + i * 0.1));
const richChars = Array.from({ length: 12 }, (_, i) =>
  char(200 + i, `角色${i}`, [`代表作${i}`], 100 + i * 50));

function assertValid(q: QuizQuestion) {
  expect(q.options).toHaveLength(4);
  expect(q.correctIndex).toBeGreaterThanOrEqual(0);
  expect(q.correctIndex).toBeLessThan(4);
  expect(q.options[q.correctIndex]).toBeTruthy();
  expect(q.prompt.length).toBeGreaterThan(0);
  // 选项无重复
  expect(new Set(q.options).size).toBe(4);
}

describe('generateQuestion', () => {
  it('富数据池：多个种子均产出合法 4 选 1 题（确定性）', () => {
    for (const seed of [1, 2, 3, 7, 42]) {
      const q = generateQuestion(richAnime, richChars, createSeededRng(seed));
      expect(q).not.toBeNull();
      assertValid(q!);
    }
  });

  it('同种子产出同题（注入 RNG 确定性）', () => {
    const a = generateQuestion(richAnime, richChars, createSeededRng(99));
    const b = generateQuestion(richAnime, richChars, createSeededRng(99));
    expect(a).toEqual(b);
  });

  it('只支持「番剧年份」题型时正确派生（选项为年份）', () => {
    // 番剧只有 date 无 rating_score、角色池空 → 只能出 animeYear
    const animeOnly = Array.from({ length: 6 }, (_, i) => anime(300 + i, `年番${i}`, `${2010 + i}-01-01`));
    const q = generateQuestion(animeOnly, [], createSeededRng(5));
    expect(q).not.toBeNull();
    expect(q!.type).toBe('animeYear');
    assertValid(q!);
    expect(q!.options.every(o => /^\d{4}$/.test(o))).toBe(true);
  });

  it('数据不足（空池）返回 null', () => {
    expect(generateQuestion([], [], createSeededRng(1))).toBeNull();
  });
});

describe('isCorrect', () => {
  it('正确下标为真，其它为假', () => {
    const q = generateQuestion(richAnime, richChars, createSeededRng(3))!;
    expect(isCorrect(q, q.correctIndex)).toBe(true);
    const wrong = (q.correctIndex + 1) % 4;
    expect(isCorrect(q, wrong)).toBe(false);
  });
});
