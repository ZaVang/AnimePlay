import type { CharacterCard, Rarity } from '@/types/card';

export const SQUAD_MEMBER_COUNT = 5 as const;
/**
 * 可进入挑战塔小队 / 拥有小队战技能包的稀有度（单一真相源）。
 * SSR 立绘齐备后于 2026-07 起加入（此前 HR/UR 专属）。`isTowerSquadRarity` 与
 * `data/squadSkillKits.isSquadRarity` 都必须走这里，别再各自硬编码——两者若漂移会出现
 * 「有技能包却准入不过」或「准入过却无技能包」的错位。
 */
export const TOWER_SQUAD_ALLOWED_RARITIES = ['SSR', 'HR', 'UR'] as const satisfies readonly Rarity[];

export type TowerSquadAllowedRarity = typeof TOWER_SQUAD_ALLOWED_RARITIES[number];
export type TowerSquadSlotIssue = 'empty' | 'missing' | 'unowned' | 'rarity' | 'skillKit' | 'duplicate';

export interface TowerSquadSlotValidation {
  slot: number;
  characterId: number | null;
  character: CharacterCard | null;
  ok: boolean;
  issue?: TowerSquadSlotIssue;
  message?: string;
}

export interface TowerSquadValidation {
  ok: boolean;
  slots: TowerSquadSlotValidation[];
  characters: CharacterCard[];
  message?: string;
}

export function isTowerSquadRarity(rarity: Rarity | null | undefined): rarity is TowerSquadAllowedRarity {
  return rarity != null && (TOWER_SQUAD_ALLOWED_RARITIES as readonly Rarity[]).includes(rarity);
}

function issueMessage(issue: TowerSquadSlotIssue, slot: number, character?: CharacterCard | null): string {
  const label = `位置 ${slot + 1}`;
  switch (issue) {
    case 'empty':
      return `${label} 为空，挑战塔需要 5 人满编小队。`;
    case 'missing':
      return `${label} 的角色不存在，请重新编队。`;
    case 'unowned':
      return `${label} 的角色尚未拥有，不能加入挑战塔小队。`;
    case 'rarity':
      return `${label} 的 ${character?.name ?? '角色'} 是 ${character?.rarity ?? '未知'}，挑战塔只允许 ${TOWER_SQUAD_ALLOWED_RARITIES.join('/')}。`;
    case 'skillKit':
      return `${label} 的 ${character?.name ?? '角色'} 小队战技能待设计，暂不能进入挑战塔。`;
    case 'duplicate':
      return `${label} 与其他位置重复，请换一名角色。`;
  }
}

export function validateTowerSquadMembers(input: {
  members: readonly (number | null)[];
  getCharacter: (id: number) => CharacterCard | null | undefined;
  isOwned: (id: number) => boolean;
  hasCompleteSkillKit?: (character: CharacterCard) => boolean;
}): TowerSquadValidation {
  const seen = new Set<number>();
  const slots: TowerSquadSlotValidation[] = [];

  for (let slot = 0; slot < SQUAD_MEMBER_COUNT; slot++) {
    const characterId = input.members[slot] ?? null;
    if (characterId === null) {
      slots.push({ slot, characterId, character: null, ok: false, issue: 'empty', message: issueMessage('empty', slot) });
      continue;
    }

    if (seen.has(characterId)) {
      slots.push({ slot, characterId, character: null, ok: false, issue: 'duplicate', message: issueMessage('duplicate', slot) });
      continue;
    }
    seen.add(characterId);

    const character = input.getCharacter(characterId) ?? null;
    if (!character) {
      slots.push({ slot, characterId, character: null, ok: false, issue: 'missing', message: issueMessage('missing', slot) });
      continue;
    }
    if (!input.isOwned(characterId)) {
      slots.push({ slot, characterId, character, ok: false, issue: 'unowned', message: issueMessage('unowned', slot, character) });
      continue;
    }
    if (!isTowerSquadRarity(character.rarity)) {
      slots.push({ slot, characterId, character, ok: false, issue: 'rarity', message: issueMessage('rarity', slot, character) });
      continue;
    }
    if (input.hasCompleteSkillKit && !input.hasCompleteSkillKit(character)) {
      slots.push({ slot, characterId, character, ok: false, issue: 'skillKit', message: issueMessage('skillKit', slot, character) });
      continue;
    }

    slots.push({ slot, characterId, character, ok: true });
  }

  const firstIssue = slots.find(slot => !slot.ok);
  return {
    ok: !firstIssue,
    slots,
    characters: firstIssue ? [] : slots.map(slot => slot.character as CharacterCard),
    message: firstIssue?.message,
  };
}
