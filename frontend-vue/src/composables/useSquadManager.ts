/**
 * Squad Manager Composable
 * Handles squad member selection, power calculation, and character management
 *
 * MIGRATED: Now uses modular stores (nurtureStore)
 */

import { useNurtureStore } from '@/stores/modules/nurtureStore';
import { useGameDataStore } from '@/stores/gameDataStore';
import { generateBattleStats, calculateBattlePower, type BattleStats } from '@/utils/battleCalculator';
import type { CharacterCard } from '@/types/card';
import type { SquadMember } from './useBattleState';

export function useSquadManager() {
  const nurtureStore = useNurtureStore();
  const gameDataStore = useGameDataStore();

  function getSquadCharacters(squadId: number): (CharacterCard | null)[] {
    const members = nurtureStore.getSquadMembers(squadId);
    return members.map((id: number | null) => {
      if (id === null) return null;
      const character = gameDataStore.getCharacterCardById(id);
      return character || null;
    });
  }

  function getSquadPower(squadId: number): number {
    const characters = getSquadCharacters(squadId).filter(Boolean) as CharacterCard[];
    return characters.reduce((total, character) => {
      const nurtureData = nurtureStore.getNurtureData(character.id);
      const battleStats = generateBattleStats(
        character.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 },
        nurtureData.attributes,
        nurtureData.battleEnhancements || { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 }
      );
      return total + calculateBattlePower(battleStats);
    }, 0);
  }

  function getSquadMemberCount(squadId: number): number {
    const members = nurtureStore.getSquadMembers(squadId);
    return members.filter((id: number | null) => id !== null).length;
  }

  function getUsedCharacterIds(squadId: number, excludePosition: number): number[] {
    const members = nurtureStore.getSquadMembers(squadId);
    return members
      .map((id: number | null, index: number) => index !== excludePosition ? id : null)
      .filter((id: number | null): id is number => id !== null);
  }

  function createSquadMember(character: CharacterCard, position: number): SquadMember {
    const nurtureData = nurtureStore.getNurtureData(character.id);
    const battleStats = generateBattleStats(
      character.battle_stats || { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 },
      nurtureData.attributes,
      nurtureData.battleEnhancements || { hp: 0, atk: 0, def: 0, sp: 0, spd: 0 }
    );

    return {
      character,
      battleStats,
      currentHP: battleStats.hp,
      maxHP: battleStats.hp,
      isDefeated: false,
      position
    };
  }

  return {
    getSquadCharacters,
    getSquadPower,
    getSquadMemberCount,
    getUsedCharacterIds,
    createSquadMember,
  };
}
