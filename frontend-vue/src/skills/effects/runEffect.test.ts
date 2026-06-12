/**
 * 技能执行器接线测试（S4）。
 * 验证分发顺序（custom → 播报表 → 告警）与播报渲染（{name} 替换）。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { runEffect } from './index';
import { usePlayerStore, useHistoryStore, useGameStore } from '@/stores/battle';
import { createSequenceRng } from '@/engine';

beforeEach(() => {
  setActivePinia(createPinia());
  usePlayerStore().playerA.name = '测试玩家';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('播报表路径', () => {
  it('log 的 {name} 替换为玩家名，notification 同步发出', async () => {
    await runEffect('战场原黑仪_毒舌反击', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    const history = useHistoryStore();
    expect(history.log).toContain('测试玩家 准备毒舌反击！');
    const game = useGameStore();
    expect(game.notifications.some(n => n.message === '毒舌反击：对方辛辣点评-3强度' && n.type === 'warning')).toBe(true);
  });

  it('静默占位条目不产生任何日志', async () => {
    await runEffect('战场原黑仪_傲娇魅力', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    expect(useHistoryStore().log).toHaveLength(0);
  });
});

describe('custom handler 路径', () => {
  it('DRAW_1 真实抽牌（custom 优先于播报表）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.deck = [
      { id: 1, name: '卡1' } as never,
      { id: 2, name: '卡2' } as never,
    ];
    await runEffect('DRAW_1', { event: 'onPlay', playerId: 'playerA', role: 'attacker' });
    expect(playerStore.playerA.hand).toHaveLength(1);
    expect(playerStore.playerA.deck).toHaveLength(1);
  });

  it('随机型 handler 使用注入的 rng（科学逻辑 30% 抽牌）', async () => {
    const playerStore = usePlayerStore();
    playerStore.playerA.deck = [{ id: 1, name: '卡1' } as never];
    const card = { id: 9, name: '科幻卡', synergy_tags: ['科幻'] } as never;

    // rng 0.1 < 0.3 → 触发抽牌
    await runEffect('牧濑红莉栖_科学逻辑', {
      event: 'onPlay', playerId: 'playerA', role: 'attacker', card, rng: createSequenceRng([0.1]),
    });
    expect(playerStore.playerA.hand).toHaveLength(1);

    // rng 0.9 ≥ 0.3 → 不抽
    playerStore.playerA.deck = [{ id: 2, name: '卡2' } as never];
    await runEffect('牧濑红莉栖_科学逻辑', {
      event: 'onPlay', playerId: 'playerA', role: 'attacker', card, rng: createSequenceRng([0.9]),
    });
    expect(playerStore.playerA.hand).toHaveLength(1); // 没变
  });
});

describe('未注册 effectId', () => {
  it('仅 console.warn，不抛错', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      runEffect('不存在的技能', { event: 'onPlay', playerId: 'playerA', role: 'attacker' }),
    ).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith('Effect handler not found: 不存在的技能');
  });
});
