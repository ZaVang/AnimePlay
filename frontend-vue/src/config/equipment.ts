/**
 * 装备系统目录与旋钮（S13-C2）。集中所有可调数据/常量；改这里即调平装备。
 *
 * 设计基线（见 docs/FUTURE.md S13-C）：
 *  - 3 固定槽 weapon/armor/supporter，任意角色可戴任意装备（无稀有度硬限制）。
 *  - 数值预算（每件总加成，hp 按 ~2.5× 折算）：R~18 / SR~35 / SSR~60 / HR~95 / UR~140。
 *    weapon 偏 atk/sp（输出）、armor 偏 hp/def（坦度）、supporter 偏 spd/sp 兼顾（节奏）。
 *  - 兑换价（知识点）R400/SR1200/SSR4000/HR10000/UR24000，每档明显高于图鉴解锁价
 *    （codexUnlock UR=12000），装备是更深的知识点 sink。
 *  - 掉落层段：1-5 → R / 6-15 → SR / 16-30 → SSR / 31-50 → HR / 51+ → UR。
 *
 * 本文件零 Vue/IO/RNG，纯数据 + 纯函数，可被 store / 组件直接引用（engine 不反向 import 本文件）。
 */
import type { Rarity } from '@/types/card';
import type { StatBonus, BattleModifiers } from '@/engine';
import { sumStatBonus } from '@/engine';

/**
 * ★ SE-T3 装备战斗 modifier 字段范围（首版子集）。
 * 只取 BattleModifiers 中「缺省为 0 的加法维」：critRate / damageUp / healUp / shieldUp。
 * critDamage（缺省 1.5 乘区基数，spread 覆盖会冲掉基数）与 damageTakenUp（负向减伤语义复杂）首版不填。
 * 语义 = 纯加区增量（叠在 BASE_CRIT_RATE 之上由 View seam 保证），求和后同类硬 clamp（见 MODIFIER_CAPS）。
 */
export type EquipModifierField = 'critRate' | 'damageUp' | 'healUp' | 'shieldUp';
export type EquipModifier = Partial<Pick<BattleModifiers, EquipModifierField>>;

/** 装备的 3 个固定槽位。 */
export type EquipmentSlot = 'weapon' | 'armor' | 'supporter';

/** 装备对家园挂机的派生效果；不进存档，由已装备目录项实时解析。 */
export interface EquipmentHomeEffect {
  /** 经验收益倍率加成，如 0.08 = +8%。 */
  expPct?: number;
  /** 好感收益倍率加成，如 0.06 = +6%。 */
  affectionPct?: number;
  /** 知识点收益倍率加成，如 0.12 = +12%。 */
  knowledgePct?: number;
  /** 家园舒适度展示分；只影响 UI/评价，不直接进存档。 */
  comfort?: number;
}

/** 静态装备定义（目录项）。bonus 为五维加成（缺省维记 0）。 */
export interface EquipmentDef {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  /** 五维加成（部分维）。求和时缺省维按 0 处理。 */
  bonus: Partial<StatBonus>;
  /** 家园挂机效果（可选；不影响挑战塔战斗公式）。 */
  homeEffect?: EquipmentHomeEffect;
  /**
   * ★ SE-T3 战斗 modifier（可选）：让装备够到五维之外的战斗旋钮（暴击/增伤/治疗/护盾）。
   * **恒定值，不随强化涨**（强化只放大五维 bonus，modifier 是静态 def 值，两条 seam 不混）。
   * 首版仅 critRate/damageUp/healUp/shieldUp 子集；经 resolveEquipModifiers 三槽求和 + clamp 后
   * 由 View seam 注入 player 侧 SquadUnitSetup.modifiers（敌方不给）。缺省不生成 modifier。
   */
  modifier?: EquipModifier;
  /**
   * ★ SE-T2 套装归属（可选）：给取向套装（攻击/坦度/节奏）打的静态标签。
   * **恒定不随强化涨、不进存档**（同 modifier?，是 EquipmentDef 静态字段，不属 EquipmentItemSave）。
   * 单角色三槽内同 setId 齐 2 / 齐 3 件由 setBonusFor 给确定性五维加法加成（不含 modifier、不套 enhancedBonus）。
   * 缺省无 setId 的装备不参与任何套装计数。
   */
  setId?: EquipmentSetId;
}

/** 槽位元数据（名 + emoji 图标键，UI 用）。 */
export const SLOT_META: Record<EquipmentSlot, { label: string; icon: string }> = {
  weapon: { label: '武器', icon: '⚔️' },
  armor: { label: '防具', icon: '🛡️' },
  supporter: { label: '支援', icon: '🎴' },
};

/** 槽位渲染顺序（UI 遍历用，固定 weapon → armor → supporter）。 */
export const SLOT_ORDER: readonly EquipmentSlot[] = ['weapon', 'armor', 'supporter'];

/** 各稀有度的定向兑换价（知识点）。明显高于图鉴解锁价，装备是更深 sink。 */
export const EQUIPMENT_PRICES: Record<'R' | 'SR' | 'SSR' | 'HR' | 'UR', number> = {
  R: 400,
  SR: 1200,
  SSR: 4000,
  HR: 10000,
  UR: 24000,
};

