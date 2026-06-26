/**
 * 共享养成色映射特征测试（I5-T1）：纯函数档位/语义类断言。
 * 守住「全语义类（无硬编码 Tailwind 色）+ 阈值正确 + 两处 bondLevel/moodStatus 共用同一份」契约。
 */
import { describe, it, expect } from 'vitest';
import {
  bondTier,
  moodTier,
  moodColor,
  ATTRIBUTE_TEXT_COLOR,
  ATTRIBUTE_BAR_COLOR,
  SEMANTIC_CARD_CLASSES,
  SEMANTIC_BTN_CLASSES,
} from './nurtureColors';

/** 所有输出色都必须是语义令牌类（accent/highlight/success/warning/danger/info/ink-2…），不得含硬编码调色板。 */
const HARDCODED = /(pink|red|purple|blue|green|yellow|orange|gray)-\d/;

describe('bondTier 羁绊档（共享语义色）', () => {
  it('七档阈值正确映射（称号 / icon 区分度保留）', () => {
    expect(bondTier(1200).level).toBe('永恒羁绊');
    expect(bondTier(1000).level).toBe('永恒羁绊');
    expect(bondTier(900).level).toBe('命定之人');
    expect(bondTier(700).level).toBe('肝胆相照');
    expect(bondTier(500).level).toBe('心照不宣');
    expect(bondTier(300).level).toBe('志同道合');
    expect(bondTier(150).level).toBe('萍水相逢');
    expect(bondTier(50).level).toBe('初次相遇');
    expect(bondTier(0).level).toBe('初次相遇');
  });

  it('每档 color/bgColor 都是语义类，无硬编码硬色', () => {
    for (const aff of [1200, 900, 700, 500, 300, 150, 0]) {
      const t = bondTier(aff);
      expect(t.color).toMatch(/^text-/);
      expect(t.color).not.toMatch(HARDCODED);
      expect(t.bgColor).not.toMatch(HARDCODED);
      expect(t.icon.length).toBeGreaterThan(0); // emoji 区分度保留
    }
  });

  it('边界值落对档（>= 语义）', () => {
    expect(bondTier(999).level).toBe('命定之人'); // < 1000
    expect(bondTier(100).level).toBe('萍水相逢'); // == 100
    expect(bondTier(99).level).toBe('初次相遇');  // < 100
  });
});

describe('moodTier / moodColor 心情档（共享语义色）', () => {
  it('五档阈值正确 + 全语义类', () => {
    expect(moodTier(95).text).toBe('非常开心');
    expect(moodTier(75).text).toBe('愉快');
    expect(moodTier(55).text).toBe('平常');
    expect(moodTier(35).text).toBe('有些烦躁');
    expect(moodTier(10).text).toBe('心情不好');
    for (const m of [95, 75, 55, 35, 10]) {
      expect(moodTier(m).color).toMatch(/^text-/);
      expect(moodTier(m).color).not.toMatch(HARDCODED);
    }
  });

  it('moodColor 与 moodTier.color 一致（同一映射，不重复定义）', () => {
    for (const m of [95, 75, 55, 35, 10, 0]) {
      expect(moodColor(m)).toBe(moodTier(m).color);
    }
  });
});

describe('属性 / named 映射全语义化', () => {
  it('ATTRIBUTE_TEXT_COLOR / ATTRIBUTE_BAR_COLOR 无硬编码色', () => {
    for (const v of Object.values(ATTRIBUTE_TEXT_COLOR)) expect(v).not.toMatch(HARDCODED);
    for (const v of Object.values(ATTRIBUTE_BAR_COLOR)) expect(v).not.toMatch(HARDCODED);
  });

  it('SEMANTIC_CARD_CLASSES / SEMANTIC_BTN_CLASSES 全语义、无硬编码色、无 text-white 压浅底', () => {
    for (const v of Object.values(SEMANTIC_CARD_CLASSES)) {
      expect(v).not.toMatch(HARDCODED);
    }
    for (const v of Object.values(SEMANTIC_BTN_CLASSES)) {
      expect(v).not.toMatch(HARDCODED);
      expect(v).not.toContain('text-white'); // 实心按钮用 text-on-accent，不裸 text-white
    }
  });

  it('card 映射覆盖 5 个旧 color key（blue/pink/green/purple/yellow）', () => {
    expect(Object.keys(SEMANTIC_CARD_CLASSES).sort()).toEqual(
      ['blue', 'green', 'pink', 'purple', 'yellow'].sort(),
    );
  });
});
