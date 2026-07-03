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
 * SC-T1：显式 archetype 单一真相源（`characterId → SquadArchetype`）。
 *
 * 定位解析优先级（见 `resolveArchetype`）：
 *   显式表（本表，含 SIGNATURE_KIT_OVERRIDES 的 role 种子）→ 正则回落 → battle_stats 兜底 → 稀有度兜底。
 *
 * 显式表专治正则「first-match-wins 误判」的头部尾巴：
 *   - Fate/圣剑系（阿尔托莉雅先被 `骑士` 判 guardian、本质是持圣剑的近战 striker）；
 *   - 音乐/乐队系（`音乐|轻音…` 抢先判 support，但输出型乐队角色应是 striker/arcane）；
 *   - 爆裂/术式系（`爆裂` 落在 arcane 规则里其实该是 striker）。
 * 长尾允许回落正则（archetype 只兜长尾，头部差异化靠本表 per-character）。
 *
 * 注意：本表的键值必被 `EXPLICIT_ARCHETYPE[id] === SIGNATURE_KIT_OVERRIDES[id].role` 断言守卫
 * （见 squadSkillKits.test.ts），故 10 个招牌 UR 的定位与其 override.role 强一致。
 */
const EXPLICIT_ARCHETYPE: Record<number, SquadArchetype> = {
  // === 招牌 UR 种子（与 SIGNATURE_KIT_OVERRIDES[id].role 强一致，测试断言守卫）===
  3575: 'striker', // 御坂美琴
  10440: 'controller', // 晓美焰
  304: 'striker', // 惣流·明日香
  706: 'controller', // 战场原黑仪
  10439: 'support', // 鹿目圆
  49: 'controller', // 长门有希
  12393: 'tactical', // 牧濑红莉栖
  10596: 'arcane', // 远坂凛
  1211: 'striker', // 忍野忍
  303: 'guardian', // 绫波丽
  // === 已知误判纠偏（正则 first-match-wins 排序错位）===
  273: 'striker', // 阿尔托莉雅·潘德拉贡：正则先命中「骑士」→guardian，实为持圣剑近战输出，纠正为 striker
  86246: 'arcane', // 芙莉莲：大魔法师，正则命中「芙莉莲」→arcane（此处显式固定，防未来正则改动漂移）
  35608: 'arcane', // 艾米莉娅（Re:Zero 精灵/魔法系）
  71337: 'striker', // 玛奇玛（链锯人，支配之魔，近战压制型 striker）
  19546: 'striker', // 利威尔（人类最强兵长，纯近战 striker）
  18102: 'striker', // 三笠·阿克曼（巨人杀手 striker）
  57751: 'striker', // 02（DARLING 驾驶员/近战突袭）——正则会落进 tactical(DARLING) 但人设是突袭 striker
  26003: 'support', // 宫园薰（四月是你的谎言，小提琴演奏 support）
};

/**
 * SC-T1：单一定位入口。显式表优先，未命中回落正则，再回落 battle_stats，最后稀有度兜底。
 * kit 生成 / 塔 / 未来养成都读这一处；`SIGNATURE_KIT_OVERRIDES[id].role` 通过显式表种子在此生效。
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

/**
 * SA-T4：招牌 UR 差异化覆盖层（数据表）。
 * key = 数字 character.id（仅 UR，且必在 characterSkillsMap 有个人技绑定）；
 * value = 对 skill1 / ultimate 的**结构化 effect 覆盖** + 一个「名场面/名台词」技能名（借个人技语义、效果自造）。
 *
 * 铁律（见 plan.md T4-B/C/D/E）：
 *  - 只用现有 9 种 squad SkillEffect，绝不搬 /battle effectId、绝不扩 type / 写 handler；
 *  - 覆盖 kit 仍走 skill() 工厂让 description = describeSquadSkill 自动派生（禁手写 description）；
 *  - 每条覆盖至少一条**肉眼可辨的机制层差异**（目标 / effect 类型 / 特殊机制 execute·revive·群体 stun/silence·独特 DOT），非纯倍率微调；
 *  - 覆盖 kit 必过 validateSquadSkillKit，落地前后 filter(isSquadSkillKitReady) 全角色集合不变（守 SA-T2 同源）。
 */