/** 取某稀有度的兑换价（R..UR 之外的稀有度无售卖，返回 0 视为不可购）。 */
export function getEquipmentPrice(rarity: Rarity): number {
  return (EQUIPMENT_PRICES as Record<string, number>)[rarity] ?? 0;
}

/**
 * ★ SD-T3 各稀有度分解回收的知识点（纯函数，按稀有度阶梯）。
 * 明显低于兑换价 EQUIPMENT_PRICES（约 1/8）——分解是重复件回收出口，不是套利（防「买 R 拆 R」有利可图）。
 *   R 50（兑换 400）/ SR 150（1200）/ SSR 500（4000）/ HR 1200（10000）/ UR 3000（24000）。
 * R..UR 之外的稀有度不可分解，返回 0。
 */
export const EQUIPMENT_DISMANTLE_VALUES: Record<'R' | 'SR' | 'SSR' | 'HR' | 'UR', number> = {
  R: 50,
  SR: 150,
  SSR: 500,
  HR: 1200,
  UR: 3000,
};

/** 取某稀有度分解回收的知识点（未知稀有度返回 0，视为不可分解）。 */
export function dismantleValueForRarity(rarity: Rarity): number {
  return (EQUIPMENT_DISMANTLE_VALUES as Record<string, number>)[rarity] ?? 0;
}

/* ============================================================
 * ★ SE-T1 装备强化 / 等级（P1-7，存档 v18）—— 纯数据 + 纯函数（零 RNG，确定性）。
 * 毕业曲线从「拿到即满」拉长为「拿到 → 强化到满」：每件可 Lv.0→MAX_ENHANCE，
 * 每级对该件 def.bonus 五维整体按 ENHANCE_STEP 线性抬升（逐维就近取整），满级 ≈ +40%。
 * 增益折算走唯一纯函数 enhancedBonus，resolveEquipBonus / 配装弹窗预览 / 候选展示三处同源消费
 * （防「预览≠实战」，Scout C-2）。强化燃料 = 同 defId 游离重复件 ×1 + KP（走 profile.spend）。
 * ============================================================ */

/** 强化等级上限（Lv.0→Lv.5，有限可预期，不做无限强化/军备竞赛）。 */
export const MAX_ENHANCE = 5 as const;

/** 每级五维整体增益比例（每级 +8%，满级 Lv.5 ≈ +40%；确定性线性，零 RNG）。 */
export const ENHANCE_STEP = 0.08 as const;

/** 每次强化固定消耗的同 defId 游离燃料件数（power-up 已有物心智）。 */
export const ENHANCE_FUEL_COUNT = 1 as const;

/** enhance 等级钳制到 [0, MAX_ENHANCE]（脏档/入参防放大战力，迁移与 action 共用）。 */
export function clampEnhance(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  return Math.min(MAX_ENHANCE, Math.max(0, Math.floor(raw)));
}

/**
 * ★ 强化增益折算（唯一纯函数，三处同源消费）：把静态 def.bonus 按强化等级线性抬升。
 * 每级整体 ×(1 + ENHANCE_STEP × enhance)，逐维就近取整（Math.round）。
 * Lv.0 恒等返回原值（无强化即静态值）；enhance 先 clamp 到 [0, MAX_ENHANCE]。
 * 缺省维不凭空生成（只放大已有非零维），保持「弱维仍弱」的建构语义。
 */
export function enhancedBonus(defBonus: Partial<StatBonus>, enhance: number): Partial<StatBonus> {
  const lv = clampEnhance(enhance);
  if (lv === 0) return { ...defBonus };
  const mult = 1 + ENHANCE_STEP * lv;
  const out: Partial<StatBonus> = {};
  for (const k of Object.keys(defBonus) as (keyof StatBonus)[]) {
    const v = defBonus[k];
    if (v != null) out[k] = Math.round(v * mult);
  }
  return out;
}

/**
 * ★ 强化到「目标等级」的 KP 成本（纯函数，按稀有度基数 × 目标级指数递增）。
 * 「爽点前移」：低级便宜、高级贵（targetLevel^2 曲线）。基数按稀有度阶梯，
 * 且每级成本远高于该件分解回收值 dismantleValueForRarity（防「拆件强化」净正套利/通胀，evolution 🔴）。
 * targetLevel = 强化后要达到的等级（1..MAX_ENHANCE）；越界返回 0（视为不可强化，由调用方拒绝）。
 */
export const ENHANCE_KP_BASE: Record<'R' | 'SR' | 'SSR' | 'HR' | 'UR', number> = {
  R: 200,
  SR: 600,
  SSR: 2000,
  HR: 5000,
  UR: 12000,
};

export function enhanceKpCost(rarity: Rarity, targetLevel: number): number {
  if (targetLevel < 1 || targetLevel > MAX_ENHANCE) return 0;
  const base = (ENHANCE_KP_BASE as Record<string, number>)[rarity] ?? 0;
  if (base === 0) return 0;
  // 目标级平方曲线：Lv1=base、Lv2=4×、…、Lv5=25×base，指数感 + 每级 >> 分解回收值。
  return base * targetLevel * targetLevel;
}

