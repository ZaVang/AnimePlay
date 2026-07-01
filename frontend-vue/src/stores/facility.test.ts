/**
 * 设施域 store 测试（S14-D SD-T1/SD-T5）：levelUp 提级 / serialize⇄deserialize 往返 / reset 归默认 Lv.1 /
 * upgradeCost 随级递增（无底 sink）/ 脏档 clamp。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useFacilityStore } from './facility';
import { FACILITY_MAX_LEVEL, facilityUpgradeCost } from '@/config/homestead';

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('useFacilityStore', () => {
  it('初始全 Lv.1（+0% 乘区）', () => {
    const f = useFacilityStore();
    expect(f.getLevels()).toEqual({ exp: 1, bond: 1, knowledge: 1 });
    expect(f.bonusPct('exp')).toBe(0);
  });

  it('levelUp 提级并更新乘区/成本', () => {
    const f = useFacilityStore();
    const costL1 = f.upgradeCost('exp');
    expect(f.levelUp('exp')).toBe(true);
    expect(f.getLevel('exp')).toBe(2);
    expect(f.bonusPct('exp')).toBeCloseTo(0.08);
    // 升级后下一级成本更高（无底 sink）
    expect(f.upgradeCost('exp')).toBeGreaterThan(costL1);
  });

  it('满级不再提级', () => {
    const f = useFacilityStore();
    f.levels = { exp: FACILITY_MAX_LEVEL, bond: 1, knowledge: 1 };
    expect(f.isMaxLevel('exp')).toBe(true);
    expect(f.levelUp('exp')).toBe(false);
    expect(f.getLevel('exp')).toBe(FACILITY_MAX_LEVEL);
    expect(f.upgradeCost('exp')).toBe(Infinity);
  });

  it('upgradeCost 与 config 纯函数同源', () => {
    const f = useFacilityStore();
    f.levels = { exp: 5, bond: 1, knowledge: 1 };
    expect(f.upgradeCost('exp')).toBe(facilityUpgradeCost(5));
  });

  it('serialize ⇄ deserialize 往返保真', () => {
    const f = useFacilityStore();
    f.levels = { exp: 6, bond: 3, knowledge: 9 };
    const dump = JSON.parse(JSON.stringify(f.serialize()));
    f.reset();
    expect(f.getLevels()).toEqual({ exp: 1, bond: 1, knowledge: 1 });
    f.deserialize(dump);
    expect(f.getLevels()).toEqual({ exp: 6, bond: 3, knowledge: 9 });
  });

  it('deserialize 脏档 clamp（非数字/超上限/低于下限）', () => {
    const f = useFacilityStore();
    f.deserialize({ exp: 'x' as unknown as number, bond: 9999, knowledge: 0 });
    expect(f.getLevels()).toEqual({ exp: 1, bond: FACILITY_MAX_LEVEL, knowledge: 1 });
  });

  it('reset 归默认全 Lv.1', () => {
    const f = useFacilityStore();
    f.levels = { exp: 5, bond: 5, knowledge: 5 };
    f.reset();
    expect(f.getLevels()).toEqual({ exp: 1, bond: 1, knowledge: 1 });
  });
});
