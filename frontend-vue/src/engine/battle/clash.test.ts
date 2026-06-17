/**
 * 对撞结算测试（S1 的 BattleEngine 薄测试迁入；S2 纯函数化后已无 Pinia 依赖）。
 */
import { describe, it, expect } from 'vitest';
import { resolveClash } from './clash';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard } from '@/types/card';

const card = (points: number): AnimeCard => ({ points }) as unknown as AnimeCard;

describe('resolveClash（不传强度 → 回退卡面点数）', () => {
  it('7 vs 3 辛辣+反驳：轻微优势 → 攻方 -1 / 防守方 -6 / 议题 +1（2026-06 调平）', () => {
    const clash: ClashInfo = {
      attackerId: 'playerA',
      defenderId: 'playerB',
      attackingCard: card(7),
      defendingCard: card(3),
      attackStyle: '辛辣点评',
      defenseStyle: '反驳',
    };
    const r = resolveClash(clash);
    expect(r.attackerStrength).toBe(7);
    expect(r.defenderStrength).toBe(3);
    expect(r.rewards).toEqual({
      attackerReputationChange: -1,
      defenderReputationChange: -6,
      topicBiasChange: 1,
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
    const r = resolveClash(clash);
    expect(r.attackerStrength).toBe(5);
    expect(r.defenderStrength).toBe(0);
    expect(r.rewards.defenderReputationChange).toBe(-4); // 压倒性优势
  });
});

describe('resolveClash（显式强度优先于卡面点数）', () => {
  it('外部算好的最终强度（含光环/持续效果）直接用于结算', () => {
    const clash: ClashInfo = {
      attackerId: 'playerA',
      defenderId: 'playerB',
      attackingCard: card(2),
      defendingCard: card(2),
      attackStyle: '友好安利',
      defenseStyle: '赞同',
    };
    const r = resolveClash(clash, { attacker: 9, defender: 1 });
    expect(r.attackerStrength).toBe(9);
    expect(r.defenderStrength).toBe(1);
    expect(r.rewards.defenderReputationChange).toBe(-4); // diff 8 → 压倒
  });
});
