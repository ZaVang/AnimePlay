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
import { computeBondBonus, type BondHit } from '@/engine';

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

// ── 家具 / 布局（S15-T2，存档 v20）：KP → 家具 → 小额 comfort + 看得见的所有权 ──
// 设计意图（守顶部「回归补充、不盖过主动收入」基线）：
//  - 家具是继设施之后的**第二条 KP sink**——设施是无底指数 sink（数值更快），家具是有限 buy-out
//    sink（广度：一次性买断 + 看得见的所有权），两者互补。
//  - 加成口径 = **只贡献 comfort**，复用既有 comfort 软加成轴（comfortBonusPct，每 10 点 +1% 封顶 +20%）：
//    摆放的家具 comfort 合计并入传给 computeIdleYield 的 effect.comfort（与装备 comfort 相加），
//    **零新增口径、零新乘子、不改 computeIdleYield 签名**（拍板-A）。语义：摆家具→基地更舒适→全产出小幅提升。
//  - 家具与装备共用同一 comfort→+20% 硬顶**是有意的**（守挂机基线，别给家具单开突破口径）。

/** 静态家具定义（目录项，纯数据，名梗风，仿 EQUIPMENT_CATALOG）。 */
export interface FurnitureDef {
  /** 目录内唯一 id（存档以此持久化「已拥有 / 已摆放」）。 */
  id: string;
  /** 展示名（名梗风）。 */
  name: string;
  /** 摆放后贡献的舒适度分（与装备 comfort 同轴，经 comfortBonusPct 消费）。 */
  comfort: number;
  /** 知识点兑换价（走 profile.spend；一次性买断）。 */
  cost: number;
}

/**
 * 家具目录（仿 EQUIPMENT_CATALOG 纯数据）。名梗风、comfort/cost 阶梯递增。
 * comfort 预算温和：全套齐摆约 60 点（floor(60/10)×1% = +6% 全产出），远不足以单独触 +20% 硬顶——
 * 与装备 comfort 相加共用同一软加成轴才是设计意图（守挂机基线）。cost 从入门到高端拉开梯度（承接 KP sink）。
 */
export const FURNITURE_CATALOG: readonly FurnitureDef[] = [
  { id: 'fn_beanbag', name: '瘫痪懒人沙发', comfort: 3, cost: 300 },
  { id: 'fn_kotatsu', name: '续命暖桌', comfort: 5, cost: 600 },
  { id: 'fn_bookshelf', name: '设定集书墙', comfort: 6, cost: 1000 },
  { id: 'fn_figure_shelf', name: '手办展示柜', comfort: 8, cost: 1800 },
  { id: 'fn_arcade', name: '街机一号机', comfort: 10, cost: 3000 },
  { id: 'fn_hotspring', name: '温泉泡澡桶', comfort: 12, cost: 5000 },
  { id: 'fn_shrine', name: '祈愿绘马神社', comfort: 16, cost: 9000 },
];

/** 已摆放家具数量上限（防脏档摆放清单无限膨胀放大 comfort）。=目录条数（首版全摆即封顶）。 */
export const FURNITURE_PLACED_MAX = FURNITURE_CATALOG.length;

/** defId → 定义的查表（懒建，供 store/UI/纯函数共用）。 */
const FURNITURE_BY_ID: ReadonlyMap<string, FurnitureDef> = new Map(FURNITURE_CATALOG.map(d => [d.id, d]));

/** 取某家具定义（未知 id → undefined）。 */
export function getFurnitureDef(id: string): FurnitureDef | undefined {
  return FURNITURE_BY_ID.get(id);
}

/**
 * 规整家具 id 清单（拥有 / 摆放共用）：只收目录内已知的字符串 id、去重、截断到 FURNITURE_PLACED_MAX。
 * 存档边界（迁移 + 反序列化）与运行期共用——杜绝脏档/篡改用未知 id 或重复项放大 comfort
 * （与 canonicalizePlacedIds 同型）。未知 id 直接丢弃（不进目录不给 comfort）。
 */
export function canonicalizeFurnitureIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === 'string' && FURNITURE_BY_ID.has(x) && !seen.has(x)) {
      seen.add(x);
      out.push(x);
      if (out.length >= FURNITURE_PLACED_MAX) break;
    }
  }
  return out;
}

/**
 * 纯函数：摆放家具 id 清单 → comfort 合计（查目录求和；未知 id 计 0）。
 * **这是「家具加成经既有口径汇入」的关键**——settle/UI 把此合计加进 effect.comfort，
 * computeIdleYield 内部 comfortBonusPct 天然消费，无须改签名（拍板-A）。
 */
