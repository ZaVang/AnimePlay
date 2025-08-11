import type { Card } from './card';

export interface PlayerState {
  id: 'playerA' | 'playerB';
  name: string;
  reputation: number; // 声望
  tp: number; // Talk Points
  maxTp: number;
  hand: Card[];
  deck: Card[];
  discardPile: Card[];
  characters: Card[]; // Characters are also Cards now
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
}
