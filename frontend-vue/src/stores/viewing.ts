/**
 * viewing 领域 store（S5 自 userStore 拆出）：
 * 观看队列、已看历史、观看统计与连续观看奖励。
 * 不触发存档（由门面统一控制）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { GAME_CONFIG } from '@/config/gameConfig';
import type { ViewingQueueSlot, ViewingStats } from '@/types/player';
import { useGameDataStore } from './gameDataStore';
import { useProfileStore } from './profile';

function createInitialStats(): ViewingStats {
  return {
    totalWatchTime: 0,
    genreProgress: {},
    consecutiveDays: 0,
    lastWatchDate: '',
  };
}

export const useViewingStore = defineStore('viewing', () => {
  const viewingQueue = ref<(ViewingQueueSlot | null)[]>(
    Array(GAME_CONFIG.gameplay.viewingQueue.slots).fill(null),
  );
  const watchedAnime = ref<Set<number>>(new Set());
  const viewingStats = ref<ViewingStats>(createInitialStats());

  /** 加入观看队列。返回是否成功（决定调用方是否存档）。 */
  function addToViewingQueue(animeId: number, slotIndex: number): boolean {
    const profile = useProfileStore();
    if (!profile.isLoggedIn || viewingQueue.value[slotIndex]) return false;

    const anime = useGameDataStore().getAnimeCardById(animeId);
    if (!anime) return false;

    viewingQueue.value[slotIndex] = { animeId, startTime: Date.now() };
    profile.addLog(`开始观看 [${anime.rarity}] ${anime.name}。`, 'info');
    return true;
  }

  /** 收取观看奖励。返回是否成功收取（决定调用方是否存档）。 */
  function collectFromViewingQueue(slotIndex: number): boolean {
    const profile = useProfileStore();
    if (!profile.isLoggedIn) return false;
    const slot = viewingQueue.value[slotIndex];
    if (!slot) return false;

    const anime = useGameDataStore().getAnimeCardById(slot.animeId);
    if (!anime) return false;

    const rewards = GAME_CONFIG.gameplay.viewingQueue.rewards[anime.rarity];
    if (!rewards) {
      profile.addLog(`未找到稀有度为 ${anime.rarity} 的观看奖励配置。`, 'warning');
      return false;
    }
    const endTime = slot.startTime + rewards.time * 60 * 1000;
    if (Date.now() < endTime) {
      profile.addLog('观看时间还没结束！', 'warning');
      return false;
    }

    profile.addExp(rewards.exp);
    profile.earn('knowledgePoints', rewards.knowledge);

    watchedAnime.value.add(slot.animeId);

    const stats = viewingStats.value;
    stats.totalWatchTime += rewards.time;
    if (anime.synergy_tags) {
      anime.synergy_tags.forEach(genre => {
        stats.genreProgress[genre] = (stats.genreProgress[genre] || 0) + 1;
      });
    }

    // 连续观看天数
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

    // 连续观看奖励
    if (stats.consecutiveDays >= 7 && stats.consecutiveDays % 7 === 0) {
      const bonusTickets = Math.min(5, Math.floor(stats.consecutiveDays / 7));
      profile.earn('animeGachaTickets', bonusTickets);
      profile.addLog(`🎉 连续观看${stats.consecutiveDays}天！获得额外${bonusTickets}张动画券！`, 'success');
    }

    profile.addLog(`看完了 ${anime.name}！获得了 ${rewards.exp} 经验和 ${rewards.knowledge} 知识点。`, 'success');
    viewingQueue.value[slotIndex] = null;
    return true;
  }

  // --- 持久化装配 ---

  function serialize() {
    return {
      viewingQueue: viewingQueue.value,
      watchedAnime: Array.from(watchedAnime.value),
      viewingStats: viewingStats.value,
    };
  }

  function deserialize(data: { viewingQueue: (ViewingQueueSlot | null)[]; watchedAnime: number[]; viewingStats: ViewingStats }) {
    const slots = GAME_CONFIG.gameplay.viewingQueue.slots;
    const queue = Array(slots).fill(null) as (ViewingQueueSlot | null)[];
    (data.viewingQueue || []).slice(0, slots).forEach((slot, i) => (queue[i] = slot));
    viewingQueue.value = queue;
    watchedAnime.value = new Set(data.watchedAnime || []);
    viewingStats.value = { ...createInitialStats(), ...data.viewingStats };
  }

  function reset() {
    viewingQueue.value = Array(GAME_CONFIG.gameplay.viewingQueue.slots).fill(null);
    watchedAnime.value = new Set();
    viewingStats.value = createInitialStats();
  }

  return {
    viewingQueue,
    watchedAnime,
    viewingStats,
    addToViewingQueue,
    collectFromViewingQueue,
    serialize,
    deserialize,
    reset,
  };
});
