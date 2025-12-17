/**
 * useBattleState Composable Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useBattleState } from '../useBattleState';
import type { SquadMember } from '../useBattleState';

describe('useBattleState', () => {
  let battleState: ReturnType<typeof useBattleState>;

  beforeEach(() => {
    battleState = useBattleState();
  });

  describe('Initial State', () => {
    it('should initialize with towerMode phase', () => {
      expect(battleState.currentPhase.value).toBe('towerMode');
    });

    it('should have empty squads initially', () => {
      expect(battleState.playerSquad.value).toEqual([]);
      expect(battleState.enemySquad.value).toEqual([]);
    });

    it('should have empty battle log', () => {
      expect(battleState.battleLog.value).toEqual([]);
    });

    it('should start at turn 0', () => {
      expect(battleState.currentTurn.value).toBe(0);
    });

    it('should be player turn initially', () => {
      expect(battleState.isPlayerTurn.value).toBe(true);
    });

    it('should have no battle result', () => {
      expect(battleState.battleResult.value).toBeNull();
    });
  });

  describe('isInBattle computed', () => {
    it('should return false when not in battle', () => {
      battleState.currentPhase.value = 'towerMode';
      expect(battleState.isInBattle.value).toBe(false);
    });

    it('should return true during battle', () => {
      battleState.currentPhase.value = 'battle';
      expect(battleState.isInBattle.value).toBe(true);
    });

    it('should return false on result phase', () => {
      battleState.currentPhase.value = 'result';
      expect(battleState.isInBattle.value).toBe(false);
    });
  });

  describe('resetBattle', () => {
    it('should clear all battle data', () => {
      // Setup some battle data
      battleState.playerSquad.value = [createMockMember('Player1', 0)];
      battleState.enemySquad.value = [createMockMember('Enemy1', 0)];
      battleState.battleLog.value = ['Test log'];
      battleState.currentTurn.value = 5;
      battleState.isPlayerTurn.value = false;
      battleState.battleResult.value = 'victory';
      battleState.selectedSquadForBattle.value = 1;

      // Reset
      battleState.resetBattle();

      // Verify
      expect(battleState.playerSquad.value).toEqual([]);
      expect(battleState.enemySquad.value).toEqual([]);
      expect(battleState.battleLog.value).toEqual([]);
      expect(battleState.currentTurn.value).toBe(0);
      expect(battleState.isPlayerTurn.value).toBe(true);
      expect(battleState.battleResult.value).toBeNull();
      expect(battleState.selectedSquadForBattle.value).toBeNull();
    });
  });

  describe('returnToTowerMode', () => {
    it('should reset to tower mode and clear battle data', () => {
      battleState.currentPhase.value = 'battle';
      battleState.playerSquad.value = [createMockMember('Player1', 0)];

      battleState.returnToTowerMode();

      expect(battleState.currentPhase.value).toBe('towerMode');
      expect(battleState.playerSquad.value).toEqual([]);
    });
  });

  describe('getFrontMember', () => {
    it('should return first non-defeated member', () => {
      const squad: SquadMember[] = [
        createMockMember('Member1', 0, true), // defeated
        createMockMember('Member2', 1, false),
        createMockMember('Member3', 2, false)
      ];

      const front = battleState.getFrontMember(squad);
      expect(front?.character.name).toBe('Member2');
    });

    it('should return null if all members defeated', () => {
      const squad: SquadMember[] = [
        createMockMember('Member1', 0, true),
        createMockMember('Member2', 1, true)
      ];

      const front = battleState.getFrontMember(squad);
      expect(front).toBeNull();
    });

    it('should return null for empty squad', () => {
      const front = battleState.getFrontMember([]);
      expect(front).toBeNull();
    });

    it('should return first member if none defeated', () => {
      const squad: SquadMember[] = [
        createMockMember('Member1', 0, false),
        createMockMember('Member2', 1, false)
      ];

      const front = battleState.getFrontMember(squad);
      expect(front?.character.name).toBe('Member1');
    });
  });

  describe('getHPPercentage', () => {
    it('should calculate correct HP percentage', () => {
      const member = createMockMember('Test', 0);
      member.currentHP = 50;
      member.maxHP = 100;

      const percentage = battleState.getHPPercentage(member);
      expect(percentage).toBe(50);
    });

    it('should handle full HP', () => {
      const member = createMockMember('Test', 0);
      member.currentHP = 100;
      member.maxHP = 100;

      const percentage = battleState.getHPPercentage(member);
      expect(percentage).toBe(100);
    });

    it('should handle zero HP', () => {
      const member = createMockMember('Test', 0);
      member.currentHP = 0;
      member.maxHP = 100;

      const percentage = battleState.getHPPercentage(member);
      expect(percentage).toBe(0);
    });

    it('should handle decimal percentages', () => {
      const member = createMockMember('Test', 0);
      member.currentHP = 33;
      member.maxHP = 100;

      const percentage = battleState.getHPPercentage(member);
      expect(percentage).toBe(33);
    });
  });
});

// Helper function to create mock squad member
function createMockMember(name: string, position: number, isDefeated = false): SquadMember {
  return {
    character: {
      id: position,
      name,
      rarity: 'UR',
      cost: 5,
      strength: 50,
      synergy_tags: [],
      skills: [],
      battle_stats: { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 }
    } as any,
    battleStats: { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 },
    currentHP: isDefeated ? 0 : 100,
    maxHP: 100,
    isDefeated,
    position
  };
}
