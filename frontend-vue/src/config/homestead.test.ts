/**
 * 家园挂机经济纯计算测试（S13-B）。锁定离线收益口径：经验/好感 flat、知识点按稀有度加权、封顶。
 */
import { describe, it, expect } from 'vitest';
import {
  computeIdleYield,
  cappedIdleHours,
  canonicalizePlacedIds,
  HOMESTEAD_EFFECT_CAP,
  HOMESTEAD_SLOTS,
  OFFLINE_CAP_HOURS,
  IDLE_EXP_PER_HOUR,
  IDLE_AFFECTION_PER_HOUR,
  comfortBonusPct,
  facilityBonusPct,
  facilityUpgradeCost,
  offlineCapHours,
  softCap,
  FACILITY_MIN_LEVEL,
  FACILITY_MAX_LEVEL,
  sumFurnitureComfort,
  canonicalizeFurnitureIds,
  getFurnitureDef,
  FURNITURE_CATALOG,
  FURNITURE_PLACED_MAX,
  FURNITURE_SLOTS,
  getFurnitureSlot,
  encounterPairKey,
  canonicalizeSeenEncounterKeys,
  SEEN_ENCOUNTER_MAX,
} from './homestead';

const H = 3600_000;

describe('cappedIdleHours', () => {
  it('0 / 负数 → 0', () => {
    expect(cappedIdleHours(0)).toBe(0);
    expect(cappedIdleHours(-5)).toBe(0);
  });
  it('正常时长按小时换算', () => {
    expect(cappedIdleHours(2 * H)).toBeCloseTo(2);
  });
  it('超过封顶钳到 OFFLINE_CAP_HOURS', () => {
    expect(cappedIdleHours(99 * H)).toBe(OFFLINE_CAP_HOURS);
  });
});

