/**
 * 图鉴定向解锁编排特征测试（evolution-2 / E2-T1）。
 * 覆盖三分支：解锁成功（扣费 + 入库 + 完成度联动）/ 余额不足（不扣不入库）/ 已拥有（拒绝）。
 * userStore.unlockCodexCard 会触发 saveToServer → pushUserSave，这里 mock 掉传输层。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('@/infra/persistence/api', () => ({
  pushUserSave: vi.fn(() => Promise.resolve({ saveVersion: 1 })),
  fetchUserSave: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  loginRequest: vi.fn(),
}));

import { useUserStore } from './userStore';
import { useProfileStore } from './profile';
import { useCollectionStore } from './collection';
import { useCodexStore } from './codex';
import { useGameDataStore } from './gameDataStore';
import { getCodexUnlockPrice } from '@/config/codexUnlock';
import type { CharacterCard, Rarity } from '@/types/card';

function makeChar(id: number, rarity: Rarity): CharacterCard {
  return { id, name: `char${id}`, rarity, image_path: '', activeSkillId: '', passiveSkillId: '' } as CharacterCard;
}

beforeEach(() => {
  setActivePinia(createPinia());
  // 造数据：一张 UR、一张 SR 角色卡（getCharacterCardById 从 allCharacterCards 派生）
  useGameDataStore().allCharacterCards = [makeChar(1, 'UR'), makeChar(2, 'SR')];
});

describe('unlockCodexCard 三分支', () => {
  it('解锁成功：扣知识点 + 入收藏 + 完成度 +1', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const price = getCodexUnlockPrice('SR'); // 600
    profile.core.knowledgePoints = price + 500;

    const collection = useCollectionStore();
    const codex = useCodexStore();
    const ownedBefore = codex.characterCompletion.owned;

    const userStore = useUserStore();
    const result = userStore.unlockCodexCard(2, 'character');

    expect(result.ok).toBe(true);
    expect(profile.core.knowledgePoints).toBe(500); // 精确扣 price
    expect(collection.getCharacterCardCount(2)).toBe(1); // 入库
    expect(codex.characterCompletion.owned).toBe(ownedBefore + 1); // 完成度纯派生 +1
  });

  it('余额不足：不扣费、不入库', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const price = getCodexUnlockPrice('UR'); // 12000
    profile.core.knowledgePoints = price - 1; // 差 1 点

    const collection = useCollectionStore();
    const userStore = useUserStore();
    const result = userStore.unlockCodexCard(1, 'character');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('知识点不足');
    expect(profile.core.knowledgePoints).toBe(price - 1); // 余额不变
    expect(collection.getCharacterCardCount(1)).toBe(0); // 未入库
  });

  it('已拥有：拒绝，不再扣费', () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = 100000;

    const collection = useCollectionStore();
    collection.addCard(1, 'character'); // 先拥有这张 UR
    const before = profile.core.knowledgePoints;

    const userStore = useUserStore();
    const result = userStore.unlockCodexCard(1, 'character');

    expect(result.ok).toBe(false);
    expect(result.error).toContain('已拥有');
    expect(profile.core.knowledgePoints).toBe(before); // 不扣费
    expect(collection.getCharacterCardCount(1)).toBe(1); // 仍是 1（未 count++）
  });

  it('未登录：拒绝', () => {
    const userStore = useUserStore();
    const result = userStore.unlockCodexCard(1, 'character');
    expect(result.ok).toBe(false);
    expect(result.error).toContain('登录');
  });
});
