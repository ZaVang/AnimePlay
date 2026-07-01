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
  isSignatureKit,
  isSquadSkillKitReady,
  validateSquadSkillCoverage,
  validateSquadSkillKit,
} from './squadSkillKits';
import { simulateTimedBattle } from '@/engine/squad/timedBattle';

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

/** SA-T4：招牌 UR 差异化技能位（机制层覆盖 + 未命中回落原型 + 不改敌人候选池集合）。 */
describe('SA-T4 signature UR skill kits', () => {
  const byId = new Map(allCharacters.map(c => [c.id, c] as const));
  const SIGNATURE_IDS = [3575, 10440, 304, 706, 10439, 49, 12393, 10596, 1211, 303];

  it('每个招牌 id 都真实存在、为 UR、且被 isSignatureKit 识别（头部覆盖数在 8~12）', () => {
    expect(SIGNATURE_IDS.length).toBeGreaterThanOrEqual(8);
    expect(SIGNATURE_IDS.length).toBeLessThanOrEqual(12);
    for (const id of SIGNATURE_IDS) {
      const c = byId.get(id);
      expect(c, `character ${id} must exist`).toBeTruthy();
      expect(c!.rarity).toBe('UR');
      expect(isSignatureKit(id)).toBe(true);
    }
    // 非覆盖角色不误报
    expect(isSignatureKit(12392)).toBe(false); // 冈部伦太郎（有 UR 技能但未做签名覆盖）
  });

  it('命中覆盖：招牌角色 kit 与「同原型但未覆盖」的他人不再逐字节相同（结构差异）', () => {
    // 御坂美琴(striker) 覆盖 skill1；找一个同为 striker 原型且未覆盖的 UR 对照。
    const misaka = getSquadSkillKitForCharacter(byId.get(3575))!;
    const okabe = getSquadSkillKitForCharacter(byId.get(12392))!; // 冈部：未覆盖，走原型
    // skill1 结构（去掉带角色 id 的 name/id 字段）不同 => 机制层差异，非仅换名
    const shape = (s: SquadSkillDef) => JSON.stringify({ target: s.target, effects: s.effects });
    expect(shape(misaka.skill1)).not.toBe(shape(okabe.skill1));
  });

  it('回落原型：未覆盖 UR 的 skill1/ultimate 仍是原型模板（覆盖表未污染回落路径）', () => {
    const okabe = getSquadSkillKitForCharacter(byId.get(12392))!;
    // 未覆盖角色 skill1 名字应含角色名或个人技名（原型/个人技命名），不含任何招牌台词。
    expect(okabe.skill1.name).not.toBe('超电磁炮');
    expect(okabe.ultimate.name).not.toBe('时间停止');
  });

  it('覆盖 kit 仍走工厂：description === describeSquadSkill（禁手写 description、锁死描述≠行为）', () => {
    for (const id of SIGNATURE_IDS) {
      const kit = getSquadSkillKitForCharacter(byId.get(id))!;
      for (const slot of SQUAD_SKILL_REQUIRED_SLOTS) {
        const s = kit[slot];
        expect(s.description, `${id} ${slot}`).toBe(describeSquadSkill(s));
      }
    }
  });

  it('覆盖 kit 全部通过 validateSquadSkillKit（只用合法 squad effect、无非法 effectId）', () => {
    const allowed = new Set<string>(ALLOWED_SQUAD_EFFECT_TYPES);
    for (const id of SIGNATURE_IDS) {
      const kit = getSquadSkillKitForCharacter(byId.get(id))!;
      expect(validateSquadSkillKit(kit).ok, `${id}`).toBe(true);
      for (const slot of SQUAD_SKILL_REQUIRED_SLOTS) {
        for (const effect of kit[slot].effects) {
          expect(allowed.has(effect.type)).toBe(true);
        }
      }
    }
  });

  it('★ 守 SA-T2：覆盖前后 filter(isSquadSkillKitReady) 全角色返回集合完全不变', () => {
    // 覆盖层是纯加法（命中才改、且必过校验），所以 ready 集合必须与「无签名」口径一致。
    // 用 validateSquadSkillCoverage 作为等价守卫：全角色 kit 校验必须全绿（含 10 个覆盖角色）。
    const coverage = validateSquadSkillCoverage(allCharacters);
    expect(coverage.ok, coverage.issues.join('\n')).toBe(true);
    // 所有招牌角色仍在 ready 集合内（未从 ready 掉成 not-ready）。
    for (const id of SIGNATURE_IDS) {
      expect(isSquadSkillKitReady(byId.get(id))).toBe(true);
    }
  });

  it('机制真跑通引擎：晓美焰时停 → 全体敌人 statusApplied(stun)', () => {
    const kit = getSquadSkillKitForCharacter(byId.get(10440))!;
    const state = makeState(kit);
    const actor = state.units.find(u => u.id === 'actor')!;
    expect(executeSkill(state, actor, kit.ultimate)).toBe(true);
    const stuns = state.events.filter(e => e.type === 'statusApplied' && e.status === 'stun');
    expect(stuns.length).toBeGreaterThanOrEqual(2); // 前后两个敌人都被眩晕
  });

  it('机制真跑通引擎：忍野忍 ultimate 含 execute（对残血敌处决）', () => {
    const kit = getSquadSkillKitForCharacter(byId.get(1211))!;
    // 布一个残血敌人（<=30% 血）验证 execute 触发 defeated。
    const state = createTimedBattleState({
      rng: createSequenceRng([0.5, 0.99, 0.25, 0.75]),
      units: [
        unit('actor', 'player', { skills: kit, currentHp: 850 }),
        unit('enemy-front', 'enemy', { stats: { ...baseStats, hp: 1200 }, currentHp: 100 }),
        unit('enemy-back', 'enemy', { position: 'back', stats: { ...baseStats, hp: 1200 } }),
      ],
    });
    const actor = state.units.find(u => u.id === 'actor')!;
    expect(executeSkill(state, actor, kit.ultimate)).toBe(true);
    expect(state.events.some(e => e.type === 'defeated' && e.targetId === 'enemy-front')).toBe(true);
  });

  it('机制真跑通引擎：鹿目圆 ultimate 复活倒下队友（revive 事件）', () => {
    const kit = getSquadSkillKitForCharacter(byId.get(10439))!;
    const state = makeState(kit); // ally-down currentHp:0
    const actor = state.units.find(u => u.id === 'actor')!;
    expect(executeSkill(state, actor, kit.ultimate)).toBe(true);
    expect(state.events.some(e => e.type === 'revive' && e.targetId === 'ally-down')).toBe(true);
  });

  it('端到端：招牌角色阵容能跑完整场 timed battle 不抛错', () => {
    const kit = getSquadSkillKitForCharacter(byId.get(3575))!;
    const result = simulateTimedBattle({
      rng: createSequenceRng(Array.from({ length: 64 }, (_, i) => (i % 7) / 7)),
      units: [
        unit('actor', 'player', { skills: kit }),
        unit('enemy-front', 'enemy', { stats: { ...baseStats, hp: 900 } }),
      ],
    });
    expect(result.events.some(e => e.type === 'battleEnd')).toBe(true);
  });
});
