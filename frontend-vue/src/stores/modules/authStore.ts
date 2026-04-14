/**
 * Authentication & Player State Store
 * Handles user login/logout and basic player progression
 */

import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';
import { useEconomyStore } from './economyStore';
import { useCollectionStore } from './collectionStore';
import { useViewingStore } from './viewingStore';
import { useDeckStore } from './deckStore';
import { useNurtureStore } from './nurtureStore';

import { PersistenceService } from '../../api/persistence';

export interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'warning' | 'gacha';
  timestamp: number;
}

export const useAuthStore = defineStore('auth', () => {
  // --- STATE ---
  const currentUser = ref<string>(localStorage.getItem('animeplay_user') || '');
  const level = ref(GAME_CONFIG.playerInitialState.level);
  const exp = ref(0);
  const logs = ref<LogEntry[]>([]);
  const isSyncing = ref(false);

  // --- GETTERS ---
  const isLoggedIn = computed(() => !!currentUser.value);
  const expToNextLevel = computed(() => {
    const currentLevelExp = GAME_CONFIG.gameplay.levelSystem.getExpForLevel(level.value);
    const nextLevelExp = GAME_CONFIG.gameplay.levelSystem.getExpForLevel(level.value + 1);
    return nextLevelExp - currentLevelExp;
  });

  // --- ACTIONS ---
  async function saveState() {
    if (!currentUser.value || isSyncing.value) return;
    
    isSyncing.value = true;
    try {
      // 协调全量数据序列化
      const economyStore = useEconomyStore();
      const collectionStore = useCollectionStore();
      const viewingStore = useViewingStore();
      const deckStore = useDeckStore();
      const nurtureStore = useNurtureStore();

      const fullState = {
        state: {
          level: level.value,
          exp: exp.value,
          logs: logs.value,
          ...economyStore.serializeForSave(),
          ...viewingStore.serializeForSave()
        },
        ...collectionStore.serializeForSave(),
        ...deckStore.serializeForSave(),
        ...nurtureStore.serializeForSave()
      };

      await PersistenceService.saveUserData(currentUser.value, fullState);
    } catch (e) {
      console.error('全量同步失败:', e);
    } finally {
      isSyncing.value = false;
    }
  }

  async function loadState(username: string) {
    try {
      const data = await PersistenceService.loadUserData(username);
      
      if (data) {
        // 1. 本地状态加载 (适配嵌套的 state 对象)
        const s = data.state || {};
        level.value = s.level || GAME_CONFIG.playerInitialState.level;
        exp.value = s.exp || 0;
        logs.value = s.logs || [];

        // 2. 分发全量数据到各个子 Store
        const economyStore = useEconomyStore();
        const collectionStore = useCollectionStore();
        const viewingStore = useViewingStore();
        const deckStore = useDeckStore();
        const nurtureStore = useNurtureStore();

        economyStore.loadFromPayload(s);
        collectionStore.loadFromPayload(data);
        viewingStore.loadFromPayload(s);
        deckStore.loadFromPayload(s); // 保持原有逻辑，从 state 中加载
        nurtureStore.loadFromPayload(data);

        return true;
      }
      return false;
    } catch (e) {
      console.error('全量加载失败:', e);
      return false;
    }
  }

  function addLog(message: string, type: LogEntry['type'] = 'info') {
    logs.value.unshift({ message, type, timestamp: Date.now() });
    if (logs.value.length > 50) {
      logs.value.pop();
    }
    saveState();
  }

  function resetState() {
    level.value = GAME_CONFIG.playerInitialState.level;
    exp.value = 0;
    logs.value = [];
    localStorage.removeItem('animeplay_user');
    
    // 重置所有子 Store
    useEconomyStore().resetState();
    useCollectionStore().resetState();
    useViewingStore().resetState();
    useDeckStore().resetState();
    useNurtureStore().resetState();
  }

  async function login(username: string) {
    if (!username || !username.match(/^[a-zA-Z0-9_-]+$/)) {
      alert('用户名只能包含字母、数字、连字符和下划线。');
      return;
    }
    
    currentUser.value = username;
    localStorage.setItem('animeplay_user', username);
    
    const loaded = await loadState(username);
    if (!loaded) {
      addLog(`欢迎，[${username}] 为新接入终端。`, 'success');
      saveState();
    } else {
      addLog(`接入成功，[${username}] 全量数据已同步。`, 'success');
    }
  }

  async function logout() {
    await saveState();
    currentUser.value = '';
    localStorage.removeItem('animeplay_user');
    resetState();
    addLog('连接断开。', 'info');
  }

  function addExp(amount: number) {
    if (!isLoggedIn.value || amount === 0) return;
    exp.value += amount;
    let requiredExp = expToNextLevel.value;

    while (exp.value >= requiredExp) {
      exp.value -= requiredExp;
      const newLevel = level.value + 1;
      const rewards = GAME_CONFIG.gameplay.levelSystem.getLevelRewards(newLevel);

      level.value = newLevel;

      const milestoneMsg = newLevel % 10 === 0 ? ' [里程碑]' : '';
      addLog(
        `核心同步率提升！当前等级: ${newLevel}${milestoneMsg}。获得奖励：知识点 ${rewards.knowledge}。`,
        'success'
      );

      requiredExp = expToNextLevel.value;
    }
    saveState();
  }

  // --- AUTO RECOVERY ---
  if (currentUser.value) {
    loadState(currentUser.value).catch(e => console.error('[AuthStore] Auto-recovery failed:', e));
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
    saveState,
    loadState
  };
});