/* ============================================================
 * ★ SE-T3 装备战斗 modifier（P2-15）—— 纯数据 + 纯函数（零 RNG，恒定不随强化涨）。
 * 让装备够到五维之外的战斗旋钮（暴击率/增伤/治疗量/护盾量），与 SB-T3 暴击轴天然衔接。
 * 三槽 modifier 逐维求和后同类硬 clamp（防三件叠爆暴击轴），由 View seam 注入 player 侧
 * SquadUnitSetup.modifiers（敌方不给），critRate 经 createRuntimeUnit spread 叠在 BASE_CRIT_RATE 之上。
 * ============================================================ */

/**
 * 同类 modifier 求和后的硬上限（clamp 在纯解析里做，防三件叠爆）。
 * critRate ≤ 0.20（叠在 BASE_CRIT_RATE 0.05 之上，实战总暴击封顶约 0.25，暴击轴不失控）。
 * 其余加维给一个宽松上限（首版示例幅度小，主要防脏 def / 未来堆叠）。
 */
export const MODIFIER_CAPS: Record<EquipModifierField, number> = {
  critRate: 0.2,
  damageUp: 0.3,
  healUp: 0.3,
  shieldUp: 0.3,
};

/** modifier 维遍历顺序（求和 / 文案统一口径）。 */
export const EQUIP_MODIFIER_FIELDS: readonly EquipModifierField[] = ['critRate', 'damageUp', 'healUp', 'shieldUp'];

/**
 * ★ 多件装备 modifier 逐维求和 + 同类硬 clamp（纯函数，store 与测试共用）。
 * 缺省维记 0；求和后每维 clamp 到 [0, MODIFIER_CAPS[field]]。只返回**有值（>0）的维**，
 * 全 0 时返回空对象——供 View seam 直接展开进 setup.modifiers（不覆盖无关默认维）。
 * **不套 enhancedBonus**：modifier 恒定不随强化涨（SE-T1 已钉死的边界）。
 */
export function sumEquipModifiers(modifiers: readonly EquipModifier[]): EquipModifier {
  const out: EquipModifier = {};
  for (const field of EQUIP_MODIFIER_FIELDS) {
    let sum = 0;
    for (const m of modifiers) sum += m[field] ?? 0;
    const capped = Math.min(MODIFIER_CAPS[field], Math.max(0, sum));
    if (capped > 0) out[field] = capped;
  }
  return out;
}

/** modifier 显示名（文案统一口径，与五维 bonus 并列展示用）。 */
const MODIFIER_LABEL: Record<EquipModifierField, string> = {
  critRate: '暴击率',
  damageUp: '增伤',
  healUp: '治疗量',
  shieldUp: '护盾量',
};

/**
 * modifier → 展示文案（如 '暴击率+5% · 治疗量+10%'）。EquipPicker / 背包 / 商店共用。
 * 均为百分比加区（就近取整到整数百分），按 EQUIP_MODIFIER_FIELDS 固定顺序，仅显示非 0 维；
 * 空 modifier / 无 modifier → 空串（调用方据此不渲染该行）。
 */
export function formatModifier(modifier: EquipModifier | undefined): string {
  if (!modifier) return '';
  return EQUIP_MODIFIER_FIELDS
    .filter(k => modifier[k])
    .map(k => `${MODIFIER_LABEL[k]}+${Math.round((modifier[k] as number) * 100)}%`)
    .join(' · ');
}

/* ============================================================
 * ★ SE-T2 确定性取向套装（P2-14 / P2-16）—— 纯数据 + 纯函数（零 RNG，恒定不随强化涨）。
 * 3 组「取向」套装（攻击 / 坦度 / 节奏）跨稀有度给现有目录打 setId 标签、不新增装备：
 *   攻击套偏 atk/sp、坦度套偏 hp/def、节奏套偏 spd/sp，每套武器/防具/支援三槽各有成员（含 R/SR）。
 * 触发 = 单角色三槽内同 setId 计数，齐 2 / 齐 3 阶梯给确定性五维加法加成（判定严格限单角色三槽）。
 * 奖励**只碰五维、纯加法、确定值**：不塞 modifier（守 SE-T3 暴击轴 clamp）、不套 enhancedBonus
 *   （不随强化涨、防「强化×套装」双乘）、零 RNG。幅度「齐套 ≈ 提升半个稀有度档」，集中此处调平。
 * 凑齐一套常需混稀有度 → 玩家在「凑套取向」与「堆最高稀有」间产生真实互斥取舍（对冲 P2-14）。
 * ============================================================ */

/** 3 组取向套装 id（攻击 / 坦度 / 节奏）。 */
export type EquipmentSetId = 'attack' | 'tank' | 'tempo';

/** 套装齐 N 件的阶梯确定性五维加成定义。 */
export interface EquipmentSet {
  id: EquipmentSetId;
  name: string;
  /** 取向短描述（UI 显示用）。 */
  hint: string;
  /** 齐 2 件的额外五维加成（纯加法、恒定值）。 */
  bonus2: Partial<StatBonus>;
  /** 齐 3 件的额外五维加成（含齐 2 全部，不叠加——齐 3 时只给 bonus3，取代 bonus2）。 */
  bonus3: Partial<StatBonus>;
}

