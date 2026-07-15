export const TIER_ROW_IDS = ['S', 'A', 'B', 'C', 'D'] as const;

export type TierRowId = 'pool' | (typeof TIER_ROW_IDS)[number];

export interface TierBoard {
  pool: number[];
  S: number[];
  A: number[];
  B: number[];
  C: number[];
  D: number[];
}

const ALL_ROWS: readonly TierRowId[] = ['pool', ...TIER_ROW_IDS];

/**
 * 把一张卡从任意现有位置移动到目标行；候选卡也可直接导入目标行。
 * 返回新棋盘，避免拖拽与点击路径各自维护一套易漂移的数组操作。
 */
export function moveTierItem(board: TierBoard, id: number, target: TierRowId): TierBoard {
  const next = Object.fromEntries(
    ALL_ROWS.map(row => [row, board[row].filter(itemId => itemId !== id)]),
  ) as unknown as TierBoard;
  next[target] = [...next[target], id];
  return next;
}

/** 从待评区或任一档位彻底移除一张卡。 */
export function removeTierItem(board: TierBoard, id: number): TierBoard {
  return Object.fromEntries(
    ALL_ROWS.map(row => [row, board[row].filter(itemId => itemId !== id)]),
  ) as unknown as TierBoard;
}

/** 查找卡片当前所在行；不在棋盘时返回 null。 */
export function findTierItemRow(board: TierBoard, id: number): TierRowId | null {
  return ALL_ROWS.find(row => board[row].includes(id)) ?? null;
}
