export interface AIProfile {
  id: string;
  name: string;
  anime: number[];      // 动画卡牌ID列表（可为空，表示使用随机卡组）
  character: number[];  // 角色卡牌ID列表（可为空，表示使用随机角色）
  description?: string;
}

// 基于真实数据生成的AI卡组配置
export const generatedAIProfiles: AIProfile[] = [
  {
    id: 'kehuanai',
    name: '科幻组合AI',
    anime: [316247, 278826, 140001, 27364, 9717, 326, 22759, 326895, 218707, 317613, 404804, 288, 135275, 420628, 11145, 386809, 126173, 271151, 127563, 28900, 208908, 247, 207573, 110048, 329906, 292970, 193378, 26449, 315, 2585],
    character: [35608, 14822, 14823, 10440],
    description: '基于艾米莉娅、折木奉太郎、千反田爱瑠、晓美焰构建的平衡卡组'
  },
  {
    id: 'zhandouai',
    name: '战斗组合AI',
    anime: [876, 51, 328609, 431767, 1671, 68812, 175596, 129807, 150490, 115932, 219200, 217300, 288, 148726, 11834, 9781, 140001, 251831, 138829, 88433, 770, 28900, 373267, 234, 82322, 214799, 273843, 265708, 152091, 315],
    character: [4, 87968, 130665, 708],
    description: '基于古河渚、后藤一里、安和昴、八九寺真宵构建的平衡卡组'
  },
  {
    id: 'zhiyuai',
    name: '治愈组合AI',
    anime: [328609, 265, 400602, 485, 1606, 10639, 285776, 326895, 326, 135275, 115932, 10380, 148726, 181354, 272510, 106818, 179949, 140001, 464376, 11577, 208908, 28900, 88287, 4019, 899, 9912, 509297, 193378, 315, 183878],
    character: [87973, 302, 86246, 48],
    description: '基于伊地知虹夏、碇真嗣、芙莉莲、凉宫春日构建的平衡卡组'
  }
];

// 随机AI档案 - 每次生成不同的卡组
const randomAI: AIProfile = {
  id: 'random-ai',
  name: '随机AI',
  anime: [], // 空数组表示使用随机生成
  character: [], // 空数组表示使用随机生成
  description: '每次对战都会生成不同的卡组和角色组合，提供全新的挑战体验',
};

const mergedProfiles: AIProfile[] = [...generatedAIProfiles, randomAI];

export function getAIProfileById(id: string): AIProfile | undefined {
  return mergedProfiles.find(p => p.id === id);
}

export function pickDefaultAIProfile(): AIProfile {
  return mergedProfiles[0];
}

export function listAIProfiles(): AIProfile[] {
  return mergedProfiles;
}