/**
 * 套装目录 / 阶梯奖表（集中一处，改这里即调平全体套装）。
 * 幅度锚定「齐套 ≈ 提升半个稀有度档」：齐 3 五维总量约等于一件 SR~SSR 的净加成，
 * 齐 2 约其一半。奖励只投向该套取向的主维（攻击→atk/sp、坦度→hp/def、节奏→spd/sp）。
 * **齐 3 是「取代」不是「叠加」**：bonus3 已含齐 2 量级并更高，避免「齐 2 奖 + 齐 3 奖」双记。
 */
export const EQUIPMENT_SETS: Record<EquipmentSetId, EquipmentSet> = {
  attack: {
    id: 'attack',
    name: '锋锐组曲',
    hint: '输出取向 · 偏 ATK/SP',
    bonus2: { atk: 18, sp: 8 },
    bonus3: { atk: 40, sp: 20 },
  },
  tank: {
    id: 'tank',
    name: '磐石壁垒',
    hint: '坦度取向 · 偏 HP/DEF',
    bonus2: { hp: 50, def: 10 },
    bonus3: { hp: 110, def: 24 },
  },
  tempo: {
    id: 'tempo',
    name: '疾风节拍',
    hint: '节奏取向 · 偏 SPD/SP',
    bonus2: { spd: 16, sp: 8 },
    bonus3: { spd: 36, sp: 20 },
  },
};

/** 套装遍历顺序（计数 / 文案统一口径）。 */
export const EQUIPMENT_SET_IDS: readonly EquipmentSetId[] = ['attack', 'tank', 'tempo'];

/** 触发齐 2 阶梯所需件数（单角色三槽内同 setId 计数）。 */
export const SET_TIER2_COUNT = 2 as const;
/** 触发齐 3 阶梯所需件数（满档）。 */
export const SET_TIER3_COUNT = 3 as const;

/** 取套装定义（未知 setId 返回 undefined）。 */
export function getEquipmentSet(setId: EquipmentSetId): EquipmentSet | undefined {
  return EQUIPMENT_SETS[setId];
}

/**
 * ★ SE-T2 套装加成解析（唯一纯函数，store 与配装弹窗预览同源消费）。
 * 入参 = 单角色**已装**三槽的 defId 列表（≤3 件，缺装的槽不传）。按每件 def.setId 计数，
 * 单套齐 SET_TIER3_COUNT → 取 bonus3（取代 bonus2，非叠加）；齐 SET_TIER2_COUNT → 取 bonus2；
 * 不足 2 件 → 不给。多套并存各自独立结算后逐维求和（sumStatBonus）。
 * **只碰五维、纯加法、恒定值**：不套 enhancedBonus（不随强化涨）、不含任何 modifier、零 RNG。
 * 未知 defId / 无 setId 的件不计数（防脏 defId 放大）。
 */
export function setBonusFor(equippedDefIds: readonly string[]): StatBonus {
  // 逐套计数（只统计已装、有 setId、存在于目录的 defId）
  const counts: Record<EquipmentSetId, number> = { attack: 0, tank: 0, tempo: 0 };
  for (const defId of equippedDefIds) {
    const setId = getEquipmentDef(defId)?.setId;
    if (setId) counts[setId] += 1;
  }
  const parts: Partial<StatBonus>[] = [];
  for (const setId of EQUIPMENT_SET_IDS) {
    const n = counts[setId];
    const set = EQUIPMENT_SETS[setId];
    if (n >= SET_TIER3_COUNT) parts.push(set.bonus3);
    else if (n >= SET_TIER2_COUNT) parts.push(set.bonus2);
  }
  return sumStatBonus(parts);
}

/**
 * 单角色三槽套装进度（UI 显形用，纯查询）：每套已装件数 + 当前档奖励 + 下一档奖励。
 * currentBonus = 当前件数达到的档位加成（不足 2 件为空对象）；tier = 0/2/3（已达档）。
 * 只返回**至少装了 1 件成员**的套（其余套不刷屏）。
 */
export interface SetProgress {
  set: EquipmentSet;
  count: number;
  /** 当前已达档位：0（<2 件）/ 2（齐 2）/ 3（齐 3）。 */
  tier: 0 | 2 | 3;
  /** 当前档位加成（未达 2 件为空对象）。 */
  currentBonus: Partial<StatBonus>;
}

export function setProgressFor(equippedDefIds: readonly string[]): SetProgress[] {
  const counts: Record<EquipmentSetId, number> = { attack: 0, tank: 0, tempo: 0 };
  for (const defId of equippedDefIds) {
    const setId = getEquipmentDef(defId)?.setId;
    if (setId) counts[setId] += 1;
  }
  const out: SetProgress[] = [];
  for (const setId of EQUIPMENT_SET_IDS) {
    const count = counts[setId];
    if (count <= 0) continue;
    const set = EQUIPMENT_SETS[setId];
    const tier: 0 | 2 | 3 = count >= SET_TIER3_COUNT ? 3 : count >= SET_TIER2_COUNT ? 2 : 0;
    const currentBonus = tier === 3 ? set.bonus3 : tier === 2 ? set.bonus2 : {};
    out.push({ set, count, tier, currentBonus });
  }
  return out;
}

