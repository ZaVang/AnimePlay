/**
 * 装备域 store（S13-C1 占位 → C2 接配装）。
 * 持有背包 inventory + 逐角色三槽配装 equipped，长出：
 *  - addItem(defId)：建实例（uid = crypto.randomUUID()）入背包，返回 uid。
 *  - equip(charId, slot, uid) / unequip(charId, slot)：含同槽校验，换下旧件留背包（不丢失）。
 *  - resolveEquipBonus(charId)：取三槽 uid → 查 inventory 得 defId → 查 config 得 bonus →
 *    委托 engine 纯函数 sumStatBonus 逐围求和（查表留 store，求和留 engine，engine 不 import config）。
 * 本 store 自己不触发保存——保存由门面 userStore 统一调。serialize/deserialize/reset 沿用 C1。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  createDefaultEquipment,
  type EquipmentItemSave,
  type EquipmentSave,
  type EquippedSlots,
} from '@/infra/persistence/schema';
import {
  getEquipmentDef,
  sanitizeEquipped,
  sumHomeEffects,
  dismantleValueForRarity,
  type EquipmentHomeEffect,
  type EquipmentSlot,
} from '@/config/equipment';
import { sumStatBonus, type StatBonus } from '@/engine';
import { useProfileStore } from './profile';

/** 空三槽（新角色首次配装时建）。 */
function emptySlots(): EquippedSlots {
  return { weapon: null, armor: null, supporter: null };
}

