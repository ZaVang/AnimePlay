/**
 * useWatchedAnime（I2-T3）——「看过」派生合集（零存档）。
 *
 * 历史上存在两套割裂的「看过」源：
 *  - `viewing.watchedAnime`：观看队列计时看完写入（首页 ViewingStats 读）。
 *  - `minigames.tasteWatchedIds`：品味画像手动勾选写入（人格 / 推荐种子 / 图鉴印章·段位 读）。
 * 二者互不相通 → 引擎只吃到「手动勾选」那一半，首页只看到「队列看完」那一半。
 *
 * 本 composable 在**消费层**把两者合并为派生并集（union computed），所有「读」侧统一消费它。
 * **写侧维持现状各写各的语义字段**（队列看完 vs 手动勾选是两种事件），不合并写、不升档。
 *
 * 依赖只向下：本 composable 同时 `use` 两个领域 store（消费层聚合），
 * 两个 store 彼此并不互相 import——避免 viewing ↔ minigames 的横向依赖。
 *
 * 性能：union 是 computed，仅在任一来源集变化时重建（千级数据无压力，且只在被读取时求值）。
 */
import { computed, type ComputedRef } from 'vue';
import { useViewingStore } from '@/stores/viewing';
import { useMiniGamesStore } from '@/stores/minigames/higherLower';

export interface WatchedAnimeUnion {
  /** 「看过」并集 Set（viewing.watchedAnime ∪ minigames.tasteWatchedIds）。 */
  watchedIds: ComputedRef<Set<number>>;
  /** 并集去重后的总数。 */
  watchedCount: ComputedRef<number>;
  /** 某番剧是否被任一来源标记「看过」。 */
  isWatched: (id: number) => boolean;
}

export function useWatchedAnime(): WatchedAnimeUnion {
  const viewing = useViewingStore();
  const minigames = useMiniGamesStore();

  const watchedIds = computed(() => {
    const union = new Set<number>(viewing.watchedAnime);
    for (const id of minigames.tasteWatchedIds) union.add(id);
    return union;
  });

  const watchedCount = computed(() => watchedIds.value.size);

  function isWatched(id: number): boolean {
    return watchedIds.value.has(id);
  }

  return { watchedIds, watchedCount, isWatched };
}
