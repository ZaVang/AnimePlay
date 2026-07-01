/**
 * 家园挂机经济常量（S13-B）。集中可调；改这里即调平挂机产出。
 *
 * 设计基线（见 docs/FUTURE.md S13）：挂机是「回归补充」，绝不盖过主动收入
 * （塔约 25+层×5 KP/趟、看番、小游戏），也不架空图鉴解锁大 sink（UR=12000 KP）。
 * 满挂机一次（6 角色混合 ≈18 KP/h × 12h 封顶）≈216 KP，约等于一趟塔的零头。
 *
 * 产出去向：经验/好感写进既有 nurtureData（经 store action）；知识点走 profile.earn。
 * 经验→升级→随机加点（statPoints，S13-C1 加点制），好感→关系仪表/里程碑，两轴互不蚕食。
 */
import type { Rarity } from '@/types/card';
import type { EquipmentHomeEffect } from './equipment';

/** 入住槽位上限（>小队的 4，可放下主力阵容）。只有入住角色挂机成长。 */
export const HOMESTEAD_SLOTS = 6;

/**
 * 规整入住名单：只收有限数字、去重、截断到 HOMESTEAD_SLOTS。
 * 存档边界（迁移 + 反序列化）与运行期共用——杜绝脏档/篡改放入重复或超额角色，
 * 否则 settleHomestead 会按出现次数重复加经验/好感、按重复稀有度放大知识点。
 */
export function canonicalizePlacedIds(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<number>();
  const out: number[] = [];
  for (const x of raw) {
    if (typeof x === 'number' && Number.isFinite(x) && !seen.has(x)) {
      seen.add(x);
      out.push(x);
      if (out.length >= HOMESTEAD_SLOTS) break;
    }
  }
  return out;
}

/** 离线产出封顶时长（小时）：超过这个时长的离线不再累积，即软节流。 */
export const OFFLINE_CAP_HOURS = 12;

// ── 设施（S14-D SD-T1/SD-T5）：三设施用 KP 可升级，每级抬升对应单一产出乘区 ──
// 设计意图（守顶部「回归补充、不盖过主动收入」基线）：
//  - 加成温和（每级 +8% 线性），成本指数递增无硬上限 → 顺带承载一条无底 KP sink（SD-T5）。
//  - 设施乘区是**独立乘子**，不折进装备 effect.pct、不受 HOMESTEAD_EFFECT_CAP(0.6) 钳制，
//    否则升满设施也只到 +60%、无底 sink 失去意义（Scout 新坑 C-1 / 决策-5）。

/** 三设施 key，对齐 HomesteadView.facilityRows：exp=训练区↑经验 / bond=休息区↑好感 / knowledge=资料室↑知识点。 */
export type FacilityKey = 'exp' | 'bond' | 'knowledge';
export const FACILITY_KEYS: readonly FacilityKey[] = ['exp', 'bond', 'knowledge'];

/** 设施初始等级（Lv.1 = +0% 乘区）。禁止 Lv.0=关闭产出（旧档补 Lv.0 会让现有玩家挂机归零，决策-3）。 */
export const FACILITY_MIN_LEVEL = 1;
/** 设施等级上限（极高，实质无硬上限，配合指数成本承载无底 sink）。 */
export const FACILITY_MAX_LEVEL = 99;
/** 每设施每级对**对应单一产出**的线性加成（Lv.1=+0%，Lv.N=(N-1)×此值）。温和：8%。 */
export const FACILITY_BONUS_PER_LEVEL = 0.08;
/** 升级成本：base × growth^(level-1)（level 为当前级，升到 level+1 的花费）。growth>1 = 指数递增无硬上限（SD-T5）。 */
export const FACILITY_UPGRADE_COST_BASE = 120;
export const FACILITY_UPGRADE_COST_GROWTH = 1.4;
/** 离线时长封顶随设施总级数抬升：每升一级 +0.5h（Lv.1×3=基线 12h，决策-7）。 */
export const OFFLINE_CAP_HOURS_PER_FACILITY_LEVEL = 0.5;

/** comfort 软加成（决策-6）：每 10 点 comfort → 全产出 +1%，封顶 +20%。 */
export const COMFORT_BONUS_PER_10 = 0.01;
export const COMFORT_BONUS_CAP = 0.2;

/** 三设施等级（运行期与结算同源喂进 computeIdleYield）。 */
export type FacilityLevels = Record<FacilityKey, number>;

/** 把任意（可能脏）设施等级钳到 [FACILITY_MIN_LEVEL, FACILITY_MAX_LEVEL] 的整数。 */
export function clampFacilityLevel(raw: unknown): number {
  const n = typeof raw === 'number' && Number.isFinite(raw) ? Math.floor(raw) : FACILITY_MIN_LEVEL;
  return Math.min(FACILITY_MAX_LEVEL, Math.max(FACILITY_MIN_LEVEL, n));
}

/** 全设施 Lv.1 的默认等级表（新档/旧档迁移补默认都用它，决策-3）。 */
export function defaultFacilityLevels(): FacilityLevels {
  return { exp: FACILITY_MIN_LEVEL, bond: FACILITY_MIN_LEVEL, knowledge: FACILITY_MIN_LEVEL };
}

/** 设施等级 → 对应单一产出乘区（Lv.1=0，Lv.N=(N-1)×8%）。纯计算，随级递增。 */
export function facilityBonusPct(level: number): number {
  const lv = clampFacilityLevel(level);
  return (lv - FACILITY_MIN_LEVEL) * FACILITY_BONUS_PER_LEVEL;
}