describe('computeIdleYield', () => {
  it('空入住 → 全零', () => {
    expect(computeIdleYield([], 5 * H)).toEqual({
      hours: 0, expEach: 0, affectionEach: 0, knowledge: 0, characterCount: 0, comfort: 0,
      bondHits: [], bondBonusPct: 0,
    });
  });

  it('0 时长 → 全零（但保留 characterCount）', () => {
    expect(computeIdleYield(['UR', 'SR'], 0)).toEqual({
      hours: 0, expEach: 0, affectionEach: 0, knowledge: 0, characterCount: 2, comfort: 0,
      bondHits: [], bondBonusPct: 0,
    });
  });

  it('2 小时 / [UR, SR]：经验好感 flat，知识点按稀有度加权', () => {
    const y = computeIdleYield(['UR', 'SR'], 2 * H);
    expect(y.hours).toBeCloseTo(2);
    expect(y.expEach).toBe(IDLE_EXP_PER_HOUR * 2); // 400
    expect(y.affectionEach).toBe(IDLE_AFFECTION_PER_HOUR * 2); // 10
    expect(y.knowledge).toBe(16); // base2 ×(UR3 + SR1) ×2h
    expect(y.characterCount).toBe(2);
  });

  it('★ S15-T3 入住羁绊乘子经口径汇入：同作品 ≥2 人 → 全产出 > 无羁绊（预览=结算同源）', () => {
    const rarities: Array<'SR'> = ['SR', 'SR'];
    const base = computeIdleYield(rarities, 12 * H);
    const bonded = computeIdleYield(rarities, 12 * H, {}, undefined, [['同作品'], ['同作品']]);
    expect(base.bondHits).toHaveLength(0);
    expect(base.bondBonusPct).toBe(0);
    expect(bonded.bondHits).toHaveLength(1);
    expect(bonded.bondBonusPct).toBeGreaterThan(0);
    // 加成通乘全产出 → 满封顶 12h 时三轴皆肉眼可辨地更高。
    expect(bonded.expEach).toBeGreaterThan(base.expEach);
    expect(bonded.affectionEach).toBeGreaterThan(base.affectionEach);
    expect(bonded.knowledge).toBeGreaterThan(base.knowledge);
  });

  it('★ S15-T3 羁绊派生源缺失/不同作品：不命中、口径不变', () => {
    const rarities: Array<'SR'> = ['SR', 'SR'];
    const plain = computeIdleYield(rarities, 2 * H);
    const noBond = computeIdleYield(rarities, 2 * H, {}, undefined, [['A'], ['B']]);
    const missing = computeIdleYield(rarities, 2 * H, {}, undefined, [undefined, undefined]);
    expect(noBond.bondBonusPct).toBe(0);
    expect(missing.bondBonusPct).toBe(0);
    expect(noBond.expEach).toBe(plain.expEach);
    expect(missing.expEach).toBe(plain.expEach);
  });

  it('超 12h 封顶：24h 当 12h 算', () => {
    const y = computeIdleYield(['UR'], 24 * H);
    expect(y.hours).toBe(OFFLINE_CAP_HOURS);
    expect(y.expEach).toBe(IDLE_EXP_PER_HOUR * OFFLINE_CAP_HOURS); // 2400
    expect(y.knowledge).toBe(2 * 3 * OFFLINE_CAP_HOURS); // 72
  });

  it('未知稀有度的系数回落 1（不抛错）', () => {
    const y = computeIdleYield(['???' as unknown as 'UR'], 1 * H);
    expect(y.knowledge).toBe(2 * 1 * 1); // base2 ×fallback1 ×1h
  });

  it('装备家园效果会提高经验/好感/知识点，并报告舒适度', () => {
    const y = computeIdleYield(['UR', 'SR'], 2 * H, {
      expPct: 0.1,
      affectionPct: 0.2,
      knowledgePct: 0.25,
      comfort: 7,
    });
    // ★ SF-T5：装备 pct 经 softCap 软化（小 x 近似线性，略低于名义 pct），设施/comfort 另计。
    expect(y.expEach).toBe(Math.floor(IDLE_EXP_PER_HOUR * 2 * (1 + softCap(0.1, HOMESTEAD_EFFECT_CAP.expPct))));
    expect(y.affectionEach).toBe(Math.floor(IDLE_AFFECTION_PER_HOUR * 2 * (1 + softCap(0.2, HOMESTEAD_EFFECT_CAP.affectionPct))));
    expect(y.knowledge).toBe(Math.floor(16 * (1 + softCap(0.25, HOMESTEAD_EFFECT_CAP.knowledgePct))));
    expect(y.comfort).toBe(7);
  });

  it('★ SF-T5 装备家园收益倍率受软化上限保护（softCap 渐近 ≈0.6，非硬顶断崖；comfort 软加成另计）', () => {
    // comfort 99 → 软加成 floor(99/10)×1% = 9%（未触 +20% 封顶）；装备 pct 走 softCap 软化。
    const cm = 1 + comfortBonusPct(99); // 1.09
    const y = computeIdleYield(['UR'], 1 * H, {
      expPct: 9,
      affectionPct: 9,
      knowledgePct: 9,
      comfort: 99,
    });
    // 软化后倍率 = 1 + softCap(9, 0.6)（渐近 0.6 但达不到），非旧 Math.min 的恰 1.6。
    expect(y.expEach).toBe(Math.floor(IDLE_EXP_PER_HOUR * (1 + softCap(9, HOMESTEAD_EFFECT_CAP.expPct)) * cm));
    expect(y.affectionEach).toBe(Math.floor(IDLE_AFFECTION_PER_HOUR * (1 + softCap(9, HOMESTEAD_EFFECT_CAP.affectionPct)) * cm));
    expect(y.knowledge).toBe(Math.floor(6 * (1 + softCap(9, HOMESTEAD_EFFECT_CAP.knowledgePct)) * cm));
    expect(y.comfort).toBe(99);
  });
});

