/**
 * 挑战塔与 AI 小队生成规则 —— 纯函数（随机源注入）。
 * 原 utils/aiSquadGenerator：角色数据与头像池由调用方传入；
 * 零引用的 generateRealCharacterAISquad / generateSimpleAISquad 未随迁（死代码淘汰）。
 */
import type { CharacterCard } from '@/types/card';
import type { RNG } from '../rng';
import { calculateBattlePower, type BattleStats } from './combat';
import { SQUAD_MEMBER_COUNT, type TowerSquadAllowedRarity } from './eligibility';

export type SquadTier = 'weak' | 'balanced' | 'strong';

export interface GeneratedSquad {
  name: string;
  description: string;
  members: CharacterCard[];
  teamBonus?: string;
}

export interface TowerFloorSquad {
  name: string;
  description: string;
  members: CharacterCard[];
  floorPower: number;
  difficulty: string;
}

// ---------------------------------------------------------------------------
// AI 角色生成
// ---------------------------------------------------------------------------

const AI_NAME_PREFIXES = [
  '神秘', '传说', '幻影', '暗影', '光明', '深渊', '天空', '雷霆',
  '烈焰', '冰霜', '疾风', '大地', '星辰', '月影', '日耀', '虚空',
];
const AI_NAME_SUFFIXES = [
  '战士', '法师', '守护者', '刺客', '弓手', '骑士', '术士', '圣者',
  '猎人', '游侠', '武者', '忍者', '剑客', '斗士', '巫师', '贤者',
];

/** 按战力档生成属性（基础模板 × 档位系数 × 随机浮动）。 */
export function generateStatsForTier(tier: SquadTier, rng: RNG): BattleStats {
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

  const baseStats = { hp: 100, atk: 60, def: 40, sp: 50, spd: 70 };
  const roll = (base: number) => Math.floor(base * baseMultiplier * (1 + (rng.next() - 0.5) * variance));

  return { hp: roll(baseStats.hp), atk: roll(baseStats.atk), def: roll(baseStats.def), sp: roll(baseStats.sp), spd: roll(baseStats.spd) };
}

function generateAICharacterName(index: number, rng: RNG): string {
  const prefix = AI_NAME_PREFIXES[Math.floor(rng.next() * AI_NAME_PREFIXES.length)];
  const suffix = AI_NAME_SUFFIXES[Math.floor(rng.next() * AI_NAME_SUFFIXES.length)];
  return `${prefix}${suffix}${index + 1}`;
}

function generateAICharacter(index: number, tier: SquadTier, rng: RNG, imagePool: readonly string[]): CharacterCard {
  const battleStats = generateStatsForTier(tier, rng);
  const name = generateAICharacterName(index, rng);

  let rarity: 'N' | 'R' | 'SR' | 'SSR' | 'HR' | 'UR';
  if (tier === 'weak') {
    const rarities: ('N' | 'R' | 'SR')[] = ['N', 'R', 'SR'];
    rarity = rarities[Math.floor(rng.next() * rarities.length)];
  } else if (tier === 'strong') {
    const rarities: ('SR' | 'SSR' | 'HR' | 'UR')[] = ['SR', 'SSR', 'HR', 'UR'];
    rarity = rarities[Math.floor(rng.next() * rarities.length)];
  } else {
    const rarities: ('R' | 'SR' | 'SSR' | 'HR')[] = ['R', 'SR', 'SSR', 'HR'];
    rarity = rarities[Math.floor(rng.next() * rarities.length)];
  }

  return {
    id: -(1000 + index), // 负数 ID 表示 AI 生成角色
    name,
    image_path: imagePool.length > 0 ? imagePool[Math.floor(rng.next() * imagePool.length)] : '',
    rarity,
    battle_stats: battleStats,
    description: `AI生成的${tier === 'weak' ? '弱级' : tier === 'strong' ? '强级' : '平衡级'}对手`,
    synergy_tags: [],
    voice_actor: 'AI语音',
    anime_id: 0,
    activeSkillId: 'default_attack',
    passiveSkillId: 'default_passive',
  };
}

// ---------------------------------------------------------------------------
// 战力匹配小队
// ---------------------------------------------------------------------------

interface SquadTheme {
  name: string;
  description: string;
  tier: SquadTier;
  teamBonus?: string;
}

