/**
 * 高低牌特征测试（evolution-5）：纯函数判定/计分/封顶 + 选卡注入 RNG 确定性 + store 流程 + 每日封顶经济。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { createSeededRng } from '@/engine';
import {
  cardValue, judge, streakReward, cappedAward, pickRound, pickCard,
  useMiniGamesStore, HL_DAILY_KP_CAP,
} from './higherLower';
import { useGameDataStore } from '../gameDataStore';
import type { AnimeCard, CharacterCard } from '@/types/card';

const char = (id: number, popularity_score: number): CharacterCard =>
  ({ id, name: `角色${id}`, rarity: 'R', popularity_score }) as unknown as CharacterCard;
const anime = (id: number, rating_total: number, date: string): AnimeCard =>
  ({ id, name: `番剧${id}`, rarity: 'R', rating_total, date }) as unknown as AnimeCard;

describe('纯函数：取值 / 判定 / 计分 / 封顶', () => {
  it('cardValue 按维度分桶取值，缺失返回 null', () => {
    expect(cardValue(char(1, 300), 'charPopularity')).toBe(300);
    expect(cardValue(anime(2, 5000, '2020-04-01'), 'animeRatingTotal')).toBe(5000);
    expect(cardValue(anime(3, 5000, '2013-10-05'), 'animeYear')).toBe(2013);
    // 角色卡没有 rating_total / date → null（分桶铁律：维度不可混用）
    expect(cardValue(char(1, 300), 'animeRatingTotal')).toBeNull();
    expect(cardValue(anime(2, 5000, 'bad-date'), 'animeYear')).toBeNull();
  });

  it('judge：higher 当右>左为真，lower 当右<左为真', () => {
    expect(judge(100, 200, 'higher')).toBe(true);
    expect(judge(100, 200, 'lower')).toBe(false);
    expect(judge(300, 100, 'lower')).toBe(true);
    expect(judge(300, 100, 'higher')).toBe(false);
  });

  it('streakReward：满 5 连才给分，每 5 连 +15', () => {
    expect(streakReward(0)).toBe(0);
    expect(streakReward(4)).toBe(0);
    expect(streakReward(5)).toBe(15);
    expect(streakReward(9)).toBe(15);
    expect(streakReward(10)).toBe(30);
    expect(streakReward(12)).toBe(30);
  });

  it('cappedAward：按当日已发与封顶裁剪，不为负', () => {
    expect(cappedAward(30, 0)).toBe(30);
    expect(cappedAward(30, HL_DAILY_KP_CAP - 10)).toBe(10); // 只剩 10 额度
    expect(cappedAward(30, HL_DAILY_KP_CAP)).toBe(0);       // 已达上限
    expect(cappedAward(30, HL_DAILY_KP_CAP + 50)).toBe(0);  // 超额也不为负
  });
});

describe('选卡注入 RNG：保证有效值且两值不等', () => {
  const pool = [char(1, 100), char(2, 200), char(3, 300), char(4, 100)];

  it('pickCard 排除指定值 + 只取该维度有效的卡', () => {
    const rng = createSeededRng(42);
    const c = pickCard(pool, 'charPopularity', rng, 100);
    expect(c).not.toBeNull();
    expect(cardValue(c!, 'charPopularity')).not.toBe(100); // 排除了值 100
  });

  it('pickRound 发一对值不相等的卡（无平局），种子化确定', () => {
    const rng = createSeededRng(7);
    const round = pickRound(pool, 'charPopularity', rng);
    expect(round).not.toBeNull();
    expect(cardValue(round!.left, 'charPopularity')).not.toBe(cardValue(round!.right, 'charPopularity'));
  });

  it('维度无任何有效卡时 pickRound 返回 null（防御）', () => {
    // 角色池在 animeRatingTotal 维度全为 null
    expect(pickRound(pool, 'animeRatingTotal', createSeededRng(1))).toBeNull();
  });
});

describe('store 流程 + 每日封顶经济', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    const gds = useGameDataStore();
    gds.allCharacterCards = [char(1, 100), char(2, 200), char(3, 300), char(4, 400), char(5, 500)];
    gds.allAnimeCards = [anime(10, 8000, '2015-01-01'), anime(11, 9000, '2020-01-01')];
  });

  it('startGame 发一对、guess 对则 streak+1 揭示、nextRound 滚动；guess 错置 isGameOver', () => {
    const store = useMiniGamesStore();
    const rng = createSeededRng(123);
    store.startGame('charPopularity', rng);
    expect(store.isPlaying).toBe(true);
    expect(store.left).not.toBeNull();
    expect(store.right).not.toBeNull();

    // 用真实值算出正确方向，断言判定与 streak
    const lv = store.leftValue!;
    const rv = store.rightValue!;
    const correctDir = rv > lv ? 'higher' : 'lower';
    expect(store.guess(correctDir)).toBe(true);
    expect(store.streak).toBe(1);
    expect(store.revealRight).toBe(true);
    store.nextRound(rng);
    expect(store.revealRight).toBe(false);

    // 故意猜反 → 游戏结束
    const lv2 = store.leftValue!;
    const rv2 = store.rightValue!;
    const wrongDir = rv2 > lv2 ? 'lower' : 'higher';
    expect(store.guess(wrongDir)).toBe(false);
    expect(store.isGameOver).toBe(true);
  });

  it('settle：更新 bestStreak/highScore/playCount，按封顶发奖并记账', () => {
    const store = useMiniGamesStore();
    store.startGame('charPopularity', createSeededRng(1));
    store.streak = 10; // 直接置一个连胜以验证结算（streakReward(10)=30）

    const r1 = store.settle();
    expect(r1.streak).toBe(10);
    expect(r1.score).toBe(30);
    expect(r1.kpToAward).toBe(30);   // 当日首结算，未达封顶
    expect(store.bestStreak).toBe(10);
    expect(store.highScore).toBe(30);
    expect(store.playCount).toBe(1);

    // 同日再来一局超长连胜 → 触发每日封顶
    store.startGame('charPopularity', createSeededRng(2));
    store.streak = 50; // streakReward(50)=150
    const r2 = store.settle();
    expect(r2.score).toBe(150);
    expect(r2.kpToAward).toBe(HL_DAILY_KP_CAP - 30); // 当日只剩 120-30=90 额度
    expect(store.bestStreak).toBe(50);

    // 第三局当日 → 封顶已满，发奖 0（只更新战绩）
    store.startGame('charPopularity', createSeededRng(3));
    store.streak = 8;
    const r3 = store.settle();
    expect(r3.kpToAward).toBe(0);
    expect(store.playCount).toBe(3);
  });

  it('settle 幂等：重复调用不重复记账/发奖', () => {
    const store = useMiniGamesStore();
    store.startGame('charPopularity', createSeededRng(9));
    store.streak = 10;
    const first = store.settle();
    expect(first.kpToAward).toBe(30);
    expect(store.playCount).toBe(1);
    const second = store.settle(); // 重复结算
    expect(second.kpToAward).toBe(0);   // 不再发奖
    expect(store.playCount).toBe(1);    // 不重复 +1
  });

  it('Quiz 与高低牌共享每日封顶（同一 awardedToday 账户）', () => {
    const store = useMiniGamesStore();
    // 高低牌先吃掉 30 额度
    store.startGame('charPopularity', createSeededRng(1));
    store.streak = 10; // streakReward=30
    expect(store.settle().kpToAward).toBe(30);
    // Quiz 同日超长连答 → 只剩 120-30=90 额度
    store.quizStreak = 50; // streakReward(50)=150
    const q = store.settleQuiz();
    expect(q.score).toBe(150);
    expect(q.kpToAward).toBe(HL_DAILY_KP_CAP - 30);
    expect(store.quizBestStreak).toBe(50);
    expect(store.remainingDailyKp).toBe(0);
  });

  it('settleQuiz 幂等：重复调用不重复记账/发奖', () => {
    const store = useMiniGamesStore();
    store.quizStreak = 5; // streakReward=15
    const first = store.settleQuiz();
    expect(first.kpToAward).toBe(15);
    expect(store.quizPlayCount).toBe(1);
    const second = store.settleQuiz();
    expect(second.kpToAward).toBe(0);
    expect(store.quizPlayCount).toBe(1);
  });

  it('serialize/deserialize 往返保真（含 quiz）', () => {
    const store = useMiniGamesStore();
    store.streak = 15;
    store.settle();
    store.quizStreak = 20;
    store.settleQuiz();
    const snap = store.serialize();
    store.reset();
    expect(store.highScore).toBe(0);
    expect(store.quizHighScore).toBe(0);
    store.deserialize(snap);
    expect(store.highScore).toBe(snap.higherLower.highScore);
    expect(store.bestStreak).toBe(15);
    expect(store.quizHighScore).toBe(snap.quiz.highScore);
    expect(store.quizBestStreak).toBe(20);
  });
});
