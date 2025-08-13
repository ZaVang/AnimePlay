import { GAME_CONFIG } from '@/config/gameConfig';
export interface AIProfile {
  id: string;
  name: string;
  anime: number[];      // 动画卡牌ID列表（可为空，表示使用随机卡组）
  character: number[];  // 角色卡牌ID列表（可为空，表示使用随机角色）
  description?: string;
}

// 预置AI配置（示例）。后续可在此新增不同风格的AI及其卡组。
export const defaultAIProfiles: AIProfile[] = [
  {
    id: 'basic-ai',
    name: 'AI#001',
    anime: [],
    character: [],
    description: '使用随机卡组的基础AI',
  },
  {
    id: 'ai-002',
    name: 'AI#002',
    anime: [],
    character: [],
    description: '随机卡组的第二个预设',
  },
];

// 从 GAME_CONFIG.aiOpponent 迁移为一个 AI 档案（仅包含动画卡，角色留空表示随机）
const fromGameConfig: AIProfile = {
  id: 'config-ai',
  name: 'AI#000',
  anime: GAME_CONFIG.aiOpponent?.deck || [],
  character: [],
  description: '源自 GAME_CONFIG 的对手配置',
};

const mergedProfiles: AIProfile[] = [fromGameConfig, ...defaultAIProfiles];

export function getAIProfileById(id: string): AIProfile | undefined {
  return mergedProfiles.find(p => p.id === id);
}

export function pickDefaultAIProfile(): AIProfile {
  return mergedProfiles[0];
}

export function listAIProfiles(): AIProfile[] {
  return mergedProfiles;
}


