/**
 * BattleEngine.resolveClash 薄测试（S1 安全网）。
 * 当前 StrengthCalculator 仍依赖 Pinia（S2 解耦目标），故此处用空 Pinia 搭台：
 * 双方无角色、无持续效果 → 最终强度 = 卡面点数，结算应与 RewardCalculator 表一致。
 * S2 把强度计算改为纯函数后，本测试去掉 Pinia 依赖即可原样保留。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { BattleEngine } from './BattleEngine';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard } from '@/types/card';

const card = (points: number): AnimeCard => ({ points }) as unknown as AnimeCard;

beforeEach(() => {
  setActivePinia(createPinia());
});

describe('BattleEngine.resolveClash（空场强度 = 卡面点数）', () => {
  it('7 vs 3 辛辣+反驳：轻微优势 → 防守方 -6 / 议题 +2', () => {
    const clash: ClashInfo = {
      attackerId: 'playerA',
      defenderId: 'playerB',
      attackingCard: card(7),
      defendingCard: card(3),
      attackStyle: '辛辣点评',
      defenseStyle: '反驳',
    };
    const r = BattleEngine.resolveClash(clash);
    expect(r.attackerStrength).toBe(7);
    expect(r.defenderStrength).toBe(3);
    expect(r.rewards).toEqual({
      attackerReputationChange: 0,
      defenderReputationChange: -6,
      topicBiasChange: 2,
    });
  });

  it('防守方未出卡：强度按 0 计', () => {
    const clash: ClashInfo = {
      attackerId: 'playerA',
      defenderId: 'playerB',
      attackingCard: card(5),
      attackStyle: '友好安利',
      defenseStyle: '赞同',
    };
    const r = BattleEngine.resolveClash(clash);
    expect(r.attackerStrength).toBe(5);
    expect(r.defenderStrength).toBe(0);
    expect(r.rewards.defenderReputationChange).toBe(-4); // 压倒性优势
  });
});