export function sumFurnitureComfort(
  placedFurnitureIds: readonly string[],
  catalog: readonly FurnitureDef[] = FURNITURE_CATALOG,
): number {
  const byId = catalog === FURNITURE_CATALOG ? FURNITURE_BY_ID : new Map(catalog.map(d => [d.id, d]));
  let total = 0;
  for (const id of placedFurnitureIds) {
    const def = byId.get(id);
    if (def) total += Math.max(0, def.comfort);
  }
  return total;
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

/**
 * ★ SF-T5 平滑软化封顶（替换旧 Math.min 硬顶断崖）：softCap(x, cap) = cap·(1 − e^(−x/cap))。
 *  - 对 x 严格单调递增（边际 = e^(−x/cap) > 0，永不出现「加装备反降收益」），无断崖；
 *  - x→∞ 渐近上界 = cap（≈0.6 量级，守「挂机不盖过主动收入」）、任意 x 恒 < cap（渐近达不到）；
 *  - 小 x 近似线性（softCap(x,cap) ≈ x − x²/(2cap)，x≪cap 时 ≈ x）——低堆叠感知与原硬顶几乎一致。
 * 与旧 Math.min 的区别：触顶后同向装备边际不再=0（断崖消除），S14-E 装备深度不再自我抵消。
 * 只软化**装备 pct**；设施乘区/comfort 软加成是独立乘子，不进本函数（决策-5/-6）。
 */
export function softCap(value: number | undefined, cap: number): number {
  if (!(value && value > 0) || !(cap > 0)) return 0;
  return cap * (1 - Math.exp(-value / cap));
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
  /** ★ S15-T3 入住羁绊命中清单（供 UI 显形；无命中为空数组）。 */
  bondHits: BondHit[];
  /** ★ S15-T3 羁绊队伍级加成倍率增量（已封顶，全产出通乘 1+bondBonusPct）。 */
  bondBonusPct: number;
}

/**
 * 纯计算：给定入住角色的稀有度列表 + 离线毫秒数 → 挂机收益（不落地）。
 * 经验/好感对每个角色是同一 flat 速率；知识点按各自稀有度系数加权求和。
 * 便于特征测试，且将来若上权威服务端可复用同一口径。
 *
 * ★ S15-T3 入住羁绊：`placedAnimeNames`（逐入住角色 anime_names，可缺可空）派生出**队伍级独立乘子**
 * `1+bondBonusPct`，与 comfort/设施同层通乘全产出（经既有口径汇入，settle 严禁另拼）。
 * 派生源缺失/0-1 入住 → 不命中不加成、不抛错（容忍）；命中给固定档、整体硬上限（不组合爆炸）。
 * 不破 `...Each` 单值接口；`bondHits` 仅供 UI 显形（预览=结算同源）。
 */
export function computeIdleYield(
  placedRarities: readonly Rarity[],
  elapsedMs: number,
  effect: EquipmentHomeEffect = {},
  facilityLevels?: FacilityLevels,
  placedAnimeNames?: ReadonlyArray<readonly string[] | undefined | null>,
): IdleYield {
  // 羁绊派生（纯函数、免存档、容忍缺失）：即便未挂机也算命中清单供 UI 显形。
  const bond = computeBondBonus(placedAnimeNames ?? []);
  // 封顶随设施总级数抬升（决策-7）；口径同源命脉：UI 与结算都喂同一 facilityLevels。
  const hours = cappedIdleHours(elapsedMs, facilityLevels);
  const count = placedRarities.length;
  const comfort = Math.max(0, Math.floor(effect.comfort ?? 0));
  if (hours <= 0 || count === 0) {
    return {
      hours: 0, expEach: 0, affectionEach: 0, knowledge: 0, characterCount: count, comfort,
      bondHits: bond.hits, bondBonusPct: bond.bonusPct,
    };
  }
  // comfort 软加成（每 10 点 +1%，封顶 +20%）：全产出通乘（决策-6）。
  const comfortMult = 1 + comfortBonusPct(comfort);
  // 羁绊乘子：队伍级独立乘子，全产出通乘（已在 engine 侧硬上限，守「挂机不盖过主动收入」基线）。
  const bondMult = 1 + bond.bonusPct;
  // 设施乘区：独立乘子，不受装备 0.6 cap 钳制（决策-5）。Lv.1=×1。
  const facExp = 1 + (facilityLevels ? facilityBonusPct(facilityLevels.exp) : 0);
  const facBond = 1 + (facilityLevels ? facilityBonusPct(facilityLevels.bond) : 0);
  const facKp = 1 + (facilityLevels ? facilityBonusPct(facilityLevels.knowledge) : 0);
  const expMult = (1 + softCap(effect.expPct, HOMESTEAD_EFFECT_CAP.expPct)) * facExp * comfortMult * bondMult;
  const affectionMult = (1 + softCap(effect.affectionPct, HOMESTEAD_EFFECT_CAP.affectionPct)) * facBond * comfortMult * bondMult;
  const knowledgeMult = (1 + softCap(effect.knowledgePct, HOMESTEAD_EFFECT_CAP.knowledgePct)) * facKp * comfortMult * bondMult;
  const expEach = Math.floor(IDLE_EXP_PER_HOUR * hours * expMult);
  const affectionEach = Math.floor(IDLE_AFFECTION_PER_HOUR * hours * affectionMult);
  const baseKnowledge = placedRarities.reduce(
    (sum, r) => sum + IDLE_KP_PER_HOUR_BASE * (IDLE_KP_RARITY_MULT[r] ?? 1) * hours,
    0,
  );
  const knowledge = Math.floor(baseKnowledge * knowledgeMult);
  return {
    hours, expEach, affectionEach, knowledge, characterCount: count, comfort,
    bondHits: bond.hits, bondBonusPct: bond.bonusPct,
  };
}
