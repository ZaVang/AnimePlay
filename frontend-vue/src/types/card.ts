import type { Skill } from './skill';

export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'HR' | 'UR';

// Base interface with common properties
export interface BaseCard {
  id: number;
  name: string;
  rarity: Rarity;
  image_path: string;
  description?: string;
  synergy_tags?: string[];
  [key: string]: any; // Allow other properties for now
}

// Interface for Anime cards with battle-specific fields
export interface AnimeCard extends BaseCard {
  cost: number; // TP cost to play the card
  effectDescription?: string; // Special effect text
}

// Interface for Character cards with their skills
export interface CharacterCard extends BaseCard {
  activeSkillId: string;   // ID for the character's active skill
  passiveSkillId: string;  // ID for the character's passive aura
  anime_names?: string[];
}

// A union type for any card, useful for generic components
export type Card = AnimeCard | CharacterCard;