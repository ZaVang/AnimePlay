/**
 * User Store V2 - Orchestrator
 * Coordinates all user-related stores and handles save/load operations
 * This replaces the monolithic 1310-line userStore.ts
 */

import { defineStore } from 'pinia';
import { useAuthStore } from './modules/authStore';
import { useCollectionStore } from './modules/collectionStore';
import { useDeckStore } from './modules/deckStore';
import { useEconomyStore } from './modules/economyStore';
import { useViewingStore } from './modules/viewingStore';
import { useNurtureStore } from './modules/nurtureStore';
import { watch } from 'vue';

export const useUserStoreV2 = defineStore('userV2', () => {
  const authStore = useAuthStore();
  const collectionStore = useCollectionStore();
  const deckStore = useDeckStore();
  const economyStore = useEconomyStore();
  const viewingStore = useViewingStore();
  const nurtureStore = useNurtureStore();

  // Watch for level changes and add rewards to economy
  watch(
    () => authStore.level,
    (newLevel, oldLevel) => {
      if (newLevel > oldLevel) {
        const rewards = (window as any).GAME_CONFIG?.gameplay?.levelSystem?.getLevelRewards(newLevel);
        if (rewards) {
          economyStore.addRewards({
            animeTickets: rewards.animeTickets,
            characterTickets: rewards.characterTickets,
            knowledge: rewards.knowledge,
          });
        }
      }
    }
  );

  // --- ORCHESTRATOR ACTIONS ---
  function resetAllStores() {
    authStore.resetState();
    collectionStore.resetState();
    deckStore.resetState();
    economyStore.resetState();
    viewingStore.resetState();
    nurtureStore.resetState();
  }

  async function loadStateFromServer() {
    if (!authStore.currentUser) return;

    try {
      const response = await fetch(`/api/user/data?username=${authStore.currentUser}`);
      if (!response.ok) throw new Error(`Server error: ${response.statusText}`);

      const data = await response.json();

      if (data.isNewUser) {
        resetAllStores();
        authStore.addLog('欢迎新玩家！已为您初始化默认存档。', 'success');
      } else {
        const payload = data;

        // Load each store's state
        economyStore.loadFromPayload(payload.state || {});
        collectionStore.loadFromPayload(payload);
        deckStore.loadFromPayload(payload.state || {});
        viewingStore.loadFromPayload(payload.state || {});
        nurtureStore.loadFromPayload(payload);

        // Load auth state last (level, exp)
        authStore.level = payload.state?.level || 1;
        authStore.exp = payload.state?.exp || 0;

        authStore.addLog('成功从服务器加载存档。', 'info');
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      alert('加载存档失败，将使用初始设置。');
      resetAllStores();
    }
  }

  async function saveStateToServer(showAlert = false) {
    if (!authStore.currentUser) return;

    const payload = {
      state: {
        level: authStore.level,
        exp: authStore.exp,
        ...economyStore.serializeForSave(),
        ...deckStore.serializeForSave(),
        ...viewingStore.serializeForSave(),
      },
      ...collectionStore.serializeForSave(),
      ...nurtureStore.serializeForSave(),
    };

    try {
      const response = await fetch('/api/user/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: authStore.currentUser, payload }),
      });

      if (!response.ok) throw new Error(`Server error: ${response.statusText}`);
      if (showAlert) authStore.addLog('存档已手动保存到服务器！', 'success');
    } catch (error) {
      console.error('Failed to save user data:', error);
      if (showAlert) authStore.addLog('存档失败，请检查浏览器控制台日志。', 'warning');
    }
  }

  async function login(username: string) {
    await authStore.login(username);
    if (authStore.currentUser) {
      await loadStateFromServer();
    }
  }

  async function logout() {
    await saveStateToServer(false);
    await authStore.logout();
    resetAllStores();
  }

  return {
    // Expose sub-stores
    auth: authStore,
    collection: collectionStore,
    deck: deckStore,
    economy: economyStore,
    viewing: viewingStore,
    nurture: nurtureStore,

    // Orchestrator actions
    resetAllStores,
    loadStateFromServer,
    saveStateToServer,
    login,
    logout,
  };
});
