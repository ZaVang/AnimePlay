/**
 * Global Store Related Types
 * Extracted from monolithic userStore to break circular dependencies.
 */

export interface Deck {
  name: string;
  anime: number[];
  character: number[];
  cover: {
    id: number;
    type: 'anime' | 'character';
  } | null;
  createdAt: string;
  version: number;
}

export interface ViewingQueueSlot {
  animeId: number;
  startTime: number; // ISO timestamp
}

export interface LogEntry {
  message: string;
  type: 'info' | 'success' | 'warning' | 'gacha';
  timestamp: number;
}

export interface CharacterNurtureData {
  affection: number;
  intimacy: number;
  lastInteraction: string;
  totalInteractions: number;
  dialogueHistory: string[];
  gifts: string[];
  specialEvents: string[];
  level: number;
  experience: number;
  totalExperience: number;
  attributes: {
    charm: number;
    intelligence: number;
    strength: number;
    mood: number;
  };
  levelBonusAttributes: {
    charm: number;
    intelligence: number;
    strength: number;
  };
  battleEnhancements: {
    hp: number;
    atk: number;
    def: number;
    sp: number;
    spd: number;
  };
  preferences: {
    favoriteTopics: string[];
    dislikedTopics: string[];
    favoriteGifts: string[];
  };
}

export interface PresetSquad {
  id: number;
  name: string;
  members: (number | null)[];
  lastUsed?: string;
}

export interface TowerProgress {
  currentFloor: number;
  maxFloor: number;
  floorRewards: { [floor: number]: boolean };
  todayAttempts: number;
  lastAttemptDate: string;
}

export interface PityState {
  totalPulls: number;
  pullsSinceLastHR: number;
  pullsSinceLastUR: number;
}
