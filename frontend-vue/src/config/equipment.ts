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

/** 静态装备定义（目录项）。bonus 为五维加成（缺省维记 0）。 */
export interface EquipmentDef {
  id: string;
  name: string;
  slot: EquipmentSlot;
  rarity: Rarity;
  /** 五维加成（部分维）。求和时缺省维按 0 处理。 */
  bonus: Partial<StatBonus>;
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
 * 起始目录：3 槽 × R..UR，每槽每稀有度 1 件。名梗与数值可后调。
 * 数值贴近预算（atk/def/sp/spd 各 1 点 ≈ 1，hp 1 点 ≈ 0.4，故 hp 折算 ~2.5×）：
 *   R 预算 ~18、SR ~35、SSR ~60、HR ~95、UR ~140。
 */
export const EQUIPMENT_CATALOG: readonly EquipmentDef[] = [
  // --- 武器 weapon（偏 atk / sp，输出向）---
  { id: 'wpn_r_woodsword', name: '木刀', slot: 'weapon', rarity: 'R', bonus: { atk: 13, sp: 5 } },
  { id: 'wpn_sr_zangetsu', name: '斩月', slot: 'weapon', rarity: 'SR', bonus: { atk: 25, sp: 10 } },
  { id: 'wpn_ssr_gotoh_guitar', name: '后藤的吉他', slot: 'weapon', rarity: 'SSR', bonus: { atk: 42, sp: 18 } },
  { id: 'wpn_hr_deathnote', name: '死亡笔记', slot: 'weapon', rarity: 'HR', bonus: { atk: 66, sp: 29 } },
  { id: 'wpn_ur_longinus', name: '朗基努斯之枪', slot: 'weapon', rarity: 'UR', bonus: { atk: 98, sp: 42 } },

  // --- 防具 armor（偏 hp / def，坦度向；hp 折算 ~2.5× 故数值偏大）---
  { id: 'arm_r_uniform', name: '校服', slot: 'armor', rarity: 'R', bonus: { hp: 30, def: 6 } },
  { id: 'arm_sr_zettai', name: '绝对领域', slot: 'armor', rarity: 'SR', bonus: { hp: 58, def: 12 } },
  { id: 'arm_ssr_nanosuit', name: '纳米装甲', slot: 'armor', rarity: 'SSR', bonus: { hp: 100, def: 20 } },
  { id: 'arm_hr_susanoo', name: '须佐能乎', slot: 'armor', rarity: 'HR', bonus: { hp: 158, def: 32 } },
  { id: 'arm_ur_atfield', name: 'AT力场', slot: 'armor', rarity: 'UR', bonus: { hp: 232, def: 48 } },

  // --- 支援 supporter（偏 spd / sp，节奏向）---
  { id: 'sup_r_glowstick', name: '应援棒', slot: 'supporter', rarity: 'R', bonus: { spd: 12, sp: 6 } },
  { id: 'sup_sr_bamboocopter', name: '竹蜻蜓', slot: 'supporter', rarity: 'SR', bonus: { spd: 23, sp: 12 } },
  { id: 'sup_ssr_sharingan', name: '写轮眼', slot: 'supporter', rarity: 'SSR', bonus: { spd: 40, sp: 20 } },
  { id: 'sup_hr_strawhat', name: '草帽', slot: 'supporter', rarity: 'HR', bonus: { spd: 62, sp: 33 } },
  { id: 'sup_ur_4dpocket', name: '四次元口袋', slot: 'supporter', rarity: 'UR', bonus: { spd: 92, sp: 48 } },
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

/**
 * 按 槽位 + 稀有度 取定义（塔掉落 {slot,rarity} → 具体 defId 用）。
 * 起始目录每槽每稀有度恰 1 件，故唯一确定；找不到（如该稀有度无此槽）返回 undefined。
 */
export function getEquipmentDefBySlotRarity(slot: string, rarity: string): EquipmentDef | undefined {
  return EQUIPMENT_CATALOG.find(def => def.slot === slot && def.rarity === rarity);
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
