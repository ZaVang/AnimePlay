/**
 * 「正在追」Pin（I4-T3）——设备级自设目标，localStorage（不进存档、不升 schema）。
 *
 * 玩家在番剧详情就地把一部番标为「正在追」，主页一处轻量列表 +「看完」按钮。
 * 补全「系统目标墙（题材集册）+ 玩家自设目标（Pin）」双轨。
 *
 * 设备级先例（onboarding/achievementsRead/theme）已验证此类「记住一次」状态走 localStorage：
 * try/catch 读写、无 DOM 静默回落、与账号漫游无关。跨设备不同步是设备级固有取舍，可接受。
 *
 * 护栏：轻量铁律——一个标记 + 主页一个列表 + 一个「看完」按钮，不做成新系统；
 * 少量上限（MAX_PINS）防 MAL/AniList 式「死亡清单」。仅番剧（角色无「正在追」语义）。
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';

const STORAGE_KEY = 'watching-pins';
/** 少量上限防「死亡清单」（永远清不完的列表退化为挫败源）。 */
export const MAX_PINS = 8;

/** 读设备 Pin 列表：JSON 数组（番剧 id）。node/无 DOM/损坏数据静默回落空数组。 */
function readPins(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 只收数字 id，去重，截到上限（防历史脏数据/超额）。
    const seen = new Set<number>();
    const out: number[] = [];
    for (const v of parsed) {
      if (typeof v === 'number' && isFinite(v) && !seen.has(v)) {
        seen.add(v);
        out.push(v);
        if (out.length >= MAX_PINS) break;
      }
    }
    return out;
  } catch {
    /* localStorage 不可用/JSON 损坏：静默回落空列表，不阻塞。 */
    return [];
  }
}

function writePins(ids: number[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* 写不进就算了：本会话内 ref 仍有效，不阻塞。 */
  }
}

export const useWatchingPinsStore = defineStore('watchingPins', () => {
  /** 「正在追」番剧 id（设备级，初始化即读设备缓存；保序便于稳定展示）。 */
  const pinnedIds = ref<number[]>(readPins());

  /** 是否已 Pin。 */
  function isPinned(id: number): boolean {
    return pinnedIds.value.includes(id);
  }

  /** 是否已达上限（用于详情禁用提示）。 */
  function isFull(): boolean {
    return pinnedIds.value.length >= MAX_PINS;
  }

  /**
   * Pin 一部番（已 Pin 或已满则不重复加）。返回是否成功加入。
   * 满了返回 false，由 UI 给「正在追已满」提示（不抛错）。
   */
  function pin(id: number): boolean {
    if (pinnedIds.value.includes(id)) return true;
    if (pinnedIds.value.length >= MAX_PINS) return false;
    pinnedIds.value = [...pinnedIds.value, id];
    writePins(pinnedIds.value);
    return true;
  }

  /** 取消 Pin。 */
  function unpin(id: number) {
    if (!pinnedIds.value.includes(id)) return;
    pinnedIds.value = pinnedIds.value.filter(x => x !== id);
    writePins(pinnedIds.value);
  }

  /** 切换 Pin（返回切换后是否已 Pin；满了加不进时返回 false 且不变）。 */
  function toggle(id: number): boolean {
    if (pinnedIds.value.includes(id)) {
      unpin(id);
      return false;
    }
    return pin(id);
  }

  return { pinnedIds, isPinned, isFull, pin, unpin, toggle };
});
