/**
 * Viewing Queue & Progress Store
 * Handles anime viewing queue, progress tracking, and viewing stats
 */

import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useAuthStore } from './authStore';
import { useEconomyStore } from './economyStore';
import { useGameDataStore } from '../gameDataStore';
import { GAME_CONFIG } from '@/config/gameConfig';

export interface ViewingQueueSlot {
  animeId: number;
  startTime: number;
}

interface ViewingStats {
  totalWatchTime: number;
  genreProgress: Record<string, number>;
  consecutiveDays: number;
  lastWatchDate: string;
}

export const useViewingStore = defineStore('viewing', () => {
  // --- STATE ---
  const viewingQueue = ref<(ViewingQueueSlot | null)[]>(
    Array(GAME_CONFIG.gameplay.viewingQueue.slots).fill(null)
  );
  const watchedAnime = ref<Set<number>>(new Set());
  const viewingStats = ref<ViewingStats>({
    totalWatchTime: 0,
    genreProgress: {},
    consecutiveDays: 0,
    lastWatchDate: '',
  });

  // --- ACTIONS ---
  function resetState() {
    viewingQueue.value = Array(GAME_CONFIG.gameplay.viewingQueue.slots).fill(null);
    watchedAnime.value = new Set();
    viewingStats.value = {
      totalWatchTime: 0,
      genreProgress: {},
      consecutiveDays: 0,
      lastWatchDate: '',
    };
  }

  function addToViewingQueue(animeId: number, slotIndex: number) {
    const authStore = useAuthStore();
    if (!authStore.isLoggedIn || viewingQueue.value[slotIndex]) return;

    const gameDataStore = useGameDataStore();
    const anime = gameDataStore.getAnimeCardById(animeId);
    if (!anime) return;

    viewingQueue.value[slotIndex] = {
      animeId: animeId,
      startTime: Date.now(),
    };
    authStore.addLog(`开始观看 [${anime.rarity}] ${anime.name}。`, 'info');
  }

  function collectFromViewingQueue(slotIndex: number) {
    const authStore = useAuthStore();
    const economyStore = useEconomyStore();

    if (!authStore.isLoggedIn) return;

    const slot = viewingQueue.value[slotIndex];
    if (!slot) return;

    const gameDataStore = useGameDataStore();
    const anime = gameDataStore.getAnimeCardById(slot.animeId);
    if (!anime) return;

    const rewards = GAME_CONFIG.gameplay.viewingQueue.rewards[anime.rarity];
    if (!rewards) {
      authStore.addLog(`未找到稀有度为 ${anime.rarity} 的观看奖励配置。`, 'warning');
      return;
    }

    const endTime = slot.startTime + rewards.time * 60 * 1000;

    if (Date.now() >= endTime) {
      authStore.addExp(rewards.exp);
      economyStore.addRewards({ knowledge: rewards.knowledge });

      watchedAnime.value.add(slot.animeId);

      const stats = viewingStats.value;
      stats.totalWatchTime += rewards.time;

      if (anime.synergy_tags) {
        anime.synergy_tags.forEach(genre => {
          stats.genreProgress[genre] = (stats.genreProgress[genre] || 0) + 1;
        });
      }

      const today = new Date().toDateString();
      const lastDate = new Date(stats.lastWatchDate).toDateString();
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toDateString();

      if (stats.lastWatchDate === '') {
        stats.consecutiveDays = 1;
      } else if (lastDate === yesterday) {
        stats.consecutiveDays += 1;
      } else if (lastDate !== today) {
        stats.consecutiveDays = 1;
      }

      stats.lastWatchDate = new Date().toISOString();

      if (stats.consecutiveDays >= 7 && stats.consecutiveDays % 7 === 0) {
        const bonusTickets = Math.min(5, Math.floor(stats.consecutiveDays / 7));
        economyStore.addRewards({ animeTickets: bonusTickets });
        authStore.addLog(`🎉 连续观看${stats.consecutiveDays}天！获得额外${bonusTickets}张动画券！`, 'success');
      }

      authStore.addLog(`看完了 ${anime.name}！获得了 ${rewards.exp} 经验和 ${rewards.knowledge} 知识点。`, 'success');
      viewingQueue.value[slotIndex] = null;
    } else {
      authStore.addLog('观看时间还没结束！', 'warning');
    }
  }

  function loadFromPayload(payload: any) {
    viewingQueue.value = payload.viewingQueue || Array(GAME_CONFIG.gameplay.viewingQueue.slots).fill(null);

    if (payload.watchedAnime && Array.isArray(payload.watchedAnime)) {
      watchedAnime.value = new Set(payload.watchedAnime);
    } else {
      watchedAnime.value = new Set();
    }

    viewingStats.value = payload.viewingStats || {
      totalWatchTime: 0,
      genreProgress: {},
      consecutiveDays: 0,
      lastWatchDate: '',
    };
  }

  function serializeForSave() {
    return {
      viewingQueue: viewingQueue.value,
      watchedAnime: Array.from(watchedAnime.value),
      viewingStats: viewingStats.value,
    };
  }

  return {
    viewingQueue,
    watchedAnime,
    viewingStats,
    VIEWING_REWARDS: GAME_CONFIG.gameplay.viewingQueue.rewards,
    resetState,
    addToViewingQueue,
    collectFromViewingQueue,
    loadFromPayload,
    serializeForSave,
  };
});