export const SQUAD_THEMES: readonly SquadTheme[] = [
  { name: '新手训练队', description: '专为初学者设计的训练对手', tier: 'weak' },
  { name: '均衡战术队', description: '攻防平衡的标准配置', tier: 'balanced' },
  { name: '精英突击队', description: '高战力的挑战性对手', tier: 'strong' },
  { name: '守护者联盟', description: '防御专精的坚固阵容', tier: 'balanced', teamBonus: '所有成员防御力+20%' },
  { name: '疾风小队', description: '速度优先的快攻队伍', tier: 'balanced', teamBonus: '所有成员速度+30%' },
  { name: '魔法师团', description: '技能伤害专精的法系队伍', tier: 'strong', teamBonus: '所有成员SP+25%' },
  { name: '狂战士团', description: '攻击力极高的暴力输出', tier: 'strong', teamBonus: '所有成员攻击力+35%' },
];

/** 战力 <500 选弱/平衡主题，>1200 选强/平衡主题，其间全随机。 */
export function generateMatchedAISquad(
  playerSquadPower: number,
  rng: RNG,
  imagePool: readonly string[],
  difficulty: number = 1.0,
): GeneratedSquad {
  let selectedTheme: SquadTheme;
  if (playerSquadPower < 500) {
    const weakThemes = SQUAD_THEMES.filter(t => t.tier === 'weak' || t.tier === 'balanced');
    selectedTheme = weakThemes[Math.floor(rng.next() * weakThemes.length)];
  } else if (playerSquadPower > 1200) {
    const strongThemes = SQUAD_THEMES.filter(t => t.tier === 'strong' || t.tier === 'balanced');
    selectedTheme = strongThemes[Math.floor(rng.next() * strongThemes.length)];
  } else {
    selectedTheme = SQUAD_THEMES[Math.floor(rng.next() * SQUAD_THEMES.length)];
  }

  const members: CharacterCard[] = [];
  for (let i = 0; i < SQUAD_MEMBER_COUNT; i++) {
    let character = generateAICharacter(i, selectedTheme.tier, rng, imagePool);

    if (selectedTheme.teamBonus && character.battle_stats) {
      const stats = { ...character.battle_stats };
      if (selectedTheme.teamBonus.includes('防御力')) stats.def = Math.floor(stats.def * 1.2);
      if (selectedTheme.teamBonus.includes('速度')) stats.spd = Math.floor(stats.spd * 1.3);
      if (selectedTheme.teamBonus.includes('SP')) stats.sp = Math.floor(stats.sp * 1.25);
      if (selectedTheme.teamBonus.includes('攻击力')) stats.atk = Math.floor(stats.atk * 1.35);
      character = { ...character, battle_stats: stats };
    }

    if (character.battle_stats && difficulty !== 1.0) {
      const s = character.battle_stats as BattleStats;
      character = {
        ...character,
        battle_stats: {
          hp: Math.floor(s.hp * difficulty),
          atk: Math.floor(s.atk * difficulty),
          def: Math.floor(s.def * difficulty),
          sp: Math.floor(s.sp * difficulty),
          spd: Math.floor(s.spd * difficulty),
        },
      };
    }

    members.push(character);
  }

  return {
    name: selectedTheme.name,
    description: selectedTheme.description,
    members,
    teamBonus: selectedTheme.teamBonus,
  };
}

// ---------------------------------------------------------------------------
// 挑战塔
// ---------------------------------------------------------------------------

/** 5 层循环的 HR/UR 阵容表（第 5 层 = 5 UR 守关）。 */
export function getTowerRarityConfig(cyclePosition: number): TowerSquadAllowedRarity[] {
  switch (cyclePosition) {
    case 1: return ['HR', 'HR', 'HR', 'HR', 'HR'];
    case 2: return ['UR', 'HR', 'HR', 'HR', 'HR'];
    case 3: return ['UR', 'UR', 'HR', 'HR', 'HR'];
    case 4: return ['UR', 'UR', 'UR', 'HR', 'HR'];
    case 5: return ['UR', 'UR', 'UR', 'UR', 'UR'];
    default: return ['HR', 'HR', 'HR', 'HR', 'HR'];
  }
}

