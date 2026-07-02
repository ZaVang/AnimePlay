/**
 * SE-T3c 特征测试：装备 modifier 经 View seam → createRuntimeUnit 真进战斗。
 *
 * View seam（SquadBattleView.unitSetups.toSetup）对 player 侧做的合并语义在此复刻并断言：
 *  - resolveEquipModifiers(charId) 返回「装备额外增量」（已 clamp、不含 BASE）。
 *  - critRate 增量在 seam 显式叠在 BASE_CRIT_RATE 之上再交 setup.modifiers
 *    （因 createRuntimeUnit 用 spread 覆盖 critRate，只传增量会冲掉基础暴击）。
 *  - healUp/damageUp/shieldUp 为纯加区（缺省 0），spread 覆盖 0→值即注入生效。
 *  - 敌方 setup 不给 modifier → 敌方 runtime.modifiers 保持引擎基线（critRate=BASE_CRIT_RATE、其余 0）。
 *
 * engine createRuntimeUnit 语义**不改**（本测试不改 engine），仅验注入后 runtime 值正确。
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useEquipmentStore } from './equipment';
import {
  BASE_CRIT_RATE,
  DEFAULT_BATTLE_MODIFIERS,
  simulateTimedBattle,
  createSeededRng,
  type SquadUnitSetup,
  type BattleStats,
} from '@/engine';
import type { EquipModifier } from '@/config/equipment';

beforeEach(() => {
  setActivePinia(createPinia());
});

const WPN_UR_CRIT = 'wpn_ur_longinus'; // modifier { critRate: 0.07 }
const SUP_UR_HEAL = 'sup_ur_holy_grail'; // modifier { healUp: 0.12 }
const ARM_UR_SHIELD = 'arm_ur_atfield'; // modifier { shieldUp: 0.12 }
const WPN_HR_DMG = 'wpn_ur_excalibur'; // modifier { damageUp: 0.10 }

const stats: BattleStats = { hp: 1000, atk: 100, def: 50, sp: 30, spd: 40 };

/** 复刻 View seam 对 player 侧的 modifier 合并（BASE 叠加收口点）。 */
function toPlayerModifiers(equipMods: EquipModifier): Partial<typeof DEFAULT_BATTLE_MODIFIERS> | undefined {
  if (Object.keys(equipMods).length === 0) return undefined;
  return {
    ...equipMods,
    ...(equipMods.critRate != null ? { critRate: BASE_CRIT_RATE + equipMods.critRate } : {}),
  };
}

function runWith(playerMods: Partial<typeof DEFAULT_BATTLE_MODIFIERS> | undefined) {
  const units: SquadUnitSetup[] = [
    { id: 'p1', name: 'p1', side: 'player', position: 'front', stats, ...(playerMods ? { modifiers: playerMods } : {}) },
    { id: 'e1', name: 'e1', side: 'enemy', position: 'front', stats },
  ];
  const result = simulateTimedBattle({ units, rng: createSeededRng(1), maxTimeMs: 1 });
  const player = result.units.find(u => u.id === 'p1')!;
  const enemy = result.units.find(u => u.id === 'e1')!;
  return { player, enemy };
}

describe('SE-T3c 装备 critRate 经 seam 叠在 BASE_CRIT_RATE 之上', () => {
  it('player runtime.modifiers.critRate = BASE_CRIT_RATE + 装备增量', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_UR_CRIT); // critRate 0.07
    eq.equip(1, 'weapon', w);
    const equipMods = eq.resolveEquipModifiers(1);
    expect(equipMods.critRate).toBeCloseTo(0.07, 5); // 增量不含 BASE

    const { player } = runWith(toPlayerModifiers(equipMods));
    expect(player.modifiers.critRate).toBeCloseTo(BASE_CRIT_RATE + 0.07, 5); // 0.05 + 0.07 = 0.12
  });

  it('无装备 modifier 的 player runtime.critRate 仍为 BASE_CRIT_RATE（seam 不注入 → 引擎基线）', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem('wpn_r_woodsword'); // 无 modifier
    eq.equip(1, 'weapon', w);
    const { player } = runWith(toPlayerModifiers(eq.resolveEquipModifiers(1)));
    expect(player.modifiers.critRate).toBeCloseTo(BASE_CRIT_RATE, 5);
  });
});

describe('SE-T3c 纯加维（healUp/damageUp/shieldUp）注入生效', () => {
  it('healUp 装备注入到 runtime.modifiers.healUp（缺省 0 → 值）', () => {
    const eq = useEquipmentStore();
    const s = eq.addItem(SUP_UR_HEAL); // healUp 0.12
    eq.equip(1, 'supporter', s);
    const { player } = runWith(toPlayerModifiers(eq.resolveEquipModifiers(1)));
    expect(player.modifiers.healUp).toBeCloseTo(0.12, 5);
    // critRate 未被 modifier 件填 → 仍是 BASE（seam 不给 critRate 时 createRuntimeUnit 用 BASE）
    expect(player.modifiers.critRate).toBeCloseTo(BASE_CRIT_RATE, 5);
  });

  it('damageUp / shieldUp 装备注入生效', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_HR_DMG); // damageUp 0.10
    const a = eq.addItem(ARM_UR_SHIELD); // shieldUp 0.12
    eq.equip(1, 'weapon', w);
    eq.equip(1, 'armor', a);
    const { player } = runWith(toPlayerModifiers(eq.resolveEquipModifiers(1)));
    expect(player.modifiers.damageUp).toBeCloseTo(0.1, 5);
    expect(player.modifiers.shieldUp).toBeCloseTo(0.12, 5);
  });
});

describe('SE-T3c 敌方不给装备 modifier', () => {
  it('敌方 runtime.modifiers 保持引擎基线（critRate=BASE、其余=DEFAULT）', () => {
    const eq = useEquipmentStore();
    const w = eq.addItem(WPN_UR_CRIT);
    eq.equip(1, 'weapon', w);
    const { enemy } = runWith(toPlayerModifiers(eq.resolveEquipModifiers(1)));
    expect(enemy.modifiers.critRate).toBeCloseTo(BASE_CRIT_RATE, 5); // 敌方无装备增量
    expect(enemy.modifiers.healUp).toBe(DEFAULT_BATTLE_MODIFIERS.healUp);
    expect(enemy.modifiers.damageUp).toBe(DEFAULT_BATTLE_MODIFIERS.damageUp);
    expect(enemy.modifiers.shieldUp).toBe(DEFAULT_BATTLE_MODIFIERS.shieldUp);
  });
});