describe('★ S15-T2 家具目录 / comfort 汇入（家具只贡献 comfort，经既有软加成轴）', () => {
  const idA = FURNITURE_CATALOG[0].id;
  const idB = FURNITURE_CATALOG[1].id;

  it('目录非空、id 唯一、comfort/cost 均为正数', () => {
    expect(FURNITURE_CATALOG.length).toBeGreaterThan(0);
    const ids = new Set(FURNITURE_CATALOG.map(d => d.id));
    expect(ids.size).toBe(FURNITURE_CATALOG.length);
    for (const d of FURNITURE_CATALOG) {
      expect(d.comfort).toBeGreaterThan(0);
      expect(d.cost).toBeGreaterThan(0);
    }
  });

  it('getFurnitureDef：已知 id 命中、未知 id → undefined', () => {
    expect(getFurnitureDef(idA)?.id).toBe(idA);
    expect(getFurnitureDef('fn_nope')).toBeUndefined();
  });

  it('sumFurnitureComfort：查目录求和，未知 id 计 0', () => {
    const expected = getFurnitureDef(idA)!.comfort + getFurnitureDef(idB)!.comfort;
    expect(sumFurnitureComfort([idA, idB])).toBe(expected);
    expect(sumFurnitureComfort([idA, 'fn_nope'])).toBe(getFurnitureDef(idA)!.comfort);
    expect(sumFurnitureComfort([])).toBe(0);
  });

  it('canonicalizeFurnitureIds：只收目录内已知 id、去重、截断到摆放上限', () => {
    expect(canonicalizeFurnitureIds([idA, idA, 'fn_nope', 42, null, idB])).toEqual([idA, idB]);
    expect(canonicalizeFurnitureIds('bad' as unknown)).toEqual([]);
    // 全目录 + 一堆脏项 → 截断到 FURNITURE_PLACED_MAX（= 目录条数）
    const many = [...FURNITURE_CATALOG.map(d => d.id), 'fn_nope', 'fn_nope2'];
    expect(canonicalizeFurnitureIds(many).length).toBe(FURNITURE_PLACED_MAX);
  });

  it('★ 家具 comfort 经既有 comfort 软加成轴汇入 → 全产出更高（满 12h 使 floor 后可辨）', () => {
    const rarities: Array<'SR'> = ['SR', 'SR'];
    // 用足够高的家具 comfort 合计（≥10 才越过 comfortBonusPct 的 10 点粒度门槛），满 12h 封顶使 floor 后差异肉眼可辨。
    const furnitureComfort = sumFurnitureComfort(FURNITURE_CATALOG.map(d => d.id));
    expect(furnitureComfort).toBeGreaterThanOrEqual(10);
    const base = computeIdleYield(rarities, 12 * H);
    // 家具 comfort 并入 effect.comfort（与 settle/UI 同源口径）。
    const withFurniture = computeIdleYield(rarities, 12 * H, { comfort: furnitureComfort });
    expect(withFurniture.comfort).toBe(furnitureComfort);
    expect(withFurniture.expEach).toBeGreaterThan(base.expEach);
    expect(withFurniture.affectionEach).toBeGreaterThan(base.affectionEach);
    expect(withFurniture.knowledge).toBeGreaterThan(base.knowledge);
    // 与装备 comfort 相加共用同一 comfortBonusPct（+20% 硬顶，有意）：家具+装备 comfort 相加口径。
    const combined = computeIdleYield(rarities, 12 * H, { comfort: furnitureComfort + 30 });
    expect(combined.expEach).toBeGreaterThanOrEqual(withFurniture.expEach);
  });
});

