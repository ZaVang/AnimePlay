/**
 * 战斗调试日志系统
 * 用于记录完整的战斗过程，包括状态变化和操作详情
 */

import { useGameStore, usePlayerStore } from '@/stores/battle';
import { systemRegistry } from '@/core/di/registry';
import type {
  BattleSessionLog,
  ActionRecord,
  PlayerSnapshot,
  GameSnapshot,
  ActionType,
  StrengthCalculation,
  CostCalculation,
  DebugConfig,
  CardReference,
  CharacterReference
} from '@/types/debug';
import type { AnimeCard } from '@/types/card';

export class BattleDebugLogger {
  private static instance: BattleDebugLogger | null = null;

  /**
   * 将完整卡牌转换为轻量级引用
   */
  private static toCardReference(card: AnimeCard): CardReference {
    return {
      id: card.id,
      name: card.name,
      type: 'anime',
      rarity: card.rarity,
      synergy_tags: card.synergy_tags,
      cost: card.cost,
      strength: card.strength
    };
  }

  /**
   * 将角色卡牌转换为轻量级引用
   */
  private static toCharacterReference(character: any): CharacterReference {
    return {
      id: character.id,
      name: character.name,
      rarity: character.rarity || 'N',
      skillCount: character.skills ? character.skills.length : 0
    };
  }
  private sessionLog: BattleSessionLog | null = null;
  private config: DebugConfig = {
    enabled: false,
    logLevel: 'normal',
    trackCalculations: true,
    trackEffects: true,
    trackStateChanges: true,
    autoExport: false,
    maxActionsPerSession: 1000
  };

  private constructor() {}

  static getInstance(): BattleDebugLogger {
    if (!BattleDebugLogger.instance) {
      BattleDebugLogger.instance = new BattleDebugLogger();
    }
    return BattleDebugLogger.instance;
  }

