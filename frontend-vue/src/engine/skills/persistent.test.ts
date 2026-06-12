/**
 * 持续效果追踪器测试（S4，原 PersistentEffectSystem 行为锁定 + 纯化验证）。
 */
import { describe, it, expect, vi } from 'vitest';
import { PersistentEffectTracker } from './persistent';
import { StatusEffectTracker } from './status';

describe('PersistentEffectTracker', () => {
  it('强度加成按玩家与卡牌类型过滤', () => {
    const t = new PersistentEffectTracker();
    t.addCardTypeStrengthBonus('playerA', '科幻', 2, 1);
    t.addTemporaryBonus({ playerId: 'playerA', bonusType: 'strength', amount: 1, duration: 1, description: '通用+1' });
    t.addCardTypeStrengthBonus('playerB', '科幻', 5, 1);

    expect(t.getStrengthBonus('playerA', ['科幻'])).toBe(3); // 类型匹配 2 + 无类型限制 1
    expect(t.getStrengthBonus('playerA', ['日常'])).toBe(1); // 仅无类型限制的
    expect(t.getStrengthBonus('playerB', ['科幻'])).toBe(5);
  });

  it('回合开始递减持续时间，到 0 过期并触发 onExpire', () => {
    const t = new PersistentEffectTracker();
    const onExpire = vi.fn();
    t.addEffect({ playerId: 'playerA', type: 'x', duration: 1, data: {}, description: '一回合效果', onExpire });
    t.addCardTypeStrengthBonus('playerA', '科幻', 2, 1);

    expect(t.getActiveEffects('playerA')).toHaveLength(1);
    t.onTurnStart('playerA');
    expect(onExpire).toHaveBeenCalledOnce();
    expect(t.getActiveEffects('playerA')).toHaveLength(0);
    expect(t.getStrengthBonus('playerA', ['科幻'])).toBe(0);
  });

  it('永久效果（duration=-1）不过期', () => {
    const t = new PersistentEffectTracker();
    t.addEffect({ playerId: 'playerA', type: 'x', duration: -1, data: {}, description: '永久' });
    t.onTurnStart('playerA');
    t.onTurnStart('playerA');
    expect(t.getActiveEffects('playerA')).toHaveLength(1);
  });

  it('限制随回合过期', () => {
    const t = new PersistentEffectTracker();
    t.addSkillDisable('playerB', 'SOME_SKILL', 1);
    expect(t.hasRestriction('playerB', 'skill_disabled')).toBe(true);
    t.onTurnStart('playerB');
    expect(t.hasRestriction('playerB', 'skill_disabled')).toBe(false);
  });

  it('日志经注入回调发出（engine 自身零 I/O）', () => {
    const logs: string[] = [];
    const t = new PersistentEffectTracker(m => logs.push(m));
    t.addCardTypeStrengthBonus('playerA', '科幻', 2, 1);
    expect(logs).toEqual(['临时加成：科幻类卡牌+2强度 (1回合)']);
    t.onTurnStart('playerA');
    expect(logs[1]).toBe('临时加成结束：科幻类卡牌+2强度 (1回合)');
  });

  it('ID 单调且互不相同（不再依赖 Date.now/Math.random）', () => {
    const t = new PersistentEffectTracker();
    const a = t.addEffect({ playerId: 'playerA', type: 'x', duration: -1, data: {}, description: 'a' });
    const b = t.addEffect({ playerId: 'playerA', type: 'x', duration: -1, data: {}, description: 'b' });
    expect(a).not.toBe(b);
  });

  it('clearAll 清空全部三类状态', () => {
    const t = new PersistentEffectTracker();
    t.addEffect({ playerId: 'playerA', type: 'x', duration: -1, data: {}, description: 'a' });
    t.addCardTypeStrengthBonus('playerA', '科幻', 2, 9);
    t.addForcedAction('playerA', 'friendly', 9);
    t.clearAll();
    expect(t.getActiveEffects('playerA')).toHaveLength(0);
    expect(t.getStrengthBonus('playerA', ['科幻'])).toBe(0);
    expect(t.hasRestriction('playerA', 'forced_action')).toBe(false);
  });
});

describe('StatusEffectTracker', () => {
  it('grant → has → consume 一次性语义', () => {
    const s = new StatusEffectTracker();
    expect(s.hasNextCardAnyType('playerA')).toBe(false);
    s.grantNextCardAnyType('playerA');
    expect(s.hasNextCardAnyType('playerA')).toBe(true);
    expect(s.consumeNextCardAnyType('playerA')).toBe(true);
    expect(s.consumeNextCardAnyType('playerA')).toBe(false); // 已消耗
    expect(s.hasNextCardAnyType('playerB')).toBe(false); // 互不影响
  });
});
