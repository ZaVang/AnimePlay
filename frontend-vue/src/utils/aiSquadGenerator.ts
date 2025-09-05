/**
 * AI小队生成器
 * 参考 generateAIDecks.js 的随机选择逻辑
 */

import { useGameDataStore } from '@/stores/gameDataStore';
import type { CharacterCard } from '@/types/card';
import type { BattleStats } from './battleCalculator';
import { calculateBattlePower } from './battleCalculator';
import { getRandomCharacterImage } from './imageUtils';

// 随机洗牌函数
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 根据战力等级生成属性
function generateStatsForTier(tier: 'weak' | 'balanced' | 'strong'): BattleStats {
  let baseMultiplier: number;
  let variance: number;

  switch (tier) {
    case 'weak':
      baseMultiplier = 0.8;
      variance = 0.1;
      break;
    case 'strong':
      baseMultiplier = 1.2;
      variance = 0.1;
      break;
    default: // balanced
      baseMultiplier = 1.0;
      variance = 0.2;
      break;
  }

  // 基础属性模板
  const baseStats = {
    hp: 100,
    atk: 60,
    def: 40,
    sp: 50,
    spd: 70
  };

  // 应用等级和随机变化
  return {
    hp: Math.floor(baseStats.hp * baseMultiplier * (1 + (Math.random() - 0.5) * variance)),
    atk: Math.floor(baseStats.atk * baseMultiplier * (1 + (Math.random() - 0.5) * variance)),
    def: Math.floor(baseStats.def * baseMultiplier * (1 + (Math.random() - 0.5) * variance)),
    sp: Math.floor(baseStats.sp * baseMultiplier * (1 + (Math.random() - 0.5) * variance)),
    spd: Math.floor(baseStats.spd * baseMultiplier * (1 + (Math.random() - 0.5) * variance))
  };
}

// AI角色名称生成器
function generateAICharacterName(index: number): string {
  const prefixes = [
    '神秘', '传说', '幻影', '暗影', '光明', '深渊', '天空', '雷霆', 
    '烈焰', '冰霜', '疾风', '大地', '星辰', '月影', '日耀', '虚空'
  ];
  
  const suffixes = [
    '战士', '法师', '守护者', '刺客', '弓手', '骑士', '术士', '圣者',
    '猎人', '游侠', '武者', '忍者', '剑客', '斗士', '巫师', '贤者'
  ];

  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  
  return `${prefix}${suffix}${index + 1}`;
}

// 生成AI角色
function generateAICharacter(index: number, tier: 'weak' | 'balanced' | 'strong'): CharacterCard {
  const battleStats = generateStatsForTier(tier);
  const name = generateAICharacterName(index);

  // 根据战力等级分配稀有度
  let rarity: 'N' | 'R' | 'SR' | 'SSR' | 'HR' | 'UR';
  if (tier === 'weak') {
    const rarities: ('N' | 'R' | 'SR')[] = ['N', 'R', 'SR'];
    rarity = rarities[Math.floor(Math.random() * rarities.length)];
  } else if (tier === 'strong') {
    const rarities: ('SR' | 'SSR' | 'HR' | 'UR')[] = ['SR', 'SSR', 'HR', 'UR'];
    rarity = rarities[Math.floor(Math.random() * rarities.length)];
  } else {
    const rarities: ('R' | 'SR' | 'SSR' | 'HR')[] = ['R', 'SR', 'SSR', 'HR'];
    rarity = rarities[Math.floor(Math.random() * rarities.length)];
  }

  return {
    id: -(1000 + index), // 负数ID表示AI角色
    name,
    image_path: getRandomCharacterImage(),
    rarity,
    battle_stats: battleStats,
    description: `AI生成的${tier === 'weak' ? '弱级' : tier === 'strong' ? '强级' : '平衡级'}对手`,
    synergy_tags: [],
    voice_actor: 'AI语音',
    anime_id: 0,
    activeSkillId: 'default_attack',
    passiveSkillId: 'default_passive'
  };
}

// 预设的小队主题
interface SquadTheme {
  name: string;
  description: string;
  tier: 'weak' | 'balanced' | 'strong';
  teamBonus?: string;
}

