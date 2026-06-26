/**
 * watchingPins store 特征测试（I4-T3）：设备级 localStorage Pin 的增删 / 上限 / 持久化。
 * vitest 环境是 node（无 DOM/localStorage），注入内存 localStorage stub（仿 onboarding.test）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const STORAGE_KEY = 'watching-pins';

function installLocalStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  const mock = {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => { store[k] = String(v); }),
    removeItem: vi.fn((k: string) => { delete store[k]; }),
    clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k]; }),
  };
  (globalThis as unknown as { localStorage: unknown }).localStorage = mock;
  return mock;
}

afterEach(() => {
  delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
  vi.resetModules();
});

async function freshStore() {
  setActivePinia(createPinia());
  const mod = await import('./watchingPins');
  return { store: mod.useWatchingPinsStore(), MAX_PINS: mod.MAX_PINS };
}

describe('初始化即读设备缓存', () => {
  beforeEach(() => { vi.resetModules(); });

  it('空缓存 → 空列表', async () => {
    installLocalStorage({});
    const { store } = await freshStore();
    expect(store.pinnedIds).toEqual([]);
  });

  it('已有缓存 JSON 数组 → 读回（保序去重）', async () => {
    installLocalStorage({ [STORAGE_KEY]: JSON.stringify([5, 9, 5, 12]) });
    const { store } = await freshStore();
    expect(store.pinnedIds).toEqual([5, 9, 12]);
    expect(store.isPinned(9)).toBe(true);
    expect(store.isPinned(7)).toBe(false);
  });

  it('损坏 JSON / 非数组 → 静默回落空列表', async () => {
    installLocalStorage({ [STORAGE_KEY]: '{not json' });
    const { store } = await freshStore();
    expect(store.pinnedIds).toEqual([]);
  });
});

describe('pin / unpin / toggle 持久化', () => {
  beforeEach(() => { vi.resetModules(); });

  it('pin 落 localStorage', async () => {
    const ls = installLocalStorage({});
    const { store } = await freshStore();
    expect(store.pin(42)).toBe(true);
    expect(store.isPinned(42)).toBe(true);
    expect(ls.setItem).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify([42]));
  });

  it('重复 pin 不重复加', async () => {
    installLocalStorage({});
    const { store } = await freshStore();
    store.pin(1);
    store.pin(1);
    expect(store.pinnedIds).toEqual([1]);
  });

  it('unpin 移除并落盘', async () => {
    const ls = installLocalStorage({ [STORAGE_KEY]: JSON.stringify([1, 2, 3]) });
    const { store } = await freshStore();
    store.unpin(2);
    expect(store.pinnedIds).toEqual([1, 3]);
    expect(ls.setItem).toHaveBeenLastCalledWith(STORAGE_KEY, JSON.stringify([1, 3]));
  });

  it('toggle 在未 Pin/已 Pin 间切换', async () => {
    installLocalStorage({});
    const { store } = await freshStore();
    expect(store.toggle(7)).toBe(true);   // 加入
    expect(store.isPinned(7)).toBe(true);
    expect(store.toggle(7)).toBe(false);  // 移除
    expect(store.isPinned(7)).toBe(false);
  });
});

describe('少量上限防死亡清单', () => {
  beforeEach(() => { vi.resetModules(); });

  it('满 MAX_PINS 后再 pin 返回 false 且不变', async () => {
    installLocalStorage({});
    const { store, MAX_PINS } = await freshStore();
    for (let i = 0; i < MAX_PINS; i++) expect(store.pin(i)).toBe(true);
    expect(store.isFull()).toBe(true);
    expect(store.pin(999)).toBe(false);
    expect(store.pinnedIds).toHaveLength(MAX_PINS);
    expect(store.isPinned(999)).toBe(false);
  });

  it('读缓存超额时截断到上限', async () => {
    const { MAX_PINS } = await import('./watchingPins');
    vi.resetModules();
    const over = Array.from({ length: MAX_PINS + 5 }, (_, i) => i);
    installLocalStorage({ [STORAGE_KEY]: JSON.stringify(over) });
    const { store } = await freshStore();
    expect(store.pinnedIds).toHaveLength(MAX_PINS);
  });
});

describe('localStorage 不可用时不抛', () => {
  beforeEach(() => { vi.resetModules(); });

  it('无 localStorage 时初始化回落空 + pin 不抛', async () => {
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
    const { store } = await freshStore();
    expect(store.pinnedIds).toEqual([]);
    expect(() => store.pin(1)).not.toThrow();
  });
});
