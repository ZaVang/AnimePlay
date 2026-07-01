/**
 * 家园 store + 门面离线结算测试（S13-B）。
 * - store：入住槽位上限 / 去重 / 序列化往返。
 * - settleHomestead（userStore 门面）：首次只建基线、2h 挂机发经验/好感/知识点、未登录返回零。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
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
import { HOMESTEAD_SLOTS } from '@/config/homestead';
import type { CharacterCard } from '@/types/card';

const H = 3600_000;

beforeEach(() => {
  setActivePinia(createPinia());
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
    expect(y.comfort).toBe(6);
    expect(y.expEach).toBe(408); // floor(200 ×2h ×(1 + 2%)) = floor(408)
    expect(y.affectionEach).toBe(10); // floor(10 × 1.02) = 10
    expect(y.knowledge).toBe(16);
    expect(profile.core.knowledgePoints).toBe(16);
    const nurture = useNurtureStore();
    expect(nurture.getNurtureData(77).totalExperience).toBe(408);
  });

  it('未登录直接返回零', () => {
    const { h } = seed();
    useProfileStore().currentUser = '';
    h.setLastSettleAt(Date.now() - 5 * H);
    const y = useUserStore().settleHomestead();
    expect(y.knowledge).toBe(0);
  });
});