/** 每完整通过 5 层，之后楼层敌人全属性 +5%。 */
export function towerAttributeBonus(floor: number): number {
  return Math.floor((floor - 1) / 5) * 0.05;
}

/** 按稀有度配置从真实角色池选人（不重复；不足时跨稀有度兜底）。 */
export function selectCharactersForTower(
  allCharacters: readonly CharacterCard[],
  rarityConfig: readonly TowerSquadAllowedRarity[],
  rng: RNG,
): CharacterCard[] {
  const selectedCharacters: CharacterCard[] = [];
  const charactersByRarity: Record<TowerSquadAllowedRarity, CharacterCard[]> = {
    UR: allCharacters.filter(c => c.rarity === 'UR'),
    HR: allCharacters.filter(c => c.rarity === 'HR'),
  };

  const usedCharacterIds = new Set<number>();

  for (let i = 0; i < rarityConfig.length; i++) {
    const requiredRarity = rarityConfig[i];
    const availableChars = charactersByRarity[requiredRarity].filter(c => !usedCharacterIds.has(c.id));

    if (availableChars.length > 0) {
      const selectedChar = availableChars[Math.floor(rng.next() * availableChars.length)];
      selectedCharacters.push(selectedChar);
      usedCharacterIds.add(selectedChar.id);
    } else {
      const allAvailable = allCharacters.filter(c =>
        (c.rarity === 'HR' || c.rarity === 'UR') && !usedCharacterIds.has(c.id),
      );
      if (allAvailable.length > 0) {
        const fallbackChar = allAvailable[Math.floor(rng.next() * allAvailable.length)];
        selectedCharacters.push(fallbackChar);
        usedCharacterIds.add(fallbackChar.id);
      } else {
        // 角色全部用尽：允许重复但换负 ID
        const reusable = allCharacters.filter(c => c.rarity === 'HR' || c.rarity === 'UR');
        const source = reusable.length > 0 ? reusable : allCharacters;
        if (source.length > 0) {
          const randomChar = source[Math.floor(rng.next() * source.length)];
          selectedCharacters.push({ ...randomChar, id: -(4000 + i) });
        }
      }
    }
  }

  return selectedCharacters;
}

/** 塔层属性强化（在描述中追加强化标记）。 */
export function applyTowerAttributeBonus(characters: readonly CharacterCard[], bonusPercentage: number): CharacterCard[] {
  if (bonusPercentage === 0) return [...characters];

  return characters.map(character => {
    if (!character.battle_stats) return character;
    const s = character.battle_stats as BattleStats;
    return {
      ...character,
      battle_stats: {
        hp: Math.floor(s.hp * (1 + bonusPercentage)),
        atk: Math.floor(s.atk * (1 + bonusPercentage)),
        def: Math.floor(s.def * (1 + bonusPercentage)),
        sp: Math.floor(s.sp * (1 + bonusPercentage)),
        spd: Math.floor(s.spd * (1 + bonusPercentage)),
      },
      description: `${character.description || ''} [塔层强化 +${Math.round(bonusPercentage * 100)}%]`,
    };
  });
}

const FLOOR_THEMES = [
  '守卫者', '挑战者', '征服者', '毁灭者', '支配者',
  '审判者', '执行者', '终结者', '主宰者', '至尊者',
];

/**
 * 爬塔敌人生成：真实 HR/UR 角色 + 5 层循环阵容 + 每循环 5% 强化。
 * HR/UR 数据不足 5 人时回退到纯 AI 生成。
 */
