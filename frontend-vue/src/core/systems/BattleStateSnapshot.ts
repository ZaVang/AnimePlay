/**
 * 战斗状态快照系统
 * 使用不可变数据结构优化频繁的状态变更，提升性能和支持撤销/重做
 */
import type { PlayerState } from '@/types';
import type { ClashInfo, GameState } from '@/types/battle';

// 战斗状态的快照接口
export interface BattleSnapshot {
  readonly id: string;
  readonly timestamp: number;
  readonly turn: number;
  readonly phase: GameState['phase'];
  readonly activePlayer: 'playerA' | 'playerB';
  readonly topicBias: number;
  readonly playerA: Readonly<PlayerState>;
  readonly playerB: Readonly<PlayerState>;
  readonly clashInfo?: Readonly<ClashInfo>;
  readonly isGameOver: boolean;
}

// 状态变更的类型
export type StateChange = 
  | { type: 'PHASE_CHANGE'; phase: BattleSnapshot['phase'] }
  | { type: 'PLAYER_SWITCH'; activePlayer: BattleSnapshot['activePlayer'] }
  | { type: 'TOPIC_BIAS_CHANGE'; bias: number }
  | { type: 'PLAYER_UPDATE'; playerId: 'playerA' | 'playerB'; updates: Partial<PlayerState> }
  | { type: 'CLASH_SET'; clashInfo: ClashInfo }
  | { type: 'CLASH_CLEAR' }
  | { type: 'TURN_ADVANCE' }
  | { type: 'GAME_END' };

// 状态快照配置
interface SnapshotConfig {
  maxSnapshots: number; // 最大保存的快照数量
  autoSnapshot: boolean; // 是否自动创建快照
  enableTimeBrunch: boolean; // 是否启用时间分支（用于撤销/重做）
}

export class BattleStateSnapshot {
  private snapshots: BattleSnapshot[] = [];
  private currentIndex = -1;
  private nextId = 0;
  
  private config: SnapshotConfig = {
    maxSnapshots: 50,
    autoSnapshot: true,
    enableTimeBrunch: true
  };

  /**
   * 创建当前状态的快照
   */
  createSnapshot(
    gameState: any,
    playerAState: PlayerState,
    playerBState: PlayerState
  ): BattleSnapshot {
    const snapshot: BattleSnapshot = {
      id: `snapshot_${this.nextId++}`,
      timestamp: Date.now(),
      turn: gameState.turn,
      phase: gameState.phase,
      activePlayer: gameState.activePlayer,
      topicBias: gameState.topicBias,
      // 先深拷贝再冻结，避免冻结 Pinia 实际状态对象
      playerA: this.freezeDeep(this.cloneDeep(playerAState)),
      playerB: this.freezeDeep(this.cloneDeep(playerBState)),
      clashInfo: gameState.clashInfo ? this.freezeDeep(this.cloneDeep(gameState.clashInfo)) : undefined,
      isGameOver: gameState.isGameOver
    };

    // 如果启用自动快照，则保存到历史记录
    if (this.config.autoSnapshot) {
      this.pushSnapshot(snapshot);
    }

    return snapshot;
  }

  /**
   * 深度冻结对象，创建不可变状态
   */
  private freezeDeep<T>(obj: T): Readonly<T> {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // 递归冻结所有属性
    Object.getOwnPropertyNames(obj).forEach(prop => {
      const val = (obj as any)[prop];
      if (val !== null && typeof val === 'object') {
        this.freezeDeep(val);
      }
    });

    return Object.freeze(obj);
  }

