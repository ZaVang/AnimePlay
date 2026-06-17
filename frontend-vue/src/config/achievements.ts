/**
 * 成就静态定义（evolution-1）。
 * 只放不变的成就元数据；已解锁 id 在 stores/achievements.ts（进存档 v6）。
 * 解锁判定在 stores/achievements.ts 的 check(event, payload) 里，按 event 分发到各条 condition。
 */
import type { CurrencyKey } from '@/types/player';

/**
 * 成就检测事件 —— 与同批埋点处 check(event, payload) 一一对应：
 *  - 'gacha'      抽卡（payload: { rarities: Rarity[] }）
 *  - 'battleWin'  对战胜利
 *  - 'watch'      收取观看
 *  - 'nurture'    养成互动
 *  - 'guess'      猜对角色
 *  - 'tower'      爬塔通层（payload: { floor: number }）
 *  - 'codex'      图鉴里程碑达成（派生统计变化时触发；payload: { milestoneId: string }）
 */
export type AchievementEvent =
  | 'gacha'
  | 'battleWin'
  | 'watch'
  | 'nurture'
  | 'guess'
  | 'tower'
  | 'codex'
  | 'minigame';

export interface AchievementDef {
  id: string;
  /** 触发检测的事件类型。 */
  event: AchievementEvent;
  title: string;
  description: string;
  /** 解锁徽章 emoji。 */
  badge: string;
  reward: { currency: CurrencyKey; amount: number };
  /**
   * 解锁条件：传入累计计数器 stats 与本次事件 payload，返回是否满足。
   * stats 由 achievements store 维护（会话级累计，靠已解锁 id 幂等，不进存档）。
   */
  condition: (stats: AchievementStats, payload?: AchievementPayload) => boolean;
}

/** 累计计数器（会话级；解锁靠已解锁 id 去重，无需持久化计数）。 */
export interface AchievementStats {
  gachaCount: number;
  battleWins: number;
  watchCount: number;
  nurtureCount: number;
  guessStreak: number;
  guessTotal: number;
  maxTowerFloor: number;
  minigameTotal: number;
}

