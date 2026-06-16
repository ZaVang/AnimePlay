/**
 * achievements 领域 store（evolution-1）：成就解锁判定 + 已解锁 id 持久化。
 * 解锁靠已解锁 id 去重（幂等）；累计计数器是会话级（不进存档，解锁本身才进档）。
 * 同一批玩法成功点里调 check(event, payload)；解锁发徽章 + 一次性奖励（profile.earn）。
 * 不触发存档（由门面统一控制）。
 */
import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import {
  ACHIEVEMENTS,
  getAchievementById,
  type AchievementEvent,
  type AchievementPayload,
  type AchievementStats,
} from '@/config/achievements';
import { useProfileStore } from './profile';

function createInitialStats(): AchievementStats {
  return {
    gachaCount: 0,
    battleWins: 0,
    watchCount: 0,
    nurtureCount: 0,
    guessStreak: 0,
    guessTotal: 0,
    maxTowerFloor: 0,
  };
}

export const useAchievementsStore = defineStore('achievements', () => {
  /** 已解锁成就 id（唯一进存档的可变状态）。 */
  const unlocked = ref<string[]>([]);
  /** 会话级累计计数（不进存档；解锁靠已解锁 id 幂等）。 */
  const stats = reactive<AchievementStats>(createInitialStats());

  const unlockedSet = computed(() => new Set(unlocked.value));

  function isUnlocked(id: string): boolean {
    return unlockedSet.value.has(id);
  }

  /** 累计某事件的计数器（在判定前先更新，使 condition 能读到本次结果）。 */
  function applyStats(event: AchievementEvent, payload?: AchievementPayload) {
    switch (event) {
      case 'gacha':
        stats.gachaCount += payload?.rarities?.length ?? 1;
        break;
      case 'battleWin':
        stats.battleWins += 1;
        break;
      case 'watch':
        stats.watchCount += 1;
        break;
      case 'nurture':
        stats.nurtureCount += 1;
        break;
      case 'guess':
        // payload?.rarities 不用于 guess；连对/累计计数由 store 维护。
        stats.guessStreak += 1;
        stats.guessTotal += 1;
        break;
      case 'tower':
        if (typeof payload?.floor === 'number') {
          stats.maxTowerFloor = Math.max(stats.maxTowerFloor, payload.floor);
        }
        break;
      case 'codex':
        // 无累计计数，靠 payload.milestoneId 触发。
        break;
    }
  }

  /** 猜错时由埋点处调用以打断连对计数。 */
  function resetGuessStreak() {
    stats.guessStreak = 0;
  }

  /**
   * 事件驱动的成就检测。返回本次新解锁的成就 id 列表（决定调用方是否存档）。
   * 已解锁的不会重复发奖（幂等）。
   */
  function check(event: AchievementEvent, payload?: AchievementPayload): string[] {
    applyStats(event, payload);

    const profile = useProfileStore();
    const newlyUnlocked: string[] = [];

    for (const def of ACHIEVEMENTS) {
      if (def.event !== event) continue;
      if (unlockedSet.value.has(def.id)) continue;
      if (!def.condition(stats, payload)) continue;

      unlocked.value.push(def.id);
      newlyUnlocked.push(def.id);
      profile.earn(def.reward.currency, def.reward.amount);
      profile.addLog(
        `${def.badge} 成就解锁：「${def.title}」——获得 ${def.reward.amount} ${profile.currencyName(def.reward.currency)}！`,
        'success',
      );
    }

    return newlyUnlocked;
  }

  // --- 持久化装配（只存已解锁 id） ---

  function serialize(): string[] {
    return unlocked.value;
  }

  function deserialize(data: string[] | null | undefined) {
    unlocked.value = Array.isArray(data) ? data : [];
  }

  function reset() {
    unlocked.value = [];
    Object.assign(stats, createInitialStats());
  }

  return {
    unlocked,
    stats,
    isUnlocked,
    check,
    resetGuessStreak,
    serialize,
    deserialize,
    reset,
    // 暴露给成就墙渲染
    getAchievementById,
  };
});