const SQUAD_THEMES: SquadTheme[] = [
  {
    name: '新手训练队',
    description: '专为初学者设计的训练对手',
    tier: 'weak'
  },
  {
    name: '均衡战术队',
    description: '攻防平衡的标准配置',
    tier: 'balanced'
  },
  {
    name: '精英突击队',
    description: '高战力的挑战性对手',
    tier: 'strong'
  },
  {
    name: '守护者联盟',
    description: '防御专精的坚固阵容',
    tier: 'balanced',
    teamBonus: '所有成员防御力+20%'
  },
  {
    name: '疾风小队',
    description: '速度优先的快攻队伍',
    tier: 'balanced',
    teamBonus: '所有成员速度+30%'
  },
  {
    name: '魔法师团',
    description: '技能伤害专精的法系队伍',
    tier: 'strong',
    teamBonus: '所有成员SP+25%'
  },
  {
    name: '狂战士团',
    description: '攻击力极高的暴力输出',
    tier: 'strong',
    teamBonus: '所有成员攻击力+35%'
  }
];

/**
 * 基于玩家队伍战力生成匹配的AI队伍
 * @param playerSquadPower 玩家队伍总战力
 * @param difficulty 难度调整 0.8-1.2
 */
export function generateMatchedAISquad(playerSquadPower: number, difficulty: number = 1.0): {
  name: string;
  description: string;
  members: CharacterCard[];
  teamBonus?: string;
} {
  // 根据玩家战力选择合适的主题
  let selectedTheme: SquadTheme;
  
  if (playerSquadPower < 500) {
    // 新手玩家，选择较弱的对手
    const weakThemes = SQUAD_THEMES.filter(t => t.tier === 'weak' || t.tier === 'balanced');
    selectedTheme = weakThemes[Math.floor(Math.random() * weakThemes.length)];
  } else if (playerSquadPower > 1200) {
    // 高级玩家，选择强力对手
    const strongThemes = SQUAD_THEMES.filter(t => t.tier === 'strong' || t.tier === 'balanced');
    selectedTheme = strongThemes[Math.floor(Math.random() * strongThemes.length)];
  } else {
    // 中等玩家，随机选择
    selectedTheme = SQUAD_THEMES[Math.floor(Math.random() * SQUAD_THEMES.length)];
  }

  // 生成4个AI角色
  const members: CharacterCard[] = [];
  for (let i = 0; i < 4; i++) {
    let character = generateAICharacter(i, selectedTheme.tier);
    
    // 应用团队加成
    if (selectedTheme.teamBonus && character.battle_stats) {
      const stats = { ...character.battle_stats };
      
      if (selectedTheme.teamBonus.includes('防御力')) {
        stats.def = Math.floor(stats.def * 1.2);
      }
      if (selectedTheme.teamBonus.includes('速度')) {
        stats.spd = Math.floor(stats.spd * 1.3);
      }
      if (selectedTheme.teamBonus.includes('SP')) {
        stats.sp = Math.floor(stats.sp * 1.25);
      }
      if (selectedTheme.teamBonus.includes('攻击力')) {
        stats.atk = Math.floor(stats.atk * 1.35);
      }
      
      character = { ...character, battle_stats: stats };
    }
    
    // 应用难度调整
    if (character.battle_stats && difficulty !== 1.0) {
      const adjustedStats = {
        hp: Math.floor(character.battle_stats.hp * difficulty),
        atk: Math.floor(character.battle_stats.atk * difficulty),
        def: Math.floor(character.battle_stats.def * difficulty),
        sp: Math.floor(character.battle_stats.sp * difficulty),
        spd: Math.floor(character.battle_stats.spd * difficulty)
      };
      character = { ...character, battle_stats: adjustedStats };
    }
    
    members.push(character);
  }

  return {
    name: selectedTheme.name,
    description: selectedTheme.description,
    members,
    teamBonus: selectedTheme.teamBonus
  };
}

/**
 * 生成基于真实角色的AI队伍
 * 从游戏数据中随机选择角色作为AI对手
 */
export function generateRealCharacterAISquad(): {
  name: string;
  description: string;
  members: CharacterCard[];
} {
  const gameDataStore = useGameDataStore();
  const allCharacters = gameDataStore.allCharacterCards;
  
  if (allCharacters.length < 4) {
    // 如果角色数据不足，回退到生成AI角色
    const generated = generateMatchedAISquad(800); // 使用平均战力
    return {
      name: '混合AI队伍',
      description: '由系统生成的对手队伍',
      members: generated.members
    };
  }

  // 随机选择4个不同的角色
  const shuffledCharacters = shuffleArray(allCharacters);
  const selectedCharacters = shuffledCharacters.slice(0, 4);

  // 生成队伍名称
  const teamNames = [
    '经典角色联盟',
    '热血番组小队',
    '传奇角色集结',
    '动画明星队伍',
    '跨界梦幻组合'
  ];

  return {
    name: teamNames[Math.floor(Math.random() * teamNames.length)],
    description: `由 ${selectedCharacters.map((c: CharacterCard) => c.name).join('、')} 组成的角色队伍`,
    members: selectedCharacters
  };
}