describe('★ SF-T5 softCap（装备 pct 平滑软化封顶：单调递增 + 渐近不超 cap + 小 x 近似线性）', () => {
  const CAP = 0.6;

  it('非正 value / 非正 cap → 0（与旧 cappedPct 边界一致）', () => {
    expect(softCap(0, CAP)).toBe(0);
    expect(softCap(-1, CAP)).toBe(0);
    expect(softCap(undefined, CAP)).toBe(0);
    expect(softCap(5, 0)).toBe(0);
  });

  it('对 x 严格单调递增（边际 >0，永不「加装备反降收益」）', () => {
    let prev = softCap(0.0001, CAP);
    for (let x = 0.05; x <= 20; x += 0.05) {
      const cur = softCap(x, CAP);
      expect(cur).toBeGreaterThan(prev);
      prev = cur;
    }
  });

  it('渐近不超 cap：现实堆叠区 < cap，超大 x 逼近 cap 不超', () => {
    // 现实装备堆叠量级（x≈0..9）严格 < cap（渐近达不到）。
    expect(softCap(9, CAP)).toBeLessThan(CAP);
    // 超大 x（e^(-x/cap) 浮点下溢为 0）→ 恰达 cap，绝不超 cap（渐近上界守恒）。
    expect(softCap(100, CAP)).toBeLessThanOrEqual(CAP);
    // 大 x 已非常接近渐近上界（差距 < 0.1% cap）。
    expect(softCap(20, CAP)).toBeGreaterThan(CAP * 0.999);
  });

  it('小 x 近似线性（x≪cap 时 softCap(x)≈x，无断崖）', () => {
    expect(softCap(0.02, CAP)).toBeCloseTo(0.02, 2);
    expect(softCap(0.05, CAP)).toBeCloseTo(0.05, 2);
    // 消除断崖：触及旧硬顶量级（0.6）后再加装备边际仍 >0
    expect(softCap(0.9, CAP)).toBeGreaterThan(softCap(0.6, CAP));
  });
});

describe('comfortBonusPct（每 10 点 +1%，封顶 +20%）', () => {
  it('不足 10 点无加成', () => {
    expect(comfortBonusPct(0)).toBe(0);
    expect(comfortBonusPct(9)).toBe(0);
  });
  it('每满 10 点 +1%（向下取整档）', () => {
    expect(comfortBonusPct(10)).toBeCloseTo(0.01);
    expect(comfortBonusPct(25)).toBeCloseTo(0.02);
    expect(comfortBonusPct(100)).toBeCloseTo(0.1);
  });
  it('封顶 +20%（200 点及以上不再增长）', () => {
    expect(comfortBonusPct(200)).toBeCloseTo(0.2);
    expect(comfortBonusPct(999)).toBeCloseTo(0.2);
  });
  it('负数/脏值回落 0', () => {
    expect(comfortBonusPct(-5)).toBe(0);
  });
});

describe('facilityBonusPct（设施等级→对应产出乘区，Lv.1=+0%）', () => {
  it('Lv.1 = +0%，逐级 +8% 线性递增', () => {
    expect(facilityBonusPct(1)).toBe(0);
    expect(facilityBonusPct(2)).toBeCloseTo(0.08);
    expect(facilityBonusPct(6)).toBeCloseTo(0.4);
  });
  it('随等级严格递增（乘区随级成长）', () => {
    for (let lv = FACILITY_MIN_LEVEL + 1; lv <= 20; lv++) {
      expect(facilityBonusPct(lv)).toBeGreaterThan(facilityBonusPct(lv - 1));
    }
  });
  it('脏值 clamp：低于下限当 Lv.1、高于上限当满级', () => {
    expect(facilityBonusPct(0)).toBe(0);
    expect(facilityBonusPct(-3)).toBe(0);
    expect(facilityBonusPct(9999)).toBe(facilityBonusPct(FACILITY_MAX_LEVEL));
  });
});

describe('facilityUpgradeCost（无底 KP sink：第 N 级成本 > 第 N-1 级）', () => {
  it('成本随等级严格递增（指数递增，非定额买断）', () => {
    for (let lv = FACILITY_MIN_LEVEL; lv < 30; lv++) {
      expect(facilityUpgradeCost(lv + 1)).toBeGreaterThan(facilityUpgradeCost(lv));
    }
  });
  it('Lv.1→2 = base', () => {
    expect(facilityUpgradeCost(1)).toBe(120);
  });
  it('满级无可升级：返回 Infinity', () => {
    expect(facilityUpgradeCost(FACILITY_MAX_LEVEL)).toBe(Infinity);
  });
});