  /**
   * 配置调试日志
   */
  configure(config: Partial<DebugConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * 开始新的战斗会话日志
   */
  startSession(playerADeckName: string, playerBDeckName: string, aiDifficulty?: string): string {
    const sessionId = `battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 总是创建会话，但只在启用时显示日志

    this.sessionLog = {
      sessionId,
      startTime: Date.now(),
      initialState: {
        playerA: this.capturePlayerSnapshot('playerA'),
        playerB: this.capturePlayerSnapshot('playerB'),
        game: this.captureGameSnapshot()
      },
      actions: [],
      metadata: {
        version: '1.0.0',
        debugMode: true,
        aiDifficulty,
        deckNames: {
          playerA: playerADeckName,
          playerB: playerBDeckName
        }
      }
    };

    if (this.config.enabled) {
      console.log('🐛 Battle debug session started:', sessionId);
    }
    return sessionId;
  }

  /**
   * 记录操作
   */
  logAction(
    actionType: ActionType,
    playerId: 'playerA' | 'playerB',
    description: string,
    details: any = {}
  ): void {
    // 只要有会话就记录，不管调试模式是否启用
    if (!this.sessionLog) return;

    // 防止日志过大
    if (this.sessionLog.actions.length >= this.config.maxActionsPerSession) {
      console.warn('Debug log reached maximum actions limit');
      return;
    }

    const gameStore = useGameStore();

    // 捕获操作前状态
    const beforeState = {
      playerA: this.capturePlayerSnapshot('playerA'),
      playerB: this.capturePlayerSnapshot('playerB'),
      game: this.captureGameSnapshot()
    };

    // 等待下一个tick后捕获操作后状态
    setTimeout(() => {
      const afterState = {
        playerA: this.capturePlayerSnapshot('playerA'),
        playerB: this.capturePlayerSnapshot('playerB'),
        game: this.captureGameSnapshot()
      };

      const actionRecord: ActionRecord = {
        id: `action_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        timestamp: Date.now(),
        turn: gameStore.turn,
        actionType,
        playerId,
        description,
        details,
        beforeState,
        afterState
      };

      this.sessionLog!.actions.push(actionRecord);

      // 只有启用调试模式时才显示详细日志
      if (this.config.enabled && this.config.logLevel === 'verbose') {
        console.log('🐛 Action logged:', actionRecord);
      }
    }, 0);
  }

  /**
   * 记录卡牌出牌操作（包含详细计算）
   */
  logCardPlay(
    playerId: 'playerA' | 'playerB',
    card: AnimeCard,
    style: '友好安利' | '辛辣点评' | '赞同' | '反驳',
    strengthCalc?: StrengthCalculation,
    costCalc?: CostCalculation
  ): void {
    this.logAction('play_card', playerId, `打出卡牌: ${card.name} (${style})`, {
      card: BattleDebugLogger.toCardReference(card),
      style,
      strengthCalculation: strengthCalc,
      costCalculation: costCalc
    });
  }

  /**
   * 记录冲突解算
   */
  logClashResolve(
    attackerId: 'playerA' | 'playerB',
    defenderId: 'playerA' | 'playerB',
    attackingCard: AnimeCard,
    defendingCard: AnimeCard | null,
    attackStrength: number,
    defenseStrength: number,
    result: {
      winner: 'playerA' | 'playerB' | 'draw';
      reputationChange: { playerA: number; playerB: number };
      topicBiasChange: number;
    }
  ): void {
    this.logAction('clash_resolve', attackerId, '冲突解算完成', {
      attackingCard: BattleDebugLogger.toCardReference(attackingCard),
      defendingCard: defendingCard ? BattleDebugLogger.toCardReference(defendingCard) : undefined,
      attackStrength,
      defenseStrength,
      result,
      reputationChange: result.reputationChange.playerA !== 0 ? result.reputationChange.playerA : result.reputationChange.playerB,
      topicBiasChange: result.topicBiasChange
    });
  }

  /**
   * 记录技能激活
   */
  logSkillActivation(
    playerId: 'playerA' | 'playerB',
    skillId: string,
    skillName: string,
    effectDescription: string,
    duration?: number
  ): void {
    this.logAction('skill_activation', playerId, `技能激活: ${skillName}`, {
      skillId,
      skillName,
      effectDescription,
      effectDuration: duration
    });
  }

  /**
   * 记录状态变化
   */
  logStateChange(
    playerId: 'playerA' | 'playerB',
    changeType: 'reputation' | 'tp' | 'topic_bias',
    amount: number,
    reason: string
  ): void {
    if (!this.config.trackStateChanges) return;

    this.logAction('effect_apply', playerId, `状态变化: ${changeType} ${amount > 0 ? '+' : ''}${amount}`, {
      changeType,
      amount,
      reason
    });
  }

  /**
   * 结束会话
   */
  endSession(winner?: 'playerA' | 'playerB' | 'draw', winCondition?: string): void {
    if (!this.sessionLog) return;

    this.sessionLog.endTime = Date.now();
    this.sessionLog.finalState = {
      playerA: this.capturePlayerSnapshot('playerA'),
      playerB: this.capturePlayerSnapshot('playerB'),
      game: this.captureGameSnapshot()
    };
    this.sessionLog.winner = winner;
    this.sessionLog.winCondition = winCondition;

    console.log('🐛 Battle debug session ended:', this.sessionLog.sessionId);

    if (this.config.autoExport) {
      this.exportSession();
    }
  }

  /**
   * 导出当前会话日志到文件
   */
  exportSession(): void {
    if (!this.sessionLog) {
      console.warn('No active session to export');
      return;
    }

    const logData = JSON.stringify(this.sessionLog, null, 2);
    const blob = new Blob([logData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `battle_log_${this.sessionLog.sessionId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    console.log('🐛 Battle log exported:', link.download);
  }

  /**
   * 获取当前会话摘要
   */
  getSessionSummary(): string | null {
    if (!this.sessionLog) return null;

    const duration = this.sessionLog.endTime ?
      (this.sessionLog.endTime - this.sessionLog.startTime) / 1000 :
      (Date.now() - this.sessionLog.startTime) / 1000;

    return `会话 ${this.sessionLog.sessionId}
时长: ${duration.toFixed(1)}秒
操作数: ${this.sessionLog.actions.length}
当前回合: ${this.sessionLog.finalState?.game.turn || '进行中'}
状态: ${this.sessionLog.winner ? `${this.sessionLog.winner} 获胜` : '进行中'}`;
  }

  /**
   * 捕获玩家状态快照
   */
  private capturePlayerSnapshot(playerId: 'playerA' | 'playerB'): PlayerSnapshot {
    const playerStore = usePlayerStore();
    const player = playerStore[playerId];

    // 获取被动效果
    let passiveEffects: any[] = [];
    let temporaryBonuses: any[] = [];

    try {
      const persistentSystem = systemRegistry.getPersistentEffectSystem();
      passiveEffects = persistentSystem.getActiveEffects(playerId).map(effect => ({
        effectId: effect.type,
        description: effect.description,
        duration: effect.duration,
        data: effect.data
      }));

      temporaryBonuses = persistentSystem.getActiveBonuses(playerId).map(bonus => ({
        type: bonus.bonusType,
        cardType: bonus.cardType,
        amount: bonus.amount,
        duration: bonus.duration,
        description: bonus.description
      }));
    } catch (error) {
      console.warn('Error capturing effects for debug log:', error);
    }

    return {
      id: playerId,
      name: player.name,
      reputation: player.reputation,
      tp: player.tp,
      hand: playerId === 'playerA' ? player.hand.map(card => BattleDebugLogger.toCardReference(card)) : [], // 只记录己方手牌详情
      handCount: player.hand.length,
      characters: player.characters.map(char => BattleDebugLogger.toCharacterReference(char)),
      activeSkills: player.characters.flatMap(char =>
        char.skills?.filter(skill => skill.type === '主动技能').map(skill => ({
          skillId: skill.effectId,
          skillName: skill.name,
          cooldown: skill.cooldown || 0
        })) || []
      ),
      passiveEffects,
      temporaryBonuses
    };
  }

  /**
   * 捕获游戏状态快照
   */
  private captureGameSnapshot(): GameSnapshot {
    const gameStore = useGameStore();

    return {
      turn: gameStore.turn,
      phase: gameStore.phase,
      activePlayer: gameStore.activePlayer,
      topicBias: gameStore.topicBias,
      clashInfo: gameStore.clashInfo ? {
        attackerId: gameStore.clashInfo.attackerId,
        attackingCard: BattleDebugLogger.toCardReference(gameStore.clashInfo.attackingCard),
        attackStyle: gameStore.clashInfo.attackStyle,
        defenderId: gameStore.clashInfo.defenderId,
        defendingCard: gameStore.clashInfo.defendingCard ? BattleDebugLogger.toCardReference(gameStore.clashInfo.defendingCard) : undefined,
        defenseStyle: gameStore.clashInfo.defenseStyle
      } : undefined,
      timestamp: Date.now()
    };
  }

  /**
   * 获取当前配置
   */
  getConfig(): DebugConfig {
    return { ...this.config };
  }

  /**
   * 获取当前会话
   */
  getCurrentSession(): BattleSessionLog | null {
    return this.sessionLog;
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    if (this.sessionLog && !this.sessionLog.endTime) {
      this.endSession();
    }
    this.sessionLog = null;
  }
}

// 导出单例实例
export const battleDebugLogger = BattleDebugLogger.getInstance();