  /**
   * 对象深拷贝（仅用于快照）
   */
  private cloneDeep<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    if (Array.isArray(obj)) {
      return (obj.map(item => this.cloneDeep(item)) as unknown) as T;
    }
    const result: any = {};
    for (const key of Object.keys(obj as any)) {
      result[key] = this.cloneDeep((obj as any)[key]);
    }
    return result as T;
  }

  /**
   * 将快照推入历史记录
   */
  private pushSnapshot(snapshot: BattleSnapshot): void {
    // 如果当前不在最新位置，说明用户执行了撤销操作后又有了新操作
    // 删除当前位置之后的所有快照（时间分支处理）
    if (this.config.enableTimeBrunch && this.currentIndex < this.snapshots.length - 1) {
      this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
    }

    this.snapshots.push(snapshot);
    this.currentIndex = this.snapshots.length - 1;

    // 限制快照数量
    if (this.snapshots.length > this.config.maxSnapshots) {
      this.snapshots.shift();
      this.currentIndex--;
    }
  }

  /**
   * 应用状态变更并返回新的快照
   */
  applyChange(
    currentSnapshot: BattleSnapshot,
    change: StateChange
  ): BattleSnapshot {
    const newSnapshot: BattleSnapshot = {
      ...currentSnapshot,
      id: `snapshot_${this.nextId++}`,
      timestamp: Date.now()
    };

    switch (change.type) {
      case 'PHASE_CHANGE':
        return { ...newSnapshot, phase: change.phase };

      case 'PLAYER_SWITCH':
        return { ...newSnapshot, activePlayer: change.activePlayer };

      case 'TOPIC_BIAS_CHANGE':
        return { ...newSnapshot, topicBias: change.bias };

      case 'PLAYER_UPDATE':
        const updatedPlayer = {
          ...newSnapshot[change.playerId],
          ...change.updates
        };
        return {
          ...newSnapshot,
          [change.playerId]: this.freezeDeep(updatedPlayer)
        };

      case 'CLASH_SET':
        return {
          ...newSnapshot,
          clashInfo: this.freezeDeep(change.clashInfo)
        };

      case 'CLASH_CLEAR':
        return {
          ...newSnapshot,
          clashInfo: undefined
        };

      case 'TURN_ADVANCE':
        return {
          ...newSnapshot,
          turn: newSnapshot.turn + 1
        };

      case 'GAME_END':
        return {
          ...newSnapshot,
          phase: 'game_over',
          isGameOver: true
        };

      default:
        return newSnapshot;
    }
  }

  /**
   * 获取当前快照
   */
  getCurrentSnapshot(): BattleSnapshot | null {
    if (this.currentIndex >= 0 && this.currentIndex < this.snapshots.length) {
      return this.snapshots[this.currentIndex];
    }
    return null;
  }

  /**
   * 撤销到上一个快照
   */
  undo(): BattleSnapshot | null {
    if (this.canUndo()) {
      this.currentIndex--;
      return this.snapshots[this.currentIndex];
    }
    return null;
  }

  /**
   * 重做到下一个快照
   */
  redo(): BattleSnapshot | null {
    if (this.canRedo()) {
      this.currentIndex++;
      return this.snapshots[this.currentIndex];
    }
    return null;
  }

  /**
   * 检查是否可以撤销
   */
  canUndo(): boolean {
    return this.currentIndex > 0;
  }

  /**
   * 检查是否可以重做
   */
  canRedo(): boolean {
    return this.currentIndex < this.snapshots.length - 1;
  }

  /**
   * 比较两个快照的差异
   */
  getDifferences(
    snapshotA: BattleSnapshot,
    snapshotB: BattleSnapshot
  ): Array<{ path: string; oldValue: any; newValue: any }> {
    const differences: Array<{ path: string; oldValue: any; newValue: any }> = [];

    // 简单的差异检测实现
    const comparePaths = [
      'turn', 'phase', 'activePlayer', 'topicBias', 'isGameOver',
      'playerA.tp', 'playerA.reputation', 'playerA.hand.length',
      'playerB.tp', 'playerB.reputation', 'playerB.hand.length'
    ];

    for (const path of comparePaths) {
      const oldValue = this.getNestedValue(snapshotA, path);
      const newValue = this.getNestedValue(snapshotB, path);

      if (oldValue !== newValue) {
        differences.push({ path, oldValue, newValue });
      }
    }

    return differences;
  }

  /**
   * 获取嵌套对象的值
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  }

  /**
   * 清理所有快照
   */
  clearAll(): void {
    this.snapshots = [];
    this.currentIndex = -1;
    this.nextId = 0;
  }

  /**
   * 获取状态统计信息
   */
  getStats() {
    return {
      totalSnapshots: this.snapshots.length,
      currentIndex: this.currentIndex,
      canUndo: this.canUndo(),
      canRedo: this.canRedo(),
      memoryUsage: this.calculateMemoryUsage(),
      config: this.config
    };
  }

  /**
   * 估算内存使用量（简化版）
   */
  private calculateMemoryUsage(): string {
    const jsonSize = JSON.stringify(this.snapshots).length;
    const kb = (jsonSize / 1024).toFixed(2);
    return `${kb} KB`;
  }

  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<SnapshotConfig>): void {
    this.config = { ...this.config, ...newConfig };

    // 如果减少了最大快照数量，清理旧快照
    if (this.snapshots.length > this.config.maxSnapshots) {
      const removeCount = this.snapshots.length - this.config.maxSnapshots;
      this.snapshots.splice(0, removeCount);
      this.currentIndex = Math.max(0, this.currentIndex - removeCount);
    }
  }

  /**
   * 创建检查点（重要状态的快照）
   */
  createCheckpoint(
    gameState: any,
    playerAState: PlayerState,
    playerBState: PlayerState,
    label: string
  ): string {
    const snapshot = this.createSnapshot(gameState, playerAState, playerBState);
    const checkpointId = `checkpoint_${label}_${Date.now()}`;
    
    // 可以为检查点添加特殊标记
    (snapshot as any).isCheckpoint = true;
    (snapshot as any).checkpointLabel = label;
    
    this.pushSnapshot(snapshot);
    
    console.log(`[BattleStateSnapshot] 创建检查点: ${label}`);
    return checkpointId;
  }
}

// 导出单例实例
export const battleStateSnapshot = new BattleStateSnapshot();