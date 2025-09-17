/**
 * 战斗调试日志系统类型定义
 */

import type { AnimeCard, CharacterCard } from './card';

// 轻量级卡牌引用（用于日志记录）
export interface CardReference {
  id: number;
  name: string;
  type: 'anime' | 'character';
  rarity?: string;
  synergy_tags?: string[];
  cost?: number;
  strength?: number;
}

// 轻量级角色卡牌引用
export interface CharacterReference {
  id: number;
  name: string;
  rarity: string;
  skillCount: number;
}

// 玩家状态快照
export interface PlayerSnapshot {
  id: 'playerA' | 'playerB';
  name: string;
  reputation: number;
  tp: number;
  hand: CardReference[]; // 轻量级卡牌引用
  handCount: number; // 对手手牌只记录数量
  characters: CharacterReference[]; // 轻量级角色引用
  activeSkills: Array<{
    skillId: string;
    skillName: string;
    cooldown: number;
  }>;
  passiveEffects: Array<{
    effectId: string;
    description: string;
    duration: number;
    data: any;
  }>;
  temporaryBonuses: Array<{
    type: 'strength' | 'cost';
    cardType?: string;
    amount: number;
    duration: number;
    description: string;
  }>;
}

// 游戏状态快照
export interface GameSnapshot {
  turn: number;
  phase: 'setup' | 'action' | 'defense' | 'resolution' | 'cleanup' | 'game_over';
  activePlayer: 'playerA' | 'playerB';
  topicBias: number;
  clashInfo?: {
    attackerId: 'playerA' | 'playerB';
    attackingCard: CardReference;
    attackStyle: '友好安利' | '辛辣点评';
    defenderId?: 'playerA' | 'playerB';
    defendingCard?: CardReference;
    defenseStyle?: '赞同' | '反驳';
  };
  timestamp: number;
}

// 卡牌强度计算详情
export interface StrengthCalculation {
  cardId: number;
  cardName: string;
  baseStrength: number;
  strengthBonuses: Array<{
    source: string; // 技能名或效果名
    amount: number;
    reason: string;
  }>;
  finalStrength: number;
}

// 卡牌费用计算详情
export interface CostCalculation {
  cardId: number;
  cardName: string;
  baseCost: number;
  costReductions: Array<{
    source: string;
    amount: number;
    reason: string;
  }>;
  finalCost: number;
}

// 操作类型
export type ActionType =
  | 'turn_start'
  | 'turn_end'
  | 'play_card'
  | 'skill_activation'
  | 'clash_initiate'
  | 'clash_respond'
  | 'clash_resolve'
  | 'effect_apply'
  | 'effect_expire'
  | 'phase_change'
  | 'game_over';

// 详细操作记录
export interface ActionRecord {
  id: string;
  timestamp: number;
  turn: number;
  actionType: ActionType;
  playerId: 'playerA' | 'playerB';
  description: string;
  details: {
    // 卡牌相关
    card?: CardReference;
    targetCard?: CardReference;
    style?: '友好安利' | '辛辣点评' | '赞同' | '反驳';

    // 计算详情
    strengthCalculation?: StrengthCalculation;
    costCalculation?: CostCalculation;

    // 状态变化
    reputationChange?: number;
    tpChange?: number;
    topicBiasChange?: number;

    // 技能效果
    skillId?: string;
    skillName?: string;
    effectDescription?: string;
    effectDuration?: number;

    // 其他数据
    [key: string]: any;
  };

  // 操作前后的状态快照
  beforeState: {
    playerA: PlayerSnapshot;
    playerB: PlayerSnapshot;
    game: GameSnapshot;
  };
  afterState: {
    playerA: PlayerSnapshot;
    playerB: PlayerSnapshot;
    game: GameSnapshot;
  };
}

// 战斗会话日志
export interface BattleSessionLog {
  sessionId: string;
  startTime: number;
  endTime?: number;
  initialState: {
    playerA: PlayerSnapshot;
    playerB: PlayerSnapshot;
    game: GameSnapshot;
  };
  actions: ActionRecord[];
  finalState?: {
    playerA: PlayerSnapshot;
    playerB: PlayerSnapshot;
    game: GameSnapshot;
  };
  winner?: 'playerA' | 'playerB' | 'draw';
  winCondition?: string;
  metadata: {
    version: string;
    debugMode: boolean;
    aiDifficulty?: string;
    deckNames: {
      playerA: string;
      playerB: string;
    };
  };
}

// 调试配置
export interface DebugConfig {
  enabled: boolean;
  logLevel: 'minimal' | 'normal' | 'verbose';
  trackCalculations: boolean;
  trackEffects: boolean;
  trackStateChanges: boolean;
  autoExport: boolean;
  maxActionsPerSession: number;
}