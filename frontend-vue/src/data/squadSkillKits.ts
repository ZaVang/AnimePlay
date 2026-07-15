// 小队战技能包「装配 / 归类 / 描述 / 校验」逻辑。
// Step 1 拆分（2026-07-03）：声明式配置抽到 data/squad/（archetypeTemplates + characterKits）。
// Step 2 统一形状（2026-07-03）：逐角色覆盖从原 3 张表并成一张 CHARACTER_KITS（一角色一条目）。
// 本文件只保留纯逻辑：读配置 → 组装 kit → 派生描述 → 校验。配置与逻辑分离，便于逐角色补设计。
// 保持装配/校验、逐角色配置与回落模板三层分离；项目约束见根 AGENTS.md。

import type { CharacterCard } from '@/types/card';
import type { Skill } from '@/types/skill';
import type {
  CompleteSquadSkillKit,
  SkillEffect,
  SquadPosition,
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
  ROLE_TO_POSITION,
  ROLE_META,
  POSITION_META,
  SQUAD_POSITION_ORDER,
  ENERGY_BY_ROLE,
  type SquadArchetype,
} from './squad/archetypeTemplates';
import {
  CHARACTER_KITS,
  SQUAD_SKILL_PENDING_DESIGN_IDS,
  ZONE_TARGET_OVERRIDES,
  type SquadSlotConfig,
} from './squad/characterKits';

// 暂缓设计排除表随配置迁至 data/squad/characterKits.ts；此处再导出以保持既有公共 API。
export { SQUAD_SKILL_PENDING_DESIGN_IDS };

export const SQUAD_SKILL_REQUIRED_SLOTS = ['normalAttack', 'skill1', 'passive', 'ultimate'] as const;
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
type ConfigSlot = 'skill1' | 'passive' | 'ultimate';
const CONFIG_SLOTS = ['skill1', 'passive', 'ultimate'] as const satisfies readonly ConfigSlot[];

const allowedEffectTypes = new Set<string>(ALLOWED_SQUAD_EFFECT_TYPES);
const personalSkillById = new Map<string, Skill>(urCharacterSkills.map(skill => [skill.id, skill]));
const pendingDesignIds = new Set<number>(SQUAD_SKILL_PENDING_DESIGN_IDS);

