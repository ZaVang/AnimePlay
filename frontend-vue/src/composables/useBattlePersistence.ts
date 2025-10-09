/**
 * Battle Persistence Composable
 * Handles saving/loading battle state to sessionStorage
 */

import { type Ref } from 'vue';
import type { BattlePhase } from './useBattleState';

const BATTLE_STATE_KEY = 'squadBattleState';

export function useBattlePersistence(
  currentPhase: Ref<BattlePhase>,
  towerEnemyData: Ref<any>
) {
  function saveState() {
    const state = {
      currentPhase: currentPhase.value,
      towerEnemyData: towerEnemyData.value
    };
    try {
      sessionStorage.setItem(BATTLE_STATE_KEY, JSON.stringify(state));
      console.log('[DEBUG] State saved:', state);
    } catch (error) {
      console.warn('[DEBUG] Failed to save state:', error);
    }
  }

  function loadState() {
    try {
      const savedState = sessionStorage.getItem(BATTLE_STATE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);
        if (state.currentPhase === 'towerMode') {
          currentPhase.value = state.currentPhase;
          towerEnemyData.value = state.towerEnemyData;
          console.log('[DEBUG] State loaded:', state);
        } else {
          console.log('[DEBUG] Reset to tower mode');
          currentPhase.value = 'towerMode';
        }
      }
    } catch (error) {
      console.warn('[DEBUG] Failed to load state:', error);
      currentPhase.value = 'towerMode';
    }
  }

  function clearState() {
    try {
      sessionStorage.removeItem(BATTLE_STATE_KEY);
      console.log('[DEBUG] State cleared');
    } catch (error) {
      console.warn('[DEBUG] Failed to clear state:', error);
    }
  }

  return {
    saveState,
    loadState,
    clearState,
  };
}