export function generateTowerFloorEnemies(
  allCharacters: readonly CharacterCard[],
  floor: number,
  rng: RNG,
  imagePool: readonly string[],
): TowerFloorSquad {
  const eligibleCharacters = allCharacters.filter(c => c.rarity === 'HR' || c.rarity === 'UR');
  if (eligibleCharacters.length < SQUAD_MEMBER_COUNT) {
    return generateLegacyTowerEnemies(floor, rng, imagePool);
  }

  const cyclePosition = ((floor - 1) % 5) + 1;
  const cycleCount = Math.floor((floor - 1) / 5);
  const attributeBonus = towerAttributeBonus(floor);

  const rarityConfig = getTowerRarityConfig(cyclePosition);
  const selectedCharacters = selectCharactersForTower(eligibleCharacters, rarityConfig, rng);
  const enhancedCharacters = applyTowerAttributeBonus(selectedCharacters, attributeBonus);

  const themeIndex = Math.floor((floor - 1) / 5) % FLOOR_THEMES.length;
  const squadName = `第${floor}层 ${FLOOR_THEMES[themeIndex]}小队`;

  let difficulty: string;
  if (cycleCount === 0) difficulty = '简单';
  else if (cycleCount <= 2) difficulty = '中等';
  else if (cycleCount <= 5) difficulty = '困难';
  else difficulty = '极难';

  const totalPower = enhancedCharacters.reduce((sum, member) => {
    return member.battle_stats ? sum + calculateBattlePower(member.battle_stats as BattleStats) : sum;
  }, 0);

  return {
    name: squadName,
    description: `第${floor}层的真实角色队伍，属性提升：${Math.round(attributeBonus * 100)}%`,
    members: enhancedCharacters,
    floorPower: Math.floor(totalPower),
    difficulty,
  };
}

// ---------------------------------------------------------------------------
// 角色数据不足时的回退生成
// ---------------------------------------------------------------------------

function generateLegacyTowerEnemies(floor: number, rng: RNG, imagePool: readonly string[]): TowerFloorSquad {
  const difficultyMultiplier = 1 + (floor - 1) * 0.1;

  let tier: SquadTier;
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

  const members: CharacterCard[] = [];
  for (let i = 0; i < SQUAD_MEMBER_COUNT; i++) {
    members.push(generateTowerAICharacter(floor, i, tier, difficultyMultiplier, rng, imagePool));
  }

  const totalPower = members.reduce((sum, member) => {
    return member.battle_stats ? sum + calculateBattlePower(member.battle_stats as BattleStats) : sum;
  }, 0);

  return {
    name: `第${floor}层 AI守护者`,
    description: `第${floor}层的AI守护者队伍`,
    members,
    floorPower: Math.floor(totalPower),
    difficulty,
  };
}

function generateTowerAICharacter(
  floor: number,
  index: number,
  tier: SquadTier,
  multiplier: number,
  rng: RNG,
  imagePool: readonly string[],
): CharacterCard {
  const name = generateTowerCharacterName(floor, index);
  const battleStats = generateTowerStatsForFloor(floor, tier, multiplier, rng);

  return {
    id: -(3000 + floor * 10 + index),
    name,
    image_path: imagePool.length > 0 ? imagePool[Math.floor(rng.next() * imagePool.length)] : '',
    rarity: 'HR' as const,
    battle_stats: battleStats,
    description: `第${floor}层的AI守护者`,
    synergy_tags: [`floor_${floor}`],
    voice_actor: 'AI语音',
    anime_id: 0,
    activeSkillId: 'default_attack',
    passiveSkillId: 'default_passive',
  };
}

function generateTowerCharacterName(floor: number, index: number): string {
  const floorPrefixes = ['新手', '学徒', '战士', '精锐', '守护', '征服', '霸主', '传说', '神话', '至尊'];
  const suffixes = ['剑客', '法师', '守卫', '射手', '战士', '圣骑', '刺客', '术士', '游侠', '斗士'];
  const prefixIndex = Math.min(Math.floor((floor - 1) / 3), floorPrefixes.length - 1);
  return `${floorPrefixes[prefixIndex]}${suffixes[index % suffixes.length]}`;
}

function generateTowerStatsForFloor(floor: number, tier: SquadTier, multiplier: number, rng: RNG): BattleStats {
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
    default:
      baseMultiplier = 1.0 + (floor - 1) * 0.06;
      variance = 0.2;
      break;
  }

  const floorBonus = Math.floor(floor / 5) * 0.2; // 每 5 层 +20%
  const finalMultiplier = (baseMultiplier + floorBonus) * multiplier;

  const baseStats = {
    hp: 100 + floor * 10,
    atk: 60 + floor * 5,
    def: 40 + floor * 3,
    sp: 50 + floor * 4,
    spd: 70 + floor * 2,
  };
  const roll = (base: number) => Math.floor(base * finalMultiplier * (1 + (rng.next() - 0.5) * variance));

  return { hp: roll(baseStats.hp), atk: roll(baseStats.atk), def: roll(baseStats.def), sp: roll(baseStats.sp), spd: roll(baseStats.spd) };
}