export const useEquipmentStore = defineStore('equipment', () => {
  /** 背包里的装备实例。 */
  const inventory = ref<EquipmentItemSave[]>([]);
  /** charId → 三槽装备（值为 inventory uid 或 null）。 */
  const equipped = ref<Record<number, EquippedSlots>>({});

  // --- 查询 ---

  /** 背包全部实例（只读视图，UI 遍历用）。 */
  function list(): EquipmentItemSave[] {
    return inventory.value;
  }

  /** 取某角色三槽配装（无记录返回空三槽副本，不写入）。 */
  function getEquipped(charId: number): EquippedSlots {
    return equipped.value[charId] ?? emptySlots();
  }

  /** 按 uid 取实例（找不到 undefined）。 */
  function getItem(uid: string): EquipmentItemSave | undefined {
    return inventory.value.find(it => it.uid === uid);
  }

  /** 该 uid 当前是否被任意角色任意槽装备中；命中返回 { charId, slot }，否则 null。 */
  function findEquippedBy(uid: string): { charId: number; slot: EquipmentSlot } | null {
    for (const [id, slots] of Object.entries(equipped.value)) {
      for (const slot of ['weapon', 'armor', 'supporter'] as EquipmentSlot[]) {
        if (slots[slot] === uid) return { charId: Number(id), slot };
      }
    }
    return null;
  }

  // --- 增删 ---

  /** 获得一件装备：建实例入背包，返回 uid（uid 在 store 层用 crypto.randomUUID 生成）。 */
  function addItem(defId: string): string {
    const uid = crypto.randomUUID();
    inventory.value.push({ uid, defId });
    return uid;
  }

  /**
   * ★ SD-T3 分解装备：移除背包该实例 + 按稀有度得 KP（走唯一货币出口 profile.earn）。
   * 防呆双保险（UI 侧另有禁用）：已被任意角色任意槽装备中的实例拒绝分解（findEquippedBy 守卫），
   * 删的必是游离件——不产生孤儿配装引用。分解产出纯计算在 config（dismantleValueForRarity）。
   * 返回是否成功（未登录 / 未知 uid / 已装备中 / 未知 def = false 不变更）。
   */
  function dismantleItem(uid: string): boolean {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return false;

    const item = getItem(uid);
    if (!item) return false;
    if (findEquippedBy(uid)) {
      profile.addLog('该装备正在使用中，请先卸下再分解。', 'warning');
      return false;
    }
    const def = getEquipmentDef(item.defId);
    if (!def) return false;

    const value = dismantleValueForRarity(def.rarity);
    inventory.value = inventory.value.filter(it => it.uid !== uid);
    profile.earn('knowledgePoints', value);
    profile.addLog(`分解 [${def.rarity}] ${def.name}，回收 ${value} 知识点。`, 'success');
    return true;
  }

  // --- 配装 ---

  /**
   * 装备：把 inventory 中 uid 的实例装到 charId 的 slot。
   * 同槽校验：实例 def.slot 必须 == 目标 slot，否则拒绝（返回 false）。
   * 换下旧件：旧 uid 仅从槽里移除、仍留背包（不删 inventory）。
   * 同一实例若已戴在别处（同角色其它槽 / 别的角色），先从原位卸下（一件只能戴一处）。
   */
  function equip(charId: number, slot: EquipmentSlot, uid: string): boolean {
    const item = getItem(uid);
    if (!item) return false;
    const def = getEquipmentDef(item.defId);
    if (!def || def.slot !== slot) return false; // 异槽装备被拒

    // 一件只能戴一处：若已装在别处，先摘下
    const where = findEquippedBy(uid);
    if (where && equipped.value[where.charId]) {
      equipped.value[where.charId][where.slot] = null;
    }

    if (!equipped.value[charId]) equipped.value[charId] = emptySlots();
    // 旧件自动回背包（只清槽引用，inventory 不动）
    equipped.value[charId][slot] = uid;
    return true;
  }

  /** 卸下某角色某槽（旧件留背包）。返回是否原本有装备。 */
  function unequip(charId: number, slot: EquipmentSlot): boolean {
    const slots = equipped.value[charId];
    if (!slots || slots[slot] == null) return false;
    slots[slot] = null;
    return true;
  }

  /**
   * 解析某角色三槽装备的合并五维加成（缺省维 0）。
   * store 查表（uid→defId→def→bonus），委托 engine sumStatBonus 求和。
   */
  function resolveEquipBonus(charId: number): StatBonus {
    const slots = equipped.value[charId];
    if (!slots) return sumStatBonus([]);
    const bonuses = (['weapon', 'armor', 'supporter'] as EquipmentSlot[])
      .map(slot => slots[slot])
      .filter((uid): uid is string => uid != null)
      .map(uid => getItem(uid))
      .filter((it): it is EquipmentItemSave => it != null)
      .map(it => getEquipmentDef(it.defId)?.bonus)
      .filter((b): b is NonNullable<typeof b> => b != null);
    return sumStatBonus(bonuses);
  }

  /** 解析某角色三槽装备的家园效果（经验/好感/KP 倍率 + 舒适度）。 */
  function resolveHomeEffect(charId: number): Required<EquipmentHomeEffect> {
    const slots = equipped.value[charId];
    if (!slots) return sumHomeEffects([]);
    const effects = (['weapon', 'armor', 'supporter'] as EquipmentSlot[])
      .map(slot => slots[slot])
      .filter((uid): uid is string => uid != null)
      .map(uid => getItem(uid))
      .filter((it): it is EquipmentItemSave => it != null)
      .map(it => getEquipmentDef(it.defId)?.homeEffect)
      .filter((effect): effect is EquipmentHomeEffect => effect != null);
    return sumHomeEffects(effects);
  }

  // --- 持久化装配 ---
  function serialize(): EquipmentSave {
    return {
      inventory: inventory.value.map(it => ({ ...it })),
      equipped: Object.fromEntries(
        Object.entries(equipped.value).map(([id, slots]) => [id, { ...slots }]),
      ),
    };
  }

  function deserialize(data: EquipmentSave): void {
    // 二次兜底：把运行期 equip() 的不变式（在库 + 单件单戴 + 同槽）收口到载入边界，对齐迁移层与家园 canonicalize。
    inventory.value = data.inventory.map(it => ({ ...it }));
    equipped.value = sanitizeEquipped(inventory.value, data.equipped);
  }

  function reset(): void {
    const empty = createDefaultEquipment();
    inventory.value = empty.inventory;
    equipped.value = empty.equipped;
  }

  return {
    inventory,
    equipped,
    list,
    getEquipped,
    getItem,
    findEquippedBy,
    addItem,
    dismantleItem,
    equip,
    unequip,
    resolveEquipBonus,
    resolveHomeEffect,
    serialize,
    deserialize,
    reset,
  };
});
