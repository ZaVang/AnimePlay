import type { ClashInfo } from '@/types/battle';

type StrengthCategory = 'attacker_crush' | 'attacker_advantage' | 'draw' | 'defender_advantage' | 'defender_crush' | 'perfect_parry';

export interface RewardResult {
  attackerReputationChange: number;
  defenderReputationChange: number;
  topicBiasChange: number;
  // TODO: Add extra effects later, e.g., { effect: 'draw_card', target: 'defender', amount: 1 }
}

function getStrengthCategory(diff: number): StrengthCategory {
  if (diff >= 4) return 'attacker_crush';
  if (diff >= 1) return 'attacker_advantage';
  if (diff === 0) return 'draw';
  if (diff >= -3) return 'defender_advantage';
  if (diff <= -4) return 'defender_crush';
  // Note: Perfect Parry (diff <= -5) is handled as a special case of defender_crush
  // because its rewards are a superset of the defender_crush rewards.
  return 'draw'; // Should be unreachable
}

export const RewardCalculator = {
  calculateRewards(clash: ClashInfo): RewardResult {

    // Handle undefended clash
    if (!clash.defendingCard || !clash.defenseStyle || !clash.defenderId) {
      const baseReputationChange = Math.ceil((clash.attackingCard.points || 1) / 2);
      if (clash.attackStyle === '辛辣点评') {
        return { attackerReputationChange: baseReputationChange, defenderReputationChange: -baseReputationChange, topicBiasChange: 2 };
      }
      return { attackerReputationChange: baseReputationChange, defenderReputationChange: -baseReputationChange, topicBiasChange: 1 };
    }

    const strengthDifference = (clash.attackingCard.points || 1) - (clash.defendingCard.points || 1);
    const category = getStrengthCategory(strengthDifference);
    
    let result: RewardResult = { attackerReputationChange: 0, defenderReputationChange: 0, topicBiasChange: 0 };
    const biasDirection = clash.attackerId === 'playerA' ? 1 : -1;

    // --- Defender chose: 赞同 ---
    if (clash.defenseStyle === '赞同') {
      if (clash.attackStyle === '友好安利') {
        switch (category) {
          case 'attacker_crush':   result = { attackerReputationChange: 4, defenderReputationChange: -1, topicBiasChange: 1 * biasDirection }; break;
          case 'attacker_advantage': result = { attackerReputationChange: 3, defenderReputationChange: 0, topicBiasChange: 1 * biasDirection }; break;
          case 'draw':             result = { attackerReputationChange: 2, defenderReputationChange: 1, topicBiasChange: 0 }; break;
          case 'defender_advantage': result = { attackerReputationChange: 1, defenderReputationChange: 1, topicBiasChange: 0 }; break;
          case 'defender_crush':   result = { attackerReputationChange: 0, defenderReputationChange: 2, topicBiasChange: 0 }; break;
        }
      } else { // 辛辣点评
        switch (category) {
          case 'attacker_crush':   result = { attackerReputationChange: 2, defenderReputationChange: -2, topicBiasChange: 3 * biasDirection }; break;
          case 'attacker_advantage': result = { attackerReputationChange: 1, defenderReputationChange: -1, topicBiasChange: 2 * biasDirection }; break;
          case 'draw':             result = { attackerReputationChange: 1, defenderReputationChange: 0, topicBiasChange: 1 * biasDirection }; break;
          case 'defender_advantage': result = { attackerReputationChange: -1, defenderReputationChange: 1, topicBiasChange: 1 * biasDirection }; break;
          case 'defender_crush':   result = { attackerReputationChange: -2, defenderReputationChange: 2, topicBiasChange: 0 }; break;
        }
      }
    }
    // --- Defender chose: 反驳 ---
    else if (clash.defenseStyle === '反驳') {
      // Handle Perfect Parry as a special case
      if (strengthDifference <= -5) {
        if (clash.attackStyle === '友好安利') {
          result = { attackerReputationChange: -3, defenderReputationChange: 4, topicBiasChange: -2 * biasDirection };
        } else { // 辛辣点评
          result = { attackerReputationChange: -2, defenderReputationChange: 3, topicBiasChange: -5 * biasDirection };
        }
        return result;
      }
      
      if (clash.attackStyle === '友好安利') {
        switch (category) {
          case 'attacker_crush':   result = { attackerReputationChange: 2, defenderReputationChange: -2, topicBiasChange: 1 * biasDirection }; break;
          case 'attacker_advantage': result = { attackerReputationChange: 1, defenderReputationChange: -1, topicBiasChange: 0 }; break;
          case 'draw':             result = { attackerReputationChange: 0, defenderReputationChange: 0, topicBiasChange: -1 * biasDirection }; break;
          case 'defender_advantage': result = { attackerReputationChange: -1, defenderReputationChange: 2, topicBiasChange: -1 * biasDirection }; break;
          case 'defender_crush':   result = { attackerReputationChange: -2, defenderReputationChange: 3, topicBiasChange: -2 * biasDirection }; break;
        }
      } else { // 辛辣点评
        switch (category) {
          case 'attacker_crush':   result = { attackerReputationChange: 1, defenderReputationChange: -3, topicBiasChange: 2 * biasDirection }; break;
          case 'attacker_advantage': result = { attackerReputationChange: 0, defenderReputationChange: -2, topicBiasChange: 1 * biasDirection }; break;
          case 'draw':             result = { attackerReputationChange: -1, defenderReputationChange: 1, topicBiasChange: -2 * biasDirection }; break;
          case 'defender_advantage': result = { attackerReputationChange: -2, defenderReputationChange: 1, topicBiasChange: -3 * biasDirection }; break;
          case 'defender_crush':   result = { attackerReputationChange: -3, defenderReputationChange: 2, topicBiasChange: -4 * biasDirection }; break;
        }
      }
    }

    return result;
  },
};
