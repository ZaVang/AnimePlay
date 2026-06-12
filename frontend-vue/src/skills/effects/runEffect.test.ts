/**
 * 技能执行器接线测试（S4 建立，S8c 收敛）。
 * 播报表机制已删——只剩 真实现 handler → 未注册告警 两条路径；
 * 另守卫合并注册表无重复 key（分桶文件 key 冲突会静默覆盖，必须拦截）。
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { runEffect } from './index';
import { customHandlers, handlerBucketSizes } from './customHandlers';
import { usePlayerStore } from '@/stores/battle';
import { createSequenceRng } from '@/engine';

beforeEach(() => {
  setActivePinia(createPinia());
  usePlayerStore().playerA.name = '测试玩家';
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('合并注册表（S8c 分桶）', () => {
  it('各桶 key 互不重复（合并总数 = 各桶之和）', () => {
    const sum = handlerBucketSizes.reduce((a, b) => a + b, 0);
    expect(Object.keys(customHandlers)).toHaveLength(sum);
  });

  it('曾经的播报技能现在是真 handler（抽查）', () => {
    for (const id of ['战场原黑仪_毒舌反击', '绫波丽_绝对沉默', '晓美焰_时间停止', 'CC_GEASS契约', '赫萝_丰收之神']) {
      expect(typeof customHandlers[id]).toBe('function');
    }
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
