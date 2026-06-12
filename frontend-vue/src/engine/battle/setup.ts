/**
 * 开局构筑规则：技能注入与卡组装配 —— 纯函数。
 * 卡牌/技能数据通过 lookup 函数与参数传入，engine 不直接依赖数据层。
 */
import type { AnimeCard, CharacterCard, Skill } from '@/types';
import type { Rarity } from '@/types/card';
import type { RNG } from '../rng';

/** 标准卡组 30 张动画卡。 */
export const DECK_SIZE = 30;
/** 每方 4 名角色。 */
export const CHARACTER_SLOTS = 4;

/** 角色无绑定技能时按稀有度兜底的模板技能。 */
export const DEFAULT_ACTIVE_BY_RARITY: Partial<Record<Rarity, string>> = {
  N: 'TPL_DRAW_1',
  R: 'TPL_GAIN_TP_2',
  SR: 'TPL_DRAW_1',
};
export const DEFAULT_PASSIVE_BY_RARITY: Partial<Record<Rarity, string>> = {
  N: 'AURA_GENRE_EXPERT',
  R: 'AURA_GENRE_EXPERT',
  SR: 'AURA_GENRE_EXPERT',
};

/**
 * 解析角色应携带的技能 ID。
 * 优先级：数据层字段（activeSkillId/passiveSkillId）→ 传入的遗留映射表 → 稀有度兜底模板。
 */
export function resolveCharacterSkillIds(
  character: CharacterCard,
  legacyMap: Record<number, string[]> = {},
): string[] {
  const preferred: string[] = [];
  if (character.activeSkillId) preferred.push(character.activeSkillId);
  if (character.passiveSkillId) preferred.push(character.passiveSkillId);
  if (preferred.length > 0) return preferred;

  const legacy = legacyMap[character.id] || [];
  if (legacy.length > 0) return legacy;

  const activeDefault = DEFAULT_ACTIVE_BY_RARITY[character.rarity];
  const passiveDefault = DEFAULT_PASSIVE_BY_RARITY[character.rarity];
  return [activeDefault, passiveDefault].filter((s): s is string => !!s);
}

/** 把解析出的技能实例注入角色（返回新对象）。 */
export function injectSkills(
  character: CharacterCard,
  getSkillById: (id: string) => Skill | undefined,
  legacyMap?: Record<number, string[]>,
): CharacterCard {
  const skills = resolveCharacterSkillIds(character, legacyMap)
    .map(getSkillById)
    .filter((s): s is Skill => s !== undefined);
  return { ...character, skills };
}

/** 按 ID 列表装配卡组，查不到的 ID 静默跳过（数据缺失容错）。 */
export function buildCardsFromIds<T>(ids: readonly number[], lookup: (id: number) => T | undefined): T[] {
  return ids.map(lookup).filter((c): c is T => c !== undefined);
}

/** 从全卡池随机抽取 count 张（Fisher-Yates，随机源注入）。 */
export function pickRandom<T>(pool: readonly T[], count: number, rng: RNG): T[] {
  return rng.shuffle(pool).slice(0, count);
}

export function randomAnimeDeck(allAnime: readonly AnimeCard[], rng: RNG, size = DECK_SIZE): AnimeCard[] {
  return pickRandom(allAnime, size, rng);
}

export function randomCharacterPicks(
  allCharacters: readonly CharacterCard[],
  rng: RNG,
  count = CHARACTER_SLOTS,
): CharacterCard[] {
  return pickRandom(allCharacters, count, rng);
}