/**
 * 起始目录：3 槽 × R..UR，每槽每稀有度 1 件。名梗与数值可后调。
 * 数值贴近预算（atk/def/sp/spd 各 1 点 ≈ 1，hp 1 点 ≈ 0.4，故 hp 折算 ~2.5×）：
 *   R 预算 ~18、SR ~35、SSR ~60、HR ~95、UR ~140。
 *
 * ★ SD-T2：家园挂机产出主承载已迁到设施乘区（SD-T1 facilityBonusPct，独立乘子不受 0.6 cap 钳制）。
 *   装备的 homeEffect 产出%（expPct/affectionPct/knowledgePct）已统一按 ×0.33 弱化到「小额佐料」
 *   量级（就近取整到 0.01 步进），装备回归战斗为主、家园为辅，二者不再抢同一杠杆。
 *   comfort 全部保留（独立软加成轴，「戴好装备略舒适」语义留住，SD-T1 已接成真软加成）。
 */
export const EQUIPMENT_CATALOG: readonly EquipmentDef[] = [
  // --- 武器 weapon（偏 atk / sp，输出向）---
  // ★ SE-T2 套装标签（setId）：跨稀有度铺 3 组取向套装成员，凑套常需混稀有度（对冲「按稀有度排序即最优」）。
  { id: 'wpn_r_woodsword', name: '木刀', slot: 'weapon', rarity: 'R', bonus: { atk: 13, sp: 5 }, homeEffect: { expPct: 0.01, comfort: 1 }, setId: 'attack' },
  { id: 'wpn_r_training_stick', name: '修行竹刀', slot: 'weapon', rarity: 'R', bonus: { atk: 10, spd: 5 }, homeEffect: { expPct: 0.01 }, setId: 'tempo' },
  { id: 'wpn_r_stage_mic', name: '练习麦克风', slot: 'weapon', rarity: 'R', bonus: { atk: 8, sp: 7 }, homeEffect: { affectionPct: 0.01, comfort: 1 } },
  { id: 'wpn_sr_zangetsu', name: '斩月', slot: 'weapon', rarity: 'SR', bonus: { atk: 25, sp: 10 }, homeEffect: { expPct: 0.02, comfort: 2 }, setId: 'attack' },
  { id: 'wpn_sr_training_bokken', name: '部活木刀', slot: 'weapon', rarity: 'SR', bonus: { atk: 22, spd: 13 }, homeEffect: { expPct: 0.02, comfort: 2 }, setId: 'tempo' },
  { id: 'wpn_sr_blue_rose', name: '蓝蔷薇长剑', slot: 'weapon', rarity: 'SR', bonus: { atk: 20, sp: 15 }, homeEffect: { affectionPct: 0.02, comfort: 2 }, setId: 'tank' },
  { id: 'wpn_ssr_gotoh_guitar', name: '后藤的吉他', slot: 'weapon', rarity: 'SSR', bonus: { atk: 42, sp: 18 }, homeEffect: { affectionPct: 0.03, comfort: 4 }, setId: 'attack' },
  { id: 'wpn_ssr_nichirin', name: '日轮刀', slot: 'weapon', rarity: 'SSR', bonus: { atk: 46, spd: 14 }, homeEffect: { expPct: 0.03, comfort: 3 }, setId: 'tempo' },
  { id: 'wpn_ssr_star_wand', name: '星之杖', slot: 'weapon', rarity: 'SSR', bonus: { atk: 34, sp: 26 }, homeEffect: { knowledgePct: 0.03, comfort: 3 } },
  { id: 'wpn_hr_deathnote', name: '死亡笔记', slot: 'weapon', rarity: 'HR', bonus: { atk: 66, sp: 29 }, homeEffect: { knowledgePct: 0.04, comfort: 5 }, setId: 'attack' },
  { id: 'wpn_hr_railgun', name: '超电磁炮', slot: 'weapon', rarity: 'HR', bonus: { atk: 72, spd: 23 }, homeEffect: { expPct: 0.04, comfort: 4 }, modifier: { critRate: 0.04 }, setId: 'tempo' },
  { id: 'wpn_hr_spirit_gun', name: '灵丸', slot: 'weapon', rarity: 'HR', bonus: { atk: 60, sp: 35 }, homeEffect: { affectionPct: 0.03, comfort: 5 }, modifier: { damageUp: 0.06 } },
  // ★ SE-T3 示例：UR 武器带暴击/增伤 modifier（小而有感，恒定不随强化涨）。
  { id: 'wpn_ur_longinus', name: '朗基努斯之枪', slot: 'weapon', rarity: 'UR', bonus: { atk: 98, sp: 42 }, homeEffect: { expPct: 0.05, comfort: 7 }, modifier: { critRate: 0.07 }, setId: 'attack' },
  { id: 'wpn_ur_excalibur', name: '誓约胜利之剑', slot: 'weapon', rarity: 'UR', bonus: { atk: 108, sp: 32 }, homeEffect: { affectionPct: 0.05, comfort: 7 }, modifier: { damageUp: 0.10 } },
  { id: 'wpn_ur_gungnir', name: '冈格尼尔', slot: 'weapon', rarity: 'UR', bonus: { atk: 92, spd: 48 }, homeEffect: { knowledgePct: 0.05, comfort: 7 }, modifier: { critRate: 0.06 }, setId: 'tempo' },

  // --- 防具 armor（偏 hp / def，坦度向；hp 折算 ~2.5× 故数值偏大）---
  { id: 'arm_r_uniform', name: '校服', slot: 'armor', rarity: 'R', bonus: { hp: 30, def: 6 }, homeEffect: { affectionPct: 0.01, comfort: 2 }, setId: 'tank' },
  { id: 'arm_r_track_jacket', name: '运动外套', slot: 'armor', rarity: 'R', bonus: { hp: 24, def: 8 }, homeEffect: { expPct: 0.01, comfort: 1 }, setId: 'tempo' },
  { id: 'arm_r_raincoat', name: '雨天披风', slot: 'armor', rarity: 'R', bonus: { hp: 34, def: 4 }, homeEffect: { knowledgePct: 0.01, comfort: 1 }, setId: 'attack' },
  { id: 'arm_sr_zettai', name: '绝对领域', slot: 'armor', rarity: 'SR', bonus: { hp: 58, def: 12 }, homeEffect: { affectionPct: 0.02, comfort: 4 }, setId: 'tank' },
  { id: 'arm_sr_cozy_cardigan', name: '咖啡厅开衫', slot: 'armor', rarity: 'SR', bonus: { hp: 64, def: 9 }, homeEffect: { affectionPct: 0.02, comfort: 4 } },
  { id: 'arm_sr_sailor_cloak', name: '水手披肩', slot: 'armor', rarity: 'SR', bonus: { hp: 50, def: 15 }, homeEffect: { expPct: 0.02, comfort: 3 }, setId: 'attack' },
  { id: 'arm_ssr_nanosuit', name: '纳米装甲', slot: 'armor', rarity: 'SSR', bonus: { hp: 100, def: 20 }, homeEffect: { expPct: 0.03, comfort: 5 }, setId: 'tank' },
  { id: 'arm_ssr_magical_robe', name: '魔法少女战袍', slot: 'armor', rarity: 'SSR', bonus: { hp: 84, def: 26 }, homeEffect: { affectionPct: 0.03, comfort: 5 }, setId: 'tempo' },
  { id: 'arm_ssr_shadow_coat', name: '影之长风衣', slot: 'armor', rarity: 'SSR', bonus: { hp: 92, def: 23 }, homeEffect: { knowledgePct: 0.03, comfort: 4 }, setId: 'attack' },
  { id: 'arm_hr_susanoo', name: '须佐能乎', slot: 'armor', rarity: 'HR', bonus: { hp: 158, def: 32 }, homeEffect: { expPct: 0.04, comfort: 7 }, setId: 'tank' },
  { id: 'arm_hr_saint_cloth', name: '黄金圣衣残片', slot: 'armor', rarity: 'HR', bonus: { hp: 140, def: 39 }, homeEffect: { affectionPct: 0.04, comfort: 8 } },
  { id: 'arm_hr_anti_magic', name: '对魔力外套', slot: 'armor', rarity: 'HR', bonus: { hp: 170, def: 27 }, homeEffect: { knowledgePct: 0.04, comfort: 6 }, setId: 'attack' },
  // ★ SE-T3 示例：护盾向 UR 防具带 shieldUp modifier（坦度装塑造护盾 build）。
  { id: 'arm_ur_atfield', name: 'AT力场', slot: 'armor', rarity: 'UR', bonus: { hp: 232, def: 48 }, homeEffect: { affectionPct: 0.05, comfort: 10 }, modifier: { shieldUp: 0.12 }, setId: 'tank' },
  { id: 'arm_ur_plug_suit', name: '同步率插入栓服', slot: 'armor', rarity: 'UR', bonus: { hp: 210, def: 56 }, homeEffect: { expPct: 0.05, comfort: 9 }, setId: 'tempo' },
  { id: 'arm_ur_world_barrier', name: '世界结界', slot: 'armor', rarity: 'UR', bonus: { hp: 250, def: 40 }, homeEffect: { knowledgePct: 0.05, comfort: 9 }, modifier: { shieldUp: 0.10 } },

  // --- 支援 supporter（偏 spd / sp，节奏向）---
  { id: 'sup_r_glowstick', name: '应援棒', slot: 'supporter', rarity: 'R', bonus: { spd: 12, sp: 6 }, homeEffect: { affectionPct: 0.01, comfort: 1 }, setId: 'tempo' },
  { id: 'sup_r_notebook', name: '追番笔记', slot: 'supporter', rarity: 'R', bonus: { spd: 9, sp: 9 }, homeEffect: { knowledgePct: 0.01 }, setId: 'attack' },
  { id: 'sup_r_lucky_charm', name: '御守', slot: 'supporter', rarity: 'R', bonus: { hp: 18, spd: 10 }, homeEffect: { comfort: 2 }, setId: 'tank' },
  { id: 'sup_sr_bamboocopter', name: '竹蜻蜓', slot: 'supporter', rarity: 'SR', bonus: { spd: 23, sp: 12 }, homeEffect: { expPct: 0.02, comfort: 2 }, setId: 'tempo' },
  { id: 'sup_sr_broadcast_mic', name: '放送部麦克风', slot: 'supporter', rarity: 'SR', bonus: { spd: 18, sp: 17 }, homeEffect: { knowledgePct: 0.02, comfort: 2 }, setId: 'attack' },
  { id: 'sup_sr_cat_headset', name: '猫耳耳机', slot: 'supporter', rarity: 'SR', bonus: { spd: 20, sp: 15 }, homeEffect: { affectionPct: 0.02, comfort: 3 }, setId: 'tank' },
  { id: 'sup_ssr_sharingan', name: '写轮眼', slot: 'supporter', rarity: 'SSR', bonus: { spd: 40, sp: 20 }, homeEffect: { knowledgePct: 0.03, comfort: 4 }, setId: 'tempo' },
  { id: 'sup_ssr_lucky_star', name: '幸运星挂件', slot: 'supporter', rarity: 'SSR', bonus: { spd: 36, sp: 24 }, homeEffect: { affectionPct: 0.03, comfort: 5 }, setId: 'attack' },
  { id: 'sup_ssr_tiny_robot', name: '迷你辅助机器人', slot: 'supporter', rarity: 'SSR', bonus: { spd: 44, sp: 16 }, homeEffect: { expPct: 0.03, comfort: 4 }, setId: 'tank' },
  // ★ SE-T3 示例：支援装带 healUp modifier（塑造治疗/辅助 build）。
  { id: 'sup_hr_strawhat', name: '草帽', slot: 'supporter', rarity: 'HR', bonus: { spd: 62, sp: 33 }, homeEffect: { affectionPct: 0.04, comfort: 6 }, modifier: { healUp: 0.06 }, setId: 'tempo' },
  { id: 'sup_hr_senzu_bag', name: '仙豆袋', slot: 'supporter', rarity: 'HR', bonus: { hp: 70, spd: 45, sp: 22 }, homeEffect: { expPct: 0.04, comfort: 5 }, modifier: { healUp: 0.08 }, setId: 'tank' },
  { id: 'sup_hr_archive_key', name: '资料库钥匙', slot: 'supporter', rarity: 'HR', bonus: { spd: 52, sp: 43 }, homeEffect: { knowledgePct: 0.04, comfort: 5 }, setId: 'attack' },
  { id: 'sup_ur_4dpocket', name: '四次元口袋', slot: 'supporter', rarity: 'UR', bonus: { spd: 92, sp: 48 }, homeEffect: { knowledgePct: 0.06, comfort: 8 }, setId: 'tempo' },
  { id: 'sup_ur_dragon_radar', name: '龙珠雷达', slot: 'supporter', rarity: 'UR', bonus: { spd: 104, sp: 36 }, homeEffect: { expPct: 0.05, comfort: 8 }, setId: 'attack' },
  { id: 'sup_ur_holy_grail', name: '小圣杯', slot: 'supporter', rarity: 'UR', bonus: { hp: 110, spd: 70, sp: 26 }, homeEffect: { affectionPct: 0.05, knowledgePct: 0.03, comfort: 9 }, modifier: { healUp: 0.12 }, setId: 'tank' },
];

