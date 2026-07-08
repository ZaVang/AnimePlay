/**
 * 家园 store + 门面离线结算测试（S13-B）。
 * - store：入住槽位上限 / 去重 / 序列化往返。
 * - settleHomestead（userStore 门面）：首次只建基线、2h 挂机发经验/好感/知识点、未登录返回零。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// settleHomestead 末尾会 saveToServer → pushUserSave；mock 掉网络层（同 persistence.test）。
vi.mock('@/infra/persistence/api', () => ({
  pushUserSave: vi.fn(() => Promise.resolve({ saveVersion: 1 })),
  fetchUserSave: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  loginRequest: vi.fn(),
}));

import { useHomesteadStore } from './homestead';
import { useUserStore } from './userStore';
import { useProfileStore } from './profile';
import { useNurtureStore } from './nurture';
import { useGameDataStore } from './gameDataStore';
import { useEquipmentStore } from './equipment';
import { HOMESTEAD_SLOTS, softCap, HOMESTEAD_EFFECT_CAP, IDLE_EXP_PER_HOUR } from '@/config/homestead';
import type { CharacterCard } from '@/types/card';

const H = 3600_000;

// ★ S15-T1：把系统时间钉死（照抄 daily.test.ts freezeDate 范式），杜绝真实墙钟 ε 叠进 hours
// 使 floor 边界的精确等值断言（expEach===400）在 back-to-back 长跑中偶发翻车。
// FIXED 是一个固定 ms 基准；settle 内部 Date.now() 与测试侧读取的 Date.now() 在冻结下恒等。
const FIXED = new Date(2026, 6, 1, 12, 0, 0).getTime();

beforeEach(() => {
  setActivePinia(createPinia());
  vi.useFakeTimers();
  vi.setSystemTime(FIXED);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('homestead store：入住 / 槽位 / 往返', () => {
  it('place 受 HOMESTEAD_SLOTS 上限约束；满 / 重复均被拒', () => {
    const h = useHomesteadStore();
    for (let i = 0; i < HOMESTEAD_SLOTS; i++) {
      expect(h.place(i)).toBe(true);
    }
    expect(h.placedCharacterIds).toHaveLength(HOMESTEAD_SLOTS);
    expect(h.canPlaceMore()).toBe(false);
    expect(h.place(999)).toBe(false); // 槽位已满
    expect(h.place(0)).toBe(false); // 已入住
  });

  it('unplace / isPlaced', () => {
    const h = useHomesteadStore();
    h.place(77);
    expect(h.isPlaced(77)).toBe(true);
    expect(h.unplace(77)).toBe(true);
    expect(h.isPlaced(77)).toBe(false);
    expect(h.unplace(77)).toBe(false);
  });

  it('serialize ⇄ deserialize 往返保真 + reset', () => {
    const h = useHomesteadStore();
    h.place(77);
    h.place(5);
    h.setLastSettleAt(1700000000000);
    const snap = JSON.parse(JSON.stringify(h.serialize()));
    h.reset();
    expect(h.placedCharacterIds).toEqual([]);
    expect(h.lastSettleAt).toBe(0);
    h.deserialize(snap);
    expect(h.placedCharacterIds).toEqual([77, 5]);
    expect(h.lastSettleAt).toBe(1700000000000);
  });

  it('★ v21 偶遇图鉴：markEncounterSeen 去重、hasSeenEncounter、序列化往返 + 脏档规整', () => {
    const h = useHomesteadStore();
    expect(h.hasSeenEncounter('48-49')).toBe(false);
    expect(h.markEncounterSeen('48-49')).toBe(true); // 首次新增
    expect(h.markEncounterSeen('48-49')).toBe(false); // 重复不再新增
    expect(h.hasSeenEncounter('48-49')).toBe(true);
    h.markEncounterSeen('5-12393');
    expect(h.seenEncounterKeys.size).toBe(2);

    // 序列化含 seenEncounterKeys；往返保真。
    const snap = JSON.parse(JSON.stringify(h.serialize()));
    expect(snap.seenEncounterKeys.sort()).toEqual(['48-49', '5-12393'].sort());
    h.reset();
    expect(h.seenEncounterKeys.size).toBe(0);
    h.deserialize(snap);
    expect(h.hasSeenEncounter('48-49')).toBe(true);
    expect(h.hasSeenEncounter('5-12393')).toBe(true);

    // 反序列化脏档：畸形键被规整/丢弃、乱序键归一为 min-max、去重。
    h.deserialize({
      placedCharacterIds: [],
      lastSettleAt: 0,
      seenEncounterKeys: ['49-48', '48-49', 'bad', '7', 'x-y', '3-9'] as unknown as string[],
    });
    // '49-48' 与 '48-49' 归一同键去重 → 只剩一个 '48-49'；'3-9' 保留；其余畸形丢弃。
    expect([...h.seenEncounterKeys].sort()).toEqual(['3-9', '48-49']);
  });
});

describe('settleHomestead（门面离线结算）', () => {
  function seed() {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = 0;
    const gameData = useGameDataStore();
    gameData.allCharacterCards = [
      { id: 77, rarity: 'UR' } as unknown as CharacterCard,
      { id: 5, rarity: 'SR' } as unknown as CharacterCard,
    ];
    const h = useHomesteadStore();
    h.place(77);
    h.place(5);
    return { profile, h };
  }

  it('首次（lastSettleAt=0）只建立基线、不补发历史', () => {
    const { profile, h } = seed();
    const y = useUserStore().settleHomestead();
    expect(y.knowledge).toBe(0);
    expect(h.lastSettleAt).toBeGreaterThan(0);
    expect(profile.core.knowledgePoints).toBe(0);
  });

  it('2 小时挂机：发经验/好感/知识点并推进基线', () => {
    const { profile, h } = seed();
    const before = Date.now();
    h.setLastSettleAt(before - 2 * H);
    const y = useUserStore().settleHomestead();

    expect(y.expEach).toBe(400); // 200/h ×2h
    expect(y.affectionEach).toBe(10); // 5/h ×2h
    expect(y.knowledge).toBe(16); // base2 ×(UR3 + SR1) ×2h
    expect(profile.core.knowledgePoints).toBe(16);

    const nurture = useNurtureStore();
    expect(nurture.getNurtureData(77).totalExperience).toBe(400);
    expect(nurture.getNurtureData(77).affection).toBe(10);
    expect(nurture.getNurtureData(5).affection).toBe(10);
    expect(h.lastSettleAt).toBeGreaterThanOrEqual(before);
  });

  it('入住角色的装备家园效果会参与离线结算', () => {
    const { profile, h } = seed();
    const before = Date.now();
    h.setLastSettleAt(before - 2 * H);
    const equipment = useEquipmentStore();
    const weapon = equipment.addItem('wpn_sr_training_bokken');
    const armor = equipment.addItem('arm_sr_cozy_cardigan');
    equipment.equip(77, 'weapon', weapon);
    equipment.equip(77, 'armor', armor);

    const y = useUserStore().settleHomestead();

    // SD-T2 弱化后：training_bokken expPct 0.02、cozy_cardigan affectionPct 0.02；comfort 2+4=6 → +0%（<10）
    // ★ SF-T5：装备 pct 经 softCap 软化（小 x 近似线性，略低于 2%）。
    const expEachSoft = Math.floor(IDLE_EXP_PER_HOUR * 2 * (1 + softCap(0.02, HOMESTEAD_EFFECT_CAP.expPct)));
    expect(y.comfort).toBe(6);
    expect(y.expEach).toBe(expEachSoft); // floor(200 ×2h ×(1 + softCap(0.02))) = 407
    expect(y.affectionEach).toBe(10); // floor(10 × (1 + softCap(0.02))) = 10
    expect(y.knowledge).toBe(16);
    expect(profile.core.knowledgePoints).toBe(16);
    const nurture = useNurtureStore();
    expect(nurture.getNurtureData(77).totalExperience).toBe(expEachSoft);
  });

  it('未登录直接返回零', () => {
    const { h } = seed();
    useProfileStore().currentUser = '';
    h.setLastSettleAt(Date.now() - 5 * H);
    const y = useUserStore().settleHomestead();
    expect(y.knowledge).toBe(0);
  });

  // ★ S15-T3：入住羁绊经既有 computeIdleYield 口径汇入（预览=结算同源）。
  function seedWithAnime(sameAnime: boolean) {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = 0;
    const gameData = useGameDataStore();
    // 两个 SR 角色：sameAnime=true 时同作品（命中羁绊），false 时各不相干（不命中）。
    gameData.allCharacterCards = [
      { id: 77, rarity: 'SR', anime_names: ['共鸣之作'] } as unknown as CharacterCard,
      { id: 5, rarity: 'SR', anime_names: sameAnime ? ['共鸣之作'] : ['另一部'] } as unknown as CharacterCard,
    ];
    const h = useHomesteadStore();
    h.place(77);
    h.place(5);
    return { h };
  }

  it('入住羁绊命中给确定加成：同作品 2 人的产出 > 不同作品', () => {
    // 不命中组：两 SR 不同作品。用满封顶 12h 使加成后的 floor 值肉眼可辨地不同（小时长会被 floor 抹平）。
    const noBond = seedWithAnime(false);
    noBond.h.setLastSettleAt(Date.now() - 12 * H);
    const yNo = useUserStore().settleHomestead();
    expect(yNo.bondHits).toHaveLength(0);
    expect(yNo.bondBonusPct).toBe(0);

    // 重置 pinia 再来命中组（避免 nurture 累加污染断言）。
    setActivePinia(createPinia());
    const bond = seedWithAnime(true);
    bond.h.setLastSettleAt(Date.now() - 12 * H);
    const yBond = useUserStore().settleHomestead();
    expect(yBond.bondHits).toHaveLength(1);
    expect(yBond.bondBonusPct).toBeGreaterThan(0);

    // 不同入住组合产出可辨：命中组严格 > 不命中组（口径同源，加成经 computeIdleYield 汇入）。
    expect(yBond.expEach).toBeGreaterThan(yNo.expEach);
    expect(yBond.affectionEach).toBeGreaterThan(yNo.affectionEach);
    expect(yBond.knowledge).toBeGreaterThan(yNo.knowledge);
  });
});
