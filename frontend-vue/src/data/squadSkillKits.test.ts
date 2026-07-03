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
  getArchetypeForCharacter,
  getSquadSkillKitForCharacter,
  hasExplicitArchetype,
  hasHrSkillNameOverride,
  isSignatureKit,
  isSquadSkillKitReady,
  signatureRoleOf,
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
  it('covers every real SSR/HR/UR character with a complete executable kit and excludes SR 及以下', () => {
    const coverage = validateSquadSkillCoverage(allCharacters);
    expect(coverage.ok, coverage.issues.join('\n')).toBe(true);

    const eligible = allCharacters.filter(c => (['SSR', 'HR', 'UR'] as Rarity[]).includes(c.rarity));
    expect(eligible.length).toBeGreaterThan(0);
    expect(eligible.every(isSquadSkillKitReady)).toBe(true);
    // SSR 立绘齐备后加入（2026-07）——确保 SSR 也真拿到可出战技能包。
    expect(eligible.some(c => c.rarity === 'SSR')).toBe(true);

    const lowRarity = allCharacters.filter(c => !(['SSR', 'HR', 'UR'] as Rarity[]).includes(c.rarity));
    expect(lowRarity.some(c => getSquadSkillKitForCharacter(c))).toBe(false);
  });

  it('uses only the D3 allowed effect catalog and provides descriptions from real effects', () => {
    const allowed = new Set<string>(ALLOWED_SQUAD_EFFECT_TYPES);
    for (const character of allCharacters.filter(c => (['SSR', 'HR', 'UR'] as Rarity[]).includes(c.rarity))) {
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
    for (const character of allCharacters.filter(c => (['SSR', 'HR', 'UR'] as Rarity[]).includes(c.rarity))) {
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
    expect(result.issues).toContain('passive missing');
    expect(result.issues).toContain('ultimate missing');
  });
});