describe('offlineCapHours / cappedIdleHours（封顶随设施等级抬升，决策-7）', () => {
  it('不传设施等级 → 基线 12h（向后兼容）', () => {
    expect(offlineCapHours()).toBe(OFFLINE_CAP_HOURS);
    expect(cappedIdleHours(99 * H)).toBe(OFFLINE_CAP_HOURS);
  });
  it('全 Lv.1（总 3 级）→ 12 + 3×0.5 = 13.5h', () => {
    expect(offlineCapHours({ exp: 1, bond: 1, knowledge: 1 })).toBeCloseTo(13.5);
  });
  it('设施升级抬升封顶：越高级封顶越大', () => {
    const low = offlineCapHours({ exp: 1, bond: 1, knowledge: 1 });
    const high = offlineCapHours({ exp: 5, bond: 5, knowledge: 5 });
    expect(high).toBeGreaterThan(low);
    // cappedIdleHours 用抬升后的封顶钳制超长离线
    expect(cappedIdleHours(999 * H, { exp: 5, bond: 5, knowledge: 5 })).toBeCloseTo(high);
  });
});

describe('computeIdleYield 设施乘区（独立于装备 0.6 cap，决策-5）', () => {
  it('设施升级真实提升对应产出（不受 0.6 装备上限钳制）', () => {
    const base = computeIdleYield(['UR', 'SR'], 2 * H);
    const upgraded = computeIdleYield(['UR', 'SR'], 2 * H, {}, { exp: 11, bond: 1, knowledge: 1 });
    // exp 设施 Lv.11 = +80%（远超装备 0.6 cap），经验应约 1.8×基础
    expect(upgraded.expEach).toBe(Math.floor(IDLE_EXP_PER_HOUR * 2 * (1 + facilityBonusPct(11))));
    expect(upgraded.expEach).toBeGreaterThan(base.expEach);
    // bond/knowledge 设施 Lv.1 → 好感/知识点不变
    expect(upgraded.affectionEach).toBe(base.affectionEach);
    expect(upgraded.knowledge).toBe(base.knowledge);
  });

  it('设施乘区与装备 pct、comfort 软加成三者相乘（装备 pct 走 SF-T5 softCap）', () => {
    const y = computeIdleYield(['UR'], 1 * H, { expPct: 0.1, comfort: 30 }, { exp: 3, bond: 1, knowledge: 1 });
    const cm = 1 + comfortBonusPct(30); // 1.03
    const fac = 1 + facilityBonusPct(3); // 1.16
    // 装备 expPct 0.1 经 softCap 软化（小 x 近似线性，略低于 0.1），设施/comfort 仍独立相乘。
    expect(y.expEach).toBe(Math.floor(IDLE_EXP_PER_HOUR * 1 * (1 + softCap(0.1, HOMESTEAD_EFFECT_CAP.expPct)) * fac * cm));
  });
});

describe('★ S16-T7 家具场景可见（icon + 固定槽位坐标，零素材 + 零升档）', () => {
  it('每件家具都有非空 emoji 图标（可见性唯一解=零素材 emoji）', () => {
    for (const d of FURNITURE_CATALOG) {
      expect(typeof d.icon).toBe('string');
      expect(d.icon.length).toBeGreaterThan(0);
    }
  });

  it('每件家具都配了固定槽位坐标（防漏配导致静默不渲染）', () => {
    for (const d of FURNITURE_CATALOG) {
      const slot = getFurnitureSlot(d.id);
      expect(slot, `${d.id} 缺槽位坐标`).toBeDefined();
    }
  });

  it('槽位坐标在合法范围 [0,100]（% 坐标，脚点锚定在场景内）', () => {
    for (const d of FURNITURE_CATALOG) {
      const slot = getFurnitureSlot(d.id)!;
      expect(slot.x).toBeGreaterThanOrEqual(0);
      expect(slot.x).toBeLessThanOrEqual(100);
      expect(slot.y).toBeGreaterThanOrEqual(0);
      expect(slot.y).toBeLessThanOrEqual(100);
    }
  });

  it('槽位落在角色活动带内（x∈[7,93]、y∈[22,86]）→ 与角色同坐标系、不被 overflow 切', () => {
    // 与 usePlazaWalk 的 MIN_X/MAX_X/MIN_Y/MAX_Y 对齐：家具脚点在同一可见地面带内，
    // 避开场景四角悬崖（overflow:hidden 会切）与顶部名牌溢出区。
    for (const d of FURNITURE_CATALOG) {
      const slot = getFurnitureSlot(d.id)!;
      expect(slot.x).toBeGreaterThanOrEqual(7);
      expect(slot.x).toBeLessThanOrEqual(93);
      expect(slot.y).toBeGreaterThanOrEqual(22);
      expect(slot.y).toBeLessThanOrEqual(86);
    }
  });

  it('各家具槽位互不重叠（同坐标会视觉叠一起 = 陈列错乱）', () => {
    const seen = new Set<string>();
    for (const d of FURNITURE_CATALOG) {
      const slot = getFurnitureSlot(d.id)!;
      const key = `${slot.x}:${slot.y}`;
      expect(seen.has(key), `${d.id} 槽位与他件重叠`).toBe(false);
      seen.add(key);
    }
  });

  it('FURNITURE_SLOTS 只含目录内 id（无孤儿槽位）', () => {
    const catalogIds = new Set(FURNITURE_CATALOG.map(d => d.id));
    for (const id of Object.keys(FURNITURE_SLOTS)) {
      expect(catalogIds.has(id), `${id} 是孤儿槽位（目录里无此家具）`).toBe(true);
    }
  });

  it('getFurnitureSlot：未知 id → undefined（渲染层据此跳过）', () => {
    expect(getFurnitureSlot('fn_nope')).toBeUndefined();
  });
});

