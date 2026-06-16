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
  effects?: Array<{
    trigger: 'onPlay' | 'beforeResolve' | 'afterResolve';
    effectId: string;
    params?: Record<string, any>;
  }>;
  // Bangumi 真实元数据（后端已送达；E2-T2 展示用，缺失时不显示对应行）
  date?: string;          // 放送日期，如 "2025-04-01"（取年份用 slice(0,4)）
  rating_score?: number;  // Bangumi 真实评分（浮点，如 8.7）
  rating_rank?: number;   // 排名（整数）
  rating_total?: number;  // 参与评分人数
}

// Interface for Character cards with their skills
export interface CharacterCard extends BaseCard {
  activeSkillId: string;   // ID for the character's active skill
  passiveSkillId: string;  // ID for the character's passive aura
  anime_names?: string[];
  skills?: Skill[]; // 对战开局由 injectSkills 注入的技能实例
  // Bangumi 真实元数据（E2-T2 展示用，缺失时不显示对应行）
  anime_count?: number;             // 登场作品数
  popularity_score?: number;        // 人气分
  comprehensive_popularity?: number; // 综合人气
  gender?: string;                  // 性别
  birthday?: string;                // 生日
}

// A union type for any card, useful for generic components
export type Card = AnimeCard | CharacterCard;