export interface AchievementPayload {
  rarities?: string[];
  floor?: number;
  milestoneId?: string;
  /** 角色满级（养成）—— nurture 互动后由 store 计算后传入。 */
  characterMaxLevel?: boolean;
  /** 小游戏本局连胜（minigame 事件）—— 高低牌/Quiz 结算时传入。 */
  streak?: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // 抽卡
  { id: 'ach_first_ur', event: 'gacha', title: '欧皇降临', description: '抽到第一张 UR 卡', badge: '🌟', reward: { currency: 'knowledgePoints', amount: 200 }, condition: (_s, p) => !!p?.rarities?.includes('UR') },
  { id: 'ach_first_ssr', event: 'gacha', title: '小有所获', description: '抽到第一张 SSR 卡', badge: '✨', reward: { currency: 'knowledgePoints', amount: 50 }, condition: (_s, p) => !!p?.rarities?.some(r => ['SSR', 'HR', 'UR'].includes(r)) },
  { id: 'ach_gacha_10', event: 'gacha', title: '抽卡新手', description: '累计抽卡 10 次', badge: '🎴', reward: { currency: 'knowledgePoints', amount: 50 }, condition: (s) => s.gachaCount >= 10 },
  { id: 'ach_gacha_100', event: 'gacha', title: '抽卡成瘾', description: '累计抽卡 100 次', badge: '🎰', reward: { currency: 'animeGachaTickets', amount: 3 }, condition: (s) => s.gachaCount >= 100 },
  // 对战
  { id: 'ach_first_win', event: 'battleWin', title: '初战告捷', description: '赢得第一场宅理论战', badge: '🏅', reward: { currency: 'knowledgePoints', amount: 50 }, condition: (s) => s.battleWins >= 1 },
  { id: 'ach_win_10', event: 'battleWin', title: '理论中坚', description: '赢得 10 场宅理论战', badge: '⚔️', reward: { currency: 'animeGachaTickets', amount: 2 }, condition: (s) => s.battleWins >= 10 },
  { id: 'ach_win_50', event: 'battleWin', title: '论战王者', description: '赢得 50 场宅理论战', badge: '👑', reward: { currency: 'knowledgePoints', amount: 500 }, condition: (s) => s.battleWins >= 50 },
  // 观看
  { id: 'ach_watch_1', event: 'watch', title: '追番起步', description: '收取第一次观看奖励', badge: '📺', reward: { currency: 'knowledgePoints', amount: 30 }, condition: (s) => s.watchCount >= 1 },
  { id: 'ach_watch_50', event: 'watch', title: '资深追番', description: '累计收取 50 次观看', badge: '🍿', reward: { currency: 'animeGachaTickets', amount: 3 }, condition: (s) => s.watchCount >= 50 },
  // 养成
  { id: 'ach_nurture_1', event: 'nurture', title: '初次相处', description: '进行第一次养成互动', badge: '💬', reward: { currency: 'knowledgePoints', amount: 30 }, condition: (s) => s.nurtureCount >= 1 },
  { id: 'ach_nurture_50', event: 'nurture', title: '形影不离', description: '累计养成互动 50 次', badge: '💞', reward: { currency: 'characterGachaTickets', amount: 2 }, condition: (s) => s.nurtureCount >= 50 },
  { id: 'ach_nurture_maxlevel', event: 'nurture', title: '羁绊圆满', description: '养成一名角色至满级', badge: '🏆', reward: { currency: 'characterGachaTickets', amount: 5 }, condition: (_s, p) => !!p?.characterMaxLevel },
  // 猜角色
  { id: 'ach_guess_1', event: 'guess', title: '慧眼初开', description: '猜对第一个角色', badge: '🔍', reward: { currency: 'knowledgePoints', amount: 30 }, condition: (s) => s.guessTotal >= 1 },
  { id: 'ach_guess_streak_5', event: 'guess', title: '火眼金睛', description: '连续猜对 5 个角色', badge: '🎯', reward: { currency: 'knowledgePoints', amount: 100 }, condition: (s) => s.guessStreak >= 5 },
  { id: 'ach_guess_50', event: 'guess', title: '识人无数', description: '累计猜对 50 个角色', badge: '🧠', reward: { currency: 'characterGachaTickets', amount: 3 }, condition: (s) => s.guessTotal >= 50 },

  { id: 'ach_minigame_1', event: 'minigame', title: '小游戏初体验', description: '玩第一局小游戏', badge: '🎮', reward: { currency: 'knowledgePoints', amount: 30 }, condition: (s) => s.minigameTotal >= 1 },
  { id: 'ach_minigame_streak_10', event: 'minigame', title: '势如破竹', description: '小游戏单局连胜达到 10', badge: '🔥', reward: { currency: 'knowledgePoints', amount: 100 }, condition: (_s, p) => (p?.streak ?? 0) >= 10 },
  { id: 'ach_minigame_20', event: 'minigame', title: '小游戏常客', description: '累计玩 20 局小游戏', badge: '🕹️', reward: { currency: 'animeGachaTickets', amount: 2 }, condition: (s) => s.minigameTotal >= 20 },
  // 爬塔
  { id: 'ach_tower_5', event: 'tower', title: '登塔者', description: '通过挑战塔第 5 层', badge: '🗼', reward: { currency: 'knowledgePoints', amount: 50 }, condition: (s) => s.maxTowerFloor >= 5 },
  { id: 'ach_tower_20', event: 'tower', title: '登峰造极', description: '通过挑战塔第 20 层', badge: '🏔️', reward: { currency: 'animeGachaTickets', amount: 3 }, condition: (s) => s.maxTowerFloor >= 20 },
  // 图鉴
  { id: 'ach_codex_milestone', event: 'codex', title: '收藏家', description: '达成任意图鉴里程碑', badge: '📚', reward: { currency: 'knowledgePoints', amount: 50 }, condition: (_s, p) => !!p?.milestoneId },
];

export function getAchievementById(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find(a => a.id === id);
}
