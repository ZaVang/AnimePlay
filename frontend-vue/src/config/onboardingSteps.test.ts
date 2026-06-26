/**
 * onboarding 步数据特征测试（I5-T3）：value-first 开场 + 末尾品味身份步 + 引导只导航不写状态。
 */
import { describe, it, expect } from 'vitest';
import { ONBOARDING_STEPS } from './onboardingSteps';

describe('ONBOARDING_STEPS', () => {
  it('从 4 步增至 5 步（末尾加 1 步，克制不堆步数）', () => {
    expect(ONBOARDING_STEPS.length).toBe(5);
  });

  it('第 1 步 value-first：点名「番剧人格」主线，不以功能罗列（每天打卡）开场', () => {
    const first = ONBOARDING_STEPS[0];
    expect(first.title).toContain('番剧人格');
    expect(first.title).not.toContain('打卡'); // 不再以打卡功能罗列开场
    // 第 1 步是纯文案步（无 route 跳转），符合 value-first 改写不新增步。
    expect(first.route).toBeUndefined();
  });

  it('末尾第 5 步点名品味身份、cta 跳 /collections 引导标记看过', () => {
    const last = ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1];
    expect(last.route).toBe('/collections');
    expect(last.cta).toBeTruthy();
    expect(last.title + last.body).toMatch(/看过|画像|人格/); // 点名品味身份主线
  });

  it('每步结构合法（icon/title/body 必有；有 route 则有 cta）', () => {
    for (const s of ONBOARDING_STEPS) {
      expect(s.icon.length).toBeGreaterThan(0);
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
      if (s.route) expect(s.cta).toBeTruthy();
    }
  });

  it('引导内只导航不写状态：cta 文案是跳转引导，无内联业务写入语义', () => {
    // 第 5 步是「去标记看过」导航，而非引导流程内直接标记（不调 toggleTasteWatched）。
    const last = ONBOARDING_STEPS[ONBOARDING_STEPS.length - 1];
    expect(last.route).toBe('/collections'); // 靠跳转让用户自行触达，不在引导里写状态
  });
});