interface SignatureSlotOverride {
  name: string;
  target: TargetSelector;
  effects: readonly SkillEffect[];
  cooldownMs?: number;
  initialCooldownMs?: number;
  energyCost?: number;
}

interface SignatureKitOverride {
  /** 显式定位（供未来 UI / SA-T3 头部映射消费；本轮不改成长，仅记录人设倾向）。 */
  role: SquadArchetype;
  skill1?: SignatureSlotOverride;
  ultimate?: SignatureSlotOverride;
}

const SIGNATURE_KIT_OVERRIDES: Record<number, SignatureKitOverride> = {
  // 御坂美琴 · 超电磁炮：单体高倍炮击 + 电磁干扰（沉默），一发定点秒杀式（striker 原型是斩杀，这里是「点名 + 封技」）。
  3575: {
    role: 'striker',
    skill1: {
      name: '超电磁炮',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.05, spRatio: 0.3, canCrit: true },
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 4000 } },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
  },
  // 晓美焰 · 时间停止：全体敌人 stun（时停群控），controller 原型仅 1.2s 短眩，这里是长时停 + 全体减速。
  10440: {
    role: 'controller',
    ultimate: {
      name: '时间停止',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'stun', durationMs: 3000 } },
        { type: 'applyStatus', status: { kind: 'slow', amount: 0.25, durationMs: 8000 } },
      ],
      energyCost: 1000,
    },
  },
  // 惣流·明日香 · 同步率爆发：自身极限自强（攻+暴击+加速三叠），striker 原型 skill1 是伤害，这里改成 self 爆发型 buff。
  304: {
    role: 'striker',
    skill1: {
      name: '同步率爆发',
      target: 'self',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkUp', amount: 0.45, durationMs: 8000 } },
        { type: 'applyStatus', status: { kind: 'critRateUp', amount: 0.25, durationMs: 8000 } },
        { type: 'applyStatus', status: { kind: 'haste', amount: 0.2, durationMs: 8000 } },
      ],
      cooldownMs: 11000,
      initialCooldownMs: 3000,
    },
  },
  // 战场原黑仪 · 毒舌反击：点名最强敌 → 沉默 + 大幅降攻 + 驱散其增益，纯控 debuff（controller 原型 skill1 是伤害+沉默）。
  706: {
    role: 'controller',
    skill1: {
      name: '毒舌反击',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'dispel' },
        { type: 'applyStatus', status: { kind: 'atkDown', amount: 0.35, durationMs: 7000 } },
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 3500 } },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
  },
  // 鹿目圆 · 圆环之理：全体治疗 + 净化 + 复活倒下队友（希望复活），support 原型 ultimate 已有 revive，这里强化为「群疗 + 复活」双兜底且复活血更高。
  10439: {
    role: 'support',
    ultimate: {
      name: '圆环之理',
      target: 'allAllies',
      effects: [
        { type: 'heal', spRatio: 1, flatPower: 120 },
        { type: 'cleanse' },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.6 },
      ],
      energyCost: 1000,
    },
  },
  // 长门有希 · 信息操作：全体敌人长沉默（封技流），controller 原型 ultimate 是伤害+短眩，这里是纯封锁全场技能。
  49: {
    role: 'controller',
    ultimate: {
      name: '信息操作',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 6000 } },
        { type: 'applyStatus', status: { kind: 'defDown', amount: 0.2, durationMs: 8000 } },
      ],
      energyCost: 1000,
    },
  },
  // 牧濑红莉栖 · 时间理论：全队充能 + 全队加速（抢先手/连发大招），tactical 原型 skill1 是打后排，这里是团队节奏加速。
  12393: {
    role: 'tactical',
    skill1: {
      name: '时间理论',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', amount: 120 },
        { type: 'applyStatus', status: { kind: 'haste', amount: 0.18, durationMs: 7000 } },
      ],
      cooldownMs: 12000,
      initialCooldownMs: 3500,
    },
  },
  // 远坂凛 · 宝石魔术：单体巨额 SP 爆发 + 独特高伤 DOT（宝石余烬灼烧），arcane 原型 ultimate 是全体，这里是单体秒杀 + 持续。
  10596: {
    role: 'arcane',
    ultimate: {
      name: '宝石魔术',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 0.4, spRatio: 2, canCrit: true },
        { type: 'applyStatus', status: { kind: 'dot', amount: 90, durationMs: 8000, tickIntervalMs: 2000 } },
      ],
      energyCost: 1000,
    },
  },
  // 忍野忍 · 吸血冲击：处决残血敌（高血线斩杀）+ 自身回血（吸血），striker 原型也有 execute 但阈值低，这里阈值更高（更霸道的处决）且自吸血。
  1211: {
    role: 'striker',
    ultimate: {
      name: '吸血冲击',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.8, spRatio: 0.4, canCrit: true },
        { type: 'execute', hpRatioThreshold: 0.3 },
        { type: 'heal', target: 'self', spRatio: 0.6, flatPower: 60 },
      ],
      energyCost: 1000,
    },
  },
  // 绫波丽 · AT力场：自身超厚护盾 + 嘲讽拉仇恨（铁壁坦克），guardian 原型 skill1 是奶队友，这里改成自身硬抗承伤。
  303: {
    role: 'guardian',
    skill1: {
      name: 'AT力场',
      target: 'self',
      effects: [
        { type: 'shield', spRatio: 0.6, defRatio: 1.8, flatPower: 120, durationMs: 8000 },
        { type: 'applyStatus', status: { kind: 'taunt', durationMs: 6000 } },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 1500,
    },
  },
};

