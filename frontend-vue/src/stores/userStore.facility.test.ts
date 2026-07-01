/**
 * userStore.upgradeFacility 门面测试（S14-D SD-T1/SD-T5）：
 * 货币铁律——余额不足不升级、扣 KP 成功才提级、满级不升。saveToServer 被 mock（不打网络）。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// 装配器整体 mock：只关心门面的 spend/levelUp 编排，不触发真实存档 IO。
vi.mock('./persistence', () => ({
  saveToServer: vi.fn(() => Promise.resolve()),
  loadFromServer: vi.fn(() => Promise.resolve()),
  resetAllDomains: vi.fn(),
}));

import { useUserStore } from './userStore';
import { useProfileStore } from './profile';
import { useFacilityStore } from './facility';
import { facilityUpgradeCost, FACILITY_MAX_LEVEL } from '@/config/homestead';

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('userStore.upgradeFacility', () => {
  it('余额不足：返回 false，等级与 KP 均不变', () => {
    const user = useUserStore();
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = 10; // 远不够 base 120
    const before = useFacilityStore().getLevel('exp');
    expect(user.upgradeFacility('exp')).toBe(false);
    expect(useFacilityStore().getLevel('exp')).toBe(before);
    expect(profile.core.knowledgePoints).toBe(10);
  });

  it('余额充足：扣 KP 且提级', () => {
    const user = useUserStore();
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = 1000;
    const cost = facilityUpgradeCost(1); // Lv.1→2
    expect(user.upgradeFacility('exp')).toBe(true);
    expect(useFacilityStore().getLevel('exp')).toBe(2);
    expect(profile.core.knowledgePoints).toBe(1000 - cost);
  });

  it('未登录：返回 false 不变更', () => {
    const user = useUserStore();
    const profile = useProfileStore();
    profile.currentUser = '';
    profile.core.knowledgePoints = 99999;
    expect(user.upgradeFacility('bond')).toBe(false);
    expect(useFacilityStore().getLevel('bond')).toBe(1);
  });

  it('满级：返回 false 不扣 KP', () => {
    const user = useUserStore();
    const profile = useProfileStore();
    profile.currentUser = 'tester';
    profile.core.knowledgePoints = 999999999;
    useFacilityStore().levels = { exp: 1, bond: 1, knowledge: FACILITY_MAX_LEVEL };
    expect(user.upgradeFacility('knowledge')).toBe(false);
    expect(profile.core.knowledgePoints).toBe(999999999);
  });
});
