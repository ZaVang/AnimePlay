import { describe, expect, it } from 'vitest';
import { calculateTowerBattleRewards } from './rewards';

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