/** id → 定义 索引（O(1) 查表，构建一次）。 */
const CATALOG_BY_ID: Readonly<Record<string, EquipmentDef>> = Object.fromEntries(
  EQUIPMENT_CATALOG.map(def => [def.id, def]),
);

/** 按 defId 取装备定义（未知 id 返回 undefined）。 */
export function getEquipmentDef(defId: string): EquipmentDef | undefined {
  return CATALOG_BY_ID[defId];
}

/** 取某槽位的所有装备定义（兑换商店分槽展示用）。 */
export function getEquipmentDefsForSlot(slot: EquipmentSlot): EquipmentDef[] {
  return EQUIPMENT_CATALOG.filter(def => def.slot === slot);
}

/** 按 槽位 + 稀有度 取候选池（塔掉落 / 目录测试 / 将来筛选共用）。 */
export function getEquipmentDefsBySlotRarity(slot: string, rarity: string): EquipmentDef[] {
  return EQUIPMENT_CATALOG.filter(def => def.slot === slot && def.rarity === rarity);
}

/**
 * 按 槽位 + 稀有度 取定义（塔掉落 {slot,rarity} → 具体 defId 用）。
 * 兼容旧调用：多候选时返回目录中的第一件；随机选择请用 getEquipmentDefsBySlotRarity + rng.pick。
 */
