import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_CATALOG,
  SLOT_ORDER,
  formatHomeEffect,
  getEquipmentDefsBySlotRarity,
  sumHomeEffects,
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