const targetLabels: Record<TargetSelector, string> = {
  frontEnemy: '前排敌人',
  lowestHpEnemy: '生命最低敌人',
  highestAtkEnemy: '攻击最高敌人',
  backEnemy: '后排敌人',
  allEnemies: '全体敌人',
  frontRowEnemies: '前排敌人',
  middleRowEnemies: '中排敌人',
  backRowEnemies: '后排敌人',
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

/** 该槽覆盖是否声明了专属效果（有 effects = 专属，名优先级最高；仅 name = 只改名，让位个人技名）。 */
function isBespokeSlot(cfg: SquadSlotConfig | undefined): cfg is SquadSlotConfig & { effects: readonly SkillEffect[] } {
  return cfg?.effects !== undefined;
}

/** 组装单槽的 CD/能量额外字段：以槽默认值打底，config 显式提供的字段覆盖之（保持拆分前的字段结构）。 */
function slotExtra(
  cfg: SquadSlotConfig | undefined,
  defaults: Pick<SquadSkillDef, 'cooldownMs' | 'initialCooldownMs' | 'energyCost'>,
): Pick<SquadSkillDef, 'cooldownMs' | 'initialCooldownMs' | 'energyCost'> {
  const extra: Pick<SquadSkillDef, 'cooldownMs' | 'initialCooldownMs' | 'energyCost'> = { ...defaults };
  if (cfg?.cooldownMs !== undefined) extra.cooldownMs = cfg.cooldownMs;
  if (cfg?.initialCooldownMs !== undefined) extra.initialCooldownMs = cfg.initialCooldownMs;
  if (cfg?.energyCost !== undefined) extra.energyCost = cfg.energyCost;
  return extra;
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

/**
 * SC-T1：单一定位入口。显式 role 优先，未命中回落正则，再回落 battle_stats，最后稀有度兜底。
 * kit 生成 / 塔 / 未来养成都读这一处；显式 role 现居 data/squad/characterKits.ts 的 CHARACTER_KITS[id].role。
 */
function resolveArchetype(character: CharacterCard, activeSkill?: Skill, passiveSkill?: Skill): SquadArchetype {
  const explicit = CHARACTER_KITS[character.id]?.role;
  if (explicit) return explicit;
  return inferArchetypeByText(character, activeSkill, passiveSkill);
}

/** 正则 + battle_stats 回落（仅在显式 role 未设时使用）。 */
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
    case 'applyStatus': {
      const st = effect.status;
      // dot/hot 的 amount 是「每跳固定点数」而非比率，按每跳点数渲染（其余状态 amount 为比率，按 % 渲染）。
      if (st.kind === 'dot' || st.kind === 'hot') {
        const tick = Math.round((st.tickIntervalMs ?? 1000) / 1000);
        return `使${target}获得${statusLabels[st.kind]}${st.amount ? `（每${tick}秒${st.amount}点）` : ''}，持续${duration(st.durationMs)}`;
      }
      return `使${target}获得${statusLabels[st.kind]}${st.amount ? ` ${percent(st.amount)}` : ''}，持续${duration(st.durationMs)}`;
    }
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

/**
 * 问题③：把一个「打全体敌人」的技能重定向到某一排（allEnemies→rowSelector）。
 * 只改原本命中 allEnemies 的效果，其它效果（自增益/自护盾等）目标不动；重派描述。
 */
function retargetAoeToRow(def: SquadSkillDef, row: TargetSelector): SquadSkillDef {
  const effects = def.effects.map(effect => {
    const orig = effect.target ?? def.target;
    return { ...effect, target: orig === 'allEnemies' ? row : orig };
  });
  const next: SquadSkillDef = { ...def, target: row, effects };
  return { ...next, description: describeSquadSkill(next) };
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

/** SC-T2：该角色是否有「只改名」型槽覆盖（原 HR 名覆盖表；供测试与 UI 消费）。 */
export function hasHrSkillNameOverride(characterId: number): boolean {
  const kit = CHARACTER_KITS[characterId];
  if (!kit) return false;
  return CONFIG_SLOTS.some(slot => {
    const cfg = kit[slot];
    return cfg?.name !== undefined && cfg.effects === undefined;
  });
}

/** SA-T4：该角色是否拥有招牌差异化 kit（任一槽声明了专属 effects；供 UI「专属徽章」消费）。 */
export function isSignatureKit(characterId: number): boolean {
  const kit = CHARACTER_KITS[characterId];
  if (!kit) return false;
  return CONFIG_SLOTS.some(slot => isBespokeSlot(kit[slot]));
}

/** SC-T1：招牌 kit 的显式 role（未命中招牌返回 undefined）。 */
export function signatureRoleOf(characterId: number): SquadArchetype | undefined {
  return isSignatureKit(characterId) ? CHARACTER_KITS[characterId]?.role : undefined;
}

/** SC-T1：暴露单一定位入口给测试/未来消费端（显式 role → 正则回落 → stats/稀有度兜底）。 */
export function getArchetypeForCharacter(character: CharacterCard, activeSkill?: Skill, passiveSkill?: Skill): SquadArchetype {
  return resolveArchetype(character, activeSkill, passiveSkill);
}

/** PCR 式「职业 + 固有站位」信息（展示层）。由角色 role 推导：职业名 + 前中后站位 + 图标/说明。 */
export interface SquadRoleInfo {
  role: SquadArchetype;
  /** 固有站位（喂给引擎 SquadUnitSetup.position）。 */
  position: SquadPosition;
  /** 职业名（坦克/战士/奶妈…）。 */
  roleLabel: string;
  roleIcon: string;
  roleBlurb: string;
  /** 站位标签（前排/中排/后排）。 */
  positionLabel: string;
  /** 站位排序权重（前 0 / 中 1 / 后 2）。 */
  positionOrder: number;
  /** PCR 式蓄能系数（攻击/受击），供 View 注入进引擎（问题②）。 */
  energyGain: { onAttack: number; onHit: number };
}

/**
 * 由角色推导 PCR 式职业 + 固有站位（单一真相源：CHARACTER_KITS[id].role → 正则/stats 回落）。
 * 编队展示、战场排列、单位条职业芯片都读这一处，保证「显示站位 === 战斗站位」不脱钩。
 */
export function getSquadRoleInfo(character: CharacterCard | null | undefined): SquadRoleInfo | null {
  if (!character) return null;
  const role = resolveArchetype(character, resolvePersonalSkill(character, 'active'), resolvePersonalSkill(character, 'passive'));
  const position = ROLE_TO_POSITION[role];
  const meta = ROLE_META[role];
  const posMeta = POSITION_META[position];
  return {
    role,
    position,
    roleLabel: meta.label,
    roleIcon: meta.icon,
    roleBlurb: meta.blurb,
    positionLabel: posMeta.label,
    positionOrder: SQUAD_POSITION_ORDER[position],
    energyGain: ENERGY_BY_ROLE[role],
  };
}

/** SC-T1：是否为该角色显式钉了 role（测试用：区分显式命中 vs 正则回落）。 */
export function hasExplicitArchetype(characterId: number): boolean {
  return CHARACTER_KITS[characterId]?.role !== undefined;
}

export function getSquadSkillKitForCharacter(character: CharacterCard | null | undefined): CompleteSquadSkillKit | undefined {
  if (!character || !isSquadRarity(character.rarity) || pendingDesignIds.has(character.id)) return undefined;

  const activeSkill = resolvePersonalSkill(character, 'active');
  const passiveSkill = resolvePersonalSkill(character, 'passive');
  const archetype = resolveArchetype(character, activeSkill, passiveSkill);
  const labels = archetypeLabels[archetype];
  const template = archetypeEffects(archetype);
  const name = character.name;
  const activeName = activeSkill?.name;
  const passiveName = passiveSkill?.name;

  // Step 2：逐角色覆盖统一读 CHARACTER_KITS[id]。每槽：有 effects = 专属（名优先级最高），
  // 否则回落原型模板 effects；名优先级 = 个人技名 > 覆盖名 > 原型通名（ultimate 的个人技名走 `·终式`）。
  const kit = CHARACTER_KITS[character.id];
  const k1 = kit?.skill1;
  const kp = kit?.passive;
  const ku = kit?.ultimate;

  const skill1Def = isBespokeSlot(k1)
    ? skill(character, 'skill1', k1.name ?? `${name}·${labels.skill1}`, k1.target ?? template.skill1.target, k1.effects, slotExtra(k1, { cooldownMs: 8000, initialCooldownMs: 1500 }))
    : skill(character, 'skill1', activeName ?? k1?.name ?? `${name}·${labels.skill1}`, template.skill1.target, template.skill1.effects, slotExtra(k1, { cooldownMs: 8000, initialCooldownMs: 1500 }));
  const ultimateDef = isBespokeSlot(ku)
    ? skill(character, 'ultimate', ku.name ?? `${name}·${labels.ultimate}`, ku.target ?? template.ultimate.target, ku.effects, slotExtra(ku, { energyCost: 1000 }))
    : skill(character, 'ultimate', activeName ? `${activeName}·终式` : ku?.name ?? `${name}·${labels.ultimate}`, template.ultimate.target, template.ultimate.effects, slotExtra(ku, { energyCost: 1000 }));

  // 问题③：分排目标覆盖（allEnemies→某一排）。只对精选角色的指定槽生效。
  const zone = ZONE_TARGET_OVERRIDES[character.id];

  return {
    normalAttack: skill(character, 'normal', `${name}·牵制`, 'frontEnemy', [
      { type: 'damage', atkRatio: 1, canCrit: true },
    ]),
    skill1: zone?.skill1 ? retargetAoeToRow(skill1Def, zone.skill1) : skill1Def,
    passive: isBespokeSlot(kp)
      ? skill(character, 'passive', kp.name ?? `${name}·${labels.passive}`, kp.target ?? template.passive.target, kp.effects, slotExtra(kp, {}))
      : skill(character, 'passive', passiveName ?? kp?.name ?? `${name}·${labels.passive}`, template.passive.target, template.passive.effects, slotExtra(kp, {})),
    ultimate: zone?.ultimate ? retargetAoeToRow(ultimateDef, zone.ultimate) : ultimateDef,
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
    // 护盾必须走 `shield` effect（引擎 addShield 才置 shieldRemaining）；applyStatus 的 shield 状态无吸收池 = 空过。
    if (effect.type === 'applyStatus' && effect.status.kind === 'shield') {
      issues.push(`${slotName} uses no-op shield status (use a shield effect instead)`);
    }
  }
}

export function validateSquadSkillKit(kit: Partial<CompleteSquadSkillKit> | undefined): SquadSkillKitValidation {
  const issues: string[] = [];
  validateSlot('normalAttack', kit?.normalAttack, issues);
  validateSlot('skill1', kit?.skill1, issues);
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
