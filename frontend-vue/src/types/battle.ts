import type { AnimeCard, CharacterCard } from './card';

export interface PlayerState {
  id: 'playerA' | 'playerB';
  name: string;
  reputation: number; // 声望
  tp: number; // Talk Points
  maxTp: number;
  hand: AnimeCard[];
  deck: AnimeCard[];
  discardPile: AnimeCard[];
  characters: CharacterCard[];
  activeCharacterIndex: number;
  skillCooldowns: Record<string, number>; // Key: skillId, Value: rounds remaining
  needsRotation: boolean;
}

export type GamePhase = 
  | 'setup'
  | 'draw'
  | 'action'
  | 'defense'
  | 'end_turn'
  | 'game_over';

export interface GameState {
  turn: number;
  activePlayer: 'playerA' | 'playerB';
  phase: GamePhase;
  topicBias: number; // 议题偏向: -10 to +10
  winner: 'playerA' | 'playerB' | 'draw' | null;
}

// --- NEWLY ADDED & DEFINED TYPES ---

export interface ClashInfo {
  attackerId: 'playerA' | 'playerB';
  attackingCard: AnimeCard;
  attackStyle: '友好安利' | '辛辣点评';
  defenderId?: 'playerA' | 'playerB';
  defendingCard?: AnimeCard;
  defenseStyle?: '赞同' | '反驳';
  // Optional fields for after the clash is resolved
  attackerStrength?: number;
  defenderStrength?: number;
}

export type BattleLogType = 'event' | 'clash' | 'damage' | 'info';

export interface BattleLogMessage {
  id: number;
  turn: number;
  message: string;
  type: BattleLogType;
}

export interface Notification {
  id: number;
  message: string;
  type: 'info' | 'warning';
}