/**
 * SC-T2：未覆盖 HR 的「个人技能名」覆盖表（只改**名**，effect / description 仍回落原型模板并由
 * describeSquadSkill 自动派生——严禁手写 description，严禁引 /battle effectId）。
 *
 * 范围 = scout 核实的 26 个「无个人技绑定、名 100% 走 `${name}·${labels.skillN}` 通名」的 HR
 * （已在 urCharacterSkillMap 有绑定的 29 个 HR 不动）。UR 走各自个人技名 / SIGNATURE 覆盖，不进本表。
 *
 * 双红线（见 plan.md SC-T2）：
 *  - 红线 1：描述必 describeSquadSkill 派生（本表只提供 name 字符串，不碰 effect）。
 *  - 红线 2：名偏中性人设 / 名台词 / 名场面，**不得**暗示与原型 effect 冲突的机制
 *    （如 support/guardian 原型不起「斩杀/处决」类攻击名，striker 不起「结界/庇护」类防御名）。
 * 缺省的槽位回落原型通名（未提供的键沿用 `${name}·${labels.skillN}`）。
 */
interface HrSkillNameOverride {
  skill1?: string;
  skill2?: string;
  passive?: string;
  ultimate?: string;
}

const HR_SKILL_NAME_OVERRIDES: Record<number, HrSkillNameOverride> = {
  // support：白色相簿2 · 冬马和纱（音乐/演奏系鼓舞）
  13391: { skill1: '寒空的旋律', skill2: '琴音共鸣', passive: '雪夜练习曲', ultimate: '未完成的乐章' },
  // support：MyGO · 高松灯（迷途歌声）
  127790: { skill1: '迷途之声', skill2: '春日影', passive: '不想成为一个人', ultimate: '为了不再迷路' },
  // support：Ave Mujica · 三角初华（假面台上的和声）
  132479: { skill1: '假面序曲', skill2: '舞台和声', passive: '初华绽放', ultimate: '谢幕安可' },
  // support：莉兹与青鸟 · 铠冢霙（双簧管的呼吸）
  40739: { skill1: '青鸟的呼吸', skill2: '双簧共鸣', passive: '第三乐章', ultimate: '莉兹与青鸟' },
  // support：欢迎加入NHK · 中原岬（温柔的契约）
  336: { skill1: '救赎契约', skill2: '并肩同行', passive: '不再孤独', ultimate: '走出房间' },
  // support*：四月是你的谎言 · 宫园薰（小提琴的自由演奏）
  26003: { skill1: '自由的音色', skill2: '即兴华彩', passive: '琴弦上的春天', ultimate: '你在春天里' },

  // arcane：魔法少女小圆 · 丘比（契约与愿望）
  10446: { skill1: '契约诱导', skill2: '愿望回收', passive: '情感观测', ultimate: '因果律干涉' },
  // arcane：魔女之旅 · 伊蕾娜（旅途的魔法）
  72355: { skill1: '旅人魔术', skill2: '风纹咒式', passive: '灰之魔女', ultimate: '星降之夜' },
  // arcane：魔法少女伊莉雅 · 伊莉雅斯菲尔（魔术礼装）
  3218: { skill1: '魔术卡装填', skill2: '英灵借力', passive: '爱因兹贝伦血脉', ultimate: '柯普利亚全解放' },
  // arcane：Re:Zero · 蕾姆（冰之魔法 / 鬼族）
  35615: { skill1: '冰华绽放', skill2: '流星锤连击', passive: '鬼族血脉', ultimate: '冰之棺墓' },
  // arcane：约会大作战 · 时崎狂三（时之精灵刻刻帝）
  19529: { skill1: '刻刻帝·一之弹', skill2: '影之分身', passive: '时之精灵', ultimate: '刻刻帝·终' },

  // controller：超时空辉夜姬 · 酒寄彩叶（时空干涉）
  189814: { skill1: '时空错位', skill2: '解析视界', passive: '因果观测', ultimate: '时轴封锁' },
  // controller：路人女主 · 泽村英梨梨（原画家的锐利笔锋）
  24093: { skill1: '毒舌吐槽', skill2: '锐利笔锋', passive: '傲娇本色', ultimate: '同人志决战' },
  // controller：路人女主 · 霞之丘诗羽（毒舌剧作家的布局）
  24092: { skill1: '剧本布局', skill2: '致命吐槽', passive: '毒舌剧作家', ultimate: '恋爱节拍杀' },

  // guardian：更衣人偶 · 喜多川海梦（在场的元气支撑）
  102090: { skill1: '同好守护', skill2: '元气应援', passive: '闪耀直率', ultimate: 'cosplay全开' },
  // guardian：夏洛特 · 友利奈绪（能力隐蔽的护持）
  29511: { skill1: '隐身护持', skill2: '能力压制', passive: '姐系可靠', ultimate: '守护约定' },
  // guardian：寒蝉 · 古手梨花（轮回中的坚守）
  3187: { skill1: '御社神护', skill2: '轮回坚守', passive: '百年之约', ultimate: '命运的抵抗' },
  // guardian：夏日口袋 · 鸣濑白羽（夏日的守望）
  59846: { skill1: '夏日守望', skill2: '海风庇护', passive: '温柔坚守', ultimate: '不让你消失' },
  // guardian：中二病 · 小鸟游六花（邪王真眼的结界）
  17362: { skill1: '邪王真眼', skill2: '契约结界', passive: '中二结界', ultimate: '暗黑闪光' },
  // guardian：摇曳百合 · 赤座灯里（治愈系的存在感守护）
  13004: { skill1: '存在感守护', skill2: '暖心陪伴', passive: '路人光环', ultimate: '大家一起' },
  // guardian：夏日口袋 · 久岛鸥（守护同伴的少女）
  59848: { skill1: '并肩守护', skill2: '海边约定', passive: '沉静坚守', ultimate: '守望夏日' },
  // guardian：未来日记 · 我妻由乃（偏执的守护）
  671: { skill1: '专属守护', skill2: '日记预知', passive: '病娇执念', ultimate: '为你挡下一切' },
  // guardian：摇曳露营 · 各务原抚子（野营的温暖庇护）
  56775: { skill1: '篝火庇护', skill2: '温暖分享', passive: '露营慢活', ultimate: '满天星空' },

  // striker*：DARLING · 02（突击驾驶员）
  57751: { skill1: '突击冲锋', skill2: '猛兽本能', passive: '亲爱的', ultimate: '螺旋突刺' },
  // striker：进击的巨人 · 利威尔（人类最强之刃）
  19546: { skill1: '立体机动斩', skill2: '疾风连刃', passive: '人类最强', ultimate: '必杀回旋斩' },
  // striker：链锯人 · 玛奇玛（支配之力的压制）
  71337: { skill1: '支配压制', skill2: '锁链束缚', passive: '支配之魔', ultimate: '万人践踏' },
};

/** SC-T2：暴露 HR 名覆盖表命中判定（测试用）。 */
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
