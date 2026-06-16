/**
 * onboarding store 特征测试（E3-T1）：设备级 localStorage 标志的读写与触发逻辑。
 * vitest 环境是 node（无 DOM/localStorage），这里注入一个内存 localStorage stub。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const STORAGE_KEY = 'onboarding-done';

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
  const mod = await import('./onboarding');
  return mod.useOnboardingStore();
}

describe('设备标志初始化', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('设备未标记时 hasSeenGuide=false（视作新设备）', async () => {
    installLocalStorage({});
    const s = await freshStore();
    expect(s.hasSeenGuide).toBe(false);
  });

  it('设备已标记 "1" 时 hasSeenGuide=true', async () => {
    installLocalStorage({ [STORAGE_KEY]: '1' });
    const s = await freshStore();
    expect(s.hasSeenGuide).toBe(true);
  });
});

describe('触发与落标志', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('新设备 maybeStartGuide 打开遮罩', async () => {
    installLocalStorage({});
    const s = await freshStore();
    expect(s.showGuide).toBe(false);
    s.maybeStartGuide();
    expect(s.showGuide).toBe(true);
  });

  it('已看过的设备 maybeStartGuide 不再弹', async () => {
    installLocalStorage({ [STORAGE_KEY]: '1' });
    const s = await freshStore();
    s.maybeStartGuide();
    expect(s.showGuide).toBe(false);
  });

  it('finishGuide 关遮罩 + 落 localStorage 标志，后续不再弹', async () => {
    const ls = installLocalStorage({});
    const s = await freshStore();
    s.maybeStartGuide();
    expect(s.showGuide).toBe(true);
    s.finishGuide();
    expect(s.showGuide).toBe(false);
    expect(s.hasSeenGuide).toBe(true);
    expect(ls.setItem).toHaveBeenCalledWith(STORAGE_KEY, '1');
    // 再触发不弹
    s.maybeStartGuide();
    expect(s.showGuide).toBe(false);
  });

  it('replayGuide 手动重看不动设备标志', async () => {
    const ls = installLocalStorage({ [STORAGE_KEY]: '1' });
    const s = await freshStore();
    s.replayGuide();
    expect(s.showGuide).toBe(true);
    expect(ls.setItem).not.toHaveBeenCalled();
  });
});

describe('localStorage 不可用时不抛', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('无 localStorage 时初始化回落 false 且 finishGuide 不抛', async () => {
    delete (globalThis as unknown as { localStorage?: unknown }).localStorage;
    const s = await freshStore();
    expect(s.hasSeenGuide).toBe(false);
    expect(() => s.finishGuide()).not.toThrow();
    expect(s.showGuide).toBe(false);
  });
});
