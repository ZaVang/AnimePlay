/**
 * 装备域 store（S13-C1 占位；C2 接配装）。
 * C1 阶段只持有空背包 + 空配装，保证存档三处同改 + 往返保真；C2 在此长出
 * inventory 增删 / equip / unequip / 逐角色 equipBonus 解析。本 store 自己不触发保存——保存由门面统一调。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import {
  createDefaultEquipment,
  type EquipmentItemSave,
  type EquipmentSave,
  type EquippedSlots,
} from '@/infra/persistence/schema';

export const useEquipmentStore = defineStore('equipment', () => {
  /** 背包里的装备实例。 */
  const inventory = ref<EquipmentItemSave[]>([]);
  /** charId → 三槽装备（值为 inventory uid 或 null）。 */
  const equipped = ref<Record<number, EquippedSlots>>({});

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
    // 输入已由 migrate() 归一，这里信任其形态（与 nurture/homestead 等域一致）。
    inventory.value = data.inventory.map(it => ({ ...it }));
    equipped.value = Object.fromEntries(
      Object.entries(data.equipped).map(([id, slots]) => [Number(id), { ...slots }]),
    );
  }

  function reset(): void {
    const empty = createDefaultEquipment();
    inventory.value = empty.inventory;
    equipped.value = empty.equipped;
  }

  return {
    inventory,
    equipped,
    serialize,
    deserialize,
    reset,
  };
});
