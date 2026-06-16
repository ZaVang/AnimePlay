/**
 * 成就「已读」标记（B3，设备级）。仿 onboarding.ts 的 localStorage try/catch 模式。
 * 成就解锁即发奖、无「可领」态，故「新解锁未读」靠设备级已读快照判定——**不进存档、不升 schema**。
 * 存的是已读成就数量（unlocked 数组只增，比数量即可判断有无新解锁，无需存全集 id）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

const STORAGE_KEY = 'achievements-read-count';

/** 读已读数量。node/无 DOM 环境静默回落 0。 */
function readCount(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw === null ? 0 : Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function writeCount(n: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    /* localStorage 不可用就算了：本会话内 ref 仍生效，红点逻辑不阻塞。 */
  }
}

export const useAchievementsReadStore = defineStore('achievementsRead', () => {
  /** 设备已读的成就数量（初始化即读设备缓存）。 */
  const readAchievementCount = ref<number>(readCount());

  /** 当前解锁数是否超过已读数 → 有新解锁未读。 */
  function hasUnread(unlockedCount: number): boolean {
    return unlockedCount > readAchievementCount.value;
  }

  /** 标记当前解锁数为已读（访问成就墙时调用）。红点即时消失（响应式）。 */
  function markRead(unlockedCount: number) {
    if (unlockedCount <= readAchievementCount.value) return;
    readAchievementCount.value = unlockedCount;
    writeCount(unlockedCount);
  }

  return { readAchievementCount, hasUnread, markRead };
});
