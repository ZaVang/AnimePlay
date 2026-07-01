import { describe, expect, it } from 'vitest';
import {
  SWEEP_CHARACTER_EXP_CAP,
  SWEEP_KNOWLEDGE_CAP,
  calculateSweepReward,
  calculateTowerBattleRewards,
} from './rewards';

describe('D1 tower reward calculation', () => {
  it('grants character exp, knowledge points, and injected equipment drop on player victory', () => {
    const rewards = calculateTowerBattleRewards({
      floor: 12,
      progressed: true,
      outcome: { winner: 'player', reason: 'elimination' },
      equipmentDrop: { rarity: 'SSR', slot: 'weapon' },
    });

    expect(rewards).toEqual({
      characterExp: 160,
      knowledgePoints: 170,
      equipmentDrop: { rarity: 'SSR', slot: 'weapon' },
    });
  });

  it('grants no rewards on enemy victory or timeout', () => {
    expect(calculateTowerBattleRewards({
      floor: 12,
      progressed: true,
      outcome: { winner: 'enemy', reason: 'elimination' },
      equipmentDrop: { rarity: 'SSR', slot: 'weapon' },
    })).toEqual({ characterExp: 0, knowledgePoints: 0, equipmentDrop: null });

    expect(calculateTowerBattleRewards({
      floor: 12,
      progressed: true,
      outcome: { winner: null, reason: 'timeout' },
      equipmentDrop: { rarity: 'SSR', slot: 'weapon' },
    })).toEqual({ characterExp: 0, knowledgePoints: 0, equipmentDrop: null });
  });

  it('grants no rewards when victory does not advance tower progress', () => {
    expect(calculateTowerBattleRewards({
      floor: 12,
      progressed: false,
      outcome: { winner: 'player', reason: 'elimination' },
      equipmentDrop: { rarity: 'SSR', slot: 'weapon' },
    })).toEqual({ characterExp: 0, knowledgePoints: 0, equipmentDrop: null });
  });
});

/** SA-T5：扫荡缩水奖励纯函数——缩水 + 边际递减 + 绝对封顶 + 装备不掉 + 防通胀。 */
describe('SA-T5 sweep reward economics', () => {
  const firstClear = (floor: number) =>
    calculateTowerBattleRewards({ floor, progressed: true, outcome: { winner: 'player', reason: 'victory' } });

  it('缩水：扫荡单次产出 << 同层首通产出（30~50% 区间内的实现）', () => {
    for (const floor of [1, 5, 20, 50]) {
      const sweep = calculateSweepReward(floor);
      const first = firstClear(floor);
      // 单次扫荡知识点/经验都明显低于首通（缩水补给，不是更划算的刷法）
      expect(sweep.sweepKnowledge).toBeLessThan(first.knowledgePoints);
      expect(sweep.sweepCharacterExp).toBeLessThan(first.characterExp);
    }
  });

  it('绝对封顶：无论层数多高，单次产出不超过 SWEEP_*_CAP', () => {
    for (const floor of [1, 100, 999, 100000]) {
      const r = calculateSweepReward(floor);
      expect(r.sweepKnowledge).toBeLessThanOrEqual(SWEEP_KNOWLEDGE_CAP);
      expect(r.sweepCharacterExp).toBeLessThanOrEqual(SWEEP_CHARACTER_EXP_CAP);
    }
  });

  it('边际递减：高层与低层产出差距被压平（非线性，杜绝「只扫最高层」Dead Zone）', () => {
    const low = calculateSweepReward(1);
    const high = calculateSweepReward(999);
    // floor 1 与 floor 999 的知识点差 < floor 派生线性差（10*(999-1)=9980）的一个零头
    expect(high.sweepKnowledge - low.sweepKnowledge).toBeLessThan(60);
  });

  it('满配周产出 << 一段推塔产出（防通胀量级校验）', () => {
    // 周上限 10 次 × 高层单次封顶产出 = 一周满配总量
    const WEEKLY_CAP = 10;
    const weeklyMaxKnowledge = SWEEP_KNOWLEDGE_CAP * WEEKLY_CAP; // 600
    // 对照：连推 20 层的首通知识点总量
    let tenFloorsPush = 0;
    for (let f = 1; f <= 20; f++) tenFloorsPush += firstClear(f).knowledgePoints;
    // 满配一周扫荡 ≈ 一趟主线推进量级，不该碾压推塔
    expect(weeklyMaxKnowledge).toBeLessThan(tenFloorsPush);
  });

  it('确定性：同层多次调用产出一致（纯函数、可复现）', () => {
    expect(calculateSweepReward(37)).toEqual(calculateSweepReward(37));
  });
});