/**
 * 新的爬塔模式AI队伍生成
 * 使用真实anime角色，按5层循环配置稀有度，基于层数提升属性
 * @param floor 当前层数
 */
export function generateTowerFloorEnemies(floor: number): {
  name: string;
  description: string;
  members: CharacterCard[];
  floorPower: number;
  difficulty: string;
} {
  const gameDataStore = useGameDataStore();
  const allCharacters = gameDataStore.allCharacterCards;
  
  if (allCharacters.length < 10) {
    // 如果角色数据不足，回退到旧版AI生成
    return generateLegacyTowerEnemies(floor);
  }

  // 计算5层循环内的位置 (1-5)
  const cyclePosition = ((floor - 1) % 5) + 1;
  
  // 计算属性提升百分比：每完整5层循环增加5%
  const cycleCount = Math.floor((floor - 1) / 5);
  const attributeBonus = cycleCount * 0.05; // 5% per cycle
  
  // 根据层数内位置确定稀有度配置
  const rarityConfig = getTowerRarityConfig(cyclePosition);
  
  // 从对应稀有度中随机选择角色
  const selectedCharacters = selectCharactersForTower(allCharacters, rarityConfig);
  
  // 应用属性提升
  const enhancedCharacters = applyTowerAttributeBonus(selectedCharacters, attributeBonus);
  
  // 生成队伍信息
  const floorThemes = [
    '守卫者', '挑战者', '征服者', '毁灭者', '支配者',
    '审判者', '执行者', '终结者', '主宰者', '至尊者'
  ];
  
  const themeIndex = Math.floor((floor - 1) / 5) % floorThemes.length;
  const squadName = `第${floor}层 ${floorThemes[themeIndex]}小队`;
  
  // 计算难度等级
  let difficulty: string;
  if (cycleCount === 0) {
    difficulty = '简单';
  } else if (cycleCount <= 2) {
    difficulty = '中等';
  } else if (cycleCount <= 5) {
    difficulty = '困难';
  } else {
    difficulty = '极难';
  }
  
  // 计算总战力（使用与玩家相同的计算公式）
  const totalPower = enhancedCharacters.reduce((sum, member) => {
    if (member.battle_stats) {
      return sum + calculateBattlePower(member.battle_stats);
    }
    return sum;
  }, 0);
  
  return {
    name: squadName,
    description: `第${floor}层的真实角色队伍，属性提升：${Math.round(attributeBonus * 100)}%`,
    members: enhancedCharacters,
    floorPower: Math.floor(totalPower),
    difficulty
  };
}

/**
 * 获取塔层稀有度配置
 * 根据5层循环确定每个位置的稀有度
 * @param cyclePosition 循环内位置 (1-5)
 */
function getTowerRarityConfig(cyclePosition: number): ('UR' | 'HR' | 'SSR' | 'SR')[] {
  switch (cyclePosition) {
    case 1: return ['UR', 'HR', 'SSR', 'SR']; // 第1层：1 UR, 1 HR, 1 SSR, 1 SR
    case 2: return ['UR', 'HR', 'SSR', 'SSR']; // 第2层：1 UR, 1 HR, 2 SSR
    case 3: return ['UR', 'HR', 'HR', 'SSR']; // 第3层：1 UR, 2 HR, 1 SSR
    case 4: return ['UR', 'UR', 'HR', 'SSR']; // 第4层：2 UR, 1 HR, 1 SSR
    case 5: return ['UR', 'UR', 'UR', 'UR']; // 第5层：4 UR
    default: return ['UR', 'HR', 'SSR', 'SR'];
  }
}

/**
 * 从角色池中按稀有度配置选择角色
 * @param allCharacters 所有可用角色
 * @param rarityConfig 稀有度配置数组
 */
