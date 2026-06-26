/**
 * useUnlockConfirm 共享解锁门面特征测试（I5-T2）：4 处逐字重复的解锁四件套收口。
 * 覆盖：收 domain 参数（anime / character 双域）、以 store error 为准、未登录/余额/确认取消守卫。
 * dialog 走真实 useDialog（用 host.settle 模拟用户点确认/取消）；transport 层 mock 掉。
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

import { useUnlockConfirm } from './useUnlockConfirm';
import { useDialogHost } from './useDialog';
import { useProfileStore } from '@/stores/profile';
import { useCollectionStore } from '@/stores/collection';
import { useGameDataStore } from '@/stores/gameDataStore';
import { getCodexUnlockPrice } from '@/config/codexUnlock';
import type { AnimeCard, CharacterCard, Rarity } from '@/types/card';

function makeAnime(id: number, rarity: Rarity): AnimeCard {
  return { id, name: `anime${id}`, rarity, image_path: '' } as AnimeCard;
}
function makeChar(id: number, rarity: Rarity): CharacterCard {
  return { id, name: `char${id}`, rarity, image_path: '', activeSkillId: '', passiveSkillId: '' } as CharacterCard;
}

/** 等下一个微任务，让门面里 await confirm() 推进到「等用户点击」状态后再 settle。 */
const tick = () => new Promise<void>(r => setTimeout(r, 0));

beforeEach(() => {
  setActivePinia(createPinia());
  useGameDataStore().allAnimeCards = [makeAnime(1, 'SR'), makeAnime(2, 'UR')];
  useGameDataStore().allCharacterCards = [makeChar(10, 'SR')];
  // 清残留弹窗
  const { active, settle } = useDialogHost();
  if (active.value) settle(false);
});

describe('收 domain 参数（双域）', () => {
  it('anime 域：确认后调 store 入 anime 收藏', async () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = getCodexUnlockPrice('SR') + 100;
    const collection = useCollectionStore();
    const { settle } = useDialogHost();

    const { unlock } = useUnlockConfirm();
    const p = unlock(makeAnime(1, 'SR'), 'anime');
    await tick();
    settle(true); // 用户点「解锁」
    await expect(p).resolves.toBe(true);
    expect(collection.getAnimeCardCount(1)).toBe(1);
  });

  it('character 域：门面不写死 anime，入 character 收藏', async () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = getCodexUnlockPrice('SR') + 100;
    const collection = useCollectionStore();
    const { settle } = useDialogHost();

    const { unlock } = useUnlockConfirm();
    const p = unlock(makeChar(10, 'SR'), 'character');
    await tick();
    settle(true);
    await expect(p).resolves.toBe(true);
    expect(collection.getCharacterCardCount(10)).toBe(1);
    expect(collection.getAnimeCardCount(10)).toBe(0); // 没误入 anime 域
  });
});

describe('守卫（以 store 为准 + 确认流程）', () => {
  it('未登录：alert 提示后直接 false，不进确认', async () => {
    // 未设 currentUser = 未登录
    const { unlock } = useUnlockConfirm();
    const { active, settle } = useDialogHost();
    const p = unlock(makeAnime(1, 'SR'), 'anime');
    await tick();
    expect(active.value?.kind).toBe('alert'); // 登录前置 alert
    settle(true);
    await expect(p).resolves.toBe(false);
  });

  it('余额不足：alert 提示后 false，不扣费不入库', async () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = getCodexUnlockPrice('UR') - 1;
    const collection = useCollectionStore();
    const { active, settle } = useDialogHost();

    const { unlock } = useUnlockConfirm();
    const p = unlock(makeAnime(2, 'UR'), 'anime');
    await tick();
    expect(active.value?.kind).toBe('alert');
    settle(true);
    await expect(p).resolves.toBe(false);
    expect(collection.getAnimeCardCount(2)).toBe(0);
    expect(profile.core.knowledgePoints).toBe(getCodexUnlockPrice('UR') - 1); // 没扣
  });

  it('确认框点取消：不入库不扣费', async () => {
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    const price = getCodexUnlockPrice('SR');
    profile.core.knowledgePoints = price + 100;
    const collection = useCollectionStore();
    const { settle } = useDialogHost();

    const { unlock } = useUnlockConfirm();
    const p = unlock(makeAnime(1, 'SR'), 'anime');
    await tick();
    settle(false); // 用户取消
    await expect(p).resolves.toBe(false);
    expect(collection.getAnimeCardCount(1)).toBe(0);
    expect(profile.core.knowledgePoints).toBe(price + 100); // 没扣
  });
});
