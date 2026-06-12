/**
 * 宅理论战整场结算奖励 —— 纯函数（S6 建立）。
 * 数值基线对齐挑战塔（塔一层胜利 ≈ 50 exp / 25 知识点）：
 * 对战一场更长，胜利略高于塔一层；败局给安慰奖励（鼓励再战不惩罚尝试）。
 * 注：gameConfig.battle 是废弃的旧规则块（prestige 制），与现行系统无关，勿取数。
 */
import type { GameOutcome } from './turn';

export interface MatchRewards {
  exp: number;
  knowledge: number;
}

const REWARD_TABLE: Record<'win' | 'draw' | 'loss', MatchRewards> = {
  win: { exp: 60, knowledge: 30 },
  draw: { exp: 30, knowledge: 15 },
  loss: { exp: 15, knowledge: 5 },
};

/** 以 playerA（人类玩家）视角结算整场奖励。 */
export function calculateMatchRewards(outcome: GameOutcome): MatchRewards {
  if (outcome.winner === 'draw') return { ...REWARD_TABLE.draw };
  return outcome.winner === 'playerA' ? { ...REWARD_TABLE.win } : { ...REWARD_TABLE.loss };
}

/** 结算原因的展示文案。 */
export const VICTORY_REASON_TEXT: Record<GameOutcome['reason'], string> = {
  reputation: '声望击破——对方声望归零',
  topic_bias: '议题压制——议题偏向达到极限',
  final_decision: '终局判定——12 回合后声望领先',
  draw: '势均力敌——双方声望持平',
  concede: '对方认输',
};
