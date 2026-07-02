/**
 * 挑战塔通层装备掉落 —— 纯函数（随机源注入）。
 * engine 纯净铁律：不 import @/config，稀有度↔层段映射由调用方注入（留在 config/equipment.ts），
 * 这里只负责「掷 50% + 命中则随机槽 + 用注入映射定稀有度」，便于注入序列 RNG 做特征/复现测试。
 */
import type { RNG } from '../rng';

/** 装备的 3 个槽位（与 config/equipment.ts EquipmentSlot 同形，engine 自持一份避免反向依赖）。 */
export type DropSlot = 'weapon' | 'armor' | 'supporter';

const DROP_SLOTS: readonly DropSlot[] = ['weapon', 'armor', 'supporter'];

/** 一次掉落结果：命中时给稀有度 + 随机槽，未命中为 null。 */
export interface TowerDrop {
  rarity: string;
  slot: DropSlot;
}

/**
 * 通某层的掉落：以 dropChance 概率命中，命中则随机一个槽 + 按层段映射定稀有度。
 * @param floor 刚通过的层数（>=1）。
 * @param rng 注入随机源（先掷概率，再掷槽位；序列 RNG 可精确复现）。
 * @param rarityForFloor 层段→稀有度映射（由 config 注入，engine 不知道具体边界）。
 * @param dropChance 掉落概率（默认 0.5）。
 * @returns 命中返回 { rarity, slot }，未命中返回 null。
 */
export function rollTowerDrop(
  floor: number,
  rng: RNG,
  rarityForFloor: (floor: number) => string,
  dropChance = 0.5,
): TowerDrop | null {
  if (!rng.chance(dropChance)) return null;
  const slot = rng.pick(DROP_SLOTS) ?? 'weapon';
  return { rarity: rarityForFloor(floor), slot };
}

/**
 * ★ S15-T4 槽位保底计数（每槽 = 连续多少次「掉落判定」未出该槽）。扁平定长，随槽位数固定（3 个），
 * engine 自持一份键名与 DropSlot 对齐；持久化落点为调用方（store 的 TowerProgress 扁平字段），engine 不维护状态。
 */
export type SlotPity = Record<DropSlot, number>;

/** 全零初始计数（新档 / 重置用）。 */
export function createSlotPity(): SlotPity {
  return { weapon: 0, armor: 0, supporter: 0 };
}

/** 一次带保底的掉落结果：本次掉落 + 更新后的计数（调用方持久化新计数，仿 gacha 保底注入范式）。 */
export interface TowerDropWithPity {
  drop: TowerDrop | null;
  pity: SlotPity;
}

/**
 * 通某层的掉落（带槽位保底，engine 纯净——注入 RNG + 注入当前计数 + 注入阈值/映射，返回新计数，绝不维护状态或碰持久化）。
 *
 * 语义（拍板-B/C）：
 *  1. 若已有某槽计数 >= 阈值 → **强制命中**该槽（跳过 chance，稀有度仍走层段映射）；多个到阈值时按 DROP_SLOTS 固定序取第一个（确定性）。
 *  2. 否则正常判定：掷 chance，命中则随机槽。
 *  3. 命中槽（无论强制还是随机）→ 该槽计数归零、其余槽 +1；本次「判定发生但未掉落」（chance 未过）→ 所有槽 +1。
 *
 * 返回**新的计数副本**（不修改入参），命中的 TowerDrop 或 null。
 *
 * @param floor 刚通过的层数（>=1）。
 * @param rng 注入随机源（先掷概率，再掷槽位；序列 RNG 可精确复现）。
 * @param rarityForFloor 层段→稀有度映射（由 config 注入）。
 * @param pity 当前各槽保底计数（由 store 传入）。
 * @param threshold 槽位保底阈值（由 config 注入 SLOT_PITY_THRESHOLD；<=0 视为关闭保底）。
 * @param dropChance 掉落概率（默认 0.5）。
 */
export function rollTowerDropWithPity(
  floor: number,
  rng: RNG,
  rarityForFloor: (floor: number) => string,
  pity: SlotPity,
  threshold: number,
  dropChance = 0.5,
): TowerDropWithPity {
  const next: SlotPity = { weapon: pity.weapon, armor: pity.armor, supporter: pity.supporter };

  // 命中某槽的收尾：该槽计数归零、其余 +1。
  const hit = (slot: DropSlot): TowerDropWithPity => {
    for (const s of DROP_SLOTS) next[s] = s === slot ? 0 : next[s] + 1;
    return { drop: { rarity: rarityForFloor(floor), slot }, pity: next };
  };

  // 1. 到阈值强制命中（确定性取 DROP_SLOTS 固定序第一个 >= 阈值 的槽）。
  const forced = threshold > 0 ? DROP_SLOTS.find(s => next[s] >= threshold) : undefined;
  if (forced) return hit(forced);

  // 2. 正常判定：chance 未过 → 无掉落，所有槽 +1（本次判定发生但没出任何槽）。
  if (!rng.chance(dropChance)) {
    for (const s of DROP_SLOTS) next[s] += 1;
    return { drop: null, pity: next };
  }

  // 3. 命中随机槽（空池兜底 weapon）：命中槽归零、其余 +1。
  return hit(rng.pick(DROP_SLOTS) ?? 'weapon');
}
