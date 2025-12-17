/**
 * Authentication & Player State Store
 * Handles user login/logout and basic player progression
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';

export interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'warning' | 'gacha';
  timestamp: number;
}

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const currentUser = ref<string>('');
  const level = ref(GAME_CONFIG.playerInitialState.level);
  const exp = ref(0);
  const logs = ref<LogEntry[]>([]);

  // --- GETTERS ---
  const isLoggedIn = computed(() => !!currentUser.value);
  const expToNextLevel = computed(() => {
    const currentLevelExp = GAME_CONFIG.gameplay.levelSystem.getExpForLevel(level.value);
    const nextLevelExp = GAME_CONFIG.gameplay.levelSystem.getExpForLevel(level.value + 1);
    return nextLevelExp - currentLevelExp;
  });

  // --- ACTIONS ---
  function addLog(message: string, type: LogEntry['type'] = 'info') {
    logs.value.unshift({ message, type, timestamp: Date.now() });
    if (logs.value.length > 50) {
      logs.value.pop();
    }
  }

  function resetState() {
    level.value = GAME_CONFIG.playerInitialState.level;
    exp.value = 0;
    logs.value = [];
  }

  async function login(username: string) {
    if (!username || !username.match(/^[a-zA-Z0-9]+$/)) {
      alert('用户名只能包含字母和数字。');
      return;
    }
    currentUser.value = username;
  }

  async function logout() {
    addLog('已登出，再见！', 'info');
    currentUser.value = '';
  }

  function addExp(amount: number) {
    if (!isLoggedIn.value || amount === 0) return;
    addLog(`获得 ${amount} 点经验。`, 'info');
    exp.value += amount;
    let requiredExp = expToNextLevel.value;

    while (exp.value >= requiredExp) {
      exp.value -= requiredExp;
      const newLevel = level.value + 1;
      const rewards = GAME_CONFIG.gameplay.levelSystem.getLevelRewards(newLevel);

      level.value = newLevel;

      // Notify other stores about level rewards
      // They will listen to this store's state changes

      const milestoneMsg = newLevel % 10 === 0 ? '🎉 里程碑等级！' : '';
      addLog(
        `恭喜！你已达到 ${newLevel} 级！${milestoneMsg}获得动画券 ${rewards.animeTickets} 张，角色券 ${rewards.characterTickets} 张，知识点 ${rewards.knowledge} 点。`,
        'success'
      );

      requiredExp = expToNextLevel.value;
    }
  }

  return {
    currentUser,
    level,
    exp,
    logs,
    isLoggedIn,
    expToNextLevel,
    addLog,
    resetState,
    login,
    logout,
    addExp,
  };
});
