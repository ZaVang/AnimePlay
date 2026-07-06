import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import type { CharacterCard } from '@/types/card';
import type { BattleStats } from '@/engine/squad/combat';
import type { SquadUnitSetup } from '@/engine/squad/types';
import { createSeededRng } from '@/engine/rng';
import { simulateTimedBattle, DEFAULT_MAX_TIME_MS } from '@/engine/squad/timedBattle';
import { generateTowerFloorEnemies, towerFloorEnemySeed } from '@/engine/squad/tower';
import { getSquadSkillKitForCharacter, getSquadRoleInfo, isSquadSkillKitReady } from './squadSkillKits';

// 回归护栏：真实塔战阵容必须**永远能在有限步内结束**（不得同步死循环冻结页面）。
// 曾有致命 bug：带 hot/dot 的单位阵亡后，死者的幽灵跳把主循环 nextAt 钉在过去时刻 →
// simulateTimedBattle 同步死转，几乎每场塔战（有奶/有人阵亡）都触发 → 整页冻结、连 F12 都按不了。
// 修复=nextStatusTickAt 只统计存活单位 + 主循环加「时间必须前进」安全阀。此测试跨真实全池 + 塔敌
// 随机大量对局，任一场跑不出结果都算失败（若又退化成死循环，测试会超时红）。
const rawPath = fileURLToPath(new URL('../../../data/selected_character/all_cards.json', import.meta.url));
const all = JSON.parse(readFileSync(rawPath, 'utf8')) as CharacterCard[];
const ready = all.filter(c => isSquadSkillKitReady(c));
const eligible = ready.filter(c => (['SSR', 'HR', 'UR'] as string[]).includes(c.rarity));

function statsOf(c: CharacterCard): BattleStats {
  const b = (c as unknown as { battle_stats?: Partial<BattleStats> }).battle_stats ?? {};
  return { hp: b.hp ?? 1000, atk: b.atk ?? 100, def: b.def ?? 80, sp: b.sp ?? 100, spd: b.spd ?? 90 };
}
function setup(c: CharacterCard, side: 'player' | 'enemy', i: number): SquadUnitSetup {
  return { id: `${side}-${i}-${c.id}`, name: c.name, side, position: getSquadRoleInfo(c)!.position, stats: statsOf(c), skills: getSquadSkillKitForCharacter(c) };
}

describe('squad battle always terminates (no browser-freezing spin)', () => {
  it('random real squads vs tower-scaled enemies across floors 1..40 all resolve', () => {
    const rng = createSeededRng(20260704);
    const pick5 = () => { const idx = new Set<number>(); while (idx.size < 5) idx.add(Math.floor(rng.next() * eligible.length)); return [...idx].map(i => eligible[i]); };
    let battles = 0;
    for (let floor = 1; floor <= 40; floor++) {
      const enemyData = generateTowerFloorEnemies(ready, floor, createSeededRng(towerFloorEnemySeed(floor)), ['x']);
      for (let s = 0; s < 8; s++) {
        const players = pick5();
        const units = [
          ...players.map((c, i) => setup(c, 'player', i)),
          ...enemyData.members.map((c, i) => setup(c as CharacterCard, 'enemy', i)),
        ];
        const result = simulateTimedBattle({ units, rng: createSeededRng(9000 + floor * 100 + s) });
        expect(result.events.some(e => e.type === 'battleEnd'), `floor ${floor} sample ${s} must end`).toBe(true);
        expect(result.elapsedMs).toBeLessThanOrEqual(DEFAULT_MAX_TIME_MS);
        battles++;
      }
    }
    expect(battles).toBe(320);
  });
});