/** 从当前级升到下一级的 KP 花费（指数递增，第 N 级成本 > 第 N-1 级）。已满级返回 Infinity。 */
export function facilityUpgradeCost(currentLevel: number): number {
  const lv = clampFacilityLevel(currentLevel);
  if (lv >= FACILITY_MAX_LEVEL) return Infinity;
  return Math.round(FACILITY_UPGRADE_COST_BASE * Math.pow(FACILITY_UPGRADE_COST_GROWTH, lv - FACILITY_MIN_LEVEL));
}

/** comfort → 全产出软加成倍率增量（每 10 点 +1%，封顶 +20%）。 */
export function comfortBonusPct(comfort: number): number {
  const c = Math.max(0, Math.floor(comfort));
  return Math.min(COMFORT_BONUS_CAP, Math.floor(c / 10) * COMFORT_BONUS_PER_10);
}

/** 有效离线封顶小时数：基线 12h + 三设施总级数×0.5h（决策-7）。 */
export function offlineCapHours(levels?: FacilityLevels): number {
  if (!levels) return OFFLINE_CAP_HOURS;
  const total = FACILITY_KEYS.reduce((s, k) => s + clampFacilityLevel(levels[k]), 0);
  return OFFLINE_CAP_HOURS + total * OFFLINE_CAP_HOURS_PER_FACILITY_LEVEL;
}

/** 每个入住角色每小时产出（可调）。 */
export const IDLE_EXP_PER_HOUR = 200;
export const IDLE_AFFECTION_PER_HOUR = 5;
export const IDLE_KP_PER_HOUR_BASE = 2;

/** 离线收益弹窗的最小展示门槛（小时）：低于此的零碎收益静默入账（只发日志），
 *  不打断频繁进出（约 13 分钟即得 +1 经验，避免切页几分钟回来就被全屏弹窗拦）。 */
export const IDLE_SETTLE_MODAL_MIN_HOURS = 0.5;

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

/**
 * 装备对家园挂机收益的倍率上限。装备效果要让玩家有选择，但挂机仍是回归补充，
 * 不能盖过挑战塔/小游戏/看番等主动玩法。
 */
export const HOMESTEAD_EFFECT_CAP: Required<Pick<EquipmentHomeEffect, 'expPct' | 'affectionPct' | 'knowledgePct'>> = {
  expPct: 0.6,
  affectionPct: 0.6,
  knowledgePct: 0.6,
};

function cappedPct(value: number | undefined, cap: number): number {
  if (!(value && value > 0)) return 0;
  return Math.min(value, cap);
}

/**
 * 把一段离线毫秒数钳到封顶，换算成"有效小时数"（结算用）。
 * 传入设施等级则封顶随总级数抬升（决策-7）；不传沿用基线 12h（旧调用向后兼容）。
 */
export function cappedIdleHours(elapsedMs: number, facilityLevels?: FacilityLevels): number {
  if (!(elapsedMs > 0)) return 0;
  const capH = offlineCapHours(facilityLevels);
  const capped = Math.min(elapsedMs, capH * MS_PER_HOUR);
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
  /** 入住角色已装备道具贡献的家园舒适度。 */
  comfort: number;
}

/**
 * 纯计算：给定入住角色的稀有度列表 + 离线毫秒数 → 挂机收益（不落地）。
 * 经验/好感对每个角色是同一 flat 速率；知识点按各自稀有度系数加权求和。
 * 便于特征测试，且将来若上权威服务端可复用同一口径。
 */
export function computeIdleYield(
  placedRarities: readonly Rarity[],
  elapsedMs: number,
  effect: EquipmentHomeEffect = {},
  facilityLevels?: FacilityLevels,
): IdleYield {
  // 封顶随设施总级数抬升（决策-7）；口径同源命脉：UI 与结算都喂同一 facilityLevels。
  const hours = cappedIdleHours(elapsedMs, facilityLevels);
  const count = placedRarities.length;
  const comfort = Math.max(0, Math.floor(effect.comfort ?? 0));
  if (hours <= 0 || count === 0) {
    return { hours: 0, expEach: 0, affectionEach: 0, knowledge: 0, characterCount: count, comfort };
  }
  // comfort 软加成（每 10 点 +1%，封顶 +20%）：全产出通乘（决策-6）。
  const comfortMult = 1 + comfortBonusPct(comfort);
  // 设施乘区：独立乘子，不受装备 0.6 cap 钳制（决策-5）。Lv.1=×1。
  const facExp = 1 + (facilityLevels ? facilityBonusPct(facilityLevels.exp) : 0);
  const facBond = 1 + (facilityLevels ? facilityBonusPct(facilityLevels.bond) : 0);
  const facKp = 1 + (facilityLevels ? facilityBonusPct(facilityLevels.knowledge) : 0);
  const expMult = (1 + cappedPct(effect.expPct, HOMESTEAD_EFFECT_CAP.expPct)) * facExp * comfortMult;
  const affectionMult = (1 + cappedPct(effect.affectionPct, HOMESTEAD_EFFECT_CAP.affectionPct)) * facBond * comfortMult;
  const knowledgeMult = (1 + cappedPct(effect.knowledgePct, HOMESTEAD_EFFECT_CAP.knowledgePct)) * facKp * comfortMult;
  const expEach = Math.floor(IDLE_EXP_PER_HOUR * hours * expMult);
  const affectionEach = Math.floor(IDLE_AFFECTION_PER_HOUR * hours * affectionMult);
  const baseKnowledge = placedRarities.reduce(
    (sum, r) => sum + IDLE_KP_PER_HOUR_BASE * (IDLE_KP_RARITY_MULT[r] ?? 1) * hours,
    0,
  );
  const knowledge = Math.floor(baseKnowledge * knowledgeMult);
  return { hours, expEach, affectionEach, knowledge, characterCount: count, comfort };
}