describe('canonicalizePlacedIds（存档边界规整入住名单）', () => {
  it('非数组 → 空', () => {
    expect(canonicalizePlacedIds(null)).toEqual([]);
    expect(canonicalizePlacedIds('x' as unknown)).toEqual([]);
    expect(canonicalizePlacedIds(undefined)).toEqual([]);
  });
  it('去重 + 只收有限数字（滤掉重复/字符串/NaN）', () => {
    expect(canonicalizePlacedIds([3, 3, 5, '7' as unknown, NaN, 5, 9])).toEqual([3, 5, 9]);
  });
  it('截断到 HOMESTEAD_SLOTS（脏档超额不放大收益）', () => {
    const many = Array.from({ length: HOMESTEAD_SLOTS + 4 }, (_, i) => i + 1);
    const out = canonicalizePlacedIds(many);
    expect(out).toHaveLength(HOMESTEAD_SLOTS);
    expect(out).toEqual(many.slice(0, HOMESTEAD_SLOTS));
  });
});

describe('★ v21 偶遇图鉴：encounterPairKey / canonicalizeSeenEncounterKeys', () => {
  it('encounterPairKey：小 id 在前、顺序无关、截整', () => {
    expect(encounterPairKey(48, 49)).toBe('48-49');
    expect(encounterPairKey(49, 48)).toBe('48-49'); // 顺序无关
    expect(encounterPairKey(48, 48)).toBe('48-48'); // 同 id 容忍
    expect(encounterPairKey(3.9, 9.1)).toBe('3-9'); // 截整
  });

  it('canonicalizeSeenEncounterKeys：合法键归一 + 去重 + 丢畸形', () => {
    expect(canonicalizeSeenEncounterKeys(['49-48', '48-49', '3-9', 'bad', '7', 'x-y', 5 as unknown as string]))
      .toEqual(['48-49', '3-9']); // 49-48 与 48-49 归一去重、3-9 保留、其余畸形丢弃
    expect(canonicalizeSeenEncounterKeys(null)).toEqual([]);
    expect(canonicalizeSeenEncounterKeys('nope' as unknown)).toEqual([]);
    expect(canonicalizeSeenEncounterKeys([])).toEqual([]);
  });

  it('canonicalizeSeenEncounterKeys：负数键丢弃（防畸形）', () => {
    expect(canonicalizeSeenEncounterKeys(['-1-5', '2-3'])).toEqual(['2-3']);
  });

  it('canonicalizeSeenEncounterKeys：截断到 SEEN_ENCOUNTER_MAX（防脏档膨胀）', () => {
    const many = Array.from({ length: SEEN_ENCOUNTER_MAX + 50 }, (_, i) => `${i}-${i + 100000}`);
    expect(canonicalizeSeenEncounterKeys(many)).toHaveLength(SEEN_ENCOUNTER_MAX);
  });
});
