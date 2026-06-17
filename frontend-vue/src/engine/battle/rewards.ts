/**
 * 宅理论战结算表 —— 纯函数。
 * 4 张结果表（攻击方式 × 防御方式）× 5 个强度差分档，与 docs/战斗系统.md 一一对应。
 * 数值受 engine/battle/rewards.test.ts 逐格锁定，改表前先改测试与文档。
 */
import type { ClashInfo } from '@/types/battle';

export type StrengthCategory =
  | 'attacker_crush'
  | 'attacker_advantage'
  | 'draw'
  | 'defender_advantage'
  | 'defender_crush';

export interface RewardResult {
  attackerReputationChange: number;
  defenderReputationChange: number;
  topicBiasChange: number;
}

/** 强度差落入的档位（≥5 攻方压倒 / 1-4 攻方优势 / 0 平 / -1~-4 守方优势 / ≤-5 守方压倒）。 */
export function getStrengthCategory(diff: number): StrengthCategory {
  if (diff >= 5) return 'attacker_crush';
  if (diff >= 1) return 'attacker_advantage';
  if (diff === 0) return 'draw';
  if (diff >= -4) return 'defender_advantage';
  return 'defender_crush';
}

/** 档位的玩家可读中文标签（按攻/守方标注，对撞区展示用）。 */
export const STRENGTH_CATEGORY_LABEL: Record<StrengthCategory, string> = {
  attacker_crush: '攻方压倒性优势',
  attacker_advantage: '攻方优势',
  draw: '势均力敌',
  defender_advantage: '守方优势',
  defender_crush: '守方压倒性优势',
};

export function calculateRewards(clash: ClashInfo): RewardResult {
  // 统一按最终强度计算（若未出卡，defenderStrength 为 0）
  const attackerStrength = clash.attackerStrength ?? (clash.attackingCard.points || 0);
  const defenderStrength = clash.defenderStrength ?? (clash.defendingCard?.points || 0);
  const category = getStrengthCategory(attackerStrength - defenderStrength);

  let result: RewardResult = { attackerReputationChange: 0, defenderReputationChange: 0, topicBiasChange: 0 };
  const biasDirection = clash.attackerId === 'playerA' ? 1 : -1;

  // --- 防御方：赞同（或未选择，默认按赞同） ---
  if (clash.defenseStyle === '赞同' || !clash.defenseStyle) {
    if (clash.attackStyle === '友好安利') {
      switch (category) {
        case 'attacker_crush':     result = { attackerReputationChange: 1, defenderReputationChange: -4, topicBiasChange: 2 * biasDirection }; break;
        case 'attacker_advantage': result = { attackerReputationChange: 0, defenderReputationChange: -3, topicBiasChange: 1 * biasDirection }; break;
        case 'draw':               result = { attackerReputationChange: 0, defenderReputationChange: 0, topicBiasChange: 0 }; break;
        case 'defender_advantage': result = { attackerReputationChange: -3, defenderReputationChange: 0, topicBiasChange: 0 }; break;
        case 'defender_crush':     result = { attackerReputationChange: -4, defenderReputationChange: 0, topicBiasChange: 0 }; break;
      }
    } else { // 辛辣点评（2026-06 调平：赢的档攻方自损 -1、议题 -1；平局不再白给议题 → 高伤高风险，非免费更优）
      switch (category) {
        case 'attacker_crush':     result = { attackerReputationChange: -1, defenderReputationChange: -6, topicBiasChange: 2 * biasDirection }; break;
        case 'attacker_advantage': result = { attackerReputationChange: -1, defenderReputationChange: -5, topicBiasChange: 1 * biasDirection }; break;
        case 'draw':               result = { attackerReputationChange: 0, defenderReputationChange: 0, topicBiasChange: 0 }; break;
        case 'defender_advantage': result = { attackerReputationChange: -5, defenderReputationChange: 0, topicBiasChange: 0 }; break;
        case 'defender_crush':     result = { attackerReputationChange: -6, defenderReputationChange: 0, topicBiasChange: 0 }; break;
      }
    }
  }
  // --- 防御方：反驳 ---
  // 2026-06 调平：反驳=「真反击」——守方占优档让攻方亏得比赞同更多（之前反而更少，方向反了）；
  // 攻方占优档守方多挨（反驳赌输）。攻方辛辣同样赢档自损 -1、议题 -1。
  else if (clash.defenseStyle === '反驳') {
    if (clash.attackStyle === '友好安利') {
      switch (category) {
        case 'attacker_crush':     result = { attackerReputationChange: 1, defenderReputationChange: -5, topicBiasChange: 2 * biasDirection }; break;
        case 'attacker_advantage': result = { attackerReputationChange: 0, defenderReputationChange: -4, topicBiasChange: 1 * biasDirection }; break;
        case 'draw':               result = { attackerReputationChange: -1, defenderReputationChange: 1, topicBiasChange: 0 }; break;
        case 'defender_advantage': result = { attackerReputationChange: -4, defenderReputationChange: 0, topicBiasChange: 0 }; break;
        case 'defender_crush':     result = { attackerReputationChange: -5, defenderReputationChange: 0, topicBiasChange: 0 }; break;
      }
    } else { // 辛辣点评
      switch (category) {
        case 'attacker_crush':     result = { attackerReputationChange: -1, defenderReputationChange: -7, topicBiasChange: 2 * biasDirection }; break;
        case 'attacker_advantage': result = { attackerReputationChange: -1, defenderReputationChange: -6, topicBiasChange: 1 * biasDirection }; break;
        case 'draw':               result = { attackerReputationChange: 0, defenderReputationChange: 0, topicBiasChange: 0 }; break;
        case 'defender_advantage': result = { attackerReputationChange: -6, defenderReputationChange: 0, topicBiasChange: 0 }; break;
        case 'defender_crush':     result = { attackerReputationChange: -7, defenderReputationChange: 0, topicBiasChange: 0 }; break;
      }
    }
  }

  return result;
}
