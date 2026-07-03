import { describe, expect, it } from 'vitest';
import type { CharacterCard, Rarity } from '@/types/card';
import {
  SQUAD_MEMBER_COUNT,
  TOWER_SQUAD_ALLOWED_RARITIES,
  isTowerSquadRarity,
  validateTowerSquadMembers,
} from './eligibility';

const mkChar = (id: number, rarity: Rarity): CharacterCard => ({
  id,
  name: `角色${id}`,
  rarity,
  image_path: '',
  activeSkillId: '',
  passiveSkillId: '',
});

describe('D2 tower squad eligibility', () => {
  const roster = new Map<number, CharacterCard>([
    [1, mkChar(1, 'UR')],
    [2, mkChar(2, 'HR')],
    [3, mkChar(3, 'UR')],
    [4, mkChar(4, 'HR')],
    [5, mkChar(5, 'UR')],
    [6, mkChar(6, 'SSR')],
    [7, mkChar(7, 'SR')],
  ]);

  it('defines a 5-member SSR/HR/UR tower squad contract', () => {
    expect(SQUAD_MEMBER_COUNT).toBe(5);
    expect(TOWER_SQUAD_ALLOWED_RARITIES).toEqual(['SSR', 'HR', 'UR']);
    expect(isTowerSquadRarity('UR')).toBe(true);
    expect(isTowerSquadRarity('HR')).toBe(true);
    expect(isTowerSquadRarity('SSR')).toBe(true); // SSR 立绘齐备后加入（2026-07）
    expect(isTowerSquadRarity('SR')).toBe(false);
    expect(isTowerSquadRarity(null)).toBe(false);
  });

  it('accepts an SSR member alongside HR/UR', () => {
    const result = validateTowerSquadMembers({
      members: [1, 2, 3, 6, 5], // 位置 4 = SSR
      getCharacter: id => roster.get(id),
      isOwned: () => true,
    });
    expect(result.ok).toBe(true);
    expect(result.characters.map(c => c.rarity)).toContain('SSR');
  });

  it('accepts exactly five owned HR/UR characters', () => {
    const result = validateTowerSquadMembers({
      members: [1, 2, 3, 4, 5],
      getCharacter: id => roster.get(id),
      isOwned: id => id >= 1 && id <= 5,
    });

    expect(result.ok).toBe(true);
    expect(result.characters.map(c => c.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('rejects missing slots, unowned characters, low rarity, and duplicates with explicit issues', () => {
    const missing = validateTowerSquadMembers({
      members: [1, 2, 3, 4, null],
      getCharacter: id => roster.get(id),
      isOwned: () => true,
    });
    expect(missing.ok).toBe(false);
    expect(missing.slots[4].issue).toBe('empty');

    const unowned = validateTowerSquadMembers({
      members: [1, 2, 3, 4, 5],
      getCharacter: id => roster.get(id),
      isOwned: id => id !== 5,
    });
    expect(unowned.ok).toBe(false);
    expect(unowned.slots[4].issue).toBe('unowned');

    const lowRarity = validateTowerSquadMembers({
      members: [1, 2, 3, 4, 7], // 位置 4 = SR（低于 SSR 门槛）
      getCharacter: id => roster.get(id),
      isOwned: () => true,
    });
    expect(lowRarity.ok).toBe(false);
    expect(lowRarity.slots[4].issue).toBe('rarity');

    const duplicate = validateTowerSquadMembers({
      members: [1, 2, 3, 4, 1],
      getCharacter: id => roster.get(id),
      isOwned: () => true,
    });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.slots[4].issue).toBe('duplicate');
  });

  it('can require a complete D3 squad skill kit after HR/UR rarity passes', () => {
    const result = validateTowerSquadMembers({
      members: [1, 2, 3, 4, 5],
      getCharacter: id => roster.get(id),
      isOwned: () => true,
      hasCompleteSkillKit: character => character.id !== 4,
    });

    expect(result.ok).toBe(false);
    expect(result.slots[3].issue).toBe('skillKit');
    expect(result.message).toContain('小队战技能待设计');
  });
});
