import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import type { CharacterCard } from '@/types/card';
import { getSquadSkillKitForCharacter } from './squadSkillKits';
import { ZONE_TARGET_OVERRIDES } from './squad/characterKits';

const rawPath = fileURLToPath(new URL('../../../data/selected_character/all_cards.json', import.meta.url));
const all = JSON.parse(readFileSync(rawPath, 'utf8')) as CharacterCard[];
const byId = new Map(all.map(c => [c.id, c]));
const ROWS = ['frontRowEnemies', 'middleRowEnemies', 'backRowEnemies'];

// 问题③：分排目标覆盖必须真生效——每条覆盖都确实把一个 allEnemies AOE 改成打某一排（无空 override）。
describe('zone target overrides apply', () => {
  it('every override retargets an allEnemies AOE to a row (no no-op, no residual allEnemies)', () => {
    for (const [idStr, slots] of Object.entries(ZONE_TARGET_OVERRIDES)) {
      const c = byId.get(Number(idStr));
      expect(c, `char ${idStr} exists in service roster`).toBeTruthy();
      const kit = getSquadSkillKitForCharacter(c!)!;
      for (const [slot, row] of Object.entries(slots)) {
        const def = kit[slot as 'skill1' | 'ultimate'];
        expect(ROWS, `${idStr} ${slot}`).toContain(def.target);
        expect(def.effects.some(e => (e as { target?: string }).target === row), `${idStr} ${slot} has a ${row} effect`).toBe(true);
        expect(def.effects.some(e => (e as { target?: string }).target === 'allEnemies'), `${idStr} ${slot} no residual allEnemies`).toBe(false);
      }
    }
  });
});
