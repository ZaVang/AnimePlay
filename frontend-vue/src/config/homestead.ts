/**
 * 家园挂机经济常量（S13-B）。集中可调；改这里即调平挂机产出。
 *
 * 设计基线（见 docs/FUTURE.md S13）：挂机是「回归补充」，绝不盖过主动收入
 * （塔约 25+层×5 KP/趟、看番、小游戏），也不架空图鉴解锁大 sink（UR=12000 KP）。
 * 满挂机一次（6 角色混合 ≈18 KP/h × 12h 封顶）≈216 KP，约等于一趟塔的零头。
 *
 * 产出去向：经验/好感写进既有 nurtureData（经 store action）；知识点走 profile.earn。
 * 等级路径（经验→升级→levelBonusAttributes）与主动训练的属性/战斗强化路径互不蚕食。
 */
import type { Rarity } from '@/types/card';

/** 入住槽位上限（>小队的 4，可放下主力阵容）。只有入住角色挂机成长。 */
export const HOMESTEAD_SLOTS = 6;

/** 离线产出封顶时长（小时）：超过这个时长的离线不再累积，即软节流。 */
export const OFFLINE_CAP_HOURS = 12;

/** 每个入住角色每小时产出（可调）。 */
export const IDLE_EXP_PER_HOUR = 200;
export const IDLE_AFFECTION_PER_HOUR = 5;
export const IDLE_KP_PER_HOUR_BASE = 2;

/** 知识点产出的稀有度系数：越稀有产得越多（奖励把好角色放进家园）。 */
export const IDLE_KP_RARITY_MULT: Record<Rarity, number> = {
  N: 0.5,
  R: 0.8,
  SR: 1,
  SSR: 1.5,
  HR: 2,
  UR: 3,
};

const MS_PER_HOUR = 3600_000;

/** 把一段离线毫秒数钳到封顶，换算成"有效小时数"（结算用）。 */
export function cappedIdleHours(elapsedMs: number): number {
  if (!(elapsedMs > 0)) return 0;
  const capped = Math.min(elapsedMs, OFFLINE_CAP_HOURS * MS_PER_HOUR);
  return capped / MS_PER_HOUR;
}

/** 一次离线结算的收益（纯计算结果，未落地）。 */
export interface IdleYield {
  /** 有效小时数（已封顶）。 */
  hours: number;
  /** 每个入住角色获得的经验（同值，flat 速率）。 */
  expEach: number;
  /** 每个入住角色获得的好感（同值，flat 速率）。 */
  affectionEach: number;
  /** 全员合计知识点（按各自稀有度加权后取整）。 */
  knowledge: number;
  /** 参与结算的入住角色数。 */
  characterCount: number;
}

/**
 * 纯计算：给定入住角色的稀有度列表 + 离线毫秒数 → 挂机收益（不落地）。
 * 经验/好感对每个角色是同一 flat 速率；知识点按各自稀有度系数加权求和。
 * 便于特征测试，且将来若上权威服务端可复用同一口径。
 */
export function computeIdleYield(placedRarities: readonly Rarity[], elapsedMs: number): IdleYield {
  const hours = cappedIdleHours(elapsedMs);
  const count = placedRarities.length;
  if (hours <= 0 || count === 0) {
    return { hours: 0, expEach: 0, affectionEach: 0, knowledge: 0, characterCount: count };
  }
  const expEach = Math.floor(IDLE_EXP_PER_HOUR * hours);
  const affectionEach = Math.floor(IDLE_AFFECTION_PER_HOUR * hours);
  const knowledge = Math.floor(
    placedRarities.reduce((sum, r) => sum + IDLE_KP_PER_HOUR_BASE * (IDLE_KP_RARITY_MULT[r] ?? 1) * hours, 0),
  );
  return { hours, expEach, affectionEach, knowledge, characterCount: count };
}
