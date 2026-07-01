import type { CharacterCard, Rarity } from '@/types/card';
import type { Skill } from '@/types/skill';
import type {
  CompleteSquadSkillKit,
  SkillEffect,
  SquadSkillDef,
  SquadSkillSlot,
  StatusKind,
  TargetSelector,
} from '@/engine/squad/types';
import { urCharacterSkills } from './urCharacterSkills';
import { characterSkillsMap } from './characterSkillsMap';

export const SQUAD_SKILL_REQUIRED_SLOTS = ['normalAttack', 'skill1', 'skill2', 'passive', 'ultimate'] as const;
export const ALLOWED_SQUAD_EFFECT_TYPES = [
  'damage',
  'heal',
  'shield',
  'applyStatus',
  'cleanse',
  'energyGain',
  'dispel',
  'revive',
  'execute',
] as const satisfies readonly SkillEffect['type'][];

export const SQUAD_SKILL_PENDING_DESIGN_IDS: readonly number[] = [];

type RequiredSquadSkillSlot = typeof SQUAD_SKILL_REQUIRED_SLOTS[number];
type SquadArchetype = 'striker' | 'guardian' | 'support' | 'controller' | 'arcane' | 'tactical';

const PASSIVE_DURATION_MS = 90_000;
const allowedEffectTypes = new Set<string>(ALLOWED_SQUAD_EFFECT_TYPES);
const personalSkillById = new Map<string, Skill>(urCharacterSkills.map(skill => [skill.id, skill]));
const pendingDesignIds = new Set<number>(SQUAD_SKILL_PENDING_DESIGN_IDS);

const targetLabels: Record<TargetSelector, string> = {
  frontEnemy: '前排敌人',
  lowestHpEnemy: '生命最低敌人',
  highestAtkEnemy: '攻击最高敌人',
  backEnemy: '后排敌人',
  allEnemies: '全体敌人',
  self: '自身',
  lowestHpAlly: '生命最低队友',
  firstDefeatedAlly: '首名倒下队友',
  allAllies: '全体队友',
};

const statusLabels: Record<StatusKind, string> = {
  shield: '护盾',
  atkUp: 'ATK提升',
  atkDown: 'ATK降低',
  defUp: 'DEF提升',
  defDown: 'DEF降低',
  spUp: 'SP提升',
  spDown: 'SP降低',
  haste: '加速',
  slow: '减速',
  critRateUp: '暴击率提升',
  stun: '眩晕',
  silence: '沉默',
  taunt: '嘲讽',
  dot: '持续伤害',
  hot: '持续治疗',
};

const archetypeLabels: Record<SquadArchetype, {
  skill1: string;
  skill2: string;
  passive: string;
  ultimate: string;
}> = {
  striker: { skill1: '破阵强袭', skill2: '锋芒蓄势', passive: '胜负直觉', ultimate: '终幕斩击' },
  guardian: { skill1: '守护结界', skill2: '前线牵制', passive: '坚壁气场', ultimate: '全域庇护' },
  support: { skill1: '共鸣急救', skill2: '节拍鼓舞', passive: '协奏气场', ultimate: '谢幕安可' },
  controller: { skill1: '封锁指令', skill2: '破绽解析', passive: '压迫领域', ultimate: '全域拘束' },
  arcane: { skill1: '术式爆发', skill2: '魔力增幅', passive: '秘仪回路', ultimate: '星辉裁决' },
  tactical: { skill1: '战术穿插', skill2: '队列调度', passive: '先读阵线', ultimate: '决策终局' },
};

function isSquadRarity(rarity: Rarity | null | undefined): rarity is 'HR' | 'UR' {
  return rarity === 'HR' || rarity === 'UR';
}

function isPersonalSkillId(skillId: string | undefined): skillId is string {
  return typeof skillId === 'string'
    && !skillId.startsWith('TPL_')
    && skillId !== 'AURA_GENRE_EXPERT'
    && skillId !== 'default_attack'
    && skillId !== 'default_passive';
}

