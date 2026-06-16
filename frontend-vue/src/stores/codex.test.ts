/**
 * codex store 特征测试（evolution-1）：完成度纯派生 / 里程碑达成与领取。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useCodexStore } from './codex';
import { useGameDataStore } from './gameDataStore';
import { useCollectionStore } from './collection';
import { useProfileStore } from './profile';
import type { AnimeCard, CharacterCard, Rarity } from '@/types/card';

function makeAnime(id: number, rarity: Rarity): AnimeCard {
  return { id, name: `anime${id}`, rarity, image_path: '', cost: 1 } as AnimeCard;
}
function makeChar(id: number, rarity: Rarity): CharacterCard {
  return { id, name: `char${id}`, rarity, image_path: '', activeSkillId: '', passiveSkillId: '' } as CharacterCard;
}

beforeEach(() => {
  setActivePinia(createPinia());
  useProfileStore().currentUser = 'tester';
});

describe('完成度纯派生', () => {
  it('owned/total 与各稀有度从数据 .length 派生', () => {
    const gameData = useGameDataStore();
    gameData.allCharacterCards = [
      makeChar(1, 'UR'),
      makeChar(2, 'UR'),
      makeChar(3, 'SR'),
      makeChar(4, 'N'),
    ];
    const collection = useCollectionStore();
    collection.addCard(1, 'character'); // 拥有 1 张 UR
    collection.addCard(3, 'character'); // 拥有 1 张 SR

    const codex = useCodexStore();
    const c = codex.characterCompletion;
    expect(c.total).toBe(4);
    expect(c.owned).toBe(2);
    expect(c.byRarity.UR).toEqual({ owned: 1, total: 2 });
    expect(c.byRarity.SR).toEqual({ owned: 1, total: 1 });
    expect(c.byRarity.N).toEqual({ owned: 0, total: 1 });
  });

  it('完成度不引入新存档字段（serialize 只含已领里程碑）', () => {
    const codex = useCodexStore();
    expect(codex.serialize()).toEqual([]);
  });
});

describe('里程碑达成与领取', () => {
  it('ownedCount 里程碑：达阈值前不可领，达成后可领且持久化', () => {
    const gameData = useGameDataStore();
    // 造 50 张角色，全部拥有 → char_owned_50 达成
    gameData.allCharacterCards = Array.from({ length: 50 }, (_, i) => makeChar(i + 1, 'N'));
    const collection = useCollectionStore();
    for (let i = 1; i <= 49; i++) collection.addCard(i, 'character');

    const codex = useCodexStore();
    const profile = useProfileStore();
    // 49 张，未达 50
    expect(codex.claim('char_owned_50')).toBe(false);

    collection.addCard(50, 'character'); // 第 50 张
    const before = profile.core.knowledgePoints;
    expect(codex.claim('char_owned_50')).toBe(true);
    expect(profile.core.knowledgePoints).toBe(before + 100); // char_owned_50 奖 100 知识点
    expect(codex.isClaimed('char_owned_50')).toBe(true);
    // 重复领取被拒
    expect(codex.claim('char_owned_50')).toBe(false);
  });

  it('rarityComplete 里程碑：集齐该稀有度才达成', () => {
    const gameData = useGameDataStore();
    gameData.allCharacterCards = [makeChar(1, 'UR'), makeChar(2, 'UR')];
    const collection = useCollectionStore();
    collection.addCard(1, 'character');

    const codex = useCodexStore();
    expect(codex.claim('char_ur_complete')).toBe(false); // 只拥有 1/2 UR
    collection.addCard(2, 'character');
    expect(codex.isAchievedById('char_ur_complete')).toBe(true);
    expect(codex.claim('char_ur_complete')).toBe(true);
  });

  it('claimableMilestones 列出已达成未领的里程碑', () => {
    const gameData = useGameDataStore();
    gameData.allAnimeCards = Array.from({ length: 50 }, (_, i) => makeAnime(i + 1, 'N'));
    const collection = useCollectionStore();
    for (let i = 1; i <= 50; i++) collection.addCard(i, 'anime');

    const codex = useCodexStore();
    const ids = codex.claimableMilestones.map(m => m.id);
    expect(ids).toContain('anime_owned_50');
  });

  it('serialize/deserialize 保真已领里程碑', () => {
    const codex = useCodexStore();
    codex.deserialize(['char_owned_50', 'anime_owned_50']);
    expect(codex.serialize()).toEqual(['char_owned_50', 'anime_owned_50']);
    expect(codex.isClaimed('char_owned_50')).toBe(true);
  });
});
