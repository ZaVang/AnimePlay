export type Rarity = 'N' | 'R' | 'SR' | 'SSR' | 'HR' | 'UR';

// A generic Card interface that covers both Anime and Characters
export interface Card {
  id: number;
  name: string;
  rarity: Rarity;
  image_path: string;
  
  // Fields for Anime cards
  cost?: number;
  points?: number;
  synergy_tags?: string[];
  
  // Fields for Character cards
  anime_names?: string[];

  [key: string]: any; // Allow other properties
}