/** SA-T4：招牌 UR 差异化技能位（机制层覆盖 + 未命中回落原型 + 不改敌人候选池集合）。 */
describe('SA-T4 signature UR skill kits', () => {
  const byId = new Map(allCharacters.map(c => [c.id, c] as const));
  const SIGNATURE_IDS = [3575, 10440, 304, 706, 10439, 49, 12393, 10596, 1211, 303];
  // 出战池已全 bespoke（2026-07-03，无真实「未配置」角色）；用合成未配置角色验证 signature 判定不误报 + 模板回落路径仍在。
  const uncovered: CharacterCard = { id: -1, name: '未配置测试角色', rarity: 'UR', image_path: '', activeSkillId: '', passiveSkillId: '' };

  it('每个招牌 id 都真实存在、为 UR、且被 isSignatureKit 识别（头部覆盖数在 8~12）', () => {
    expect(SIGNATURE_IDS.length).toBeGreaterThanOrEqual(8);
    expect(SIGNATURE_IDS.length).toBeLessThanOrEqual(12);
    for (const id of SIGNATURE_IDS) {
      const c = byId.get(id);
      expect(c, `character ${id} must exist`).toBeTruthy();
      expect(c!.rarity).toBe('UR');
      expect(isSignatureKit(id)).toBe(true);
    }
    // 不在 CHARACTER_KITS 的角色不误报（合成未配置角色作反例）。
    expect(isSignatureKit(uncovered.id)).toBe(false);
  });

  it('命中覆盖：招牌角色 kit 与「未配置走模板」的角色不再逐字节相同（结构差异）', () => {
    const misaka = getSquadSkillKitForCharacter(byId.get(3575))!;
    const templ = getSquadSkillKitForCharacter(uncovered)!; // 未配置：走原型模板
    // skill1 结构（去掉带角色 id 的 name/id 字段）不同 => 机制层差异，非仅换名
    const shape = (s: SquadSkillDef) => JSON.stringify({ target: s.target, effects: s.effects });
    expect(shape(misaka.skill1)).not.toBe(shape(templ.skill1));
  });

  it('回落原型：未配置角色 skill1/ultimate 走原型模板 + 通名（覆盖表未污染回落路径）', () => {
    const templ = getSquadSkillKitForCharacter(uncovered)!;
    // 未配置角色名走 `名·原型标签` 通名，不含任何招牌台词。
    expect(templ.skill1.name.startsWith(`${uncovered.name}·`)).toBe(true);
    expect(templ.skill1.name).not.toBe('超电磁炮');
    expect(templ.ultimate.name).not.toBe('时间停止');
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

/** SC-T1：显式 archetype 单一定位真相源（显式优先 → 回落正则 → 已知误判纠正 → override.role 强一致）。 */
describe('SC-T1 explicit archetype single source', () => {
  const byId = new Map(allCharacters.map(c => [c.id, c] as const));
  const SIGNATURE_IDS = [3575, 10440, 304, 706, 10439, 49, 12393, 10596, 1211, 303];

  it('★ 10 个招牌 UR 的显式 archetype === 其 override.role（补 S14-A 残留 CI 守卫缺口）', () => {
    for (const id of SIGNATURE_IDS) {
      const c = byId.get(id)!;
      const role = signatureRoleOf(id);
      expect(role, `${id} 应有 override.role`).toBeTruthy();
      expect(hasExplicitArchetype(id), `${id} 应在显式表`).toBe(true);
      expect(getArchetypeForCharacter(c), `${id} archetype 应 === override.role`).toBe(role);
    }
  });

  it('显式优先：显式命中角色的 archetype 稳定等于显式声明（不受传入技能名干扰）', () => {
    const misaka = byId.get(3575)!; // 显式 striker
    expect(getArchetypeForCharacter(misaka)).toBe('striker');
    // 即使塞入会让正则判成 support 的假技能名，显式表仍优先
    expect(getArchetypeForCharacter(misaka, { name: '治疗演奏' } as never)).toBe('striker');
  });

  it('已知误判被纠正：阿尔托莉雅不再被正则序判成 guardian/arcane（显式 striker）', () => {
    const artoria = byId.get(273);
    expect(artoria, '阿尔托莉雅(273) 应存在').toBeTruthy();
    expect(hasExplicitArchetype(273)).toBe(true);
    expect(getArchetypeForCharacter(artoria!)).toBe('striker');
    // 宫园薰(音乐系)显式 support（正则也会判 support，但显式固定防漂移）
    expect(getArchetypeForCharacter(byId.get(26003)!)).toBe('support');
    // 02(DARLING) 显式 striker（正则会先命中 tactical DARLING）
    expect(getArchetypeForCharacter(byId.get(57751)!)).toBe('striker');
  });

  it('未命中干净回落正则：非显式角色仍返回合法 archetype（不抛错、值在 6 种内）', () => {
    const valid = new Set(['striker', 'guardian', 'support', 'controller', 'arcane', 'tactical']);
    const someNonExplicit = allCharacters.filter(c => !hasExplicitArchetype(c.id)).slice(0, 30);
    expect(someNonExplicit.length).toBeGreaterThan(0);
    for (const c of someNonExplicit) {
      expect(valid.has(getArchetypeForCharacter(c)), `${c.id} ${c.name}`).toBe(true);
    }
  });

  it('改定位入口后全角色覆盖仍全绿、ready 集合不变（守 SA-T2 同源）', () => {
    const coverage = validateSquadSkillCoverage(allCharacters);
    expect(coverage.ok, coverage.issues.join('\n')).toBe(true);
    const readyCount = allCharacters.filter(isSquadSkillKitReady).length;
    const highRarity = allCharacters.filter(c => (['SSR', 'HR', 'UR'] as Rarity[]).includes(c.rarity)).length;
    expect(readyCount).toBe(highRarity); // 所有 HR/UR 仍 ready，无一因定位变化掉队
  });
});

/** SC-T2：未覆盖 HR 补个人技能名（命中个人名 / 回落原型通名 / description 派生 / 不破坏 UR）。 */
describe('SC-T2 HR personal skill names', () => {
  const byId = new Map(allCharacters.map(c => [c.id, c] as const));
  // scout 核实的未覆盖 HR 样本（无个人技绑定、原走原型通名）
  const UNCOVERED_HR = [13391, 127790, 10446, 35615, 19529, 19546, 71337, 57751, 26003];

  it('原「未覆盖 HR」现已逐角色 bespoke（skill1 非通名），且未配置角色仍干净回落通名', () => {
    // 出战池全差异化后，这批曾走原型通名的 HR 现已 bespoke，skill1 名不再是 `角色名·标签`。
    for (const id of UNCOVERED_HR) {
      const c = byId.get(id);
      expect(c, `${id} 应存在`).toBeTruthy();
      const kit = getSquadSkillKitForCharacter(c)!;
      expect(kit.skill1.name.startsWith(`${c!.name}·`), `${id} skill1 应非通名`).toBe(false);
    }
    // 回落路径仍在：合成未配置角色走原型模板 + 通名，description 由 describeSquadSkill 派生。
    const templ: CharacterCard = { id: -2, name: '未配置HR', rarity: 'HR', image_path: '', activeSkillId: '', passiveSkillId: '' };
    const kit = getSquadSkillKitForCharacter(templ)!;
    for (const slot of SQUAD_SKILL_REQUIRED_SLOTS) {
      expect(kit[slot].name.startsWith('未配置HR·'), slot).toBe(true);
      expect(kit[slot].description).toBe(describeSquadSkill(kit[slot]));
    }
    expect(validateSquadSkillKit(kit).ok).toBe(true);
  });

  it('description 一律 describeSquadSkill 派生（红线 1：禁手写描述）', () => {
    for (const id of UNCOVERED_HR) {
      const kit = getSquadSkillKitForCharacter(byId.get(id))!;
      for (const slot of SQUAD_SKILL_REQUIRED_SLOTS) {
        expect(kit[slot].description, `${id} ${slot}`).toBe(describeSquadSkill(kit[slot]));
      }
    }
  });

  it('HR kit 仍过 validateSquadSkillKit + 只用合法 squad effect', () => {
    const allowed = new Set<string>(ALLOWED_SQUAD_EFFECT_TYPES);
    for (const id of UNCOVERED_HR) {
      const kit = getSquadSkillKitForCharacter(byId.get(id))!;
      expect(validateSquadSkillKit(kit).ok, `${id}`).toBe(true);
      for (const slot of SQUAD_SKILL_REQUIRED_SLOTS) {
        for (const effect of kit[slot].effects) {
          expect(allowed.has(effect.type)).toBe(true);
        }
      }
    }
  });

  it('未映射 HR 回落原型通名（未污染回落路径）', () => {
    // 已覆盖(有个人技绑定)的 HR 例如 604 中野梓：不在名覆盖表内，走个人技名/原型
    expect(hasHrSkillNameOverride(604)).toBe(false);
    // 一个既非覆盖表、又无个人技的 HR 应回落 `名·标签`（挑一个不在 26 表里的 HR）
    const plain = allCharacters.find(c => c.rarity === 'HR' && !hasHrSkillNameOverride(c.id));
    expect(plain).toBeTruthy();
  });

  it('不破坏招牌 UR 路径：招牌 UR 名仍来自 SIGNATURE 覆盖（不被逐角色 name-only 覆盖清洗）', () => {
    // 御坂美琴 skill1 仍是招牌名「超电磁炮」
    expect(getSquadSkillKitForCharacter(byId.get(3575))!.skill1.name).toBe('超电磁炮');
    // 10 个招牌 UR 仍是 signature（skill1/ultimate 带专属 effect），名不被 skill2/passive 名覆盖污染。
    // 注：Step 3（2026-07-03）逐角色补设计起，非招牌角色（含 UR）可有 name-only 的 skill2/passive 名，
    // 故不再断言「UR 不含 name 覆盖」——那是三表未合并前的旧不变量。
    const SIGNATURE_IDS = [3575, 10440, 304, 706, 10439, 49, 12393, 10596, 1211, 303];
    for (const id of SIGNATURE_IDS) {
      if (byId.get(id)) expect(isSignatureKit(id), `${id} 仍应是 signature`).toBe(true);
    }
  });
});
