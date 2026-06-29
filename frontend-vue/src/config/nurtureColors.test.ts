/**
 * 好感档语义色特征测试（S13-C1 瘦身）。
 * 守住「全语义类（无硬编码 Tailwind 色）+ 阈值与 BOND_MILESTONES 对齐」契约。
 */
import { describe, it, expect } from 'vitest';
import { bondTier } from './nurtureColors';
import { BOND_MILESTONES } from './nurture';

/** 所有输出色都必须是语义令牌类，不得含硬编码调色板。 */
const HARDCODED = /(pink|red|purple|blue|green|yellow|orange|gray)-\d/;

describe('bondTier 好感档（共享语义色）', () => {
  it('档位阈值与 BOND_MILESTONES 对齐（>= 语义）', () => {
    expect(bondTier(4000).icon).toBe('⭐');
    expect(bondTier(3999).icon).toBe('🌟'); // < 4000 落 ≥2000 档
    expect(bondTier(2000).icon).toBe('🌟');
    expect(bondTier(1000).icon).toBe('💜');
    expect(bondTier(500).icon).toBe('💙');
    expect(bondTier(250).icon).toBe('💚');
    expect(bondTier(100).icon).toBe('💛');
    expect(bondTier(99).icon).toBe('🤝');
    expect(bondTier(0).icon).toBe('🤝');
  });

  it('每档 color/bgColor 都是语义类，无硬编码硬色', () => {
    for (const aff of [4000, 2000, 1000, 500, 250, 100, 0]) {
      const t = bondTier(aff);
      expect(t.color).toMatch(/^text-/);
      expect(t.color).not.toMatch(HARDCODED);
      expect(t.bgColor).not.toMatch(HARDCODED);
      expect(t.icon.length).toBeGreaterThan(0);
    }
  });

  it('阈值与里程碑配置一致（每个里程碑阈值都能落到非默认档）', () => {
    for (const m of BOND_MILESTONES) {
      expect(bondTier(m.threshold).icon).not.toBe('🤝');
    }
  });
});
