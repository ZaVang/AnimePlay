// 小队战技能包「装配 / 归类 / 描述 / 校验」逻辑。
// Step 1 拆分（2026-07-03）：声明式配置已抽到 data/squad/——
//   · archetypeTemplates.ts = 6 套共享定位模板 + 通名标签；
//   · characterKits.ts = 三张按 id 键的逐角色覆盖表 + 暂缓设计排除表。
// 本文件只保留纯逻辑：读配置 → 组装 kit → 派生描述 → 校验。配置与逻辑分离，便于逐角色补设计。
// 现状与三步方案见 docs/orch/squad-skill-design-audit-2026-07-03.md。

import type { CharacterCard } from '@/types/card';
import type { Skill } from '@/types/skill';
import type {
  CompleteSquadSkillKit,
  SkillEffect,
  SquadSkillDef,
  SquadSkillSlot,
  StatusKind,
  TargetSelector,
} from '@/engine/squad/types';
import { isTowerSquadRarity } from '@/engine/squad/eligibility';
import { urCharacterSkills } from './urCharacterSkills';
import { characterSkillsMap } from './characterSkillsMap';
import {
  PASSIVE_DURATION_MS,
  archetypeEffects,
  archetypeLabels,
  type SquadArchetype,
} from './squad/archetypeTemplates';
import {
  EXPLICIT_ARCHETYPE,
  HR_SKILL_NAME_OVERRIDES,
  SIGNATURE_KIT_OVERRIDES,
  SQUAD_SKILL_PENDING_DESIGN_IDS,
} from './squad/characterKits';

// 暂缓设计排除表随配置迁至 data/squad/characterKits.ts；此处再导出以保持既有公共 API。
export { SQUAD_SKILL_PENDING_DESIGN_IDS };

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

type RequiredSquadSkillSlot = typeof SQUAD_SKILL_REQUIRED_SLOTS[number];

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

/** 出战/技能包稀有度门槛 —— 走 `eligibility` 单一真相源（含 SSR，2026-07 起）。 */
const isSquadRarity = isTowerSquadRarity;

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

/**
 * SC-T1：单一定位入口。显式表优先，未命中回落正则，再回落 battle_stats，最后稀有度兜底。
 * kit 生成 / 塔 / 未来养成都读这一处；`SIGNATURE_KIT_OVERRIDES[id].role` 通过显式表种子在此生效。
 * 显式表 `EXPLICIT_ARCHETYPE` 与招牌覆盖 `SIGNATURE_KIT_OVERRIDES` 现居 data/squad/characterKits.ts。
 */
function resolveArchetype(character: CharacterCard, activeSkill?: Skill, passiveSkill?: Skill): SquadArchetype {
  const explicit = EXPLICIT_ARCHETYPE[character.id];
  if (explicit) return explicit;
  return inferArchetypeByText(character, activeSkill, passiveSkill);
}

/** 正则 + battle_stats 回落（仅在显式表未命中时使用）。 */
function inferArchetypeByText(character: CharacterCard, activeSkill?: Skill, passiveSkill?: Skill): SquadArchetype {
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

/** SC-T2:暴露 HR 名覆盖表命中判定（测试用）。 */
export function hasHrSkillNameOverride(characterId: number): boolean {
  return Object.prototype.hasOwnProperty.call(HR_SKILL_NAME_OVERRIDES, characterId);
}

/** SA-T4 留口：该角色是否拥有招牌差异化 kit（供第 2 轮 UI「专属徽章」消费；本轮不做徽章）。 */
export function isSignatureKit(characterId: number): boolean {
  return Object.prototype.hasOwnProperty.call(SIGNATURE_KIT_OVERRIDES, characterId);
}

/** SC-T1：招牌覆盖声明的 role（供测试守卫「显式 archetype === override.role」；未覆盖返回 undefined）。 */
export function signatureRoleOf(characterId: number): SquadArchetype | undefined {
  return SIGNATURE_KIT_OVERRIDES[characterId]?.role;
}

/** SC-T1：暴露单一定位入口给测试/未来消费端（显式表优先 → 正则回落 → stats/稀有度兜底）。 */
export function getArchetypeForCharacter(character: CharacterCard, activeSkill?: Skill, passiveSkill?: Skill): SquadArchetype {
  return resolveArchetype(character, activeSkill, passiveSkill);
}

/** SC-T1：显式定位表是否命中该角色（测试用：区分显式命中 vs 正则回落）。 */
export function hasExplicitArchetype(characterId: number): boolean {
  return Object.prototype.hasOwnProperty.call(EXPLICIT_ARCHETYPE, characterId);
}

export function getSquadSkillKitForCharacter(character: CharacterCard | null | undefined): CompleteSquadSkillKit | undefined {
  if (!character || !isSquadRarity(character.rarity) || pendingDesignIds.has(character.id)) return undefined;

  const activeSkill = resolvePersonalSkill(character, 'active');
  const passiveSkill = resolvePersonalSkill(character, 'passive');
  const archetype = resolveArchetype(character, activeSkill, passiveSkill);
  const labels = archetypeLabels[archetype];
  const effects = archetypeEffects(archetype);
  const name = character.name;
  const activeName = activeSkill?.name;
  const passiveName = passiveSkill?.name;

  // SA-T4：招牌 UR 覆盖层——命中则用手写差异化 effect，未命中回落原型模板（覆盖仍走 skill() 工厂，description 自动派生）。
  const override = SIGNATURE_KIT_OVERRIDES[character.id];
  const s1 = override?.skill1;
  const ult = override?.ultimate;

  // SC-T2：未覆盖 HR 名覆盖表——只改**名**（effect 仍走原型模板，description 仍自动派生）。
  // 优先级：个人技名(activeName/passiveName) > HR 名覆盖 > 原型通名。招牌 UR effect 覆盖仍走 s1/ult，名不受此表影响。
  const nameOverride = HR_SKILL_NAME_OVERRIDES[character.id];

  return {
    normalAttack: skill(character, 'normal', `${name}·牵制`, 'frontEnemy', [
      { type: 'damage', atkRatio: 1, canCrit: true },
    ]),
    skill1: s1
      ? skill(character, 'skill1', s1.name, s1.target, s1.effects, {
          cooldownMs: s1.cooldownMs ?? 8000,
          initialCooldownMs: s1.initialCooldownMs ?? 1500,
        })
      : skill(character, 'skill1', activeName ?? nameOverride?.skill1 ?? `${name}·${labels.skill1}`, effects.skill1.target, effects.skill1.effects, {
          cooldownMs: 8000,
          initialCooldownMs: 1500,
        }),
    skill2: skill(character, 'skill2', nameOverride?.skill2 ?? `${name}·${labels.skill2}`, effects.skill2.target, effects.skill2.effects, {
      cooldownMs: 12000,
      initialCooldownMs: 4500,
    }),
    passive: skill(character, 'passive', passiveName ?? nameOverride?.passive ?? `${name}·${labels.passive}`, effects.passive.target, effects.passive.effects),
    ultimate: ult
      ? skill(character, 'ultimate', ult.name, ult.target, ult.effects, { energyCost: ult.energyCost ?? 1000 })
      : skill(character, 'ultimate', activeName ? `${activeName}·终式` : nameOverride?.ultimate ?? `${name}·${labels.ultimate}`, effects.ultimate.target, effects.ultimate.effects, {
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
      issues.push(`${character.id} ${character.name}: 非出战稀有度（SSR/HR/UR 外）意外拥有小队战技能包`);
    }
  }
  return { ok: issues.length === 0, issues };
}
