/**
 * achievementsRead store 特征测试（B3）：设备级 localStorage 已读快照的读写与「有新解锁」判定。
 * vitest 环境是 node（无 DOM/localStorage），注入内存 localStorage stub（仿 onboarding.test）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const STORAGE_KEY = 'achievements-read-count';

function installLocalStorage(initial: Record<string, string> = {}) {
  const store: Record<string, string> = { ...initial };
  const mock = {
    getItem: vi.fn((k: string) => (k in store ? store[k] : null)),
    setItem: vi.fn((k: string, v: string) => {
      store[k] = String(v);
    }),
    removeItem: vi.fn((k: string) => {
      delete store[k];
    }),
    clear: vi.fn(() => {
      for (const k of Object.keys(store)) delete store[k];
    }),
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
  const mod = await import('./achievementsRead');
  return mod.useAchievementsReadStore();
}

describe('已读快照初始化', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('设备无记录时已读数为 0', async () => {
    installLocalStorage({});
    const s = await freshStore();
    expect(s.readAchievementCount).toBe(0);
  });

  it('设备已记录时读出已读数', async () => {
    installLocalStorage({ [STORAGE_KEY]: '3' });
    const s = await freshStore();
    expect(s.readAchievementCount).toBe(3);
  });

  it('非法记录回落 0', async () => {
    installLocalStorage({ [STORAGE_KEY]: 'oops' });
    const s = await freshStore();
    expect(s.readAchievementCount).toBe(0);
  });
});

describe('hasUnread 判定', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('解锁数超过已读数 → 有新', async () => {
    installLocalStorage({ [STORAGE_KEY]: '2' });
    const s = await freshStore();
    expect(s.hasUnread(3)).toBe(true);
    expect(s.hasUnread(2)).toBe(false);
    expect(s.hasUnread(1)).toBe(false);
  });
});

describe('markRead 落已读', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('标记后已读数追上解锁数，红点消失（hasUnread=false），并写入 localStorage', async () => {
    const ls = installLocalStorage({});
    const s = await freshStore();
    expect(s.hasUnread(5)).toBe(true);
    s.markRead(5);
    expect(s.readAchievementCount).toBe(5);
    expect(s.hasUnread(5)).toBe(false);
    expect(ls.setItem).toHaveBeenCalledWith(STORAGE_KEY, '5');
  });

  it('markRead 不回退（小于当前已读数则不动）', async () => {
    installLocalStorage({ [STORAGE_KEY]: '5' });
    const s = await freshStore();
    s.markRead(3);
    expect(s.readAchievementCount).toBe(5);
  });
});

describe('localStorage 不可用时不抛', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('无 localStorage 时初始化回落 0，markRead 不抛', async () => {
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
    const s = await freshStore();
    expect(s.readAchievementCount).toBe(0);
    expect(() => s.markRead(2)).not.toThrow();
    expect(s.readAchievementCount).toBe(2);
  });
});
