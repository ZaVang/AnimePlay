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
import type { StatBonus } from '@/engine';

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
  { id: 'wpn_r_woodsword', name: '木刀', slot: 'weapon', rarity: 'R', bonus: { atk: 13, sp: 5 }, homeEffect: { expPct: 0.01, comfort: 1 } },
  { id: 'wpn_r_training_stick', name: '修行竹刀', slot: 'weapon', rarity: 'R', bonus: { atk: 10, spd: 5 }, homeEffect: { expPct: 0.01 } },
  { id: 'wpn_r_stage_mic', name: '练习麦克风', slot: 'weapon', rarity: 'R', bonus: { atk: 8, sp: 7 }, homeEffect: { affectionPct: 0.01, comfort: 1 } },
  { id: 'wpn_sr_zangetsu', name: '斩月', slot: 'weapon', rarity: 'SR', bonus: { atk: 25, sp: 10 }, homeEffect: { expPct: 0.02, comfort: 2 } },
  { id: 'wpn_sr_training_bokken', name: '部活木刀', slot: 'weapon', rarity: 'SR', bonus: { atk: 22, spd: 13 }, homeEffect: { expPct: 0.02, comfort: 2 } },
  { id: 'wpn_sr_blue_rose', name: '蓝蔷薇长剑', slot: 'weapon', rarity: 'SR', bonus: { atk: 20, sp: 15 }, homeEffect: { affectionPct: 0.02, comfort: 2 } },
  { id: 'wpn_ssr_gotoh_guitar', name: '后藤的吉他', slot: 'weapon', rarity: 'SSR', bonus: { atk: 42, sp: 18 }, homeEffect: { affectionPct: 0.03, comfort: 4 } },
  { id: 'wpn_ssr_nichirin', name: '日轮刀', slot: 'weapon', rarity: 'SSR', bonus: { atk: 46, spd: 14 }, homeEffect: { expPct: 0.03, comfort: 3 } },
  { id: 'wpn_ssr_star_wand', name: '星之杖', slot: 'weapon', rarity: 'SSR', bonus: { atk: 34, sp: 26 }, homeEffect: { knowledgePct: 0.03, comfort: 3 } },
  { id: 'wpn_hr_deathnote', name: '死亡笔记', slot: 'weapon', rarity: 'HR', bonus: { atk: 66, sp: 29 }, homeEffect: { knowledgePct: 0.04, comfort: 5 } },
  { id: 'wpn_hr_railgun', name: '超电磁炮', slot: 'weapon', rarity: 'HR', bonus: { atk: 72, spd: 23 }, homeEffect: { expPct: 0.04, comfort: 4 } },
  { id: 'wpn_hr_spirit_gun', name: '灵丸', slot: 'weapon', rarity: 'HR', bonus: { atk: 60, sp: 35 }, homeEffect: { affectionPct: 0.03, comfort: 5 } },
  { id: 'wpn_ur_longinus', name: '朗基努斯之枪', slot: 'weapon', rarity: 'UR', bonus: { atk: 98, sp: 42 }, homeEffect: { expPct: 0.05, comfort: 7 } },
  { id: 'wpn_ur_excalibur', name: '誓约胜利之剑', slot: 'weapon', rarity: 'UR', bonus: { atk: 108, sp: 32 }, homeEffect: { affectionPct: 0.05, comfort: 7 } },
  { id: 'wpn_ur_gungnir', name: '冈格尼尔', slot: 'weapon', rarity: 'UR', bonus: { atk: 92, spd: 48 }, homeEffect: { knowledgePct: 0.05, comfort: 7 } },

  // --- 防具 armor（偏 hp / def，坦度向；hp 折算 ~2.5× 故数值偏大）---
  { id: 'arm_r_uniform', name: '校服', slot: 'armor', rarity: 'R', bonus: { hp: 30, def: 6 }, homeEffect: { affectionPct: 0.01, comfort: 2 } },
  { id: 'arm_r_track_jacket', name: '运动外套', slot: 'armor', rarity: 'R', bonus: { hp: 24, def: 8 }, homeEffect: { expPct: 0.01, comfort: 1 } },
  { id: 'arm_r_raincoat', name: '雨天披风', slot: 'armor', rarity: 'R', bonus: { hp: 34, def: 4 }, homeEffect: { knowledgePct: 0.01, comfort: 1 } },
  { id: 'arm_sr_zettai', name: '绝对领域', slot: 'armor', rarity: 'SR', bonus: { hp: 58, def: 12 }, homeEffect: { affectionPct: 0.02, comfort: 4 } },
  { id: 'arm_sr_cozy_cardigan', name: '咖啡厅开衫', slot: 'armor', rarity: 'SR', bonus: { hp: 64, def: 9 }, homeEffect: { affectionPct: 0.02, comfort: 4 } },
  { id: 'arm_sr_sailor_cloak', name: '水手披肩', slot: 'armor', rarity: 'SR', bonus: { hp: 50, def: 15 }, homeEffect: { expPct: 0.02, comfort: 3 } },
  { id: 'arm_ssr_nanosuit', name: '纳米装甲', slot: 'armor', rarity: 'SSR', bonus: { hp: 100, def: 20 }, homeEffect: { expPct: 0.03, comfort: 5 } },
  { id: 'arm_ssr_magical_robe', name: '魔法少女战袍', slot: 'armor', rarity: 'SSR', bonus: { hp: 84, def: 26 }, homeEffect: { affectionPct: 0.03, comfort: 5 } },
  { id: 'arm_ssr_shadow_coat', name: '影之长风衣', slot: 'armor', rarity: 'SSR', bonus: { hp: 92, def: 23 }, homeEffect: { knowledgePct: 0.03, comfort: 4 } },
  { id: 'arm_hr_susanoo', name: '须佐能乎', slot: 'armor', rarity: 'HR', bonus: { hp: 158, def: 32 }, homeEffect: { expPct: 0.04, comfort: 7 } },
  { id: 'arm_hr_saint_cloth', name: '黄金圣衣残片', slot: 'armor', rarity: 'HR', bonus: { hp: 140, def: 39 }, homeEffect: { affectionPct: 0.04, comfort: 8 } },
  { id: 'arm_hr_anti_magic', name: '对魔力外套', slot: 'armor', rarity: 'HR', bonus: { hp: 170, def: 27 }, homeEffect: { knowledgePct: 0.04, comfort: 6 } },
  { id: 'arm_ur_atfield', name: 'AT力场', slot: 'armor', rarity: 'UR', bonus: { hp: 232, def: 48 }, homeEffect: { affectionPct: 0.05, comfort: 10 } },
  { id: 'arm_ur_plug_suit', name: '同步率插入栓服', slot: 'armor', rarity: 'UR', bonus: { hp: 210, def: 56 }, homeEffect: { expPct: 0.05, comfort: 9 } },
  { id: 'arm_ur_world_barrier', name: '世界结界', slot: 'armor', rarity: 'UR', bonus: { hp: 250, def: 40 }, homeEffect: { knowledgePct: 0.05, comfort: 9 } },

  // --- 支援 supporter（偏 spd / sp，节奏向）---
  { id: 'sup_r_glowstick', name: '应援棒', slot: 'supporter', rarity: 'R', bonus: { spd: 12, sp: 6 }, homeEffect: { affectionPct: 0.01, comfort: 1 } },
  { id: 'sup_r_notebook', name: '追番笔记', slot: 'supporter', rarity: 'R', bonus: { spd: 9, sp: 9 }, homeEffect: { knowledgePct: 0.01 } },
  { id: 'sup_r_lucky_charm', name: '御守', slot: 'supporter', rarity: 'R', bonus: { hp: 18, spd: 10 }, homeEffect: { comfort: 2 } },
  { id: 'sup_sr_bamboocopter', name: '竹蜻蜓', slot: 'supporter', rarity: 'SR', bonus: { spd: 23, sp: 12 }, homeEffect: { expPct: 0.02, comfort: 2 } },
  { id: 'sup_sr_broadcast_mic', name: '放送部麦克风', slot: 'supporter', rarity: 'SR', bonus: { spd: 18, sp: 17 }, homeEffect: { knowledgePct: 0.02, comfort: 2 } },
  { id: 'sup_sr_cat_headset', name: '猫耳耳机', slot: 'supporter', rarity: 'SR', bonus: { spd: 20, sp: 15 }, homeEffect: { affectionPct: 0.02, comfort: 3 } },
  { id: 'sup_ssr_sharingan', name: '写轮眼', slot: 'supporter', rarity: 'SSR', bonus: { spd: 40, sp: 20 }, homeEffect: { knowledgePct: 0.03, comfort: 4 } },
  { id: 'sup_ssr_lucky_star', name: '幸运星挂件', slot: 'supporter', rarity: 'SSR', bonus: { spd: 36, sp: 24 }, homeEffect: { affectionPct: 0.03, comfort: 5 } },
  { id: 'sup_ssr_tiny_robot', name: '迷你辅助机器人', slot: 'supporter', rarity: 'SSR', bonus: { spd: 44, sp: 16 }, homeEffect: { expPct: 0.03, comfort: 4 } },
  { id: 'sup_hr_strawhat', name: '草帽', slot: 'supporter', rarity: 'HR', bonus: { spd: 62, sp: 33 }, homeEffect: { affectionPct: 0.04, comfort: 6 } },
  { id: 'sup_hr_senzu_bag', name: '仙豆袋', slot: 'supporter', rarity: 'HR', bonus: { hp: 70, spd: 45, sp: 22 }, homeEffect: { expPct: 0.04, comfort: 5 } },
  { id: 'sup_hr_archive_key', name: '资料库钥匙', slot: 'supporter', rarity: 'HR', bonus: { spd: 52, sp: 43 }, homeEffect: { knowledgePct: 0.04, comfort: 5 } },
  { id: 'sup_ur_4dpocket', name: '四次元口袋', slot: 'supporter', rarity: 'UR', bonus: { spd: 92, sp: 48 }, homeEffect: { knowledgePct: 0.06, comfort: 8 } },
  { id: 'sup_ur_dragon_radar', name: '龙珠雷达', slot: 'supporter', rarity: 'UR', bonus: { spd: 104, sp: 36 }, homeEffect: { expPct: 0.05, comfort: 8 } },
  { id: 'sup_ur_holy_grail', name: '小圣杯', slot: 'supporter', rarity: 'UR', bonus: { hp: 110, spd: 70, sp: 26 }, homeEffect: { affectionPct: 0.05, knowledgePct: 0.03, comfort: 9 } },
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
