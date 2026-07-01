/**
 * 装备域 store 行为测试（S13-C2）。
 * 覆盖：装备 / 卸下 / 同槽换装（旧件回背包不丢失）/ 异槽装备被拒（同槽校验）/
 * 一件实例只能戴一处 / resolveEquipBonus 多件逐围求和（缺省维 0）/ serialize⇄deserialize 往返 + reset。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useEquipmentStore } from './equipment';
import { useProfileStore } from './profile';
import { getEquipmentDef, dismantleValueForRarity } from '@/config/equipment';

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
});