export function getEquipmentDefBySlotRarity(slot: string, rarity: string): EquipmentDef | undefined {
  return getEquipmentDefsBySlotRarity(slot, rarity)[0];
}

/**
 * 掉落层段 → 稀有度（纯函数，与塔通层结算共用）。
 * 1-5 → R / 6-15 → SR / 16-30 → SSR / 31-50 → HR / 51+ → UR。
 */
export function dropRarityForFloor(floor: number): 'R' | 'SR' | 'SSR' | 'HR' | 'UR' {
  if (floor <= 5) return 'R';
  if (floor <= 15) return 'SR';
  if (floor <= 30) return 'SSR';
  if (floor <= 50) return 'HR';
  return 'UR';
}

/** 通层掉落概率（50%）。RNG 在 engine 掉落纯函数里注入。 */
export const DROP_CHANCE = 0.5;

/** 五维显示名（固定顺序，UI 文案统一口径用）。 */
const STAT_LABEL: Record<keyof StatBonus, string> = {
  hp: 'HP',
  atk: 'ATK',
  def: 'DEF',
  sp: 'SP',
  spd: 'SPD',
};

/**
 * 五维加成 → 展示文案（如 'ATK+13 · SP+5'）。背包卡 / 兑换商店 / 配装弹窗共用，
 * 避免各处自拼大小写与分隔符不一致。按 hp→atk→def→sp→spd 固定顺序，仅显示非 0 维。
 */