function selectCharactersForTower(allCharacters: CharacterCard[], rarityConfig: ('UR' | 'HR' | 'SSR' | 'SR')[]): CharacterCard[] {
  const selectedCharacters: CharacterCard[] = [];
  
  // 按稀有度分组角色
  const charactersByRarity: Record<string, CharacterCard[]> = {
    'UR': allCharacters.filter(c => c.rarity === 'UR'),
    'HR': allCharacters.filter(c => c.rarity === 'HR'),
    'SSR': allCharacters.filter(c => c.rarity === 'SSR'),
    'SR': allCharacters.filter(c => c.rarity === 'SR')
  };
  
  // 为每个位置选择角色
  const usedCharacterIds = new Set<number>();
  
  for (let i = 0; i < rarityConfig.length; i++) {
    const requiredRarity = rarityConfig[i];
    const availableChars = charactersByRarity[requiredRarity].filter(c => !usedCharacterIds.has(c.id));
    
    if (availableChars.length > 0) {
      // 随机选择一个角色
      const randomIndex = Math.floor(Math.random() * availableChars.length);
      const selectedChar = availableChars[randomIndex];
      selectedCharacters.push(selectedChar);
      usedCharacterIds.add(selectedChar.id);
    } else {
      // 如果该稀有度没有角色或都被用完，从其他稀有度中随机选择
      const allAvailable = allCharacters.filter(c => !usedCharacterIds.has(c.id));
      if (allAvailable.length > 0) {
        const randomIndex = Math.floor(Math.random() * allAvailable.length);
        const fallbackChar = allAvailable[randomIndex];
        selectedCharacters.push(fallbackChar);
        usedCharacterIds.add(fallbackChar.id);
      } else {
        // 最后的回退：随机选择任意角色（可能重复）
        const randomChar = allCharacters[Math.floor(Math.random() * allCharacters.length)];
        selectedCharacters.push({ ...randomChar, id: -(4000 + i) }); // 使用负ID避免重复
      }
    }
  }
  
  return selectedCharacters;
}

/**
 * 为角色应用塔层属性加成
 * @param characters 原始角色列表
 * @param bonusPercentage 加成百分比 (0.05 = 5%)
 */
function applyTowerAttributeBonus(characters: CharacterCard[], bonusPercentage: number): CharacterCard[] {
  if (bonusPercentage === 0) {
    return characters; // 没有加成直接返回
  }
  
  return characters.map(character => {
    if (!character.battle_stats) {
      return character; // 没有战斗属性直接返回
    }
    
    const originalStats = character.battle_stats;
    const enhancedStats = {
      hp: Math.floor(originalStats.hp * (1 + bonusPercentage)),
      atk: Math.floor(originalStats.atk * (1 + bonusPercentage)),
      def: Math.floor(originalStats.def * (1 + bonusPercentage)),
      sp: Math.floor(originalStats.sp * (1 + bonusPercentage)),
      spd: Math.floor(originalStats.spd * (1 + bonusPercentage))
    };
    
    return {
      ...character,
      battle_stats: enhancedStats,
      // 在描述中添加强化信息
      description: `${character.description || ''} [塔层强化 +${Math.round(bonusPercentage * 100)}%]`
    };
  });
}

/**
 * 回退到原版AI生成逻辑
 * 当角色数据不足时使用
 */
function generateLegacyTowerEnemies(floor: number): {
  name: string;
  description: string;
  members: CharacterCard[];
  floorPower: number;
  difficulty: string;
} {
  // 原版逻辑的简化版本
  const difficultyMultiplier = 1 + (floor - 1) * 0.1;
  
  let tier: 'weak' | 'balanced' | 'strong';
  let difficulty: string;
  
  if (floor <= 5) {
    tier = 'weak';
    difficulty = '简单';
  } else if (floor <= 15) {
    tier = 'balanced';
    difficulty = '中等';
  } else {
    tier = 'strong';
    difficulty = '困难';
  }
  
  const squadName = `第${floor}层 AI守护者`;
  
  const members: CharacterCard[] = [];
  for (let i = 0; i < 4; i++) {
    const character = generateTowerAICharacter(floor, i, tier, difficultyMultiplier);
    members.push(character);
  }
  
  const totalPower = members.reduce((sum, member) => {
    if (member.battle_stats) {
      return sum + calculateBattlePower(member.battle_stats);
    }
    return sum;
  }, 0);
  
  return {
    name: squadName,
    description: `第${floor}层的AI守护者队伍`,
    members,
    floorPower: Math.floor(totalPower),
    difficulty
  };
}

