/**
 * Wrapped 成绩卡数据聚合（E3-T2）—— 纯函数，零 Vue/Pinia/DOM 依赖。
 * 输入是从各 store 读出的快照（plain object），输出是成绩卡视图模型。
 * 抽成纯函数是为了可单测（特征测试覆盖这里）；ShareCard.vue 负责把 live store 喂进来。
 *
 * 不触发存档、不写任何状态——纯读派生。
 */
import type { Rarity } from '@/types/card';

/** 单域完成度快照（来自 codex.animeCompletion / characterCompletion）。 */
export interface CompletionSnapshot {
  owned: number;
  total: number;
  byRarity: Record<Rarity, { owned: number; total: number }>;
}

/** 一条抽卡历史（来自 gachaStore.animeHistory / characterHistory）。 */
export interface HistoryEntry {
  rarity: Rarity;
  timestamp: number;
}

/** 聚合输入：从 store 读出的原始快照。 */
export interface WrappedInput {
  username: string;
  level: number;
  knowledgePoints: number;
  animeCompletion: CompletionSnapshot;
  characterCompletion: CompletionSnapshot;
  /** 已解锁成就数 / 成就总数。 */
  achievementsUnlocked: number;
  achievementsTotal: number;
  /** 已领图鉴里程碑数。 */
  milestonesClaimed: number;
  /** 挑战塔最高层。 */
  towerMaxFloor: number;
  /** 拥有的不同卡种数（animeCollection.size + characterCollection.size）。 */
  uniqueCardsOwned: number;
  /** 全部抽卡历史（动画 + 角色合并）。 */
  history: HistoryEntry[];
  /** 「本月」基准时间戳（默认 Date.now()，测试可注入）。 */
  now?: number;
}

/** 成绩卡视图模型：成绩卡 UI / Canvas 直接读这里。 */
export interface WrappedStats {
  username: string;
  level: number;
  knowledgePoints: number;
  /** 图鉴总完成度百分比（动画 + 角色合并，0-100 整数）。 */
  codexPercent: number;
  codexOwned: number;
  codexTotal: number;
  /** 动画 UR 收集 owned/total。 */
  animeUr: { owned: number; total: number };
  /** 角色 UR 收集 owned/total。 */
  characterUr: { owned: number; total: number };
  achievementsUnlocked: number;
  achievementsTotal: number;
  milestonesClaimed: number;
  towerMaxFloor: number;
  uniqueCardsOwned: number;
  /** 累计抽卡次数（历史总条数）。 */
  totalPulls: number;
  /** 历史中 UR 总数（欧气）。 */
  urPulls: number;
  /** 本月（近 30 天）抽到的 UR 数（近期欧气）。 */
  urThisMonth: number;
  /** 高稀有率：UR+HR+SSR 占总抽数百分比（0-100 整数；无历史为 0）。 */
  luckyPercent: number;
}

function safePercent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/** 把 store 快照聚合成成绩卡视图模型（纯函数）。 */
export function buildWrappedStats(input: WrappedInput): WrappedStats {
  const now = input.now ?? Date.now();

  const codexOwned = input.animeCompletion.owned + input.characterCompletion.owned;
  const codexTotal = input.animeCompletion.total + input.characterCompletion.total;

  const animeUr = input.animeCompletion.byRarity.UR ?? { owned: 0, total: 0 };
  const characterUr = input.characterCompletion.byRarity.UR ?? { owned: 0, total: 0 };

  const totalPulls = input.history.length;
  let urPulls = 0;
  let urThisMonth = 0;
  let highRarity = 0;
  for (const h of input.history) {
    if (h.rarity === 'UR') {
      urPulls++;
      if (now - h.timestamp <= MONTH_MS) urThisMonth++;
    }
    if (h.rarity === 'UR' || h.rarity === 'HR' || h.rarity === 'SSR') highRarity++;
  }

  return {
    username: input.username,
    level: input.level,
    knowledgePoints: input.knowledgePoints,
    codexPercent: safePercent(codexOwned, codexTotal),
    codexOwned,
    codexTotal,
    animeUr: { owned: animeUr.owned, total: animeUr.total },
    characterUr: { owned: characterUr.owned, total: characterUr.total },
    achievementsUnlocked: input.achievementsUnlocked,
    achievementsTotal: input.achievementsTotal,
    milestonesClaimed: input.milestonesClaimed,
    towerMaxFloor: input.towerMaxFloor,
    uniqueCardsOwned: input.uniqueCardsOwned,
    totalPulls,
    urPulls,
    urThisMonth,
    luckyPercent: safePercent(highRarity, totalPulls),
  };
}