export function formatBonus(bonus: Partial<StatBonus>): string {
  return (Object.keys(STAT_LABEL) as (keyof StatBonus)[])
    .filter(k => bonus[k])
    .map(k => `${STAT_LABEL[k]}+${bonus[k]}`)
    .join(' · ');
}

const EMPTY_HOME_EFFECT: Required<EquipmentHomeEffect> = {
  expPct: 0,
  affectionPct: 0,
  knowledgePct: 0,
  comfort: 0,
};

/** 多件装备的家园效果逐项求和（缺省维按 0 处理）。 */
export function sumHomeEffects(effects: readonly EquipmentHomeEffect[]): Required<EquipmentHomeEffect> {
  return effects.reduce<Required<EquipmentHomeEffect>>(
    (total, effect) => ({
      expPct: total.expPct + (effect.expPct ?? 0),
      affectionPct: total.affectionPct + (effect.affectionPct ?? 0),
      knowledgePct: total.knowledgePct + (effect.knowledgePct ?? 0),
      comfort: total.comfort + (effect.comfort ?? 0),
    }),
    { ...EMPTY_HOME_EFFECT },
  );
}

function formatPct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

/** 家园效果展示文案，稳定顺序：舒适 → 经验 → 好感 → 知识。 */
export function formatHomeEffect(effect: EquipmentHomeEffect): string {
  const parts: string[] = [];
  if (effect.comfort) parts.push(`家园舒适+${effect.comfort}`);
  if (effect.expPct) parts.push(`经验+${formatPct(effect.expPct)}`);
  if (effect.affectionPct) parts.push(`好感+${formatPct(effect.affectionPct)}`);
  if (effect.knowledgePct) parts.push(`知识+${formatPct(effect.knowledgePct)}`);
  return parts.join(' · ');
}

/** 单角色三槽（与存档 EquippedSlots 同形；config 不反向 import infra 类型，故就地声明结构）。 */
type EquippedTriple = { weapon: string | null; armor: string | null; supporter: string | null };

/**
 * 规整逐角色三槽配装（存档迁移 + 反序列化共用）。每个 uid 必须同时满足：
 *  ① 在 inventory 中有对应实例 ② 未被别的角色/槽占用（一件只能戴一处）
 *  ③ 其 def.slot 与所在槽匹配（武器只能进 weapon…）——任一不满足该槽置 null。
 * 把运行期 equip() 的不变式收口到载入边界，杜绝脏档绕过校验（孤儿 / 重复戴 / 异槽戴）放大战力。
 */
export function sanitizeEquipped(
  inventory: readonly { uid: string; defId: string }[],
  rawEquipped: unknown,
): Record<number, EquippedTriple> {
  const out: Record<number, EquippedTriple> = {};
  if (!rawEquipped || typeof rawEquipped !== 'object') return out;
  // uid → 该实例的固有槽位（未知 defId / 不在背包 → undefined，永不匹配任何槽）
  // 首条优先（与运行期 getItem = inventory.find 取首条一致）：同 uid 双 defId 时，定槽与算 bonus 解释同一条，
  // 杜绝「校验按后一条 def.slot 通过、战斗加成按前一条 def.bonus 生效」的错位绕过。
  const slotByUid = new Map<string, EquipmentSlot | undefined>();
  for (const it of inventory) {
    if (!slotByUid.has(it.uid)) slotByUid.set(it.uid, getEquipmentDef(it.defId)?.slot);
  }
  const used = new Set<string>();
  const keep = (slot: EquipmentSlot, v: unknown): string | null => {
    if (typeof v !== 'string' || used.has(v) || slotByUid.get(v) !== slot) return null;
    used.add(v);
    return v;
  };
  for (const [key, val] of Object.entries(rawEquipped as Record<string, Record<string, unknown>>)) {
    const charId = Number(key);
    if (!Number.isFinite(charId) || !val || typeof val !== 'object') continue;
    out[charId] = {
      weapon: keep('weapon', val.weapon),
      armor: keep('armor', val.armor),
      supporter: keep('supporter', val.supporter),
    };
  }
  return out;
}
