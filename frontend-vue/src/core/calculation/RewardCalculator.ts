import type { ClashInfo } from '@/types/battle';

type StrengthCategory = 'attacker_crush' | 'attacker_advantage' | 'draw' | 'defender_advantage' | 'defender_crush' | 'perfect_parry';

export interface RewardResult {
  attackerReputationChange: number;
  defenderReputationChange: number;
  topicBiasChange: number;
  // TODO: Add extra effects later, e.g., { effect: 'draw_card', target: 'defender', amount: 1 }
}

function getStrengthCategory(diff: number): StrengthCategory {
  if (diff >= 5) return 'attacker_crush';
  if (diff >= 1) return 'attacker_advantage';
  if (diff === 0) return 'draw';
  if (diff >= -4) return 'defender_advantage';
  if (diff <= -5) return 'defender_crush';
  return 'draw'; // Should be unreachable
}

export const RewardCalculator = {
  calculateRewards(clash: ClashInfo): RewardResult {
    // 统一按最终强度计算（若未出卡，defenderStrength 为 0）
    const attackerStrength = clash.attackerStrength ?? (clash.attackingCard.points || 0);
    const defenderStrength = clash.defenderStrength ?? (clash.defendingCard?.points || 0);
    const strengthDifference = attackerStrength - defenderStrength;
    const category = getStrengthCategory(strengthDifference);
    
    let result: RewardResult = { attackerReputationChange: 0, defenderReputationChange: 0, topicBiasChange: 0 };
    const biasDirection = clash.attackerId === 'playerA' ? 1 : -1;

    // --- Defender chose: 赞同 ---
    if (clash.defenseStyle === '赞同' || !clash.defenseStyle) {
      if (clash.attackStyle === '友好安利') {
        switch (category) {
          case 'attacker_crush':   result = { attackerReputationChange: 1, defenderReputationChange: -4, topicBiasChange: 2 * biasDirection }; break;
          case 'attacker_advantage': result = { attackerReputationChange: 0, defenderReputationChange: -3, topicBiasChange: 1 * biasDirection }; break;
          case 'draw':             result = { attackerReputationChange: 0, defenderReputationChange: 0, topicBiasChange: 0 }; break;
          case 'defender_advantage': result = { attackerReputationChange: -3, defenderReputationChange: 0, topicBiasChange: 0 }; break;
          case 'defender_crush':   result = { attackerReputationChange: -4, defenderReputationChange: 0, topicBiasChange: 0 }; break;
        }
      } else { // 辛辣点评
        switch (category) {
          case 'attacker_crush':   result = { attackerReputationChange: 0, defenderReputationChange: -6, topicBiasChange: 3 * biasDirection }; break;
          case 'attacker_advantage': result = { attackerReputationChange: 0, defenderReputationChange: -5, topicBiasChange: 2 * biasDirection }; break;
          case 'draw':             result = { attackerReputationChange: 0, defenderReputationChange: 0, topicBiasChange: 1 * biasDirection }; break;
          case 'defender_advantage': result = { attackerReputationChange: -5, defenderReputationChange: 0, topicBiasChange: 0 }; break;
          case 'defender_crush':   result = { attackerReputationChange: -6, defenderReputationChange: 0, topicBiasChange: 1 * biasDirection }; break;
        }
      }
    }
    // --- Defender chose: 反驳 ---
    else if (clash.defenseStyle === '反驳') {
      if (clash.attackStyle === '友好安利') {
        switch (category) {
          case 'attacker_crush':   result = { attackerReputationChange: 1, defenderReputationChange: -5, topicBiasChange: 2 * biasDirection }; break;
          case 'attacker_advantage': result = { attackerReputationChange: 0, defenderReputationChange: -4, topicBiasChange: 1 * biasDirection }; break;
          case 'draw':             result = { attackerReputationChange: -1, defenderReputationChange: 1, topicBiasChange: 0 }; break;
          case 'defender_advantage': result = { attackerReputationChange: -2, defenderReputationChange: 0, topicBiasChange: 0 }; break;
          case 'defender_crush':   result = { attackerReputationChange: -3, defenderReputationChange: 0, topicBiasChange: 0 }; break;
        }
      } else { // 辛辣点评
        switch (category) {
          case 'attacker_crush':   result = { attackerReputationChange: 0, defenderReputationChange: -7, topicBiasChange: 3 * biasDirection }; break;
          case 'attacker_advantage': result = { attackerReputationChange: 0, defenderReputationChange: -6, topicBiasChange: 2 * biasDirection }; break;
          case 'draw':             result = { attackerReputationChange: 0, defenderReputationChange: 0, topicBiasChange: 0 }; break;
          case 'defender_advantage': result = { attackerReputationChange: -4, defenderReputationChange: 0, topicBiasChange: 0 }; break;
          case 'defender_crush':   result = { attackerReputationChange: -5, defenderReputationChange: 0, topicBiasChange: 0 }; break;
        }
      }
    }

    return result;
  },
};
