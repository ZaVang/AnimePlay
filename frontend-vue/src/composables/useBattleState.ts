/**
 * Battle State Composable
 * Manages battle state, turn logic, and combat flow
 */

import { ref, computed } from 'vue';
import type { CharacterCard } from '@/types/card';
import type { BattleStats } from '@/utils/battleCalculator';

export interface SquadMember {
  character: CharacterCard;
  battleStats: BattleStats;
  currentHP: number;
  maxHP: number;
  isDefeated: boolean;
  position: number;
}

export type BattlePhase = 'towerMode' | 'battle' | 'result';

export function useBattleState() {
  const currentPhase = ref<BattlePhase>('towerMode');
  const currentBattleMode = ref<'tower'>('tower');
  const playerSquad = ref<SquadMember[]>([]);
  const enemySquad = ref<SquadMember[]>([]);
  const currentTurn = ref(0);
  const battleLog = ref<string[]>([]);
  const isPlayerTurn = ref(true);
  const battleResult = ref<'victory' | 'defeat' | null>(null);
  const selectedSquadForBattle = ref<number | null>(null);
  const towerEnemyData = ref<any>(null);

  const isInBattle = computed(() => currentPhase.value === 'battle');

  function resetBattle() {
    playerSquad.value = [];
    enemySquad.value = [];
    battleLog.value = [];
    currentTurn.value = 0;
    isPlayerTurn.value = true;
    battleResult.value = null;
    selectedSquadForBattle.value = null;
  }

  function returnToTowerMode() {
    currentPhase.value = 'towerMode';
    resetBattle();
  }

  function getFrontMember(squad: SquadMember[]): SquadMember | null {
    return squad.find(member => !member.isDefeated) || null;
  }

  function getHPPercentage(member: SquadMember): number {
    return (member.currentHP / member.maxHP) * 100;
  }

  return {
    // State
    currentPhase,
    currentBattleMode,
    playerSquad,
    enemySquad,
    currentTurn,
    battleLog,
    isPlayerTurn,
    battleResult,
    selectedSquadForBattle,
    towerEnemyData,

    // Computed
    isInBattle,

    // Actions
    resetBattle,
    returnToTowerMode,
    getFrontMember,
    getHPPercentage,
  };
}
