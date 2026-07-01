/**
 * 角色养成规则 —— 纯函数（S4 自 userStore / NurtureActions 提取；S13-C1 改加点制；S14-A SA-T3 改确定成长）。
 * 等级曲线、升级确定加点（按角色 base 五维比例分配）、瘦身版默认数据工厂。
 * 训练/属性/强化相关函数已随 S13-C1 养成精简删除。
 */
import type { CharacterNurtureData, StatPoints } from '@/types/nurture';
import type { RNG } from '../rng';

/** 角色等级上限。 */
export const MAX_CHARACTER_LEVEL = 100;

/** 每升一级分配的加点总数（可调；起 10）。按角色 base 五维比例确定分配到 5 战斗维。 */
export const POINTS_PER_LEVEL = 10;

/**
 * 混合分配保底比例（SA-T3）：每级点数的这一份按 5 维均分（防极端偏科），
 * 其余按角色 base 五维比例倾斜分配。0 = 纯 base 比例、1 = 纯均分。
 * 取 0.3：多数按 base 倾斜（定位鲜明），少数均分兜底（不至于某维为 0）。
 */
export const BASE_TILT_EVEN_SHARE = 0.3;

const STAT_KEYS = ['hp', 'atk', 'def', 'sp', 'spd'] as const;

/** 升到 level 级所需总经验 = (level-1)² × 1000。 */
export function getRequiredExpForLevel(level: number): number {
  if (level <= 1) return 0;
  return (level - 1) * (level - 1) * 1000;
}

/** 由总经验反推等级。 */
export function getLevelFromExp(totalExp: number): number {
  let level = 1;
  while (getRequiredExpForLevel(level + 1) <= totalExp) {
    level++;
  }
  return level;
}

export interface LevelProgress {
  current: number;
  required: number;
  percentage: number;
}

/** 当前等级内的经验进度。 */
export function getLevelProgress(level: number, totalExp: number): LevelProgress {
  const currentLevelExpStart = getRequiredExpForLevel(level);
  const nextLevelExpStart = getRequiredExpForLevel(level + 1);

  const currentLevelExp = Math.max(0, totalExp - currentLevelExpStart);
  const requiredForNext = nextLevelExpStart - currentLevelExpStart;
  const percentage = requiredForNext > 0 ? (currentLevelExp / requiredForNext) * 100 : 0;

  return {
    current: currentLevelExp,
    required: requiredForNext,
    percentage: Math.min(100, Math.max(0, percentage)),
  };
}

