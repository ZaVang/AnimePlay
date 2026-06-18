/**
 * 高低牌 Higher/Lower（evolution-5，小游戏 Hub 内的新游戏 #1）。
 *
 * 玩法：给两张同类卡，左卡数值已揭示，右卡数值隐藏，玩家猜右卡「更高/更低」。
 * 对 → streak+1，右卡变新左卡，再发一张新右卡（滚动式）；错 → 结算。
 *
 * 维度按卡类型分桶（Scout 实测铁律，不可混用）：
 *  - 角色人气：character.popularity_score（13–4050，458 distinct）
 *  - 番剧口碑：anime.rating_total（6277–34793，249 distinct）
 *  - 番剧年代：anime.date 取年份（1993–2025）
 * 三者皆「数值大 = 更多/更晚」，higher/lower 心智模型干净；选卡保证两值不等，无平局歧义。
 *
 * 纯逻辑（选卡/取值/判定/计分/封顶）抽成纯函数 + 注入 RNG，配特征测试；
 * store 编排层喂 defaultRng（生产真随机）。经济与每日封顶在 store，发奖由门面 userStore 走 profile.earn。
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useGameDataStore } from '../gameDataStore';
import { defaultRng, createSeededRng, type RNG } from '@/engine';
import type { AnimeCard, CharacterCard } from '@/types/card';
import type { MiniGamesSave } from '@/infra/persistence';
import { generateQuestion, isCorrect as quizIsCorrect, type QuizQuestion } from './quiz';

export type HLCategoryId = 'charPopularity' | 'animeRatingTotal' | 'animeYear';
export type HLGuess = 'higher' | 'lower';
type AnyCard = AnimeCard | CharacterCard;

export interface HLCategoryDef {
  id: HLCategoryId;
  cardType: 'character' | 'anime';
  label: string;        // 选择器标题，如「角色人气」
  metricLabel: string;  // 数值含义，如「人气值」
  hint: string;         // 一句话玩法提示
}

export const HL_CATEGORIES: HLCategoryDef[] = [
  { id: 'charPopularity', cardType: 'character', label: '角色人气', metricLabel: '人气值', hint: '谁的 Bangumi 人气更高？' },
  { id: 'animeRatingTotal', cardType: 'anime', label: '番剧口碑', metricLabel: '评价人数', hint: '哪部番的评分人数更多？' },
  { id: 'animeYear', cardType: 'anime', label: '番剧年代', metricLabel: '放送年份', hint: '哪部番放送得更晚？' },
];

export function getCategory(id: HLCategoryId): HLCategoryDef {
  return HL_CATEGORIES.find(c => c.id === id) ?? HL_CATEGORIES[0];
}

/** 每日小游戏发奖封顶（知识点/天，跨小游戏共享此域计数）。 */
export const HL_DAILY_KP_CAP = 120;

/** 本地日期键（YYYY-M-D）。复制 daily.ts 同款，保持领域 store 自包含。 */
function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// --- 纯函数（导出供特征测试；不在内部调用 Math.random，随机经参数注入） ---

/** 取某卡在某维度的数值；缺失/非法返回 null（防御，虽实测 100% 覆盖）。 */
export function cardValue(card: AnyCard, category: HLCategoryId): number | null {
  if (category === 'charPopularity') {
    const v = (card as CharacterCard).popularity_score;
    return typeof v === 'number' && isFinite(v) ? v : null;
  }
  if (category === 'animeRatingTotal') {
    const v = (card as AnimeCard).rating_total;
    return typeof v === 'number' && isFinite(v) ? v : null;
  }
  // animeYear
  const date = (card as AnimeCard).date;
  if (typeof date !== 'string' || !/^\d{4}/.test(date)) return null;
  const year = parseInt(date.slice(0, 4), 10);
  return isFinite(year) ? year : null;
}

/** 从卡池随机取一张「该维度有有效值、且值 ≠ excludeValue」的卡。注入 RNG。无可取返回 null。 */
export function pickCard(
  pool: readonly AnyCard[],
  category: HLCategoryId,
  rng: RNG,
  excludeValue?: number,
): AnyCard | null {
  const eligible = pool.filter(c => {
    const v = cardValue(c, category);
    return v !== null && v !== excludeValue;
  });
  if (eligible.length === 0) return null;
  return rng.pick(eligible) ?? null;
}

