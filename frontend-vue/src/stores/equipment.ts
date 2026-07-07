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
  enhancedBonus,
  enhanceKpCost,
  clampEnhance,
  sumEquipModifiers,
  setBonusFor,
  SLOT_ORDER,
  MAX_ENHANCE,
  ENHANCE_FUEL_COUNT,
  type EquipmentHomeEffect,
  type EquipModifier,
  type EquipmentSlot,
} from '@/config/equipment';
import {
  sumStatBonus,
  calculateBattlePower,
  type StatBonus,
  type BattleStats,
} from '@/engine';
import { resolveMemberBattleStats } from '@/utils/battleStats';
import { useProfileStore } from './profile';
import { useGameDataStore } from './gameDataStore';
import { useNurtureStore } from './nurture';

/** 空三槽（新角色首次配装时建）。 */
function emptySlots(): EquippedSlots {
  return { weapon: null, armor: null, supporter: null };
}

/** 强化成本/可行性查询结果（UI 展示 + action 内部共用）。导出以便消费端类型标注。 */
export interface EnhanceCost {
  /** 目标等级（当前 +1）；已满级时 = 当前等级（MAX_ENHANCE）。 */
  targetLevel: number;
  /** 当前等级。 */
  currentLevel: number;
  /** 升到目标级的 KP 成本（已满级 / 未知 def → 0）。 */
  kp: number;
  /** 所需燃料件数（同 defId 游离重复件）。 */
  fuelNeeded: number;
  /** 当前可用燃料件数（同 defId、非本件、当前未被任意角色任意槽装备的游离实例）。 */
  fuelOwned: number;
  /** 是否已满级。 */
  maxed: boolean;
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

