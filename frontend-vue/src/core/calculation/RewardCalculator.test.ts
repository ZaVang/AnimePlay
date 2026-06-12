/**
 * RewardCalculator 特征测试（S1 安全网）。
 * 逐格锁死 4 张结果表 —— 与 docs/战斗系统.md 的表格一一对应。
 * S2 迁入 engine/battle 时这些断言保持不变。
 */
import { describe, it, expect } from 'vitest';
import { RewardCalculator } from './RewardCalculator';
import type { ClashInfo } from '@/types/battle';
import type { AnimeCard } from '@/types/card';

type Style = { attackStyle: '友好安利' | '辛辣点评'; defenseStyle?: '赞同' | '反驳' };

function clash(diff: number, style: Style, attackerId: 'playerA' | 'playerB' = 'playerA'): ClashInfo {
  return {
    attackerId,
    defenderId: attackerId === 'playerA' ? 'playerB' : 'playerA',
    attackingCard: { points: 0 } as unknown as AnimeCard,
    attackerStrength: diff,
    defenderStrength: 0,
    ...style,
  };
}

// [diff, 攻击方声望, 防御方声望, 议题偏向(玩家A视角)]
type Row = [number, number, number, number];

const tables: Array<{ name: string; style: Style; rows: Row[] }> = [
  {
    name: '友好安利 + 赞同',
    style: { attackStyle: '友好安利', defenseStyle: '赞同' },
    rows: [
      [5, 1, -4, 2],
      [3, 0, -3, 1],
      [0, 0, 0, 0],
      [-3, -3, 0, 0],
      [-5, -4, 0, 0],
    ],
  },
  {
    name: '辛辣点评 + 赞同',
    style: { attackStyle: '辛辣点评', defenseStyle: '赞同' },
    rows: [
      [5, 0, -6, 3],
      [3, 0, -5, 2],
      [0, 0, 0, 1],
      [-3, -5, 0, 0],
      [-5, -6, 0, 1],
    ],
  },
  {
    name: '友好安利 + 反驳',
    style: { attackStyle: '友好安利', defenseStyle: '反驳' },
    rows: [
      [5, 1, -5, 2],
      [3, 0, -4, 1],
      [0, -1, 1, 0],
      [-3, -2, 0, 0],
      [-5, -3, 0, 0],
    ],
  },
  {
    name: '辛辣点评 + 反驳',
    style: { attackStyle: '辛辣点评', defenseStyle: '反驳' },
    rows: [
      [5, 0, -7, 3],
      [3, 0, -6, 2],
      [0, 0, 0, 0],
      [-3, -4, 0, 0],
      [-5, -5, 0, 0],
    ],
  },
];

describe('四张结果表逐格锁定（攻击方=playerA）', () => {
  for (const t of tables) {
    describe(t.name, () => {
      it.each(t.rows)('强度差 %i → 攻 %i / 防 %i / 议题 %i', (diff, atk, def, bias) => {
        const r = RewardCalculator.calculateRewards(clash(diff, t.style));
        expect(r.attackerReputationChange).toBe(atk);
        expect(r.defenderReputationChange).toBe(def);
        expect(r.topicBiasChange).toBe(bias);
      });
    });
  }
});

describe('强度差分档边界', () => {
  const style: Style = { attackStyle: '友好安利', defenseStyle: '赞同' };
  it('diff=4 仍是轻微优势（-3），diff=5 进入压倒（-4）', () => {
    expect(RewardCalculator.calculateRewards(clash(4, style)).defenderReputationChange).toBe(-3);
    expect(RewardCalculator.calculateRewards(clash(5, style)).defenderReputationChange).toBe(-4);
  });
  it('diff=-4 仍是轻微劣势（攻 -3），diff=-5 进入压倒性劣势（攻 -4）', () => {
    expect(RewardCalculator.calculateRewards(clash(-4, style)).attackerReputationChange).toBe(-3);
    expect(RewardCalculator.calculateRewards(clash(-5, style)).attackerReputationChange).toBe(-4);
  });
  it('diff=1 即为轻微优势', () => {
    expect(RewardCalculator.calculateRewards(clash(1, style)).defenderReputationChange).toBe(-3);
  });
});

describe('议题偏向方向', () => {
  it('攻击方为 playerB 时议题偏向取反（负方向）', () => {
    const r = RewardCalculator.calculateRewards(
      clash(5, { attackStyle: '辛辣点评', defenseStyle: '赞同' }, 'playerB'),
    );
    expect(r.topicBiasChange).toBe(-3);
  });
});

describe('缺省与兜底', () => {
  it('未选择防御方式时按「赞同」结算', () => {
    const r = RewardCalculator.calculateRewards(clash(5, { attackStyle: '友好安利' }));
    expect(r).toEqual({ attackerReputationChange: 1, defenderReputationChange: -4, topicBiasChange: 2 });
  });

  it('未传 attackerStrength 时回退用卡面点数', () => {
    const c: ClashInfo = {
      attackerId: 'playerA',
      defenderId: 'playerB',
      attackingCard: { points: 6 } as unknown as AnimeCard,
      attackStyle: '友好安利',
      defenseStyle: '赞同',
      // 无 attackerStrength / defenderStrength / defendingCard → 6 vs 0 → 压倒
    };
    expect(RewardCalculator.calculateRewards(c).defenderReputationChange).toBe(-4);
  });
});
