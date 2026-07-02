import { describe, expect, it } from 'vitest';
import {
  EQUIPMENT_CATALOG,
  SLOT_ORDER,
  EQUIPMENT_PRICES,
  formatHomeEffect,
  getEquipmentDefsBySlotRarity,
  sumHomeEffects,
  dismantleValueForRarity,
  enhancedBonus,
  enhanceKpCost,
  clampEnhance,
  sumEquipModifiers,
  formatModifier,
  MODIFIER_CAPS,
  MAX_ENHANCE,
  ENHANCE_STEP,
  setBonusFor,
  setProgressFor,
  getEquipmentDef,
  getEquipmentSet,
  EQUIPMENT_SETS,
  EQUIPMENT_SET_IDS,
  type EquipmentHomeEffect,
  type EquipmentSetId,
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

describe('SE-T1 clampEnhance（等级钳制到 [0, MAX_ENHANCE]）', () => {
  it('合法级原样保留', () => {
    expect(clampEnhance(0)).toBe(0);
    expect(clampEnhance(3)).toBe(3);
    expect(clampEnhance(MAX_ENHANCE)).toBe(MAX_ENHANCE);
  });
  it('越界/非数/小数 → 钳制或 0', () => {
    expect(clampEnhance(99)).toBe(MAX_ENHANCE);
    expect(clampEnhance(-4)).toBe(0);
    expect(clampEnhance(3.9)).toBe(3);
    expect(clampEnhance('oops')).toBe(0);
    expect(clampEnhance(undefined)).toBe(0);
    expect(clampEnhance(NaN)).toBe(0);
  });
});

describe('SE-T1 enhancedBonus（确定性线性强化，逐维就近取整）', () => {
  const base = { atk: 100, sp: 50 } as const;

  it('Lv.0 恒等返回原值（无强化即静态值）', () => {
    expect(enhancedBonus(base, 0)).toEqual({ atk: 100, sp: 50 });
  });

  it('每级整体 +ENHANCE_STEP（+8%），逐维就近取整', () => {
    // Lv.1: ×1.08 → atk 108, sp 54
    expect(enhancedBonus(base, 1)).toEqual({ atk: 108, sp: 54 });
    // Lv.3: ×1.24 → atk 124, sp 62
    expect(enhancedBonus(base, 3)).toEqual({ atk: 124, sp: 62 });
  });

  it('满级 Lv.MAX ≈ +40%（×1.40）', () => {
    const maxed = enhancedBonus(base, MAX_ENHANCE);
    expect(maxed).toEqual({ atk: 140, sp: 70 });
    expect(1 + ENHANCE_STEP * MAX_ENHANCE).toBeCloseTo(1.4, 5);
  });

  it('每级 > 前一级（严格递增，无平台期）', () => {
    let prev = -1;
    for (let lv = 0; lv <= MAX_ENHANCE; lv++) {
      const atk = enhancedBonus(base, lv).atk ?? 0;
      expect(atk).toBeGreaterThan(prev);
      prev = atk;
    }
  });

  it('缺省维不凭空生成（弱维仍弱，只放大已有非零维）', () => {
    const out = enhancedBonus({ atk: 100 }, MAX_ENHANCE);
    expect(out).not.toHaveProperty('hp');
    expect(out).not.toHaveProperty('def');
    expect(out.atk).toBe(140);
  });

  it('越界 enhance 先 clamp（脏档不放大）', () => {
    expect(enhancedBonus(base, 999)).toEqual(enhancedBonus(base, MAX_ENHANCE));
    expect(enhancedBonus(base, -3)).toEqual({ atk: 100, sp: 50 });
  });
});

describe('SE-T1 enhanceKpCost（成本递增 + 远高于分解回收值，防套利）', () => {
  const RARITIES = ['R', 'SR', 'SSR', 'HR', 'UR'] as const;

  it('目标级越界返回 0（不可强化）', () => {
    expect(enhanceKpCost('UR', 0)).toBe(0);
    expect(enhanceKpCost('UR', MAX_ENHANCE + 1)).toBe(0);
    expect(enhanceKpCost('N', 1)).toBe(0);
  });

  it('每件每级成本随目标级严格递增（爽点前移：低级便宜高级贵）', () => {
    for (const r of RARITIES) {
      let prev = -1;
      for (let lv = 1; lv <= MAX_ENHANCE; lv++) {
        const c = enhanceKpCost(r, lv);
        expect(c, `${r} Lv${lv}`).toBeGreaterThan(prev);
        prev = c;
      }
    }
  });

  it('★ 每级 KP 成本远高于该件分解回收值（防「拆件强化」净正套利/通胀）', () => {
    for (const r of RARITIES) {
      for (let lv = 1; lv <= MAX_ENHANCE; lv++) {
        expect(enhanceKpCost(r, lv), `${r} Lv${lv}`).toBeGreaterThan(dismantleValueForRarity(r));
      }
    }
  });

  it('成本随稀有度递增（同目标级）', () => {
    expect(enhanceKpCost('R', 1)).toBeLessThan(enhanceKpCost('SR', 1));
    expect(enhanceKpCost('SR', 1)).toBeLessThan(enhanceKpCost('SSR', 1));
    expect(enhanceKpCost('SSR', 1)).toBeLessThan(enhanceKpCost('HR', 1));
    expect(enhanceKpCost('HR', 1)).toBeLessThan(enhanceKpCost('UR', 1));
  });
});

describe('SE-T3 sumEquipModifiers（三槽 modifier 逐维求和 + 同类硬 clamp）', () => {
  it('空输入 → 空对象（无 modifier 时不生成任何维）', () => {
    expect(sumEquipModifiers([])).toEqual({});
    expect(sumEquipModifiers([{}, {}])).toEqual({});
  });

  it('逐维求和：多件同维累加、异维并列', () => {
    expect(sumEquipModifiers([{ critRate: 0.05 }, { critRate: 0.04 }, { healUp: 0.1 }])).toEqual({
      critRate: 0.09,
      healUp: 0.1,
    });
  });

  it('缺省维不生成（只返回 >0 的维）', () => {
    const out = sumEquipModifiers([{ critRate: 0.05 }]);
    expect(out).toEqual({ critRate: 0.05 });
    expect(out).not.toHaveProperty('damageUp');
    expect(out).not.toHaveProperty('healUp');
    expect(out).not.toHaveProperty('shieldUp');
  });

  it('★ 同类求和硬 clamp：critRate 三件叠加不超上限 0.20', () => {
    const out = sumEquipModifiers([{ critRate: 0.1 }, { critRate: 0.1 }, { critRate: 0.1 }]);
    expect(out.critRate).toBe(MODIFIER_CAPS.critRate);
    expect(out.critRate).toBeLessThanOrEqual(0.2);
  });

  it('每维各自 clamp 到 MODIFIER_CAPS', () => {
    const out = sumEquipModifiers([
      { damageUp: 0.5, healUp: 0.5, shieldUp: 0.5 },
    ]);
    expect(out.damageUp).toBe(MODIFIER_CAPS.damageUp);
    expect(out.healUp).toBe(MODIFIER_CAPS.healUp);
    expect(out.shieldUp).toBe(MODIFIER_CAPS.shieldUp);
  });

  it('负值被地板夹到 0（不生成负维）', () => {
    expect(sumEquipModifiers([{ critRate: -0.5 }])).toEqual({});
  });
});

describe('SE-T3 formatModifier（modifier 展示文案）', () => {
  it('undefined / 空对象 → 空串（不渲染该行）', () => {
    expect(formatModifier(undefined)).toBe('');
    expect(formatModifier({})).toBe('');
  });

  it('按固定顺序输出百分比加区文案', () => {
    expect(formatModifier({ critRate: 0.07 })).toBe('暴击率+7%');
    expect(formatModifier({ critRate: 0.05, healUp: 0.1 })).toBe('暴击率+5% · 治疗量+10%');
    expect(formatModifier({ damageUp: 0.1, shieldUp: 0.12 })).toBe('增伤+10% · 护盾量+12%');
  });
});

describe('SE-T3 EQUIPMENT_CATALOG modifier 示例填充 + 恒定不随强化涨边界', () => {
  it('至少有若干件带 modifier（示例填充落地）', () => {
    const withMod = EQUIPMENT_CATALOG.filter(d => d.modifier && Object.keys(d.modifier).length > 0);
    expect(withMod.length).toBeGreaterThanOrEqual(4);
  });

  it('所有 modifier 维只在首版子集内、单件不超 clamp 上限', () => {
    const allowed = new Set(['critRate', 'damageUp', 'healUp', 'shieldUp']);
    for (const def of EQUIPMENT_CATALOG) {
      if (!def.modifier) continue;
      for (const [k, v] of Object.entries(def.modifier)) {
        expect(allowed.has(k), `${def.id}.${k}`).toBe(true);
        expect(v ?? 0, `${def.id}.${k}`).toBeLessThanOrEqual(MODIFIER_CAPS[k as keyof typeof MODIFIER_CAPS]);
        expect(v ?? 0, `${def.id}.${k}`).toBeGreaterThan(0);
      }
    }
  });

  it('大多数件不带 modifier（缺省不生成，非每件都带）', () => {
    const withoutMod = EQUIPMENT_CATALOG.filter(d => !d.modifier);
    expect(withoutMod.length).toBeGreaterThan(EQUIPMENT_CATALOG.length / 2);
  });
});

describe('SE-T2 套装目录填充（setId 标签 + 三槽 + 跨稀有度含 R/SR）', () => {
  const SLOTS = ['weapon', 'armor', 'supporter'] as const;

  it('每套 setId 引用的成员都存在于 catalog（无悬空标签）', () => {
    for (const def of EQUIPMENT_CATALOG) {
      if (def.setId) expect(EQUIPMENT_SET_IDS).toContain(def.setId);
    }
  });

  it('每套三槽都有成员（凑套需覆盖 weapon/armor/supporter）', () => {
    for (const setId of EQUIPMENT_SET_IDS) {
      for (const slot of SLOTS) {
        const members = EQUIPMENT_CATALOG.filter(d => d.setId === setId && d.slot === slot);
        expect(members.length, `${setId}/${slot}`).toBeGreaterThan(0);
      }
    }
  });

  it('每套铺了 R/SR 低稀有成员（啊哈前移，凑套 > 单件）', () => {
    for (const setId of EQUIPMENT_SET_IDS) {
      const lowRarity = EQUIPMENT_CATALOG.filter(
        d => d.setId === setId && (d.rarity === 'R' || d.rarity === 'SR'),
      );
      expect(lowRarity.length, setId).toBeGreaterThan(0);
    }
  });

  it('未打标签的装备缺省无 setId（不参与套装计数）', () => {
    const withoutSet = EQUIPMENT_CATALOG.filter(d => !d.setId);
    expect(withoutSet.length).toBeGreaterThan(0); // 存在散件（非套装成员）
    for (const def of withoutSet) expect(def.setId).toBeUndefined();
  });

  it('getEquipmentSet：已知套返回定义、未知返回 undefined', () => {
    expect(getEquipmentSet('attack')?.id).toBe('attack');
    expect(getEquipmentSet('nope' as EquipmentSetId)).toBeUndefined();
  });
});

describe('SE-T2 setBonusFor（三槽 setId 计数 → 阶梯确定五维加成）', () => {
  // 取每套三槽实际成员（跨稀有度混搭凑套）
  function membersOf(setId: EquipmentSetId): { weapon: string; armor: string; supporter: string } {
    const pick = (slot: string) =>
      EQUIPMENT_CATALOG.find(d => d.setId === setId && d.slot === slot)!.id;
    return { weapon: pick('weapon'), armor: pick('armor'), supporter: pick('supporter') };
  }
  const attack = membersOf('attack');
  const tank = membersOf('tank');

  it('不足 2 件不给（单件套装成员 → 全 0）', () => {
    expect(setBonusFor([attack.weapon])).toEqual({ hp: 0, atk: 0, def: 0, sp: 0, spd: 0 });
  });

  it('齐 2 件给 bonus2', () => {
    const out = setBonusFor([attack.weapon, attack.armor]);
    const { bonus2 } = EQUIPMENT_SETS.attack;
    expect(out.atk).toBe(bonus2.atk);
    expect(out.sp).toBe(bonus2.sp);
  });

  it('齐 3 件给 bonus3（取代 bonus2，非叠加）', () => {
    const out = setBonusFor([attack.weapon, attack.armor, attack.supporter]);
    const { bonus2, bonus3 } = EQUIPMENT_SETS.attack;
    expect(out.atk).toBe(bonus3.atk);
    expect(out.sp).toBe(bonus3.sp);
    // 非「bonus2 + bonus3」双记
    expect(out.atk).not.toBe((bonus2.atk ?? 0) + (bonus3.atk ?? 0));
  });

  it('齐 3 > 齐 2（阶梯递增）', () => {
    const two = setBonusFor([attack.weapon, attack.armor]).atk;
    const three = setBonusFor([attack.weapon, attack.armor, attack.supporter]).atk;
    expect(three).toBeGreaterThan(two);
  });

  it('多套并存各自独立结算后求和（各齐 2）', () => {
    const out = setBonusFor([attack.weapon, attack.armor, tank.weapon, tank.armor]);
    expect(out.atk).toBe(EQUIPMENT_SETS.attack.bonus2.atk);
    expect(out.hp).toBe(EQUIPMENT_SETS.tank.bonus2.hp);
  });

  it('只统计已装 defId：未知 / 无 setId 的件不计数', () => {
    // 已知无 setId 的散件（wpn_r_stage_mic 未打标签）+ 未知 defId 不参与计数
    const out = setBonusFor([attack.weapon, 'wpn_r_stage_mic', 'nonexistent_def']);
    expect(out).toEqual({ hp: 0, atk: 0, def: 0, sp: 0, spd: 0 }); // 只 1 件 attack，不足 2
  });

  it('★ 加成只碰五维、纯加法（无 modifier 维泄漏）', () => {
    const out = setBonusFor([attack.weapon, attack.armor, attack.supporter]);
    expect(Object.keys(out).sort()).toEqual(['atk', 'def', 'hp', 'sp', 'spd']);
    expect(out).not.toHaveProperty('critRate');
  });
});

describe('SE-T2 setProgressFor（UI 显形：进度 + 当前档奖）', () => {
  const w = EQUIPMENT_CATALOG.find(d => d.setId === 'attack' && d.slot === 'weapon')!.id;
  const a = EQUIPMENT_CATALOG.find(d => d.setId === 'attack' && d.slot === 'armor')!.id;

  it('装了成员才列出（未涉及的套不刷屏）', () => {
    const rows = setProgressFor([w]);
    expect(rows).toHaveLength(1);
    expect(rows[0].set.id).toBe('attack');
    expect(rows[0].count).toBe(1);
    expect(rows[0].tier).toBe(0);
    expect(rows[0].currentBonus).toEqual({});
  });

  it('齐 2 → tier 2 + currentBonus = bonus2', () => {
    const rows = setProgressFor([w, a]);
    expect(rows[0].tier).toBe(2);
    expect(rows[0].currentBonus).toEqual(EQUIPMENT_SETS.attack.bonus2);
  });

  it('setId 未涉及的件（散件）不产生进度行', () => {
    expect(setProgressFor(['wpn_r_stage_mic'])).toHaveLength(0);
    // 与 getEquipmentDef 保持同源（未知 defId 不计）
    expect(getEquipmentDef('wpn_r_stage_mic')?.setId).toBeUndefined();
  });
});
