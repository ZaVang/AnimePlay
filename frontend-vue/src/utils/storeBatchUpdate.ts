/**
 * Store批量更新工具
 * 使用Pinia的$patch方法批量更新多个状态，减少响应式触发次数
 */

import { usePlayerStore, useGameStore, useHistoryStore } from '@/stores/battle';

export interface BatchPlayerUpdate {
  playerId: 'playerA' | 'playerB';
  reputation?: number;
  tp?: number;
  drawCards?: number;
}

export interface BatchGameUpdate {
  topicBias?: number;
  phase?: string;
  activePlayer?: 'playerA' | 'playerB';
}

/**
 * 批量更新玩家状态
 * 使用$patch减少响应式触发
 */
export function batchUpdatePlayers(updates: BatchPlayerUpdate[]): void {
  const playerStore = usePlayerStore();

  playerStore.$patch((state) => {
    for (const update of updates) {
      const player = state[update.playerId];

      if (update.reputation !== undefined) {
        player.reputation += update.reputation;
      }

      if (update.tp !== undefined) {
        player.tp = Math.min(Math.max(player.tp + update.tp, 0), player.maxTp);
      }

      if (update.drawCards !== undefined && update.drawCards > 0) {
        // 注意：抽牌需要单独处理，因为涉及牌库操作
        // 这里只是示例，实际应该使用 playerStore.drawCards()
      }
    }
  });
}

/**
 * 批量更新游戏状态
 */
export function batchUpdateGame(updates: BatchGameUpdate): void {
  const gameStore = useGameStore();

  gameStore.$patch((state) => {
    if (updates.topicBias !== undefined) {
      state.topicBias += updates.topicBias;
    }

    if (updates.phase) {
      state.phase = updates.phase;
    }

    if (updates.activePlayer) {
      state.activePlayer = updates.activePlayer;
    }
  });
}

/**
 * 批量添加历史日志
 */
export function batchAddLogs(logs: Array<{ message: string; type: string }>): void {
  const historyStore = useHistoryStore();

  // 日志添加通常需要时间戳和格式化，所以逐个调用
  // 但可以在单个nextTick中完成
  for (const log of logs) {
    historyStore.addLog(log.message, log.type as any);
  }
}

/**
 * 冲突结算的批量更新
 * 优化resolveClash中的多次store更新
 */
export function batchClashResolution(params: {
  attackerId: 'playerA' | 'playerB';
  defenderId?: 'playerA' | 'playerB';
  attackerReputationChange: number;
  defenderReputationChange: number;
  topicBiasChange: number;
  logs?: Array<{ message: string; type: string }>;
}): void {
  const {
    attackerId,
    defenderId,
    attackerReputationChange,
    defenderReputationChange,
    topicBiasChange,
    logs
  } = params;

  // 1. 批量更新玩家声望
  const playerUpdates: BatchPlayerUpdate[] = [
    { playerId: attackerId, reputation: attackerReputationChange }
  ];

  if (defenderId) {
    playerUpdates.push({
      playerId: defenderId,
      reputation: defenderReputationChange
    });
  }

  batchUpdatePlayers(playerUpdates);

  // 2. 更新游戏状态
  batchUpdateGame({ topicBias: topicBiasChange });

  // 3. 添加日志
  if (logs && logs.length > 0) {
    batchAddLogs(logs);
  }
}

/**
 * 回合结束的批量更新
 */
export function batchTurnEnd(params: {
  currentPlayer: 'playerA' | 'playerB';
  nextPlayer: 'playerA' | 'playerB';
  tpRecover: number;
  drawCount: number;
}): void {
  const playerStore = usePlayerStore();
  const gameStore = useGameStore();

  // 批量更新玩家状态
  playerStore.$patch((state) => {
    const player = state[params.currentPlayer];
    player.tp = Math.min(player.tp + params.tpRecover, player.maxTp);
  });

  // 抽牌（需要单独调用，因为涉及牌库操作）
  playerStore.drawCards(params.nextPlayer, params.drawCount);

  // 更新游戏阶段和活跃玩家
  gameStore.$patch((state) => {
    state.activePlayer = params.nextPlayer;
    state.phase = 'action';
  });
}

/**
 * 性能统计
 */
let batchUpdateStats = {
  totalBatchUpdates: 0,
  totalIndividualUpdates: 0,
  estimatedSavings: 0
};

/**
 * 记录批量更新（用于性能分析）
 */
export function trackBatchUpdate(individualCount: number): void {
  batchUpdateStats.totalBatchUpdates++;
  batchUpdateStats.totalIndividualUpdates += individualCount;
  // 假设批量更新比单独更新节省40%的响应式触发
  batchUpdateStats.estimatedSavings += Math.floor(individualCount * 0.4);
}

/**
 * 获取批量更新统计
 */
export function getBatchUpdateStats() {
  return {
    ...batchUpdateStats,
    avgBatchSize: batchUpdateStats.totalBatchUpdates > 0
      ? (batchUpdateStats.totalIndividualUpdates / batchUpdateStats.totalBatchUpdates).toFixed(2)
      : '0'
  };
}

/**
 * 重置统计
 */
export function resetBatchUpdateStats(): void {
  batchUpdateStats = {
    totalBatchUpdates: 0,
    totalIndividualUpdates: 0,
    estimatedSavings: 0
  };
}

// 开发环境下暴露到全局
if (import.meta.env.DEV) {
  (window as any).__batchUpdateDebug = {
    getStats: getBatchUpdateStats,
    resetStats: resetBatchUpdateStats
  };
}
