import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { CharacterCard, Rarity } from '@/types/card';
import type { BattleStats } from '@/engine/squad/combat';
import type { CompleteSquadSkillKit, SquadSkillDef, SquadUnitSetup } from '@/engine/squad/types';
import { createSequenceRng } from '@/engine/rng';
import { createTimedBattleState } from '@/engine/squad/timedBattle';
import { executeSkill } from '@/engine/squad/effects';
import {
  ALLOWED_SQUAD_EFFECT_TYPES,
  SQUAD_SKILL_REQUIRED_SLOTS,
  describeSquadSkill,
  getSquadSkillKitForCharacter,
  isSquadSkillKitReady,
  validateSquadSkillCoverage,
  validateSquadSkillKit,
} from './squadSkillKits';

const rawPath = fileURLToPath(new URL('../../../data/character/all_cards.json', import.meta.url));
const allCharacters = JSON.parse(readFileSync(rawPath, 'utf8')) as CharacterCard[];

const baseStats: BattleStats = { hp: 1000, atk: 160, def: 90, sp: 150, spd: 120 };

function unit(id: string, side: 'player' | 'enemy', over: Partial<SquadUnitSetup> = {}): SquadUnitSetup {
  return {
    id,
    name: id,
    side,
    position: side === 'player' ? 'front' : 'front',
    stats: baseStats,
    ...over,
  };
}

function makeState(kit: CompleteSquadSkillKit) {
  return createTimedBattleState({
    rng: createSequenceRng([0.5, 0.99, 0.25, 0.75]),
    units: [
      unit('actor', 'player', { skills: kit, currentHp: 850 }),
      unit('ally-low', 'player', { position: 'middle', currentHp: 150 }),
      unit('ally-down', 'player', { position: 'back', currentHp: 0 }),
      unit('enemy-front', 'enemy', { stats: { ...baseStats, hp: 1200, atk: 180 } }),
      unit('enemy-back', 'enemy', { position: 'back', stats: { ...baseStats, hp: 1200, atk: 120 } }),
    ],
  });
}

describe('D3 squad skill kits', () => {
  it('covers every real HR/UR character with a complete executable kit and excludes lower rarities', () => {
    const coverage = validateSquadSkillCoverage(allCharacters);
    expect(coverage.ok, coverage.issues.join('\n')).toBe(true);

    const highRarity = allCharacters.filter(c => c.rarity === 'HR' || c.rarity === 'UR');
    expect(highRarity.length).toBeGreaterThan(0);
    expect(highRarity.every(isSquadSkillKitReady)).toBe(true);

    const lowRarity = allCharacters.filter(c => !(['HR', 'UR'] as Rarity[]).includes(c.rarity));
    expect(lowRarity.some(c => getSquadSkillKitForCharacter(c))).toBe(false);
  });

  it('uses only the D3 allowed effect catalog and provides descriptions from real effects', () => {
    const allowed = new Set<string>(ALLOWED_SQUAD_EFFECT_TYPES);
    for (const character of allCharacters.filter(c => c.rarity === 'HR' || c.rarity === 'UR')) {
      const kit = getSquadSkillKitForCharacter(character)!;
      const slots = SQUAD_SKILL_REQUIRED_SLOTS.map(slot => kit[slot]);
      expect(validateSquadSkillKit(kit).ok).toBe(true);
      for (const skill of slots) {
        expect(skill.description).toBe(describeSquadSkill(skill));
        expect(skill.name).not.toMatch(/模板|占位|default|TPL/i);
        expect(skill.effects.length).toBeGreaterThan(0);
        for (const effect of skill.effects) {
          expect(allowed.has(effect.type)).toBe(true);
        }
      }
    }
  });

  it('executes every slot, including passive, through the timed battle runtime', () => {
    for (const character of allCharacters.filter(c => c.rarity === 'HR' || c.rarity === 'UR')) {
      const kit = getSquadSkillKitForCharacter(character)!;
      const state = makeState(kit);
      const actor = state.units.find(u => u.id === 'actor')!;

      const beforeEventCount = state.events.length;
      expect(state.events).toContainEqual(expect.objectContaining({ type: 'passiveActivated', actorId: 'actor' }));
      expect(state.events.length).toBeGreaterThan(beforeEventCount - 1);

      for (const slot of SQUAD_SKILL_REQUIRED_SLOTS) {
        const skill = kit[slot] as SquadSkillDef;
        expect(executeSkill(state, actor, skill), `${character.id} ${character.name} ${slot}`).toBe(true);
      }
    }
  });

  it('reports incomplete kits and illegal effects instead of letting them pass eligibility', () => {
    const badKit = {
      normalAttack: {
        id: 'bad-normal',
        name: '坏普攻',
        slot: 'normal',
        target: 'frontEnemy',
        description: '非法效果',
        effects: [{ type: 'teleport' }],
      },
    } as unknown as CompleteSquadSkillKit;

    const result = validateSquadSkillKit(badKit);
    expect(result.ok).toBe(false);
    expect(result.issues).toContain('normalAttack uses illegal effect teleport');
    expect(result.issues).toContain('skill1 missing');
    expect(result.issues).toContain('skill2 missing');
    expect(result.issues).toContain('passive missing');
    expect(result.issues).toContain('ultimate missing');
  });
});
