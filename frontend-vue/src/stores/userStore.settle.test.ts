/**
 * ★ SF-T6 userStore.settleHomestead 墙钟回拨钳位测试（此前全仓零 settle 单测）。
 * 用 vi.spyOn(Date,'now') 控时：改系统时间回拨 → 收益 0 且 lastSettleAt 夹到 now（不停在旧的更大值），
 * 正常前进结算不受影响。saveToServer 被 mock（不打网络）。
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

vi.mock('./persistence', () => ({
  saveToServer: vi.fn(() => Promise.resolve()),
  loadFromServer: vi.fn(() => Promise.resolve()),
  resetAllDomains: vi.fn(),
}));

import { useUserStore } from './userStore';
import { useProfileStore } from './profile';
import { useHomesteadStore } from './homestead';

beforeEach(() => {
  setActivePinia(createPinia());
  useProfileStore().currentUser = 'tester';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SF-T6 settleHomestead 墙钟回拨钳位', () => {
  it('首次（lastSettleAt=0）只建基线：夹到 now、收益 0', () => {
    const user = useUserStore();
    const homestead = useHomesteadStore();
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    expect(homestead.lastSettleAt).toBe(0);
    const y = user.settleHomestead();
    expect(y.expEach).toBe(0);
    expect(homestead.lastSettleAt).toBe(1_000_000); // 基线建立
  });

  it('回拨（now < lastSettleAt）：收益 0 且 lastSettleAt 夹到 now（不停在旧的更大值）', () => {
    const user = useUserStore();
    const homestead = useHomesteadStore();
    // 基线停在未来（例如玩家先把系统时间调到很晚结算过一次）
    homestead.setLastSettleAt(5_000_000);
    // 现在系统时间被回拨到更早
    vi.spyOn(Date, 'now').mockReturnValue(2_000_000);
    const y = user.settleHomestead();
    expect(y.expEach).toBe(0);
    expect(y.affectionEach).toBe(0);
    expect(y.knowledge).toBe(0);
    // 关键：基线被夹到 now，不再是旧的更大值 5_000_000 → 后续正常时间不被吞
    expect(homestead.lastSettleAt).toBe(2_000_000);
  });

  it('回拨钳位后正常前进不受影响：lastSettleAt 随 now 推进', () => {
    const user = useUserStore();
    const homestead = useHomesteadStore();
    homestead.setLastSettleAt(5_000_000);
    // 回拨一次夹到 2_000_000
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(2_000_000);
    user.settleHomestead();
    expect(homestead.lastSettleAt).toBe(2_000_000);
    // 之后时间正常前进：结算推进基线到新 now（无入住角色 → 收益 0，但基线推进）
    nowSpy.mockReturnValue(2_000_000 + 3600_000);
    user.settleHomestead();
    expect(homestead.lastSettleAt).toBe(2_000_000 + 3600_000);
  });

  it('未登录：返回 empty，不动 lastSettleAt', () => {
    const user = useUserStore();
    const profile = useProfileStore();
    const homestead = useHomesteadStore();
    profile.currentUser = '';
    homestead.setLastSettleAt(5_000_000);
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const y = user.settleHomestead();
    expect(y.expEach).toBe(0);
    expect(homestead.lastSettleAt).toBe(5_000_000); // 未登录不改基线
  });
});