/** 空加点（新角色 / 旧档迁移缺省）。 */
export function createEmptyStatPoints(): StatPoints {
  return { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
}

/**
 * 把 totalPoints 点随机分配到 5 战斗维（hp/atk/def/sp/spd）：逐点随机投放。
 * 注入 RNG，同种子可复现。总和恒等于输入点数，各项非负。
 *
 * ⚠️ SA-T3 后升级加点已改走确定分配（distributeStatPointsByBase / rollLevelUpStatPoints）。
 * 本随机函数不再用于升级路径，仅保留供潜在随机场景/兼容——升级确定路径不依赖它、不依赖 RNG。
 */
export function distributeRandomStatPoints(totalPoints: number, rng: RNG): StatPoints {
  const distribution = createEmptyStatPoints();
  let remaining = Math.max(0, Math.floor(totalPoints));
  while (remaining > 0) {
    const stat = STAT_KEYS[rng.int(STAT_KEYS.length)];
    distribution[stat]++;
    remaining--;
  }
  return distribution;
}

/**
 * 按权重把整数 totalPoints 确定分配到 5 战斗维：最大余数法（Hare quota），
 * 保证「总和恒等于 totalPoints、结果与权重顺序无关、各项非负」，纯函数无随机。
 * 权重全 0（异常）时退化为均分。tie-break 用固定 STAT_KEYS 顺序，确保可复现。
 */
function allocateByWeights(totalPoints: number, weights: Record<(typeof STAT_KEYS)[number], number>): StatPoints {
  const result = createEmptyStatPoints();
  if (totalPoints <= 0) return result;

  const safeWeights = STAT_KEYS.map(key => Math.max(0, weights[key]));
  let weightSum = safeWeights.reduce((sum, w) => sum + w, 0);
  const effectiveWeights = weightSum > 0 ? safeWeights : STAT_KEYS.map(() => 1);
  if (weightSum <= 0) weightSum = STAT_KEYS.length;

  // 第一轮：向下取整的保底份额
  const remainders: { key: (typeof STAT_KEYS)[number]; remainder: number }[] = [];
  let assigned = 0;
  STAT_KEYS.forEach((key, i) => {
    const exact = (totalPoints * effectiveWeights[i]) / weightSum;
    const floorShare = Math.floor(exact);
    result[key] = floorShare;
    assigned += floorShare;
    remainders.push({ key, remainder: exact - floorShare });
  });

  // 第二轮：把剩余点数按余数从大到小补齐（tie 用 STAT_KEYS 固定顺序，稳定排序）
  let leftover = totalPoints - assigned;
  remainders.sort((a, b) =>
    b.remainder - a.remainder || STAT_KEYS.indexOf(a.key) - STAT_KEYS.indexOf(b.key),
  );
  for (let i = 0; leftover > 0; i = (i + 1) % remainders.length) {
    result[remainders[i].key]++;
    leftover--;
  }

  return result;
}

/**
 * 把 totalPoints 点确定分配到 5 战斗维（SA-T3）：混合权重的单次最大余数分配 =
 *   每维有效权重 = 均分份额（BASE_TILT_EVEN_SHARE × 1/5，防极端偏科）
 *                + 倾斜份额（(1-BASE_TILT_EVEN_SHARE) × base_i/baseSum，按定位倾斜）。
 * base 高 def 者有效权重自然偏 def——无需 role/archetype 正则（P2-7 已证正则频繁误判）。
 * 单次分配（而非均分+倾斜两趟叠加）避免 tie-break 偏置累加：均衡 base 会得到干净均分。
 * 纯函数、无随机、总和恒等于 totalPoints；base 缺省/全 0 时退化为纯均分。
 */
export function distributeStatPointsByBase(totalPoints: number, baseStats: StatPoints): StatPoints {
  const total = Math.max(0, Math.floor(totalPoints));
  if (total <= 0) return createEmptyStatPoints();

  const baseValues = STAT_KEYS.map(key => Math.max(0, baseStats[key]));
  const baseSum = baseValues.reduce((sum, v) => sum + v, 0);
  const evenShare = BASE_TILT_EVEN_SHARE / STAT_KEYS.length;
  const tiltFactor = 1 - BASE_TILT_EVEN_SHARE;

  const weights: Record<(typeof STAT_KEYS)[number], number> = { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 };
  STAT_KEYS.forEach((key, i) => {
    const tiltShare = baseSum > 0 ? tiltFactor * (baseValues[i] / baseSum) : tiltFactor / STAT_KEYS.length;
    weights[key] = evenShare + tiltShare; // 各维权重和恒为 1
  });

  return allocateByWeights(total, weights);
}

/**
 * 升级 oldLevel → newLevel 期间累计的确定加点（每升一级按 base 比例分配 POINTS_PER_LEVEL 点）。
 * 用于把多级跳跃一次性结算成一份加点增量；确定分配 → 同角色同 base 同等级差结果可复现。
 * 每级独立分配再累加（而非一次性分配 N×POINTS_PER_LEVEL），保证逐级观感与单级一致。
 */
export function rollLevelUpStatPoints(oldLevel: number, newLevel: number, baseStats: StatPoints): StatPoints {
  const gain = createEmptyStatPoints();
  const perLevel = distributeStatPointsByBase(POINTS_PER_LEVEL, baseStats);
  const levels = Math.max(0, newLevel - oldLevel);
  gain.hp = perLevel.hp * levels;
  gain.atk = perLevel.atk * levels;
  gain.def = perLevel.def * levels;
  gain.sp = perLevel.sp * levels;
  gain.spd = perLevel.spd * levels;
  return gain;
}

/** 新角色的默认养成数据（瘦身两轴 + 空加点）。 */
export function createDefaultNurtureData(): CharacterNurtureData {
  return {
    affection: 0,
    lastInteraction: '',
    level: 1,
    experience: 0,
    totalExperience: 0,
    statPoints: createEmptyStatPoints(),
    claimedBondMilestones: [],
  };
}
