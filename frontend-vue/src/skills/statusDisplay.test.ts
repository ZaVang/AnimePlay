/**
 * 状态芯片映射测试：describePlayerStatus 把 persistentEffects 的隐藏机制
 * 翻译成可读芯片（图标/标签/正负向）。锁定映射与「只显本人、空态隐藏」语义。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { persistentEffects, clearBattleSkillState } from './systems';
import { describePlayerStatus } from './statusDisplay';

beforeEach(() => {
  setActivePinia(createPinia());
  clearBattleSkillState();
});

describe('describePlayerStatus（场上状态芯片）', () => {
  it('无效果时返回空数组（UI 据此隐藏整行）', () => {
    expect(describePlayerStatus('playerA')).toEqual([]);
  });

  it('效果护盾 → 增益芯片', () => {
    persistentEffects.addRestriction('playerA', 'effect_shield', {}, 1);
    const chips = describePlayerStatus('playerA');
    expect(chips).toHaveLength(1);
    expect(chips[0].tone).toBe('buff');
    expect(chips[0].label).toContain('效果护盾');
  });

  it('强制行动 → 减益芯片，辛辣/友好文案区分', () => {
    persistentEffects.addForcedAction('playerA', 'harsh_only', 2);
    expect(describePlayerStatus('playerA')[0]).toMatchObject({ tone: 'debuff' });
    expect(describePlayerStatus('playerA')[0].label).toContain('辛辣');
  });

  it('强度加成按正负判正向/敌对削弱', () => {
    persistentEffects.addCardTypeStrengthBonus('playerA', '科幻', 2, 1);
    persistentEffects.addTemporaryBonus({
      playerId: 'playerA', bonusType: 'strength', amount: -2, duration: 1, description: '敌对削弱',
    });
    const strengthChips = describePlayerStatus('playerA').filter(c => c.icon === '⚔');
    const tones = strengthChips.map(c => c.tone);
    expect(tones).toContain('buff');
    expect(tones).toContain('debuff');
  });

  it('只返回该玩家自己的状态', () => {
    persistentEffects.addRestriction('playerB', 'effect_shield', {}, 1);
    expect(describePlayerStatus('playerA')).toEqual([]);
    expect(describePlayerStatus('playerB')).toHaveLength(1);
  });

  it('纯内部连击计数类限制不打扰玩家（无芯片）', () => {
    persistentEffects.addRestriction('playerA', 'music_combo_cost', {}, 1);
    expect(describePlayerStatus('playerA')).toEqual([]);
  });
});