function resolvePersonalSkill(character: CharacterCard, kind: 'active' | 'passive'): Skill | undefined {
  const binding = characterSkillsMap[character.id];
  const skillId = kind === 'active'
    ? binding?.activeSkillId ?? character.activeSkillId
    : binding?.passiveSkillId ?? character.passiveSkillId;
  return isPersonalSkillId(skillId) ? personalSkillById.get(skillId) : undefined;
}

function textOf(character: CharacterCard): string {
  return [
    character.name,
    character.description,
    ...(character.anime_names ?? []),
    ...(character.synergy_tags ?? []),
  ].filter(Boolean).join(' ');
}

function inferArchetype(character: CharacterCard, activeSkill?: Skill, passiveSkill?: Skill): SquadArchetype {
  const text = `${textOf(character)} ${activeSkill?.name ?? ''} ${passiveSkill?.name ?? ''}`;
  if (/治疗|治愈|鼓励|演奏|音乐|轻音|吹响|白色相簿|四月|莉兹|孤独摇滚|BanG Dream|MyGO|Ave Mujica|GIRLS BAND/i.test(text)) return 'support';
  if (/守护|骑士|AT力场|天使|CLANNAD|紫罗兰|夏日口袋|摇曳露营|庇护|加护/i.test(text)) return 'guardian';
  if (/魔法|术式|奇幻|Fate|圣剑|精灵|魔女|芙莉莲|惠惠|无职|异世界|Re：|狼与香辛料|圆环|魔法少女/i.test(text)) return 'arcane';
  if (/封锁|命令|沉默|毒舌|分析|推理|操作|时间|Geass|凉宫|长门|冰菓|物语|辉夜|路人女主|约会大作战/i.test(text)) return 'controller';
  if (/科学|电磁|战术|队列|赛博|反叛|命运石|EVA|新世纪|鲁路修|牧濑|冈部|锦木|契约之吻|DARLING/i.test(text)) return 'tactical';
  if (/剑|炮|突击|爆裂|斩|猎人|巨人|链锯|刀剑|银魂|战斗|刺客|阿克曼|利威尔|02|蕾塞|玛奇玛/i.test(text)) return 'striker';

  const stats = character.battle_stats;
  if (stats) {
    const atkSp = Number(stats.atk ?? 0) + Number(stats.sp ?? 0);
    const hpDef = Number(stats.hp ?? 0) / 8 + Number(stats.def ?? 0);
    if (hpDef > atkSp) return 'guardian';
    if (Number(stats.sp ?? 0) > Number(stats.atk ?? 0) * 1.15) return 'arcane';
    if (Number(stats.spd ?? 0) > Number(stats.def ?? 0) * 1.4) return 'tactical';
  }
  return character.rarity === 'UR' ? 'striker' : 'support';
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function duration(ms: number): string {
  return ms >= PASSIVE_DURATION_MS ? '整场战斗' : `${Math.round(ms / 1000)}秒`;
}

function describeEffect(effect: SkillEffect, fallbackTarget: TargetSelector): string {
  const target = targetLabels[effect.target ?? fallbackTarget];
  switch (effect.type) {
    case 'damage': {
      const parts = [];
      if (effect.atkRatio) parts.push(`ATK ${percent(effect.atkRatio)}`);
      if (effect.spRatio) parts.push(`SP ${percent(effect.spRatio)}`);
      if (effect.flatPower) parts.push(`${effect.flatPower}固定`);
      return `对${target}造成${parts.join(' + ') || '固定'}伤害${effect.canCrit === false ? '，不触发暴击' : ''}`;
    }
    case 'heal': {
      const parts = [];
      if (effect.atkRatio) parts.push(`ATK ${percent(effect.atkRatio)}`);
      if (effect.spRatio) parts.push(`SP ${percent(effect.spRatio)}`);
      if (effect.flatPower) parts.push(`${effect.flatPower}固定`);
      return `治疗${target}（${parts.join(' + ') || '固定'}）`;
    }
    case 'shield': {
      const parts = [];
      if (effect.spRatio) parts.push(`SP ${percent(effect.spRatio)}`);
      if (effect.defRatio) parts.push(`DEF ${percent(effect.defRatio)}`);
      if (effect.flatPower) parts.push(`${effect.flatPower}固定`);
      return `为${target}提供${parts.join(' + ') || '固定'}护盾，持续${duration(effect.durationMs)}`;
    }
    case 'applyStatus':
      return `使${target}获得${statusLabels[effect.status.kind]}${effect.status.amount ? ` ${percent(effect.status.amount)}` : ''}，持续${duration(effect.status.durationMs)}`;
    case 'cleanse':
      return `净化${target}的负面状态`;
    case 'energyGain':
      return `使${target}获得${effect.amount}能量`;
    case 'dispel':
      return `驱散${target}的增益状态`;
    case 'revive':
      return `复活${target}并恢复${percent(effect.hpRatio)}最大生命`;
    case 'execute':
      return `若${target}生命不高于${percent(effect.hpRatioThreshold)}则处决`;
  }
}

export function describeSquadSkill(skill: SquadSkillDef): string {
  return skill.effects.map(effect => describeEffect(effect, skill.target)).join('；');
}

function skill(
  character: CharacterCard,
  slot: SquadSkillSlot,
  name: string,
  target: TargetSelector,
  effects: readonly SkillEffect[],
  extra: Pick<SquadSkillDef, 'cooldownMs' | 'initialCooldownMs' | 'energyCost'> = {},
): SquadSkillDef {
  const def: SquadSkillDef = {
    id: `${character.id}_${slot}_${name}`,
    name,
    slot,
    target,
    effects,
    ...extra,
  };
  return { ...def, description: describeSquadSkill(def) };
}

function archetypeEffects(archetype: SquadArchetype): {
  skill1: { target: TargetSelector; effects: readonly SkillEffect[] };
  skill2: { target: TargetSelector; effects: readonly SkillEffect[] };
  passive: { target: TargetSelector; effects: readonly SkillEffect[] };
  ultimate: { target: TargetSelector; effects: readonly SkillEffect[] };
} {
  switch (archetype) {
    case 'guardian':
      return {
        skill1: {
          target: 'lowestHpAlly',
          effects: [
            { type: 'shield', spRatio: 0.45, defRatio: 0.9, flatPower: 40, durationMs: 7000 },
            { type: 'heal', spRatio: 0.25, flatPower: 25 },
          ],
        },
        skill2: {
          target: 'self',
          effects: [
            { type: 'applyStatus', status: { kind: 'taunt', durationMs: 5000 } },
            { type: 'shield', defRatio: 1.2, flatPower: 40, durationMs: 5000 },
          ],
        },
        passive: {
          target: 'allAllies',
          effects: [{ type: 'applyStatus', status: { kind: 'defUp', amount: 0.1, durationMs: PASSIVE_DURATION_MS } }],
        },
        ultimate: {
          target: 'allAllies',
          effects: [
            { type: 'shield', spRatio: 0.7, defRatio: 0.9, flatPower: 80, durationMs: 9000 },
            { type: 'cleanse' },
            { type: 'heal', target: 'lowestHpAlly', spRatio: 0.8, flatPower: 50 },
          ],
        },
      };
    case 'support':
      return {
        skill1: {
          target: 'lowestHpAlly',
          effects: [
            { type: 'heal', spRatio: 0.9, flatPower: 35 },
            { type: 'energyGain', amount: 80 },
          ],
        },
        skill2: {
          target: 'allAllies',
          effects: [
            { type: 'applyStatus', status: { kind: 'haste', amount: 0.12, durationMs: 6000 } },
            { type: 'applyStatus', status: { kind: 'spUp', amount: 0.15, durationMs: 6000 } },
          ],
        },
        passive: {
          target: 'allAllies',
          effects: [{ type: 'applyStatus', status: { kind: 'spUp', amount: 0.08, durationMs: PASSIVE_DURATION_MS } }],
        },
        ultimate: {
          target: 'allAllies',
          effects: [
            { type: 'heal', spRatio: 0.65, flatPower: 80 },
            { type: 'cleanse' },
            { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.35 },
          ],
        },
      };
    case 'controller':
      return {
        skill1: {
          target: 'frontEnemy',
          effects: [
            { type: 'damage', atkRatio: 0.3, spRatio: 0.8, canCrit: true },
            { type: 'applyStatus', status: { kind: 'silence', durationMs: 3500 } },
          ],
        },
        skill2: {
          target: 'highestAtkEnemy',
          effects: [
            { type: 'damage', atkRatio: 0.4, spRatio: 0.5, canCrit: true },
            { type: 'applyStatus', status: { kind: 'atkDown', amount: 0.22, durationMs: 6000 } },
            { type: 'dispel' },
          ],
        },
        passive: {
          target: 'allEnemies',
          effects: [{ type: 'applyStatus', status: { kind: 'slow', amount: 0.08, durationMs: PASSIVE_DURATION_MS } }],
        },
        ultimate: {
          target: 'allEnemies',
          effects: [
            { type: 'damage', atkRatio: 0.6, spRatio: 1, canCrit: true },
            { type: 'applyStatus', status: { kind: 'stun', durationMs: 1200 } },
            { type: 'applyStatus', status: { kind: 'slow', amount: 0.2, durationMs: 6000 } },
          ],
        },
      };
    case 'arcane':
      return {
        skill1: {
          target: 'frontEnemy',
          effects: [
            { type: 'damage', atkRatio: 0.2, spRatio: 1.2, canCrit: true },
            { type: 'applyStatus', status: { kind: 'dot', amount: 45, durationMs: 6000, tickIntervalMs: 2000 } },
          ],
        },
        skill2: {
          target: 'self',
          effects: [
            { type: 'applyStatus', status: { kind: 'spUp', amount: 0.28, durationMs: 7000 } },
            { type: 'shield', spRatio: 0.8, durationMs: 6000 },
          ],
        },
        passive: {
          target: 'self',
          effects: [{ type: 'applyStatus', status: { kind: 'spUp', amount: 0.12, durationMs: PASSIVE_DURATION_MS } }],
        },
        ultimate: {
          target: 'allEnemies',
          effects: [
            { type: 'damage', atkRatio: 0.4, spRatio: 1.45, canCrit: true },
            { type: 'applyStatus', status: { kind: 'defDown', amount: 0.18, durationMs: 7000 } },
          ],
        },
      };
    case 'tactical':
      return {
        skill1: {
          target: 'backEnemy',
          effects: [
            { type: 'damage', atkRatio: 0.8, spRatio: 0.6, canCrit: true },
            { type: 'applyStatus', status: { kind: 'slow', amount: 0.18, durationMs: 5000 } },
          ],
        },
        skill2: {
          target: 'allAllies',
          effects: [
            { type: 'energyGain', amount: 90 },
            { type: 'cleanse' },
          ],
        },
        passive: {
          target: 'allAllies',
          effects: [{ type: 'applyStatus', status: { kind: 'haste', amount: 0.08, durationMs: PASSIVE_DURATION_MS } }],
        },
        ultimate: {
          target: 'highestAtkEnemy',
          effects: [
            { type: 'damage', atkRatio: 0.8, spRatio: 1.2, canCrit: true },
            { type: 'dispel' },
            { type: 'applyStatus', status: { kind: 'silence', durationMs: 5000 } },
          ],
        },
      };
    case 'striker':
    default:
      return {
        skill1: {
          target: 'frontEnemy',
          effects: [
            { type: 'damage', atkRatio: 1.25, spRatio: 0.2, canCrit: true },
            { type: 'energyGain', target: 'self', amount: 70 },
          ],
        },
        skill2: {
          target: 'self',
          effects: [
            { type: 'applyStatus', status: { kind: 'atkUp', amount: 0.22, durationMs: 7000 } },
            { type: 'applyStatus', status: { kind: 'haste', amount: 0.12, durationMs: 7000 } },
          ],
        },
        passive: {
          target: 'self',
          effects: [{ type: 'applyStatus', status: { kind: 'critRateUp', amount: 0.1, durationMs: PASSIVE_DURATION_MS } }],
        },
        ultimate: {
          target: 'lowestHpEnemy',
          effects: [
            { type: 'damage', atkRatio: 2.2, spRatio: 0.6, canCrit: true },
            { type: 'execute', hpRatioThreshold: 0.16 },
          ],
        },
      };
  }
}

export function getSquadSkillKitForCharacter(character: CharacterCard | null | undefined): CompleteSquadSkillKit | undefined {
  if (!character || !isSquadRarity(character.rarity) || pendingDesignIds.has(character.id)) return undefined;

  const activeSkill = resolvePersonalSkill(character, 'active');
  const passiveSkill = resolvePersonalSkill(character, 'passive');
  const archetype = inferArchetype(character, activeSkill, passiveSkill);
  const labels = archetypeLabels[archetype];
  const effects = archetypeEffects(archetype);
  const name = character.name;
  const activeName = activeSkill?.name;
  const passiveName = passiveSkill?.name;

  return {
    normalAttack: skill(character, 'normal', `${name}·牵制`, 'frontEnemy', [
      { type: 'damage', atkRatio: 1, canCrit: true },
    ]),
    skill1: skill(character, 'skill1', activeName ?? `${name}·${labels.skill1}`, effects.skill1.target, effects.skill1.effects, {
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    }),
    skill2: skill(character, 'skill2', `${name}·${labels.skill2}`, effects.skill2.target, effects.skill2.effects, {
      cooldownMs: 12000,
      initialCooldownMs: 4500,
    }),
    passive: skill(character, 'passive', passiveName ?? `${name}·${labels.passive}`, effects.passive.target, effects.passive.effects),
    ultimate: skill(character, 'ultimate', activeName ? `${activeName}·终式` : `${name}·${labels.ultimate}`, effects.ultimate.target, effects.ultimate.effects, {
      energyCost: 1000,
    }),
  };
}

export function isSquadSkillKitReady(character: CharacterCard | null | undefined): boolean {
  return validateSquadSkillKit(getSquadSkillKitForCharacter(character)).ok;
}

export interface SquadSkillKitValidation {
  ok: boolean;
  issues: string[];
}

function validateSlot(slotName: RequiredSquadSkillSlot, skillDef: SquadSkillDef | undefined, issues: string[]): void {
  if (!skillDef) {
    issues.push(`${slotName} missing`);
    return;
  }
  if (!skillDef.id || !skillDef.name) issues.push(`${slotName} missing id/name`);
  if (!skillDef.description) issues.push(`${slotName} missing description`);
  if (slotName === 'normalAttack' && skillDef.slot !== 'normal') issues.push(`${slotName} slot must be normal`);
  if (slotName !== 'normalAttack' && skillDef.slot !== slotName) issues.push(`${slotName} slot mismatch`);
  if (!skillDef.effects.length) issues.push(`${slotName} has no executable effects`);
  for (const effect of skillDef.effects) {
    if (!allowedEffectTypes.has(effect.type)) issues.push(`${slotName} uses illegal effect ${effect.type}`);
  }
}

export function validateSquadSkillKit(kit: Partial<CompleteSquadSkillKit> | undefined): SquadSkillKitValidation {
  const issues: string[] = [];
  validateSlot('normalAttack', kit?.normalAttack, issues);
  validateSlot('skill1', kit?.skill1, issues);
  validateSlot('skill2', kit?.skill2, issues);
  validateSlot('passive', kit?.passive, issues);
  validateSlot('ultimate', kit?.ultimate, issues);
  return { ok: issues.length === 0, issues };
}

export function validateSquadSkillCoverage(characters: readonly CharacterCard[]): SquadSkillKitValidation {
  const issues: string[] = [];
  for (const character of characters) {
    const kit = getSquadSkillKitForCharacter(character);
    if (isSquadRarity(character.rarity)) {
      if (pendingDesignIds.has(character.id)) continue;
      const result = validateSquadSkillKit(kit);
      if (!result.ok) issues.push(`${character.id} ${character.name}: ${result.issues.join(', ')}`);
    } else if (kit) {
      issues.push(`${character.id} ${character.name}: non HR/UR unexpectedly has a squad skill kit`);
    }
  }
  return { ok: issues.length === 0, issues };
}
