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
