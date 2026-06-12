/**
 * 回合规则与胜负判定 —— 纯函数。
 * 回合推进的副作用（改 store、定时器、AI 调度）在 stores/battleFlow.ts，这里只有规则。
 */
import type { PlayerId } from '@/types/battle';

/** 第 12 回合结束后进入终局判定。 */
export const TURN_LIMIT = 12;
/** 开局双方各抽 5 张。 */
export const INITIAL_HAND_SIZE = 5;
/** 每回合开始时当前行动方抽 1 张。 */
export const TURN_START_DRAW = 1;
/** 初始声望。 */
export const INITIAL_REPUTATION = 30;
/** 议题偏向胜利阈值（±）。 */
export const TOPIC_BIAS_LIMIT = 10;

/** 最大 TP = 2 + (回合数 - 1)，双方同步，无上限（文档与 UI 曾误称 10 上限）。 */
export function maxTpForTurn(turn: number): number {
  return 2 + (turn - 1);
}

export type VictoryReason = 'reputation' | 'topic_bias' | 'final_decision' | 'draw' | 'concede';

export interface GameOutcome {
  winner: PlayerId | 'draw';
  reason: VictoryReason;
}

export interface VictorySnapshot {
  reputationA: number;
  reputationB: number;
  /** 玩家 A 视角：+10 A 胜，-10 B 胜。 */
  topicBias: number;
}

/**
 * 每次状态变化后的即时胜负检查。
 * 检查顺序与原实现一致：A 声望 → B 声望 → 议题偏向（双方同时归零时 B 胜）。
 */
export function checkVictory(s: VictorySnapshot): GameOutcome | null {
  if (s.reputationA <= 0) return { winner: 'playerB', reason: 'reputation' };
  if (s.reputationB <= 0) return { winner: 'playerA', reason: 'reputation' };
  if (s.topicBias >= TOPIC_BIAS_LIMIT) return { winner: 'playerA', reason: 'topic_bias' };
  if (s.topicBias <= -TOPIC_BIAS_LIMIT) return { winner: 'playerB', reason: 'topic_bias' };
  return null;
}

/** 12 回合打满后的终局判定：声望高者胜，相同为平局。 */
export function judgeFinal(reputationA: number, reputationB: number): GameOutcome {
  if (reputationA > reputationB) return { winner: 'playerA', reason: 'final_decision' };
  if (reputationB > reputationA) return { winner: 'playerB', reason: 'final_decision' };
  return { winner: 'draw', reason: 'draw' };
}

export function isTurnLimitReached(turn: number): boolean {
  return turn >= TURN_LIMIT;
}

/** 待轮换时的下一位主辩手索引（循环）。 */
export function nextRotationIndex(activeIndex: number, characterCount: number): number {
  return (activeIndex + 1) % characterCount;
}
