/**
 * 播报表完整性测试（S4）。
 * 表里的每个条目都是「尚未真实现」的技能播报；S8 真实现后应从表中移除。
 */
import { describe, it, expect } from 'vitest';
import { ANNOUNCEMENTS } from './announcements';

describe('ANNOUNCEMENTS 表', () => {
  const entries = Object.entries(ANNOUNCEMENTS);

  it('共 72 条（S4 收编自 skills/effects 的播报式假实现）', () => {
    expect(entries).toHaveLength(72);
  });

  it('条目形状合法：log/notify 至少其一或为静默占位', () => {
    for (const [id, e] of entries) {
      expect(typeof id).toBe('string');
      if (e.log !== undefined) expect(typeof e.log).toBe('string');
      if (e.notify !== undefined) expect(typeof e.notify).toBe('string');
      if (e.logType !== undefined) expect(['event', 'clash', 'damage', 'info']).toContain(e.logType);
      if (e.notifyType !== undefined) expect(['info', 'warning']).toContain(e.notifyType);
    }
  });

  it('文案抽查：原 handler 的播报内容被原样保留（{name} 占位）', () => {
    expect(ANNOUNCEMENTS['战场原黑仪_毒舌反击']).toEqual({
      log: '{name} 准备毒舌反击！',
      notify: '毒舌反击：对方辛辣点评-3强度',
      notifyType: 'warning',
    });
    expect(ANNOUNCEMENTS['绫波丽_绝对沉默'].log).toBe('{name} 发动绝对沉默：对手下回合无法使用技能。');
    // 静默占位（原实现只有 console.log 的被动）
    expect(ANNOUNCEMENTS['战场原黑仪_傲娇魅力']).toEqual({});
  });

  it('与真实现注册表互斥的前提：表内不含 S1/S2 已实装的模板技能', () => {
    for (const id of ['DRAW_1', 'GAIN_TP_1', 'GAIN_TP_2', 'STRENGTH_PLUS_1', 'STRENGTH_PLUS_2', 'NEXT_CARD_ANY_TYPE']) {
      expect(ANNOUNCEMENTS[id]).toBeUndefined();
    }
  });
});
