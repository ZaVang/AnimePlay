/**
 * 战斗回放系统
 * 独立的回放管理器，不影响实际游戏状态
 */

import type {
  BattleSessionLog,
  ActionRecord,
  PlayerSnapshot,
  GameSnapshot
} from '@/types/debug';

export interface ReplayState {
  currentActionIndex: number;
  isPlaying: boolean;
  playbackSpeed: number; // 播放速度倍数 (0.5x, 1x, 2x, etc.)
  playerA: PlayerSnapshot;
  playerB: PlayerSnapshot;
  game: GameSnapshot;
}

export interface ReplayControls {
  play: () => void;
  pause: () => void;
  stop: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToAction: (index: number) => void;
  setSpeed: (speed: number) => void;
}

export class BattleReplayManager {
  private sessionLog: BattleSessionLog | null = null;
  private replayState: ReplayState | null = null;
  private playbackTimer: number | null = null;
  private onStateChange: ((state: ReplayState) => void) | null = null;

  /**
   * 加载战斗日志进行回放
   */
  loadSession(sessionLog: BattleSessionLog): void {
    this.sessionLog = sessionLog;
    this.replayState = {
      currentActionIndex: -1, // -1 表示初始状态
      isPlaying: false,
      playbackSpeed: 1.0,
      playerA: { ...sessionLog.initialState.playerA },
      playerB: { ...sessionLog.initialState.playerB },
      game: { ...sessionLog.initialState.game }
    };
    this.notifyStateChange();
  }

  /**
   * 获取当前回放状态
   */
  getCurrentState(): ReplayState | null {
    return this.replayState;
  }

  /**
   * 设置状态变化回调
   */
  setOnStateChange(callback: (state: ReplayState) => void): void {
    this.onStateChange = callback;
  }

  /**
   * 获取回放控制接口
   */
  getControls(): ReplayControls {
    return {
      play: () => this.play(),
      pause: () => this.pause(),
      stop: () => this.stop(),
      stepForward: () => this.stepForward(),
      stepBackward: () => this.stepBackward(),
      jumpToAction: (index: number) => this.jumpToAction(index),
      setSpeed: (speed: number) => this.setSpeed(speed)
    };
  }

  /**
   * 开始播放
   */
  private play(): void {
    if (!this.replayState || !this.sessionLog) return;

    this.replayState.isPlaying = true;
    this.notifyStateChange();
    this.scheduleNextAction();
  }

  /**
   * 暂停播放
   */
  private pause(): void {
    if (!this.replayState) return;

    this.replayState.isPlaying = false;
    this.clearPlaybackTimer();
    this.notifyStateChange();
  }

  /**
   * 停止播放并重置到初始状态
   */
  private stop(): void {
    if (!this.replayState || !this.sessionLog) return;

    this.pause();
    this.replayState.currentActionIndex = -1;
    this.replayState.playerA = { ...this.sessionLog.initialState.playerA };
    this.replayState.playerB = { ...this.sessionLog.initialState.playerB };
    this.replayState.game = { ...this.sessionLog.initialState.game };
    this.notifyStateChange();
  }

  /**
   * 前进一步
   */
  private stepForward(): void {
    if (!this.replayState || !this.sessionLog) return;

    const nextIndex = this.replayState.currentActionIndex + 1;
    if (nextIndex < this.sessionLog.actions.length) {
      this.jumpToAction(nextIndex);
    }
  }

  /**
   * 后退一步
   */
  private stepBackward(): void {
    if (!this.replayState) return;

    const prevIndex = this.replayState.currentActionIndex - 1;
    this.jumpToAction(prevIndex);
  }

  /**
   * 跳转到指定动作
   */
  private jumpToAction(index: number): void {
    if (!this.replayState || !this.sessionLog) return;

    // 限制索引范围：-1 到 actions.length - 1
    const clampedIndex = Math.max(-1, Math.min(index, this.sessionLog.actions.length - 1));

    this.replayState.currentActionIndex = clampedIndex;

    if (clampedIndex === -1) {
      // 回到初始状态
      this.replayState.playerA = { ...this.sessionLog.initialState.playerA };
      this.replayState.playerB = { ...this.sessionLog.initialState.playerB };
      this.replayState.game = { ...this.sessionLog.initialState.game };
    } else {
      // 应用动作后的状态
      const action = this.sessionLog.actions[clampedIndex];
      this.replayState.playerA = { ...action.afterState.playerA };
      this.replayState.playerB = { ...action.afterState.playerB };
      this.replayState.game = { ...action.afterState.game };
    }

    this.notifyStateChange();
  }

  /**
   * 设置播放速度
   */
  private setSpeed(speed: number): void {
    if (!this.replayState) return;

    this.replayState.playbackSpeed = Math.max(0.1, Math.min(5.0, speed));
    this.notifyStateChange();

    // 如果正在播放，重新安排下一个动作
    if (this.replayState.isPlaying) {
      this.clearPlaybackTimer();
      this.scheduleNextAction();
    }
  }

  /**
   * 安排下一个动作
   */
  private scheduleNextAction(): void {
    if (!this.replayState || !this.sessionLog || !this.replayState.isPlaying) return;

    const nextIndex = this.replayState.currentActionIndex + 1;
    if (nextIndex >= this.sessionLog.actions.length) {
      // 播放完毕
      this.pause();
      return;
    }

    const baseDelay = 1500; // 基础延迟 1.5 秒
    const delay = baseDelay / this.replayState.playbackSpeed;

    this.playbackTimer = window.setTimeout(() => {
      this.stepForward();
      if (this.replayState?.isPlaying) {
        this.scheduleNextAction();
      }
    }, delay);
  }

  /**
   * 清除播放定时器
   */
  private clearPlaybackTimer(): void {
    if (this.playbackTimer !== null) {
      window.clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
  }

  /**
   * 通知状态变化
   */
  private notifyStateChange(): void {
    if (this.onStateChange && this.replayState) {
      this.onStateChange({ ...this.replayState });
    }
  }

  /**
   * 获取当前动作信息
   */
  getCurrentAction(): ActionRecord | null {
    if (!this.replayState || !this.sessionLog || this.replayState.currentActionIndex === -1) {
      return null;
    }

    return this.sessionLog.actions[this.replayState.currentActionIndex] || null;
  }

  /**
   * 获取回放进度（0-100）
   */
  getProgress(): number {
    if (!this.replayState || !this.sessionLog) return 0;

    if (this.sessionLog.actions.length === 0) return 100;

    return ((this.replayState.currentActionIndex + 1) / this.sessionLog.actions.length) * 100;
  }

  /**
   * 获取会话摘要信息
   */
  getSessionInfo(): {
    sessionId: string;
    duration: number;
    actionCount: number;
    winner?: string;
  } | null {
    if (!this.sessionLog) return null;

    const duration = this.sessionLog.endTime ?
      (this.sessionLog.endTime - this.sessionLog.startTime) / 1000 : 0;

    return {
      sessionId: this.sessionLog.sessionId,
      duration,
      actionCount: this.sessionLog.actions.length,
      winner: this.sessionLog.winner
    };
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    this.clearPlaybackTimer();
    this.sessionLog = null;
    this.replayState = null;
    this.onStateChange = null;
  }
}