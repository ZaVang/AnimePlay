/**
 * useWatchedAnime 特征测试（I2-T3）：「看过」派生合集。
 * 覆盖：两套来源合流去重、isWatched/count 一致、空集、任一来源变化即反映。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useViewingStore } from '@/stores/viewing';
import { useMiniGamesStore } from '@/stores/minigames/higherLower';
import { useWatchedAnime } from './useWatchedAnime';

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('useWatchedAnime', () => {
  it('合并「队列看完」与「手动勾选」两套来源并去重', () => {
    const viewing = useViewingStore();
    const minigames = useMiniGamesStore();
    viewing.watchedAnime.add(1);
    viewing.watchedAnime.add(2);
    minigames.tasteWatchedIds.add(2); // 与队列重叠
    minigames.tasteWatchedIds.add(3);

    const { watchedIds, watchedCount, isWatched } = useWatchedAnime();
    expect([...watchedIds.value].sort((a, b) => a - b)).toEqual([1, 2, 3]);
    expect(watchedCount.value).toBe(3); // 去重后 3 个
    expect(isWatched(1)).toBe(true);  // 仅队列
    expect(isWatched(3)).toBe(true);  // 仅手动
    expect(isWatched(2)).toBe(true);  // 两者都有
    expect(isWatched(99)).toBe(false);
  });

  it('空集时 count 为 0、isWatched 全 false', () => {
    const { watchedCount, isWatched } = useWatchedAnime();
    expect(watchedCount.value).toBe(0);
    expect(isWatched(1)).toBe(false);
  });

  it('任一来源变化后并集即时反映（computed 响应）', () => {
    const minigames = useMiniGamesStore();
    const { watchedCount } = useWatchedAnime();
    expect(watchedCount.value).toBe(0);
    minigames.tasteWatchedIds.add(42);
    // computed 依赖 Set 引用读取——通过门面 toggle 触发响应式。
    minigames.toggleTasteWatched(7);
    expect(watchedCount.value).toBe(2);
  });
});