  /** 获得一件装备：建实例入背包，返回 uid（uid 在 store 层用 crypto.randomUUID 生成）。enhance 初始 0（未强化）。 */
  function addItem(defId: string): string {
    const uid = crypto.randomUUID();
    inventory.value.push({ uid, defId, enhance: 0 });
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

  // --- 强化（SE-T1c）---

  /**
   * 同 defId 可当燃料的游离实例 uid 列表（正在装备中的实例、被强化件自身不可当燃料，复用 findEquippedBy 守卫）。
   */
  function freeFuelUids(selfUid: string, defId: string): string[] {
    return inventory.value
      .filter(it => it.defId === defId && it.uid !== selfUid && !findEquippedBy(it.uid))
      .map(it => it.uid);
  }

  /**
   * 取某实例强化到「下一级」的成本 + 拥有量（纯查询，不变更状态）。未知 uid / 未知 def → 全 0 且 maxed=true（不可强化）。
   */
  function getEnhanceCost(uid: string): EnhanceCost {
    const item = getItem(uid);
    const def = item ? getEquipmentDef(item.defId) : undefined;
    if (!item || !def) {
      return { targetLevel: 0, currentLevel: 0, kp: 0, fuelNeeded: 0, fuelOwned: 0, maxed: true };
    }
    const currentLevel = clampEnhance(item.enhance);
    const maxed = currentLevel >= MAX_ENHANCE;
    const targetLevel = maxed ? currentLevel : currentLevel + 1;
    return {
      targetLevel,
      currentLevel,
      kp: maxed ? 0 : enhanceKpCost(def.rarity, targetLevel),
      fuelNeeded: maxed ? 0 : ENHANCE_FUEL_COUNT,
      fuelOwned: freeFuelUids(uid, item.defId).length,
      maxed,
    };
  }

  /**
   * ★ SE-T1c 强化装备：升一级，花 KP（走唯一货币出口 profile.spend）+ 吃 1 件同 defId 游离燃料。
   * 先校验后扣（原子）：满级 / KP 不足 / 燃料不足 / 未登录 / 未知 uid 一律拒绝且不变更任何状态。
   * 正在装备中的实例、被强化件自身不可当燃料（freeFuelUids 已排除）。
   * 返回是否成功。
   */
  function enhanceItem(uid: string): boolean {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return false;

    const item = getItem(uid);
    if (!item) return false;
    const def = getEquipmentDef(item.defId);
    if (!def) return false;

    const currentLevel = clampEnhance(item.enhance);
    if (currentLevel >= MAX_ENHANCE) {
      profile.addLog(`${def.name} 已强化到满级（Lv.${MAX_ENHANCE}）。`, 'info');
      return false;
    }

    const targetLevel = currentLevel + 1;
    const kpCost = enhanceKpCost(def.rarity, targetLevel);
    const fuel = freeFuelUids(uid, item.defId);
    if (fuel.length < ENHANCE_FUEL_COUNT) {
      profile.addLog(`强化 ${def.name} 需要 ${ENHANCE_FUEL_COUNT} 件相同的空闲装备作燃料。`, 'warning');
      return false;
    }
    if (profile.core.knowledgePoints < kpCost) {
      profile.addLog(`强化 ${def.name} 到 Lv.${targetLevel} 需要 ${kpCost} 知识点，余额不足。`, 'warning');
      return false;
    }

    // 校验全通过 → 扣 KP（唯一货币出口）+ 消耗燃料 + 升级
    if (!profile.spend('knowledgePoints', kpCost)) return false; // 双保险：并发/竞态防负
    const fuelUid = fuel[0];
    inventory.value = inventory.value.filter(it => it.uid !== fuelUid);
    // 直接改被强化实例的 enhance（inventory 里的对象引用）
    const target = getItem(uid);
    if (target) target.enhance = targetLevel;
    profile.addLog(`强化 [${def.rarity}] ${def.name} → Lv.${targetLevel}（消耗 1 件同款 + ${kpCost} 知识点）。`, 'success');
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
   * ★ 养成流·阶段1「一键装备」：对 SLOT_ORDER 三槽逐槽贪心，各挑一件使该角色**战力最大化**的装备装上。
   *
   * 战力口径与全站单一收口一致：calculateBattlePower(resolveMemberBattleStats(base, nurture, 合成装备加成))
   * （合成装备加成经纯解析 bonusForSlots，含逐件 enhancedBonus + 套装 setBonusFor，与实战/详情同源）。
   *
   * 逐槽规则：
   *  - 候选 = 背包中 def.slot 匹配、且未被**别的角色**占用、且未在本次已被本角色其它槽/本槽选走的游离/在位件；
   *    当前该槽已装件本身始终作为「保留」候选参与比较（否则空槽有候选就装）。
   *  - 对每个候选把它假设进该槽（其余槽维持本次已定结果），走 bonusForSlots → resolveMemberBattleStats →
   *    calculateBattlePower，取战力最大者；平手保留当前档（稳定、不无谓换装）。
   *  - 一件只戴一处：本次已选中的 uid 记入 used，后续槽不再复用；落地仍走既有 equip()（不新增存档字段）。
   *
   * 返回 { changed, powerBefore, powerAfter } 供 UI 飘字（changed = 实际发生变更的槽数，powerAfter ≥ powerBefore）。
   */
  function autoEquipBest(charId: number): { changed: number; powerBefore: number; powerAfter: number } {
    // base 五维 + 养成数据（缺角色/缺数据兜底，与 battleStats/nurture 缺省口径一致，不因缺数据报错）
    const character = useGameDataStore().getCharacterCardById(charId);
    const base: BattleStats = character?.battle_stats ?? { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 };
    const nurtureData = useNurtureStore().getNurtureData(charId);

    const powerFor = (slots: EquippedSlots): number =>
      calculateBattlePower(resolveMemberBattleStats(base, nurtureData, bonusForSlots(slots)));

    // 从当前配装出发（未记录则空三槽），逐槽在候选中贪心择优
    const current = equipped.value[charId] ?? emptySlots();
    const chosen: EquippedSlots = { ...current };
    const powerBefore = powerFor(chosen);

    // 本次已选中的 uid（含从当前配装继承的）——一件只戴一处，后续槽不复用
    const used = new Set<string>();
    for (const slot of SLOT_ORDER) {
      const uid = chosen[slot];
      if (uid) used.add(uid);
    }

    for (const slot of SLOT_ORDER) {
      const currentUid = chosen[slot];
      // 候选：槽匹配 + 未被别的角色占用 + 未在本次被别的槽选走（currentUid 自身允许，作保留项）
      const candidates = inventory.value.filter(it => {
        if (getEquipmentDef(it.defId)?.slot !== slot) return false;
        if (it.uid !== currentUid && used.has(it.uid)) return false; // 本次已被占用
        const where = findEquippedBy(it.uid);
        if (where && where.charId !== charId) return false; // 被别的角色戴着
        return true;
      });

      // 评估集 = 当前保留（含空）+ 每个候选装入该槽
      let bestUid: string | null = currentUid;
      let bestPower = powerFor(chosen);
      for (const cand of candidates) {
        if (cand.uid === currentUid) continue; // 保留档已计入 bestPower
        const trial: EquippedSlots = { ...chosen, [slot]: cand.uid };
        const p = powerFor(trial);
        if (p > bestPower) {
          bestPower = p;
          bestUid = cand.uid;
        }
      }

      chosen[slot] = bestUid;
      if (bestUid) used.add(bestUid);
    }

    // 落地：逐槽对比当前实际配装，仅对有变化的槽走既有 equip/unequip（equip 内含一件单戴自动卸原位）
    let changed = 0;
    const live = equipped.value[charId] ?? emptySlots();
    for (const slot of SLOT_ORDER) {
      const target = chosen[slot];
      if (live[slot] === target) continue;
      if (target == null) {
        if (unequip(charId, slot)) changed += 1;
      } else if (equip(charId, slot, target)) {
        changed += 1;
      }
    }

    const powerAfter = powerFor(equipped.value[charId] ?? emptySlots());
    return { changed, powerBefore, powerAfter };
  }

  /**
   * 解析某角色三槽装备的合并五维加成（缺省维 0）。
   * store 查表（uid→defId→def→bonus），SE-T1 求和前逐件套用 enhancedBonus(def.bonus, item.enhance)
   * （强化增益经此唯一 seam 进战力，与配装弹窗预览/候选展示同源），再委托 engine sumStatBonus 求和。
   * ★ SE-T2：逐件求和后**追加套装加成** setBonusFor(三槽 defId)——套装是「装备整体」确定性五维加法附加项，
   *   **不套 enhancedBonus**（不随强化涨、与 SE-T1 正交），一并 sumStatBonus。这一处改完，实战/养成详情/
   *   家园 explore 三个消费点自动生效（EquipPickerModal 换装预览另需同源调 setBonusFor，见该组件）。
   *   0 套装件时 setBonusFor 返回全 0，与 SE-T2 前逐字节一致（既有断言不受影响）。
   */
  function resolveEquipBonus(charId: number): StatBonus {
    return bonusForSlots(equipped.value[charId] ?? null);
  }

  /**
   * ★ 三槽 uid 组合 → 合并五维加成的**纯解析**（不读 equipped.value，供 resolveEquipBonus 与
   * autoEquipBest 候选评估同源消费）。逐件套 enhancedBonus（随强化涨）+ 追加 setBonusFor 套装项
   * （不套 enhancedBonus，恒定）。传 null / 全空 → 全 0（sumStatBonus([]) 归一）。
   */
  function bonusForSlots(slots: EquippedSlots | null): StatBonus {
    if (!slots) return sumStatBonus([]);
    const items = (['weapon', 'armor', 'supporter'] as EquipmentSlot[])
      .map(slot => slots[slot])
      .filter((uid): uid is string => uid != null)
      .map(uid => getItem(uid))
      .filter((it): it is EquipmentItemSave => it != null);
    const bonuses = items
      .map(it => {
        const def = getEquipmentDef(it.defId);
        return def ? enhancedBonus(def.bonus, it.enhance) : null;
      })
      .filter((b): b is NonNullable<typeof b> => b != null);
    // 套装加成：单角色三槽已装 defId 计数 → 确定性五维（不套 enhancedBonus，恒定）
    const setBonus = setBonusFor(items.map(it => it.defId));
    return sumStatBonus([...bonuses, setBonus]);
  }

  /**
   * ★ SE-T3 解析某角色三槽装备的战斗 modifier（暴击/增伤/治疗/护盾），逐维求和后同类硬 clamp。
   * 与 resolveEquipBonus 是**两条独立 seam**：本函数**绝不套 enhancedBonus**——modifier 恒定不随强化涨。
   * 只返回有值（>0）的维（供 View seam 展开进 player 侧 SquadUnitSetup.modifiers，敌方不给）；
   * critRate 增量由 createRuntimeUnit spread 叠在 BASE_CRIT_RATE 之上（本函数不含 BASE，只返装备增量）。
   */
  function resolveEquipModifiers(charId: number): EquipModifier {
    const slots = equipped.value[charId];
    if (!slots) return {};
    const modifiers = (['weapon', 'armor', 'supporter'] as EquipmentSlot[])
      .map(slot => slots[slot])
      .filter((uid): uid is string => uid != null)
      .map(uid => getItem(uid))
      .filter((it): it is EquipmentItemSave => it != null)
      .map(it => getEquipmentDef(it.defId)?.modifier)
      .filter((m): m is EquipModifier => m != null);
    return sumEquipModifiers(modifiers);
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
      // v18：白名单重建 {uid, defId, enhance}（禁 spread 漏进脏字段，Scout C-1 / pitfalls S13-C1）。
      inventory: inventory.value.map(it => ({ uid: it.uid, defId: it.defId, enhance: clampEnhance(it.enhance) })),
      equipped: Object.fromEntries(
        Object.entries(equipped.value).map(([id, slots]) => [id, { ...slots }]),
      ),
    };
  }

  function deserialize(data: EquipmentSave): void {
    // 二次兜底：把运行期 equip() 的不变式（在库 + 单件单戴 + 同槽）收口到载入边界，对齐迁移层与家园 canonicalize。
    // v18：白名单重建带 enhance（clamp [0,MAX]），杜绝脏字段/越界等级放大战力。
    inventory.value = data.inventory.map(it => ({ uid: it.uid, defId: it.defId, enhance: clampEnhance(it.enhance) }));
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
    getEnhanceCost,
    enhanceItem,
    equip,
    unequip,
    autoEquipBest,
    resolveEquipBonus,
    resolveEquipModifiers,
    resolveHomeEffect,
    serialize,
    deserialize,
    reset,
  };
});
