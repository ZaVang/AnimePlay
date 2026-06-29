/**
 * 养成数值常量（S13-C1）。集中可调；改这里即调平养成。
 *
 * 两轴：等级（加点制）+ 好感（关系仪表/里程碑）。
 *  - 补习：角色页花知识点换经验的 KP sink（走 profile.spend → addCharacterExp）。
 *  - 带塔参战涨好感：塔战斗结算后给参战角色涨好感（与挂机好感同一字段）。
 *  - STAT_DISPLAY_REF：五维进度条软上限参考（仅显示用，不进存档、不影响战斗）。
 *  - 好感里程碑：6 档阈值 → 一次性 KP 奖励 + 羁绊称号。
 */

/** 补习：一次花费的知识点（可调）。 */
export const TUTORING_KP_COST = 100;
/** 补习：一次换得的角色经验（可调）。 */
export const TUTORING_EXP_GAIN = 500;

/** 带塔参战：塔战斗结算后给每个参战角色涨的好感（可调）。 */
export const BATTLE_AFFECTION_GAIN = 8;

/**
 * 五维进度条软上限参考（mock 定稿，可调）。
 * 条填充 = min(100%, 该围值 / 参考)；超出满条 + MAX 标记。
 * 跨角色可比、避免用绝对理论最大值导致条永远空。数值本身无硬上限（加点池 + 装备封顶）。
 * 不进存档、不影响战斗结算。
 */
export const STAT_DISPLAY_REF = {
  hp: 1500,
  atk: 800,
  def: 600,
  sp: 700,
  spd: 600,
} as const;

/** 五维显示元数据（key / 中文名 / 缩写）。 */
export const STAT_META: { key: keyof typeof STAT_DISPLAY_REF; label: string; short: string }[] = [
  { key: 'hp', label: '生命', short: 'HP' },
  { key: 'atk', label: '攻击', short: 'ATK' },
  { key: 'def', label: '防御', short: 'DEF' },
  { key: 'sp', label: '技力', short: 'SP' },
  { key: 'spd', label: '速度', short: 'SPD' },
];

/** 好感里程碑一档。 */
export interface BondMilestone {
  /** 稳定 id（已领状态持久化用）。 */
  id: string;
  /** 触发阈值（affection ≥ threshold 即可领取）。 */
  threshold: number;
  /** 一次性知识点奖励（经 profile.earn 发放）。 */
  reward: number;
  /** 羁绊称号。 */
  title: string;
}

/** 好感里程碑 6 档（阈值 / 一次性 KP 奖励 / 称号）。集中可调。 */
export const BOND_MILESTONES: readonly BondMilestone[] = [
  { id: 'bond_1', threshold: 100, reward: 50, title: '初识' },
  { id: 'bond_2', threshold: 250, reward: 100, title: '熟络' },
  { id: 'bond_3', threshold: 500, reward: 200, title: '要好' },
  { id: 'bond_4', threshold: 1000, reward: 400, title: '挚友' },
  { id: 'bond_5', threshold: 2000, reward: 800, title: '羁绊' },
  { id: 'bond_6', threshold: 4000, reward: 1500, title: '命运' },
];

/** 当前好感对应的最高已达成称号（未达任何档 → 默认）。 */
export function bondTitleFor(affection: number): string {
  let title = '陌生';
  for (const m of BOND_MILESTONES) {
    if (affection >= m.threshold) title = m.title;
  }
  return title;
}

/** 已领状态持久化的 key（写进 nurtureData 还是单列由装配层决定；此处只给稳定 id）。 */
export function isMilestoneClaimable(affection: number, claimedIds: readonly string[], m: BondMilestone): boolean {
  return affection >= m.threshold && !claimedIds.includes(m.id);
}
