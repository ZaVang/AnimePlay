/**
 * 番剧问答 Quiz（小游戏 #2，evolution-6）——纯题目生成逻辑。
 * 4 类题，全部从真实数据派生；注入 RNG，配特征测试。无状态、无 Vue/Pinia 依赖。
 * 会话态与发奖在 minigames store（与高低牌共享每日封顶）。
 */
import type { RNG } from '@/engine';
import type { AnimeCard, CharacterCard } from '@/types/card';

export type QuizType = 'characterAnime' | 'animeYear' | 'highestRated' | 'mostPopularChar';

export interface QuizQuestion {
  type: QuizType;
  prompt: string;
  options: string[];      // 4 个选项文本
  correctIndex: number;   // 正确选项下标
  /** 题目主体图片（角色/番剧），有则 UI 展示。 */
  subjectImage?: string;
}

interface QuizPools {
  anime: readonly AnimeCard[];
  characters: readonly CharacterCard[];
}

function year(card: AnimeCard): number | null {
  if (typeof card.date !== 'string' || !/^\d{4}/.test(card.date)) return null;
  const y = parseInt(card.date.slice(0, 4), 10);
  return isFinite(y) ? y : null;
}

/** 从池中取 n 个互不相同（按 keyFn 去重）的元素。注入 RNG。 */
function sampleDistinct<T>(pool: readonly T[], n: number, rng: RNG, keyFn: (t: T) => string): T[] {
  const shuffled = rng.shuffle(pool);
  const out: T[] = [];
  const seen = new Set<string>();
  for (const item of shuffled) {
    const k = keyFn(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
    if (out.length === n) break;
  }
  return out;
}

/** 「角色 X 出自哪部作品」：正解取角色 anime_names[0]，干扰项取其它番剧名。 */
function genCharacterAnime(pools: QuizPools, rng: RNG): QuizQuestion | null {
  const eligible = pools.characters.filter(c => Array.isArray(c.anime_names) && c.anime_names.length > 0 && c.anime_names[0]);
  const subject = rng.pick(eligible);
  if (!subject) return null;
  const correct = subject.anime_names![0];
  // 干扰项：与正解不同名的番剧名
  const distractors = sampleDistinct(
    pools.anime.filter(a => a.name && a.name !== correct),
    3, rng, a => a.name,
  ).map(a => a.name);
  if (distractors.length < 3) return null;
  const options = rng.shuffle([correct, ...distractors]);
  return {
    type: 'characterAnime',
    prompt: `「${subject.name}」出自下面哪部作品？`,
    options,
    correctIndex: options.indexOf(correct),
    subjectImage: `/data/images/character/${subject.id}.jpg`,
  };
}

/** 「番剧 X 哪年放送」：正解取真实年份，干扰项取邻近年份。 */
function genAnimeYear(pools: QuizPools, rng: RNG): QuizQuestion | null {
  const eligible = pools.anime.filter(a => year(a) !== null && a.name);
  const subject = rng.pick(eligible);
  if (!subject) return null;
  const correct = year(subject)!;
  const candidates = new Set<number>();
  let guard = 0;
  while (candidates.size < 3 && guard++ < 50) {
    const delta = rng.int(11) - 5; // -5..+5
    const y = correct + delta;
    if (y !== correct && y >= 1960 && y <= 2030) candidates.add(y);
  }
  if (candidates.size < 3) return null;
  const options = rng.shuffle([correct, ...candidates].map(String));
  return {
    type: 'animeYear',
    prompt: `《${subject.name}》是哪一年放送的？`,
    options,
    correctIndex: options.indexOf(String(correct)),
    subjectImage: `/data/images/anime/${subject.id}.jpg`,
  };
}

/** 「下列哪部番剧评分最高」：4 部不同评分的番剧，选最高。 */
function genHighestRated(pools: QuizPools, rng: RNG): QuizQuestion | null {
  const eligible = pools.anime.filter(a => typeof a.rating_score === 'number' && a.name);
  const four = sampleDistinct(eligible, 4, rng, a => String(a.rating_score));
  if (four.length < 4) return null;
  const best = four.reduce((m, a) => (a.rating_score! > m.rating_score! ? a : m));
  const options = four.map(a => a.name);
  return {
    type: 'highestRated',
    prompt: '下列哪部番剧的 Bangumi 评分最高？',
    options,
    correctIndex: options.indexOf(best.name),
  };
}

/** 「下列哪个角色人气最高」：4 个不同人气的角色，选最高。 */
function genMostPopularChar(pools: QuizPools, rng: RNG): QuizQuestion | null {
  const eligible = pools.characters.filter(c => typeof c.popularity_score === 'number' && c.name);
  const four = sampleDistinct(eligible, 4, rng, c => String(c.popularity_score));
  if (four.length < 4) return null;
  const best = four.reduce((m, c) => (c.popularity_score! > m.popularity_score! ? c : m));
  const options = four.map(c => c.name);
  return {
    type: 'mostPopularChar',
    prompt: '下列哪个角色的人气最高？',
    options,
    correctIndex: options.indexOf(best.name),
  };
}

const GENERATORS: Record<QuizType, (p: QuizPools, r: RNG) => QuizQuestion | null> = {
  characterAnime: genCharacterAnime,
  animeYear: genAnimeYear,
  highestRated: genHighestRated,
  mostPopularChar: genMostPopularChar,
};

export const QUIZ_TYPES: QuizType[] = ['characterAnime', 'animeYear', 'highestRated', 'mostPopularChar'];

/**
 * 生成一题：随机选题型，失败（数据不足）则换下一型，全失败返回 null。注入 RNG。
 */
export function generateQuestion(anime: readonly AnimeCard[], characters: readonly CharacterCard[], rng: RNG): QuizQuestion | null {
  const pools: QuizPools = { anime, characters };
  const order = rng.shuffle(QUIZ_TYPES);
  for (const t of order) {
    const q = GENERATORS[t](pools, rng);
    if (q) return q;
  }
  return null;
}

/** 判定答题是否正确。 */
export function isCorrect(question: QuizQuestion, chosenIndex: number): boolean {
  return chosenIndex === question.correctIndex;
}
