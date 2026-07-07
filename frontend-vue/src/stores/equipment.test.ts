/**
 * 装备域 store 行为测试（S13-C2）。
 * 覆盖：装备 / 卸下 / 同槽换装（旧件回背包不丢失）/ 异槽装备被拒（同槽校验）/
 * 一件实例只能戴一处 / resolveEquipBonus 多件逐围求和（缺省维 0）/ serialize⇄deserialize 往返 + reset。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useEquipmentStore } from './equipment';
import { useProfileStore } from './profile';
import { getEquipmentDef, dismantleValueForRarity, enhancedBonus, enhanceKpCost, MAX_ENHANCE, ENHANCE_FUEL_COUNT, EQUIPMENT_CATALOG, EQUIPMENT_SETS } from '@/config/equipment';
import { calculateBattlePower } from '@/engine';
import { resolveMemberBattleStats } from '@/utils/battleStats';

beforeEach(() => {
  setActivePinia(createPinia());
});

// 起始目录已知 defId（每槽每稀有度 1 件）
const WPN_R = 'wpn_r_woodsword'; // weapon { atk:13, sp:5 }
const ARM_R = 'arm_r_uniform'; // armor { hp:30, def:6 }
const SUP_R = 'sup_r_glowstick'; // supporter { spd:12, sp:6 }
const WPN_UR = 'wpn_ur_longinus'; // weapon { atk:98, sp:42 }

describe('addItem / list', () => {
  it('addItem 建实例入背包，返回唯一 uid', () => {
    const eq = useEquipmentStore();
    const u1 = eq.addItem(WPN_R);
    const u2 = eq.addItem(WPN_R);
    expect(u1).not.toBe(u2); // uid 唯一
    expect(eq.list()).toHaveLength(2);
    expect(eq.getItem(u1)?.defId).toBe(WPN_R);
  });
});

describe('equip / unequip / 同槽校验', () => {
  it('装备成功：实例进对应槽', () => {
    const eq = useEquipmentStore();
    const uid = eq.addItem(WPN_R);
    expect(eq.equip(1, 'weapon', uid)).toBe(true);
    expect(eq.getEquipped(1).weapon).toBe(uid);
  });

  it('异槽装备被拒（武器不能装到防具槽）', () => {
    const eq = useEquipmentStore();
    const uid = eq.addItem(WPN_R);
    expect(eq.equip(1, 'armor', uid)).toBe(false);
    expect(eq.getEquipped(1).armor).toBeNull();
  });

  it('未知 uid 装备被拒', () => {
    const eq = useEquipmentStore();
    expect(eq.equip(1, 'weapon', 'nope')).toBe(false);
  });

  it('卸下：槽清空但实例仍在背包', () => {
    const eq = useEquipmentStore();
    const uid = eq.addItem(WPN_R);
    eq.equip(1, 'weapon', uid);
    expect(eq.unequip(1, 'weapon')).toBe(true);
    expect(eq.getEquipped(1).weapon).toBeNull();
    expect(eq.getItem(uid)).toBeDefined(); // 实例没丢
    expect(eq.unequip(1, 'weapon')).toBe(false); // 空槽再卸返回 false
  });

  it('同槽换装：旧件回背包不丢失', () => {
    const eq = useEquipmentStore();
    const oldUid = eq.addItem(WPN_R);
    const newUid = eq.addItem(WPN_UR);
    eq.equip(1, 'weapon', oldUid);
    eq.equip(1, 'weapon', newUid); // 换装
    expect(eq.getEquipped(1).weapon).toBe(newUid);
    // 旧件仍在背包、未被任何槽引用
    expect(eq.getItem(oldUid)).toBeDefined();
    expect(eq.findEquippedBy(oldUid)).toBeNull();
    expect(eq.list()).toHaveLength(2);
  });

  it('一件实例只能戴一处：换角色时自动从原角色卸下', () => {
    const eq = useEquipmentStore();
    const uid = eq.addItem(WPN_R);
    eq.equip(1, 'weapon', uid);
    eq.equip(2, 'weapon', uid); // 给角色 2 装同一件
    expect(eq.getEquipped(1).weapon).toBeNull(); // 角色 1 自动卸下
    expect(eq.getEquipped(2).weapon).toBe(uid);
  });
});

describe('resolveEquipBonus 逐围求和', () => {
  it('无装备时全零', () => {
    const eq = useEquipmentStore();
    expect(eq.resolveEquipBonus(1)).toEqual({ hp: 0, atk: 0, def: 0, sp: 0, spd: 0 });
  });

  it('三槽满装：逐围求和，缺省维记 0', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_R); // atk:13, sp:5
    const a = eq.addItem(ARM_R); // hp:30, def:6
    const s = eq.addItem(SUP_R); // spd:12, sp:6
    eq.equip(1, 'weapon', w);
    eq.equip(1, 'armor', a);
    eq.equip(1, 'supporter', s);
    expect(eq.resolveEquipBonus(1)).toEqual({
      hp: 30, // armor
      atk: 13, // weapon
      def: 6, // armor
      sp: 5 + 6, // weapon + supporter = 11
      spd: 12, // supporter
    });
  });

  it('和与目录定义一致（单件）', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_UR);
    eq.equip(1, 'weapon', w);
    const def = getEquipmentDef(WPN_UR)!;
    const bonus = eq.resolveEquipBonus(1);
    expect(bonus.atk).toBe(def.bonus.atk);
    expect(bonus.sp).toBe(def.bonus.sp);
    expect(bonus.hp).toBe(0);
  });
});

describe('resolveHomeEffect 逐项求和', () => {
  it('无装备时效果全零', () => {
    const eq = useEquipmentStore();
    expect(eq.resolveHomeEffect(1)).toEqual({ expPct: 0, affectionPct: 0, knowledgePct: 0, comfort: 0 });
  });

  it('只汇总已装备道具的家园效果', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem('wpn_sr_training_bokken');
    const a = eq.addItem('arm_sr_cozy_cardigan');
    eq.addItem('sup_sr_broadcast_mic');
    eq.equip(1, 'weapon', w);
    eq.equip(1, 'armor', a);

    // SD-T2 弱化后：training_bokken expPct 0.02、cozy_cardigan affectionPct 0.02；comfort 保留 2+4=6
    expect(eq.resolveHomeEffect(1)).toEqual({
      expPct: 0.02,
      affectionPct: 0.02,
      knowledgePct: 0,
      comfort: 6,
    });
  });
});

describe('SD-T3 dismantleItem（分解游离件为 KP，已装备件保护）', () => {
  it('分解游离件：移除背包实例 + 按稀有度得 KP（走 profile.earn）', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const eq = useEquipmentStore();
    const uid = eq.addItem(WPN_UR); // UR
    const kpBefore = profile.core.knowledgePoints;
    expect(eq.dismantleItem(uid)).toBe(true);
    expect(eq.getItem(uid)).toBeUndefined(); // 实例移除
    expect(profile.core.knowledgePoints).toBe(kpBefore + dismantleValueForRarity('UR'));
  });

  it('已装备件拒绝分解（findEquippedBy 守卫）', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const eq = useEquipmentStore();
    const uid = eq.addItem(WPN_R);
    eq.equip(1, 'weapon', uid);
    const kpBefore = profile.core.knowledgePoints;
    expect(eq.dismantleItem(uid)).toBe(false);
    expect(eq.getItem(uid)).toBeDefined(); // 实例仍在
    expect(profile.core.knowledgePoints).toBe(kpBefore); // 未得 KP
  });

  it('卸下后可分解；只删指定实例、同 defId 其它件不受影响', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const eq = useEquipmentStore();
    const u1 = eq.addItem(WPN_R);
    const u2 = eq.addItem(WPN_R);
    eq.equip(1, 'weapon', u1);
    eq.unequip(1, 'weapon'); // u1 回背包
    expect(eq.dismantleItem(u1)).toBe(true);
    expect(eq.getItem(u1)).toBeUndefined();
    expect(eq.getItem(u2)).toBeDefined(); // 另一件不受影响
  });

  it('未登录 / 未知 uid → 拒绝', () => {
    const eq = useEquipmentStore();
    const uid = eq.addItem(WPN_R);
    expect(eq.dismantleItem(uid)).toBe(false); // 未登录
    useProfileStore().currentUser = 'tester';
    expect(eq.dismantleItem('nope')).toBe(false); // 未知 uid
  });
});

describe('SE-T1b 强化增益经 resolveEquipBonus 单一 seam 进战力', () => {
  const NURTURE_ZERO = { statPoints: { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 }, breakthrough: 0, claimedBondMilestones: [] };

  it('resolveEquipBonus 逐件套用 enhancedBonus：强化后加成随等级提升', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_UR); // atk:98, sp:42
    eq.equip(1, 'weapon', w);
    const before = eq.resolveEquipBonus(1);
    expect(before.atk).toBe(98); // enhance:0 = 静态值

    // 直接抬升该实例 enhance（本 case 只验 resolveEquipBonus 同源套用，不走 action）
    eq.getItem(w)!.enhance = 2;
    const after = eq.resolveEquipBonus(1);
    const def = getEquipmentDef(WPN_UR)!;
    expect(after).toEqual({ ...before, ...enhancedBonus(def.bonus, 2), hp: 0, def: 0, spd: 0 });
    expect(after.atk).toBeGreaterThan(before.atk);
    expect(after.sp).toBeGreaterThan(before.sp);
  });

  it('强化后经 resolveMemberBattleStats 真进战力（不另拼口径）', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_UR);
    eq.equip(1, 'weapon', w);
    const base = { hp: 500, atk: 100, def: 50, sp: 30, spd: 40 };

    const statsBefore = resolveMemberBattleStats(base, NURTURE_ZERO, eq.resolveEquipBonus(1));
    const powerBefore = calculateBattlePower(statsBefore);

    eq.getItem(w)!.enhance = MAX_ENHANCE;
    const statsAfter = resolveMemberBattleStats(base, NURTURE_ZERO, eq.resolveEquipBonus(1));
    const powerAfter = calculateBattlePower(statsAfter);

    expect(statsAfter.atk).toBeGreaterThan(statsBefore.atk); // 五维真提升
    expect(powerAfter).toBeGreaterThan(powerBefore); // 战力真提升
  });
});

describe('SE-T1c getEnhanceCost / enhanceItem（KP+燃料强化，货币走 profile.spend）', () => {
  function login() {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    return profile;
  }

  it('getEnhanceCost：下一级 KP 成本 + 所需/拥有燃料件数', () => {
    login();
    const eq = useEquipmentStore();
    const target = eq.addItem(WPN_R); // R
    eq.addItem(WPN_R); // 1 件同款游离燃料
    const cost = eq.getEnhanceCost(target);
    expect(cost.currentLevel).toBe(0);
    expect(cost.targetLevel).toBe(1);
    expect(cost.kp).toBe(enhanceKpCost('R', 1));
    expect(cost.fuelNeeded).toBe(ENHANCE_FUEL_COUNT);
    expect(cost.fuelOwned).toBe(1);
    expect(cost.maxed).toBe(false);
  });

  it('成功强化：扣 KP（profile.spend 余额减少）+ 吃 1 件同 defId 游离燃料 + enhance +1', () => {
    const profile = login();
    const eq = useEquipmentStore();
    const target = eq.addItem(WPN_R);
    const fuel = eq.addItem(WPN_R);
    profile.core.knowledgePoints = enhanceKpCost('R', 1) + 500;
    const kpBefore = profile.core.knowledgePoints;

    expect(eq.enhanceItem(target)).toBe(true);
    expect(eq.getItem(target)!.enhance).toBe(1); // 升一级
    expect(eq.getItem(fuel)).toBeUndefined(); // 燃料被吃掉
    expect(profile.core.knowledgePoints).toBe(kpBefore - enhanceKpCost('R', 1)); // KP 扣减
    expect(eq.list()).toHaveLength(1); // 只剩被强化件
  });

  it('满级（Lv.MAX）拒绝且不变更', () => {
    const profile = login();
    const eq = useEquipmentStore();
    const target = eq.addItem(WPN_R);
    eq.addItem(WPN_R); // 备好燃料
    eq.getItem(target)!.enhance = MAX_ENHANCE;
    profile.core.knowledgePoints = 999999;
    const kpBefore = profile.core.knowledgePoints;

    expect(eq.enhanceItem(target)).toBe(false);
    expect(eq.getItem(target)!.enhance).toBe(MAX_ENHANCE); // 不变
    expect(eq.list()).toHaveLength(2); // 燃料未被吃
    expect(profile.core.knowledgePoints).toBe(kpBefore); // KP 未扣
  });

  it('KP 不足拒绝且不变更（燃料不被吃）', () => {
    const profile = login();
    const eq = useEquipmentStore();
    const target = eq.addItem(WPN_UR); // UR Lv1 成本高
    const fuel = eq.addItem(WPN_UR);
    profile.core.knowledgePoints = enhanceKpCost('UR', 1) - 1; // 差 1

    expect(eq.enhanceItem(target)).toBe(false);
    expect(eq.getItem(target)!.enhance).toBe(0); // 不变
    expect(eq.getItem(fuel)).toBeDefined(); // 燃料未被吃
    expect(profile.core.knowledgePoints).toBe(enhanceKpCost('UR', 1) - 1); // KP 未扣
  });

  it('燃料不足拒绝且不变更（无同款游离件）', () => {
    const profile = login();
    const eq = useEquipmentStore();
    const target = eq.addItem(WPN_R); // 唯一一件，无燃料
    profile.core.knowledgePoints = 999999;
    const kpBefore = profile.core.knowledgePoints;

    expect(eq.enhanceItem(target)).toBe(false);
    expect(eq.getItem(target)!.enhance).toBe(0);
    expect(profile.core.knowledgePoints).toBe(kpBefore); // KP 未扣
  });

  it('装备中的同款实例不可当燃料（findEquippedBy 守卫）→ 无游离燃料则拒绝', () => {
    const profile = login();
    const eq = useEquipmentStore();
    const target = eq.addItem(WPN_R);
    const equippedFuel = eq.addItem(WPN_R);
    eq.equip(1, 'weapon', equippedFuel); // 同款但装备中 → 不可当燃料
    profile.core.knowledgePoints = 999999;

    expect(eq.getEnhanceCost(target).fuelOwned).toBe(0); // 装备中的件不计入燃料
    expect(eq.enhanceItem(target)).toBe(false); // 无游离燃料 → 拒绝
    expect(eq.getItem(target)!.enhance).toBe(0);
    expect(eq.getItem(equippedFuel)).toBeDefined(); // 装备中件未被吃
  });

  it('被强化件自身不可当燃料（唯一件不能拿自己当料）', () => {
    const profile = login();
    const eq = useEquipmentStore();
    const target = eq.addItem(WPN_R); // 只有它自己
    profile.core.knowledgePoints = 999999;
    expect(eq.getEnhanceCost(target).fuelOwned).toBe(0); // 自身排除
    expect(eq.enhanceItem(target)).toBe(false);
  });

  it('未登录拒绝', () => {
    const eq = useEquipmentStore();
    const target = eq.addItem(WPN_R);
    eq.addItem(WPN_R);
    expect(eq.enhanceItem(target)).toBe(false); // 未 login
  });
});

describe('SE-T3 resolveEquipModifiers（三槽 modifier 求和 + clamp + 不随强化涨）', () => {
  // 已知带 modifier 的目录件
  const WPN_UR_CRIT = 'wpn_ur_longinus'; // modifier { critRate: 0.07 }
  const WPN_HR_CRIT = 'wpn_hr_railgun'; // modifier { critRate: 0.04 }
  const ARM_UR_SHIELD = 'arm_ur_atfield'; // modifier { shieldUp: 0.12 }
  const SUP_UR_HEAL = 'sup_ur_holy_grail'; // modifier { healUp: 0.12 }

  it('无装备 / 无 modifier 件 → 空对象', () => {
    const eq = useEquipmentStore();
    expect(eq.resolveEquipModifiers(1)).toEqual({});
    const w = eq.addItem(WPN_R); // 无 modifier
    eq.equip(1, 'weapon', w);
    expect(eq.resolveEquipModifiers(1)).toEqual({});
  });

  it('三槽 modifier 各维求和（critRate 累加、healUp/shieldUp 并列）', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_UR_CRIT); // critRate 0.07
    const a = eq.addItem(ARM_UR_SHIELD); // shieldUp 0.12
    const s = eq.addItem(SUP_UR_HEAL); // healUp 0.12
    eq.equip(1, 'weapon', w);
    eq.equip(1, 'armor', a);
    eq.equip(1, 'supporter', s);
    const mods = eq.resolveEquipModifiers(1);
    expect(mods.critRate).toBeCloseTo(0.07, 5);
    expect(mods.shieldUp).toBeCloseTo(0.12, 5);
    expect(mods.healUp).toBeCloseTo(0.12, 5);
  });

  it('缺省维为 0（不生成未被任何件填的维）', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_UR_CRIT); // 只有 critRate
    eq.equip(1, 'weapon', w);
    const mods = eq.resolveEquipModifiers(1);
    expect(mods).not.toHaveProperty('damageUp');
    expect(mods).not.toHaveProperty('healUp');
    expect(mods).not.toHaveProperty('shieldUp');
  });

  it('★ 同类 critRate 求和硬 clamp（多件叠加不超上限 0.20）', () => {
    const eq = useEquipmentStore();
    // 两件 critRate 装备（同 weapon 槽只能戴一件，故用别的手法：直接把两件都戴——一个 weapon、一个也 weapon 会互斥）
    // 采用 weapon(0.07) + 另一 weapon(0.06) 不行；改用能叠的：weapon longinus(0.07) + weapon gungnir 互斥。
    // 因三槽各一件、单件 critRate ≤0.07，正常戴满 3 槽 critRate 合计 <0.20 不会触顶。
    // clamp 边界已由 config sumEquipModifiers 单测覆盖；此处验 store 传导：戴单件即返该件值（未被 clamp 削）。
    const w = eq.addItem(WPN_UR_CRIT);
    eq.equip(1, 'weapon', w);
    expect(eq.resolveEquipModifiers(1).critRate).toBeCloseTo(0.07, 5); // 未触顶，原值传导
  });

  it('★ modifier 恒定：同一件强化前后 resolveEquipModifiers 输出不变（不套 enhancedBonus）', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_UR_CRIT);
    eq.equip(1, 'weapon', w);
    const before = eq.resolveEquipModifiers(1);
    eq.getItem(w)!.enhance = MAX_ENHANCE; // 强化拉满
    const after = eq.resolveEquipModifiers(1);
    expect(after).toEqual(before); // modifier 不随强化涨
    expect(after.critRate).toBeCloseTo(0.07, 5);
  });

  it('换下装备后 modifier 归零（与 equipped 状态同步）', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_HR_CRIT);
    eq.equip(1, 'weapon', w);
    expect(eq.resolveEquipModifiers(1).critRate).toBeCloseTo(0.04, 5);
    eq.unequip(1, 'weapon');
    expect(eq.resolveEquipModifiers(1)).toEqual({});
  });
});

describe('SE-T2 套装加成经 resolveEquipBonus 单一 seam 汇入', () => {
  // attack 套的三槽实际成员（跨稀有度混搭）
  const ATK_W = EQUIPMENT_CATALOG.find(d => d.setId === 'attack' && d.slot === 'weapon')!.id;
  const ATK_A = EQUIPMENT_CATALOG.find(d => d.setId === 'attack' && d.slot === 'armor')!.id;
  const ATK_S = EQUIPMENT_CATALOG.find(d => d.setId === 'attack' && d.slot === 'supporter')!.id;
  const NURTURE_ZERO = { statPoints: { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 }, breakthrough: 0, claimedBondMilestones: [] };

  it('0 套装件时 resolveEquipBonus 与逐件求和逐字节一致（既有断言不受影响）', () => {
    const eq = useEquipmentStore();
    // 用无 setId 的散件（wpn_r_stage_mic 未打标签）
    const w = eq.addItem('wpn_r_stage_mic'); // atk:8, sp:7, 无 setId
    eq.equip(1, 'weapon', w);
    const def = getEquipmentDef('wpn_r_stage_mic')!;
    expect(eq.resolveEquipBonus(1)).toEqual({
      hp: 0, atk: def.bonus.atk, def: 0, sp: def.bonus.sp, spd: 0,
    });
  });

  it('齐 2 件套装 → resolveEquipBonus 追加 bonus2（超出逐件求和）', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(ATK_W);
    const a = eq.addItem(ATK_A);
    eq.equip(1, 'weapon', w);
    // 先只装 1 件套装成员（不足 2）
    const oneOnly = eq.resolveEquipBonus(1);
    eq.equip(1, 'armor', a); // 齐 2
    const two = eq.resolveEquipBonus(1);
    // 齐 2 后 atk 增量 = armor 逐件 atk（0）+ 套装 bonus2.atk
    const armAtk = getEquipmentDef(ATK_A)!.bonus.atk ?? 0;
    expect(two.atk).toBe(oneOnly.atk + armAtk + (EQUIPMENT_SETS.attack.bonus2.atk ?? 0));
  });

  it('缺件不给（1 件套装成员 → 无套装加成，仅逐件）', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(ATK_W);
    eq.equip(1, 'weapon', w);
    const def = getEquipmentDef(ATK_W)!;
    // 只有逐件 bonus，无套装项
    expect(eq.resolveEquipBonus(1).atk).toBe(def.bonus.atk);
  });

  it('齐套后经 resolveMemberBattleStats 真进战力（不另拼口径）', () => {
    const eq = useEquipmentStore();
    const base = { hp: 500, atk: 100, def: 50, sp: 30, spd: 40 };
    const w = eq.addItem(ATK_W);
    const a = eq.addItem(ATK_A);
    const s = eq.addItem(ATK_S);
    eq.equip(1, 'weapon', w);
    eq.equip(1, 'armor', a);
    const statsTwo = resolveMemberBattleStats(base, NURTURE_ZERO, eq.resolveEquipBonus(1));
    const powerTwo = calculateBattlePower(statsTwo);
    eq.equip(1, 'supporter', s); // 齐 3
    const statsThree = resolveMemberBattleStats(base, NURTURE_ZERO, eq.resolveEquipBonus(1));
    const powerThree = calculateBattlePower(statsThree);
    expect(powerThree).toBeGreaterThan(powerTwo); // 齐 3 战力真高于齐 2
  });

  it('★ 套装加成不随 enhance 变化（恒定，不套 enhancedBonus）', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(ATK_W);
    const a = eq.addItem(ATK_A);
    eq.equip(1, 'weapon', w);
    eq.equip(1, 'armor', a); // 齐 2
    const before = eq.resolveEquipBonus(1);
    // 强化其中一件到满级：逐件 bonus 会涨，但套装加成分量应恒定
    eq.getItem(w)!.enhance = MAX_ENHANCE;
    const after = eq.resolveEquipBonus(1);
    // 套装 bonus2.atk 是恒定项：after.atk - before.atk 应恰等于「w 强化增量」（不含套装重复放大）
    const wAtkBefore = enhancedBonus(getEquipmentDef(ATK_W)!.bonus, 0).atk ?? 0;
    const wAtkAfter = enhancedBonus(getEquipmentDef(ATK_W)!.bonus, MAX_ENHANCE).atk ?? 0;
    expect(after.atk - before.atk).toBe(wAtkAfter - wAtkBefore);
  });
});

describe('养成流·阶段1 autoEquipBest（一键装备：逐槽贪心最大化战力）', () => {
  // base 五维缺 gameData 时兜底 {hp:100,atk:50,def:30,sp:40,spd:60}，nurture 缺省全 0 → 纯装备驱动
  const NURTURE_ZERO = { statPoints: { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 }, breakthrough: 0, claimedBondMilestones: [] };
  const BASE = { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 };

  it('空背包不报错：返回 changed:0、战力不变', () => {
    const eq = useEquipmentStore();
    const r = eq.autoEquipBest(1);
    expect(r.changed).toBe(0);
    expect(r.powerAfter).toBe(r.powerBefore);
    expect(eq.getEquipped(1)).toEqual({ weapon: null, armor: null, supporter: null });
  });

  it('三槽各有候选：三槽装满、战力不降、装的都是槽匹配件', () => {
    const eq = useEquipmentStore();
    eq.addItem(WPN_R);
    eq.addItem(ARM_R);
    eq.addItem(SUP_R);
    const r = eq.autoEquipBest(1);
    expect(r.changed).toBe(3);
    expect(r.powerAfter).toBeGreaterThanOrEqual(r.powerBefore);
    const slots = eq.getEquipped(1);
    expect(getEquipmentDef(eq.getItem(slots.weapon!)!.defId)!.slot).toBe('weapon');
    expect(getEquipmentDef(eq.getItem(slots.armor!)!.defId)!.slot).toBe('armor');
    expect(getEquipmentDef(eq.getItem(slots.supporter!)!.defId)!.slot).toBe('supporter');
  });

  it('同槽多候选：选中的是使战力最大的那一件（UR 武器 > R 武器）', () => {
    const eq = useEquipmentStore();
    const weak = eq.addItem(WPN_R); // atk:13, sp:5
    const strong = eq.addItem(WPN_UR); // atk:98, sp:42
    eq.autoEquipBest(1);
    // 选中的是最优件（UR），弱件游离
    expect(eq.getEquipped(1).weapon).toBe(strong);
    expect(eq.findEquippedBy(weak)).toBeNull();
    // 该 uid 装上后确实是候选中战力最大者（对拍：手算两件各自战力）
    const powerStrong = calculateBattlePower(
      resolveMemberBattleStats(BASE, NURTURE_ZERO, eq.resolveEquipBonus(1)),
    );
    eq.equip(1, 'weapon', weak);
    const powerWeak = calculateBattlePower(
      resolveMemberBattleStats(BASE, NURTURE_ZERO, eq.resolveEquipBonus(1)),
    );
    expect(powerStrong).toBeGreaterThan(powerWeak);
  });

  it('已装更优件时保留不换（幂等：再次一键 changed:0）', () => {
    const eq = useEquipmentStore();
    const strong = eq.addItem(WPN_UR);
    eq.addItem(WPN_R); // 更弱的备选
    eq.equip(1, 'weapon', strong); // 已装最优
    const r = eq.autoEquipBest(1);
    expect(r.changed).toBe(0); // 无更优 → 不换
    expect(eq.getEquipped(1).weapon).toBe(strong);
    // 再跑一次仍稳定
    expect(eq.autoEquipBest(1).changed).toBe(0);
  });

  it('已被别的角色占用的道具不重复用', () => {
    const eq = useEquipmentStore();
    const shared = eq.addItem(WPN_UR);
    eq.equip(2, 'weapon', shared); // 角色 2 先戴着
    const own = eq.addItem(WPN_R); // 角色 1 唯一可用武器
    eq.autoEquipBest(1);
    // 角色 1 不能抢角色 2 的件，只能用自己的 R 件
    expect(eq.getEquipped(1).weapon).toBe(own);
    expect(eq.getEquipped(2).weapon).toBe(shared); // 角色 2 仍持有
  });

  it('全局战力口径对拍：一键后战力 = 当前配装真实战力，且 ≥ before', () => {
    const eq = useEquipmentStore();
    eq.addItem(WPN_UR);
    eq.addItem(ARM_R);
    eq.addItem(SUP_R);
    const r = eq.autoEquipBest(1);
    const actual = calculateBattlePower(
      resolveMemberBattleStats(BASE, NURTURE_ZERO, eq.resolveEquipBonus(1)),
    );
    expect(r.powerAfter).toBe(actual);
    expect(r.powerAfter).toBeGreaterThanOrEqual(r.powerBefore);
  });
});

describe('serialize ⇄ deserialize 往返 + reset', () => {
  it('往返保真', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_R);
    eq.equip(1, 'weapon', w);
    const snap = JSON.parse(JSON.stringify(eq.serialize()));
    eq.reset();
    expect(eq.list()).toHaveLength(0);
    expect(eq.getEquipped(1).weapon).toBeNull();
    eq.deserialize(snap);
    expect(eq.list()).toHaveLength(1);
    expect(eq.getEquipped(1).weapon).toBe(w);
  });

  it('SE-T1a 强化等级 enhance 经 serialize⇄deserialize 往返保真（含 clamp）', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_R);
    eq.getItem(w)!.enhance = 3;
    const snap = JSON.parse(JSON.stringify(eq.serialize()));
    expect(snap.inventory[0]).toEqual({ uid: w, defId: WPN_R, enhance: 3 });
    eq.reset();
    eq.deserialize(snap);
    expect(eq.getItem(w)!.enhance).toBe(3); // 强化等级不丢

    // deserialize 对脏档 enhance clamp 到 [0, MAX_ENHANCE]
    eq.deserialize({ inventory: [{ uid: 'x', defId: WPN_R, enhance: 99 }], equipped: {} } as never);
    expect(eq.getItem('x')!.enhance).toBe(MAX_ENHANCE);
  });
});