/** 发一对「值不相等」的卡（保证无平局）。注入 RNG。池不足返回 null。 */
export function pickRound(
  pool: readonly AnyCard[],
  category: HLCategoryId,
  rng: RNG,
): { left: AnyCard; right: AnyCard } | null {
  const left = pickCard(pool, category, rng);
  if (!left) return null;
  const right = pickCard(pool, category, rng, cardValue(left, category)!);
  if (!right) return null;
  return { left, right };
}

/** 判定：right 相对 left 是否符合猜测方向（值已保证不等）。 */
export function judge(leftVal: number, rightVal: number, guess: HLGuess): boolean {
  return guess === 'higher' ? rightVal > leftVal : rightVal < leftVal;
}

/** 连胜里程碑得分（每 5 连给 15，满 5 才有：streak<5→0）。 */
export function streakReward(streak: number): number {
  return Math.floor(streak / 5) * 15;
}

/** 按当日已发奖与封顶裁剪本次实发知识点（≥0）。 */
export function cappedAward(reward: number, awardedToday: number, cap = HL_DAILY_KP_CAP): number {
  return Math.max(0, Math.min(reward, cap - awardedToday));
}

// --- store（状态 + 编排，喂 defaultRng；发奖由 userStore 走 profile.earn） ---

export const useMiniGamesStore = defineStore('minigames', () => {
  // 高低牌战绩（持久化）
  const highScore = ref(0);      // 历史最高单局得分（streakReward 折算）
  const bestStreak = ref(0);     // 历史最长连胜
  const playCount = ref(0);      // 累计局数
  // 每日发奖封顶（持久化，跨天读时归零）
  const awardDate = ref('');
  const awardedToday = ref(0);

  // 对局态（会话态，不持久化）
  const category = ref<HLCategoryId>('charPopularity');
  const left = ref<AnyCard | null>(null);
  const right = ref<AnyCard | null>(null);
  const revealRight = ref(false);   // 是否已揭示右卡数值（判定后）
  const lastCorrect = ref<boolean | null>(null);
  const streak = ref(0);
  const isPlaying = ref(false);
  const isGameOver = ref(false);
  const settled = ref(false);       // 本局是否已结算（幂等保护，开新局清零）
  const lastAward = ref(0);         // 上一局结算实发知识点（UI 展示）

  // 番剧问答 Quiz（v9）：战绩持久化 + 会话态。每日封顶与高低牌共享（grantAward）。
  const quizHighScore = ref(0);
  const quizBestStreak = ref(0);
  const quizPlayCount = ref(0);
  const quizQuestion = ref<QuizQuestion | null>(null);
  const quizChosen = ref<number | null>(null);   // 已选下标（揭示态）
  const quizStreak = ref(0);
  const quizPlaying = ref(false);
  const quizOver = ref(false);
  const quizSettled = ref(false);
  const quizLastAward = ref(0);

  // 每日挑战（v10）：固定种子全员同题，每日一次。战绩持久化 + 会话态。
  const DC_QUESTION_COUNT = 5;
  const DC_KP_PER_CORRECT = 12; // 每答对 1 题 12 知识点（满分 5×12=60），每日仅首通发放
  const dcLastDate = ref('');
  const dcLastScore = ref(0);
  const dcBestScore = ref(0);
  const dcStreakDays = ref(0);      // v11：连续完成天数
  const dcBestStreakDays = ref(0);
  const dcQuestions = ref<QuizQuestion[]>([]);
  const dcIndex = ref(0);
  const dcChosen = ref<number | null>(null);
  const dcScore = ref(0);
  const dcActive = ref(false);
  const dcDone = ref(false);
  const dcLastAward = ref(0);

  // 番剧品味画像（v12）：勾选「看过」的番剧 id 集（持久化；纯收藏态，无战绩/无每日封顶）。
  const tasteWatchedIds = ref<Set<number>>(new Set());
  const tasteWatchedCount = computed(() => tasteWatchedIds.value.size);

  /** 切换某番剧的「看过」状态。 */
  function toggleTasteWatched(animeId: number) {
    if (tasteWatchedIds.value.has(animeId)) tasteWatchedIds.value.delete(animeId);
    else tasteWatchedIds.value.add(animeId);
  }

  /** 清空已看记录。 */
  function clearTasteWatched() {
    tasteWatchedIds.value.clear();
  }

  const leftValue = computed(() => (left.value ? cardValue(left.value, category.value) : null));
  const rightValue = computed(() => (right.value ? cardValue(right.value, category.value) : null));
  const remainingDailyKp = computed(() => {
    const today = awardDate.value === todayKey() ? awardedToday.value : 0;
    return Math.max(0, HL_DAILY_KP_CAP - today);
  });

  function pool(rng: RNG = defaultRng): AnyCard[] {
    const data = useGameDataStore();
    const cardType = getCategory(category.value).cardType;
    return (cardType === 'character' ? data.allCharacterCards : data.allAnimeCards) as AnyCard[];
  }

  /** 开新局（选定维度）。 */
  function startGame(cat: HLCategoryId, rng: RNG = defaultRng) {
    category.value = cat;
    const round = pickRound(pool(rng), cat, rng);
    left.value = round?.left ?? null;
    right.value = round?.right ?? null;
    revealRight.value = false;
    lastCorrect.value = null;
    streak.value = 0;
    isPlaying.value = !!round;
    isGameOver.value = false;
    settled.value = false;
    lastAward.value = 0;
  }

  /**
   * 猜一手：揭示右卡并判定（不前进牌面，便于 UI 展示揭示动画）。
   * 对 → streak+1；错 → isGameOver（由 userStore 结算）。组件随后调 nextRound 前进。
   */
  function guess(direction: HLGuess): boolean {
    if (!isPlaying.value || isGameOver.value || revealRight.value || !left.value || !right.value) return false;
    const lv = cardValue(left.value, category.value)!;
    const rv = cardValue(right.value, category.value)!;
    const correct = judge(lv, rv, direction);
    revealRight.value = true;
    lastCorrect.value = correct;
    if (correct) streak.value += 1;
    else isGameOver.value = true;
    return correct;
  }

  /** 猜对后滚到下一对：右卡成新左卡，再发一张「与新左值不等」的右卡。卡池耗尽则收尾。 */
  function nextRound(rng: RNG = defaultRng) {
    if (isGameOver.value || !right.value) return;
    const newLeft = right.value;
    const newRight = pickCard(pool(rng), category.value, rng, cardValue(newLeft, category.value)!);
    if (!newRight) {
      isGameOver.value = true;
      return;
    }
    left.value = newLeft;
    right.value = newRight;
    revealRight.value = false;
    lastCorrect.value = null;
  }

  /**
   * 结算本局：更新战绩 + 每日封顶记账，返回本次应发知识点（由 userStore earn）。
   * 幂等保护：每局只结算一次（settled 标志，重复调用返回零奖励、不重复记账）。
   */
  /** 共享发奖：按当日封顶裁剪并记账，返回实发知识点（高低牌/Quiz 共用同一每日上限）。 */
  function grantAward(score: number): number {
    const today = todayKey();
    if (awardDate.value !== today) {
      awardDate.value = today;
      awardedToday.value = 0;
    }
    const kp = cappedAward(score, awardedToday.value);
    awardedToday.value += kp;
    return kp;
  }

  function settle(): { score: number; streak: number; kpToAward: number } {
    if (settled.value) return { score: streakReward(streak.value), streak: streak.value, kpToAward: 0 };
    settled.value = true;
    const finalStreak = streak.value;
    const score = streakReward(finalStreak);
    const kp = grantAward(score);

    playCount.value += 1;
    if (finalStreak > bestStreak.value) bestStreak.value = finalStreak;
    if (score > highScore.value) highScore.value = score;
    lastAward.value = kp;
    isPlaying.value = false;
    return { score, streak: finalStreak, kpToAward: kp };
  }

  // --- 番剧问答 Quiz ---

  function quizPool() {
    const data = useGameDataStore();
    return { anime: data.allAnimeCards, characters: data.allCharacterCards };
  }

  /** 开新一局 Quiz（出第一题）。 */
  function startQuiz(rng: RNG = defaultRng) {
    const { anime, characters } = quizPool();
    quizQuestion.value = generateQuestion(anime, characters, rng);
    quizChosen.value = null;
    quizStreak.value = 0;
    quizPlaying.value = !!quizQuestion.value;
    quizOver.value = false;
    quizSettled.value = false;
    quizLastAward.value = 0;
  }

  /** 答题：揭示并判定。对 → streak+1（由组件随后调 nextQuestion）；错 → quizOver。 */
  function answerQuiz(index: number): boolean {
    if (!quizPlaying.value || quizOver.value || quizChosen.value !== null || !quizQuestion.value) return false;
    quizChosen.value = index;
    const correct = quizIsCorrect(quizQuestion.value, index);
    if (correct) quizStreak.value += 1;
    else quizOver.value = true;
    return correct;
  }

  /** 答对后出下一题。 */
  function nextQuestion(rng: RNG = defaultRng) {
    if (quizOver.value) return;
    const { anime, characters } = quizPool();
    quizQuestion.value = generateQuestion(anime, characters, rng);
    quizChosen.value = null;
    if (!quizQuestion.value) quizOver.value = true;
  }

  /** 结算 Quiz：更新战绩 + 共享每日封顶发奖。幂等。 */
  function settleQuiz(): { score: number; streak: number; kpToAward: number } {
    const finalStreak = quizStreak.value;
    const score = streakReward(finalStreak);
    if (quizSettled.value) return { score, streak: finalStreak, kpToAward: 0 };
    quizSettled.value = true;
    const kp = grantAward(score);
    quizPlayCount.value += 1;
    if (finalStreak > quizBestStreak.value) quizBestStreak.value = finalStreak;
    if (score > quizHighScore.value) quizHighScore.value = score;
    quizLastAward.value = kp;
    quizPlaying.value = false;
    return { score, streak: finalStreak, kpToAward: kp };
  }

  function quitQuiz() {
    quizPlaying.value = false;
    quizOver.value = false;
    quizQuestion.value = null;
  }

  // --- 每日挑战（固定种子全员同题，每日一次） ---

  /** 当日种子（YYYYMMDD）：全员同题、隔天换题、可回放确定。 */
  function dateSeed(): number {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  const dcCompletedToday = computed(() => dcLastDate.value === todayKey());
  const dcCurrentQuestion = computed(() => dcQuestions.value[dcIndex.value] ?? null);
  const dcTotal = computed(() => dcQuestions.value.length);

  /** 开始今日挑战：用当日种子确定性生成 DC_QUESTION_COUNT 题（全员同题）。 */
  function startDailyChallenge(rng: RNG = createSeededRng(dateSeed())) {
    const { anime, characters } = quizPool();
    const qs: QuizQuestion[] = [];
    for (let i = 0; i < DC_QUESTION_COUNT; i++) {
      const q = generateQuestion(anime, characters, rng);
      if (q) qs.push(q);
    }
    dcQuestions.value = qs;
    dcIndex.value = 0;
    dcChosen.value = null;
    dcScore.value = 0;
    dcActive.value = qs.length > 0;
    dcDone.value = false;
    dcLastAward.value = 0;
  }

  /** 答当前题：揭示并计分（不前进，便于 UI 揭示）。 */
  function answerDailyChallenge(index: number): boolean {
    if (!dcActive.value || dcDone.value || dcChosen.value !== null || !dcCurrentQuestion.value) return false;
    dcChosen.value = index;
    const correct = quizIsCorrect(dcCurrentQuestion.value, index);
    if (correct) dcScore.value += 1;
    return correct;
  }

  /** 进入下一题；最后一题后置 dcDone（由组件随后调 settle）。 */
  function nextDailyChallenge() {
    if (dcDone.value) return;
    if (dcIndex.value + 1 >= dcQuestions.value.length) {
      dcDone.value = true;
      dcActive.value = false;
    } else {
      dcIndex.value += 1;
      dcChosen.value = null;
    }
  }

  /**
   * 结算今日挑战：更新战绩，返回应发知识点（每日仅首通发放，不占小游戏共享封顶）。
   * 今日已通关再调返回 0（alreadyDone）。
   */
  /** 昨日的本地日期键（连续天数判定用）。 */
  function yesterdayKey(): string {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function settleDailyChallenge(): { score: number; kpToAward: number; alreadyDone: boolean } {
    const score = dcScore.value;
    const today = todayKey();
    if (dcLastDate.value === today) return { score, kpToAward: 0, alreadyDone: true };
    // 连续天数：昨日完成过则 +1，否则（断签/首次）归 1
    dcStreakDays.value = dcLastDate.value === yesterdayKey() ? dcStreakDays.value + 1 : 1;
    if (dcStreakDays.value > dcBestStreakDays.value) dcBestStreakDays.value = dcStreakDays.value;
    dcLastDate.value = today;
    dcLastScore.value = score;
    if (score > dcBestScore.value) dcBestScore.value = score;
    const kp = score * DC_KP_PER_CORRECT;
    dcLastAward.value = kp;
    return { score, kpToAward: kp, alreadyDone: false };
  }

  function quit() {
    isPlaying.value = false;
    isGameOver.value = false;
    left.value = null;
    right.value = null;
  }

  // --- 持久化装配（v8 minigames 域） ---

  function serialize(): MiniGamesSave {
    return {
      higherLower: {
        highScore: highScore.value,
        bestStreak: bestStreak.value,
        playCount: playCount.value,
      },
      quiz: {
        highScore: quizHighScore.value,
        bestStreak: quizBestStreak.value,
        playCount: quizPlayCount.value,
      },
      dailyChallenge: {
        lastDate: dcLastDate.value,
        lastScore: dcLastScore.value,
        bestScore: dcBestScore.value,
        streakDays: dcStreakDays.value,
        bestStreakDays: dcBestStreakDays.value,
      },
      tasteProfile: { watchedAnimeIds: [...tasteWatchedIds.value] },
      awardDate: awardDate.value,
      awardedToday: awardedToday.value,
    };
  }

  function deserialize(data: MiniGamesSave | null | undefined) {
    highScore.value = data?.higherLower?.highScore ?? 0;
    bestStreak.value = data?.higherLower?.bestStreak ?? 0;
    playCount.value = data?.higherLower?.playCount ?? 0;
    quizHighScore.value = data?.quiz?.highScore ?? 0;
    quizBestStreak.value = data?.quiz?.bestStreak ?? 0;
    quizPlayCount.value = data?.quiz?.playCount ?? 0;
    dcLastDate.value = data?.dailyChallenge?.lastDate ?? '';
    dcLastScore.value = data?.dailyChallenge?.lastScore ?? 0;
    dcBestScore.value = data?.dailyChallenge?.bestScore ?? 0;
    dcStreakDays.value = data?.dailyChallenge?.streakDays ?? 0;
    dcBestStreakDays.value = data?.dailyChallenge?.bestStreakDays ?? 0;
    tasteWatchedIds.value = new Set(data?.tasteProfile?.watchedAnimeIds ?? []);
    awardDate.value = data?.awardDate ?? '';
    awardedToday.value = data?.awardedToday ?? 0;
  }

  function reset() {
    highScore.value = 0;
    bestStreak.value = 0;
    playCount.value = 0;
    quizHighScore.value = 0;
    quizBestStreak.value = 0;
    quizPlayCount.value = 0;
    dcLastDate.value = '';
    dcLastScore.value = 0;
    dcBestScore.value = 0;
    dcStreakDays.value = 0;
    dcBestStreakDays.value = 0;
    dcQuestions.value = [];
    dcActive.value = false;
    dcDone.value = false;
    tasteWatchedIds.value = new Set();
    awardDate.value = '';
    awardedToday.value = 0;
    quit();
    quitQuiz();
  }

  return {
    // 战绩
    highScore, bestStreak, playCount, remainingDailyKp,
    // 每日封顶记账（持久化字段，往返测试需可读写）
    awardDate, awardedToday,
    // 对局态
    category, left, right, revealRight, lastCorrect, streak, isPlaying, isGameOver, lastAward,
    leftValue, rightValue,
    // 高低牌方法
    startGame, guess, nextRound, settle, quit,
    // Quiz 战绩 + 会话态 + 方法
    quizHighScore, quizBestStreak, quizPlayCount,
    quizQuestion, quizChosen, quizStreak, quizPlaying, quizOver, quizLastAward,
    startQuiz, answerQuiz, nextQuestion, settleQuiz, quitQuiz,
    // 每日挑战 战绩 + 会话态 + 方法
    dcLastDate, dcLastScore, dcBestScore, dcStreakDays, dcBestStreakDays, dcScore, dcChosen, dcActive, dcDone, dcLastAward, dcIndex, dcQuestions,
    dcCompletedToday, dcCurrentQuestion, dcTotal,
    startDailyChallenge, answerDailyChallenge, nextDailyChallenge, settleDailyChallenge,
    // 品味画像（v12）
    tasteWatchedIds, tasteWatchedCount, toggleTasteWatched, clearTasteWatched,
    serialize, deserialize, reset,
  };
});
