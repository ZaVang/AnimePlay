import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_CATALOG,
  SLOT_ORDER,
  EQUIPMENT_PRICES,
  formatHomeEffect,
  getEquipmentDefsBySlotRarity,
  sumHomeEffects,
  dismantleValueForRarity,
  type EquipmentHomeEffect,
} from './equipment';

const SELLABLE_RARITIES = ['R', 'SR', 'SSR', 'HR', 'UR'] as const;

describe('equipment catalog depth', () => {
  it('keeps at least 3 choices for every slot and sellable rarity', () => {
    for (const slot of SLOT_ORDER) {
      for (const rarity of SELLABLE_RARITIES) {
        expect(getEquipmentDefsBySlotRarity(slot, rarity), `${slot}/${rarity}`).toHaveLength(3);
      }
    }
  });

  it('all catalog entries expose at least one stat or home effect', () => {
    for (const def of EQUIPMENT_CATALOG) {
      const statTotal = Object.values(def.bonus).reduce((sum, v) => sum + Math.abs(v ?? 0), 0);
      const effectTotal = Object.values(def.homeEffect ?? {}).reduce((sum, v) => sum + Math.abs(v ?? 0), 0);
      expect(statTotal + effectTotal, def.id).toBeGreaterThan(0);
    }
  });
});

describe('equipment home effects', () => {
  it('sums sparse home effects with missing fields treated as 0', () => {
    const effects: EquipmentHomeEffect[] = [
      { expPct: 0.1, comfort: 3 },
      { affectionPct: 0.08 },
      { knowledgePct: 0.12, comfort: 5 },
    ];

    expect(sumHomeEffects(effects)).toEqual({
      expPct: 0.1,
      affectionPct: 0.08,
      knowledgePct: 0.12,
      comfort: 8,
    });
  });

  it('formats effect text in a stable player-readable order', () => {
    expect(formatHomeEffect({ expPct: 0.08, affectionPct: 0.05, knowledgePct: 0.12, comfort: 4 }))
      .toBe('家园舒适+4 · 经验+8% · 好感+5% · 知识+12%');
  });

  it('returns empty text for entries without home effects', () => {
    expect(formatHomeEffect({})).toBe('');
  });
});

describe('SD-T2 装备 homeEffect 产出%已弱化到小额佐料量级', () => {
  it('所有 catalog 件的产出%（exp/affection/knowledge）均 ≤ 0.06（弱化后不再是主承载）', () => {
    for (const def of EQUIPMENT_CATALOG) {
      const e = def.homeEffect;
      if (!e) continue;
      expect(e.expPct ?? 0, def.id).toBeLessThanOrEqual(0.06);
      expect(e.affectionPct ?? 0, def.id).toBeLessThanOrEqual(0.06);
      expect(e.knowledgePct ?? 0, def.id).toBeLessThanOrEqual(0.06);
    }
  });

  it('comfort 全部保留（仍有正 comfort 件存在）', () => {
    const withComfort = EQUIPMENT_CATALOG.filter(d => (d.homeEffect?.comfort ?? 0) > 0);
    expect(withComfort.length).toBeGreaterThan(0);
  });
});

describe('SD-T3 dismantleValueForRarity（回收价明显低于兑换价）', () => {
  it('每档回收价 > 0 且明显低于兑换价（防套利）', () => {
    for (const rarity of SELLABLE_RARITIES) {
      const dv = dismantleValueForRarity(rarity);
      expect(dv, rarity).toBeGreaterThan(0);
      expect(dv, rarity).toBeLessThan(EQUIPMENT_PRICES[rarity]);
    }
  });

  it('回收价随稀有度递增', () => {
    expect(dismantleValueForRarity('R')).toBeLessThan(dismantleValueForRarity('SR'));
    expect(dismantleValueForRarity('SR')).toBeLessThan(dismantleValueForRarity('SSR'));
    expect(dismantleValueForRarity('SSR')).toBeLessThan(dismantleValueForRarity('HR'));
    expect(dismantleValueForRarity('HR')).toBeLessThan(dismantleValueForRarity('UR'));
  });

  it('未知稀有度不可分解（返回 0）', () => {
    expect(dismantleValueForRarity('N')).toBe(0);
  });
});