// 生成回退AI角色
function generateTowerAICharacter(floor: number, index: number, tier: 'weak' | 'balanced' | 'strong', multiplier: number): CharacterCard {
  const name = generateTowerCharacterName(floor, index);
  const battleStats = generateTowerStatsForFloor(floor, tier, multiplier);
  
  return {
    id: -(3000 + floor * 10 + index),
    name,
    image_path: getRandomCharacterImage(),
    rarity: 'SR' as const,
    battle_stats: battleStats,
    description: `第${floor}层的AI守护者`,
    synergy_tags: [`floor_${floor}`],
    voice_actor: 'AI语音',
    anime_id: 0,
    activeSkillId: 'default_attack',
    passiveSkillId: 'default_passive'
  };
}

// 生成爬塔角色名称
function generateTowerCharacterName(floor: number, index: number): string {
  const floorPrefixes = [
    '新手', '学徒', '战士', '精锐', '守护', 
    '征服', '霸主', '传说', '神话', '至尊'
  ];
  
  const suffixes = [
    '剑客', '法师', '守卫', '射手', '战士', 
    '圣骑', '刺客', '术士', '游侠', '斗士'
  ];
  
  const prefixIndex = Math.min(Math.floor((floor - 1) / 3), floorPrefixes.length - 1);
  const prefix = floorPrefixes[prefixIndex];
  const suffix = suffixes[index % suffixes.length];
  
  return `${prefix}${suffix}`;
}

// 根据层数生成属性
function generateTowerStatsForFloor(floor: number, tier: 'weak' | 'balanced' | 'strong', multiplier: number): BattleStats {
  // 基础属性随层数增长
  let baseMultiplier: number;
  let variance: number;

  switch (tier) {
    case 'weak':
      baseMultiplier = 0.8 + (floor - 1) * 0.05;
      variance = 0.1;
      break;
    case 'strong':
      baseMultiplier = 1.2 + (floor - 1) * 0.08;
      variance = 0.1;
      break;
    default: // balanced
      baseMultiplier = 1.0 + (floor - 1) * 0.06;
      variance = 0.2;
      break;
  }

  // 层数加成
  const floorBonus = Math.floor(floor / 5) * 0.2; // 每5层增加20%
  const finalMultiplier = (baseMultiplier + floorBonus) * multiplier;

  // 基础属性模板（随层数提升）
  const baseStats = {
    hp: 100 + floor * 10,
    atk: 60 + floor * 5,
    def: 40 + floor * 3,
    sp: 50 + floor * 4,
    spd: 70 + floor * 2
  };

  // 应用等级和随机变化
  return {
    hp: Math.floor(baseStats.hp * finalMultiplier * (1 + (Math.random() - 0.5) * variance)),
    atk: Math.floor(baseStats.atk * finalMultiplier * (1 + (Math.random() - 0.5) * variance)),
    def: Math.floor(baseStats.def * finalMultiplier * (1 + (Math.random() - 0.5) * variance)),
    sp: Math.floor(baseStats.sp * finalMultiplier * (1 + (Math.random() - 0.5) * variance)),
    spd: Math.floor(baseStats.spd * finalMultiplier * (1 + (Math.random() - 0.5) * variance))
  };
}

/**
 * 简单的AI队伍生成（固定属性）
 * 用于快速测试
 */
export function generateSimpleAISquad(name: string = '测试AI队'): {
  name: string;
  description: string;
  members: CharacterCard[];
} {
  const members: CharacterCard[] = [];
  
  for (let i = 0; i < 4; i++) {
    members.push({
      id: -(2000 + i),
      name: `AI${i + 1}号`,
      image_path: getRandomCharacterImage(),
      rarity: 'R' as const,
      battle_stats: {
        hp: 90 + Math.floor(Math.random() * 20),
        atk: 50 + Math.floor(Math.random() * 20),
        def: 35 + Math.floor(Math.random() * 15),
        sp: 40 + Math.floor(Math.random() * 20),
        spd: 60 + Math.floor(Math.random() * 20)
      },
      description: 'AI测试角色',
      synergy_tags: [],
      voice_actor: '',
      anime_id: 0,
      activeSkillId: 'default_attack',
      passiveSkillId: 'default_passive'
    });
  }

  return {
    name,
    description: '用于测试的AI队伍',
    members
  };
}