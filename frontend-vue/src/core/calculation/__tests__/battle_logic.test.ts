
import { describe, it, expect } from 'vitest';
import { StrengthCalculator } from '../StrengthCalculator';
import { RewardCalculator } from '../RewardCalculator';
import type { AnimeCard } from '@/types/card';
import type { ClashInfo, BattleContext } from '@/types/battle';

describe('Battle Engine: StrengthCalculator (Pure)', () => {
  const mockCard: Partial<AnimeCard> = {
    id: 1,
    name: 'Test Card',
    points: 10,
    synergy_tags: ['Action']
  };

  it('should return base points when no context or systems provided', () => {
    const strength = StrengthCalculator.calculateFinalStrength(mockCard as AnimeCard, 'playerA');
    expect(strength).toBe(10);
  });

  it('should apply aura bonuses from context correctly', () => {
    const context: BattleContext = {
      topicBias: 0,
      attackerAuraBonus: 5,
      defenderAuraBonus: 0
    };
    const strength = StrengthCalculator.calculateFinalStrength(mockCard as AnimeCard, 'playerA', context);
    expect(strength).toBe(15);
  });

  it('should handle missing cards with 0 strength', () => {
    const strength = StrengthCalculator.calculateFinalStrength(undefined, 'playerA');
    expect(strength).toBe(0);
  });
});

describe('Battle Engine: RewardCalculator (Pure Matrix)', () => {
  const attackerCard: Partial<AnimeCard> = { id: 1, name: 'Attacker', points: 10 };
  const defenderCard: Partial<AnimeCard> = { id: 2, name: 'Defender', points: 5 };

  it('Friendly vs Agree -> Attacker Crush (10 vs 5)', () => {
    const clash: ClashInfo = {
      attackerId: 'playerA',
      attackingCard: attackerCard as AnimeCard,
      attackStyle: '友好安利',
      defenderId: 'playerB',
      defendingCard: defenderCard as AnimeCard,
      defenseStyle: '赞同',
      attackerStrength: 10,
      defenderStrength: 5
    };

    const rewards = RewardCalculator.calculateRewards(clash);
    // Based on RewardCalculator line 36
    expect(rewards.attackerReputationChange).toBe(1);
    expect(rewards.defenderReputationChange).toBe(-4);
    expect(rewards.topicBiasChange).toBe(2); // biasDirection (playerA) = 1
  });

  it('Harsh vs Rebut -> Draw (10 vs 10)', () => {
    const clash: ClashInfo = {
      attackerId: 'playerB',
      attackingCard: attackerCard as AnimeCard,
      attackStyle: '辛辣点评',
      defenderId: 'playerA',
      defendingCard: attackerCard as AnimeCard, // 10 pts
      defenseStyle: '反驳',
      attackerStrength: 10,
      defenderStrength: 10
    };

    const rewards = RewardCalculator.calculateRewards(clash);
    // Based on RewardCalculator line 66
    expect(rewards.attackerReputationChange).toBe(0);
    expect(rewards.defenderReputationChange).toBe(0);
    expect(rewards.topicBiasChange).toBe(0);
  });

  it('Harsh vs Rebut -> Attacker Advantage (10 vs 9)', () => {
    const clash: ClashInfo = {
      attackerId: 'playerA',
      attackingCard: attackerCard as AnimeCard,
      attackStyle: '辛辣点评',
      defenderId: 'playerB',
      defendingCard: { ...defenderCard, points: 9 } as AnimeCard,
      defenseStyle: '反驳',
      attackerStrength: 10,
      defenderStrength: 9
    };

    const rewards = RewardCalculator.calculateRewards(clash);
    // Based on RewardCalculator line 65
    expect(rewards.attackerReputationChange).toBe(0);
    expect(rewards.defenderReputationChange).toBe(-6);
    expect(rewards.topicBiasChange).toBe(2);
  });
});
