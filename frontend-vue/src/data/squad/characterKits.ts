// 小队战「逐角色 kit」统一配置（声明式数据，无逻辑）。
// 简化（2026-07-03）：每角色 = 普攻(通用) + 专属技能 skill1(冷却) + 专属被动 passive(开场持续) + 大招(能量)。
// 移除第二个主动技能 skill2；被动升级为逐角色专属 effect（开场施加一次、持续整场）。
// 装配/校验逻辑在 squadSkillKits.ts，回落模板在 archetypeTemplates.ts。
// 现状与方案见 docs/orch/squad-skill-design-audit-2026-07-03.md。

import type { SkillEffect, TargetSelector } from '@/engine/squad/types'
import type { SquadArchetype } from './archetypeTemplates'

/** 单个技能槽的逐角色覆盖。带 effects = 专属效果（名压过个人技名）；仅 name = 只改名（名让位个人技名）。 */
export interface SquadSlotConfig {
  name?: string
  target?: TargetSelector
  effects?: readonly SkillEffect[]
  cooldownMs?: number
  initialCooldownMs?: number
  energyCost?: number
}

/** 一个角色的完整 kit 覆盖（缺省的槽/字段回落原型模板 + 通名）。normalAttack 恒通用，不开放覆盖。 */
export interface CharacterKitConfig {
  role?: SquadArchetype
  skill1?: SquadSlotConfig
  passive?: SquadSlotConfig
  ultimate?: SquadSlotConfig
}

/** 暂缺设计、临时排除出小队战的角色 id（占位，空数组 = 无排除）。 */
export const SQUAD_SKILL_PENDING_DESIGN_IDS: readonly number[] = []

export const CHARACTER_KITS: Record<number, CharacterKitConfig> = {
  5: {
    role: 'arcane',
    skill1: {
      name: '团子大家族',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '梦幻世界的少女',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.18 },
        },
      ],
    },
    ultimate: {
      name: '世界尽头的小提琴',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 55, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  6: {
    role: 'support',
    skill1: {
      name: '海星在此！',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.4, flatPower: 40 },
        { type: 'cleanse', target: 'lowestHpAlly' },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '被遗忘之人的守望',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 25, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '找朋友的木雕祈愿',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 0.9, flatPower: 30 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 6000, amount: 50, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  32: {
    role: 'support',
    skill1: {
      name: '只属于你的人',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1, spRatio: 0.6, flatPower: 45 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.18 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '唧的记忆',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '寻找心爱之人',
      target: 'firstDefeatedAlly',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        { type: 'heal', target: 'allAllies', atkRatio: 0.7, spRatio: 0.5 },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  47: {
    role: 'tactical',
    skill1: {
      name: '又是这种展开吗',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', target: 'self', amount: 90 },
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 6000, amount: 0.18 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '被卷入的日常',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', target: 'allAllies', amount: 90 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '无奈的最优解',
      target: 'allAllies',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 8000, amount: 0.28 } },
        { type: 'energyGain', target: 'self', amount: 100 },
      ],
      energyCost: 1000,
    },
  },
  49: {
    role: 'controller',
    passive: {
      name: '情报统合思念体',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '信息操作',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 6000 } },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 8000, amount: 0.2 } },
      ],
      energyCost: 1000,
    },
  },
  50: {
    role: 'support',
    skill1: {
      name: '未来人的应急处置',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.2, spRatio: 0.4 },
        { type: 'cleanse', target: 'lowestHpAlly' },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '迷糊的未来人',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 22, tickIntervalMs: 2000 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
    },
    ultimate: {
      name: '禁则事项·时间修复',
      target: 'firstDefeatedAlly',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        { type: 'heal', target: 'allAllies', atkRatio: 0.7 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.18 },
        },
      ],
      energyCost: 1000,
    },
  },
  53: {
    role: 'support',
    skill1: {
      name: '呐,一起去吧',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.4 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'hot', durationMs: 6000, amount: 60, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8600,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '高高在上的夏空',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '到达远空的夏之翼',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1.1 },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.22 },
        },
      ],
      energyCost: 1000,
    },
  },
  74: {
    role: 'support',
    skill1: {
      name: '友人帐归还',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', spRatio: 1.4 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '温柔的羁绊',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 28, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '斑猫老师·妖力庇护',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', spRatio: 0.9 },
        { type: 'shield', target: 'allAllies', spRatio: 0.6, durationMs: 8000 },
        { type: 'dispel', target: 'allEnemies' },
      ],
      energyCost: 1000,
    },
  },
  79: {
    role: 'striker',
    skill1: {
      name: '赏金猎人的直觉',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '菲·瓦伦坦·天赋',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.18 },
        },
      ],
    },
    ultimate: {
      name: '记忆的赌注',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.4, canCrit: true },
        { type: 'execute', hpRatioThreshold: 0.25 },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
      energyCost: 1000,
    },
  },
  86: {
    role: 'striker',
    skill1: {
      name: '钢之炼成·长枪突刺',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '钢之意志',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '等价交换·全金属炼金',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 7000, amount: 0.28 },
        },
      ],
      energyCost: 1000,
    },
  },
  156: {
    role: 'support',
    skill1: {
      name: '蟲之诊断',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.2, spRatio: 0.6, flatPower: 40 },
        { type: 'cleanse', target: 'lowestHpAlly' },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '与蟲共存',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 24, tickIntervalMs: 2000 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
    },
    ultimate: {
      name: '光酒·生命之泉',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1, spRatio: 0.7, flatPower: 50 },
        {
          type: 'applyStatus',
          status: { kind: 'hot', durationMs: 8000, amount: 60, tickIntervalMs: 2000 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  229: {
    role: 'striker',
    skill1: {
      name: '紫伞破魔连击',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 5000, amount: 0.22 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '夜兔族之血',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.2 },
        },
      ],
    },
    ultimate: {
      name: '夜兔的怪力咆哮',
      target: 'allEnemies',
      effects: [
        { type: 'damage', atkRatio: 1.1, canCrit: true },
        { type: 'applyStatus', status: { kind: 'stun', durationMs: 2000 } },
      ],
      energyCost: 1000,
    },
  },
  266: {
    role: 'striker',
    skill1: {
      name: '变换之翼·斩',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '达克尼斯的杀意',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.16 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '黑暗物质·全武装',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.4, canCrit: true },
        { type: 'execute', hpRatioThreshold: 0.25 },
      ],
      energyCost: 1000,
    },
  },
  273: {
    role: 'striker',
  },
  292: {
    role: 'arcane',
    skill1: {
      name: '黑之契约者·电流贯穿',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.5, canCrit: true },
        { type: 'applyStatus', status: { kind: 'stun', durationMs: 1500 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '无偿的能力者',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '契约的代价·黑之死神',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 8000, amount: 0.28 } },
      ],
      energyCost: 1000,
    },
  },
  293: {
    role: 'support',
    skill1: {
      name: '电流治愈之手',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.2, spRatio: 0.4 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'hot', durationMs: 6000, amount: 50, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '能力回收的代价',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 26, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '李舜生的双重身份',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 1 },
        { type: 'cleanse', target: 'allAllies' },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
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
    passive: {
      name: '绫波丽·天赋',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.22 },
        },
        { type: 'shield', target: 'self', defRatio: 1, flatPower: 50, durationMs: 90000 },
      ],
    },
  },
  304: {
    role: 'striker',
    skill1: {
      name: '同步率爆发',
      target: 'self',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 8000, amount: 0.45 } },
        { type: 'applyStatus', status: { kind: 'critRateUp', durationMs: 8000, amount: 0.25 } },
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 8000, amount: 0.2 } },
      ],
      cooldownMs: 11000,
      initialCooldownMs: 3000,
    },
    passive: {
      name: '永不服输的骄傲',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.18 },
        },
      ],
    },
  },
  319: {
    role: 'controller',
    skill1: {
      name: '百分百好孩子的微笑',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 5000, amount: 0.3 } },
        { type: 'damage', atkRatio: 1.2, canCrit: true },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '完美天使的假面',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '我可是很坏的女人哦',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'slow', durationMs: 5000, amount: 0.3 } },
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 4000 } },
        { type: 'dispel' },
      ],
      energyCost: 1000,
    },
  },
  329: {
    role: 'arcane',
    skill1: {
      name: '无法传达的歌声',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '偶像的执念',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.16 },
        },
      ],
    },
    ultimate: {
      name: 'SOUND OF DESTINY',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 65, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  336: {
    skill1: { name: '救赎契约' },
    passive: { name: '不再孤独' },
    ultimate: { name: '走出房间' },
  },
  468: {
    role: 'tactical',
    skill1: {
      name: '节奏爆发',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.28 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1600,
    },
    passive: {
      name: '轻音部的鼓点',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 70 },
      ],
    },
    ultimate: {
      name: '鼓手的全力独奏',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', target: 'self', amount: 110 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 8000, amount: 0.3 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 8000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  469: {
    role: 'support',
    skill1: {
      name: '大小姐的下午茶',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', spRatio: 0.7 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '温柔的贵族气质',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.14 },
        },
      ],
    },
    ultimate: {
      name: '华丽的键盘协奏',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', spRatio: 1 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 8000, amount: 0.3 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  671: {
    skill1: { name: '专属守护' },
    passive: { name: '病娇执念' },
    ultimate: { name: '为你挡下一切' },
  },
  706: {
    role: 'controller',
    skill1: {
      name: '毒舌反击',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'dispel' },
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 7000, amount: 0.35 } },
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 3500 } },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '傲娇的毒舌锋芒',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
  },
  878: {
    role: 'striker',
    skill1: {
      name: '欧啦欧啦欧啦',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 6000, amount: 0.25 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '沉着冷静的高中生',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '白金之星·时停',
      target: 'frontEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'stun', durationMs: 2500 } },
        { type: 'damage', atkRatio: 2.2, canCrit: true },
        { type: 'execute', hpRatioThreshold: 0.25 },
      ],
      energyCost: 1000,
    },
  },
  951: {
    role: 'arcane',
    skill1: {
      name: '真红之炎·飞焰',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'dot', durationMs: 6000, amount: 65, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '火雾战士の炎',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 90000, amount: 28, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '天壤劫火·炎髪灼眼',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.22 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  1007: {
    role: 'striker',
    skill1: {
      name: '不良少年的直拳',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.22 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '光坂的传说',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.15 },
        },
        { type: 'shield', target: 'self', defRatio: 1, flatPower: 50, durationMs: 30000 },
      ],
    },
    ultimate: {
      name: '守护家庭的觉悟',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.2, canCrit: true },
        { type: 'execute', hpRatioThreshold: 0.28 },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 5000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  1211: {
    role: 'striker',
    passive: {
      name: '传说的吸血鬼·怪异之王',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'hot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
      ],
    },
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
  1227: {
    role: 'arcane',
    skill1: {
      name: '王之财宝',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 0.95, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '英雄王的傲慢',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '天地乖离开辟之星',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.45, canCrit: true },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'stun', durationMs: 2000 } },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 8000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  1937: {
    role: 'controller',
    skill1: {
      name: '能力使的情报网',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 5000, amount: 0.2 },
        },
        { type: 'dispel', target: 'allEnemies' },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '学园都市的普通人',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '揭开裙底的绝技',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 4500 },
        },
        { type: 'damage', atkRatio: 0.9, canCrit: true },
      ],
      energyCost: 1000,
    },
  },
  2215: {
    role: 'controller',
    skill1: {
      name: '死神的注视',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', spRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '死亡笔记之主',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '计划通·新世界的神',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'stun', durationMs: 2500 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 4000 },
        },
      ],
      energyCost: 1000,
    },
  },
  2354: {
    role: 'striker',
    skill1: {
      name: '冲锋螺旋',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', target: 'frontEnemy', atkRatio: 1.9, canCrit: true },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '相信自己的螺旋',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.16 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '钻头贯穿天际',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', atkRatio: 1.1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.35 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.18 },
        },
      ],
      energyCost: 1000,
    },
  },
  2629: {
    role: 'controller',
    skill1: {
      name: '圣书目录·审判',
      target: 'frontEnemy',
      effects: [
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'silence', durationMs: 4000 },
        },
        { type: 'damage', target: 'frontEnemy', spRatio: 1.6, canCrit: true },
      ],
      cooldownMs: 8700,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '完全记忆能力',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '十万三千冊魔导书',
      target: 'allEnemies',
      effects: [
        { type: 'dispel', target: 'allEnemies' },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 5000 },
        },
        { type: 'damage', target: 'allEnemies', spRatio: 1.2, canCrit: true },
      ],
      energyCost: 1000,
    },
  },
  2765: {
    role: 'arcane',
    skill1: {
      name: '封印解除',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', spRatio: 1.7, canCrit: true },
        {
          type: 'applyStatus',
          target: 'lowestHpEnemy',
          status: { kind: 'dot', durationMs: 6000, amount: 55, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '库洛牌之主',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.16 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
    },
    ultimate: {
      name: '库洛牌·全部收服',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.3 },
        },
        { type: 'shield', target: 'allAllies', spRatio: 0.5, durationMs: 7000 },
      ],
      energyCost: 1000,
    },
  },
  2902: {
    role: 'tactical',
    skill1: {
      name: 'TAROS战术指挥',
      target: 'allAllies',
      effects: [
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 6000, amount: 0.2 } },
        { type: 'energyGain', target: 'self', amount: 90 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '天才指挥官',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 60 },
      ],
    },
    ultimate: {
      name: '舰长的最终作战',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', amount: 110 },
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 8000, amount: 0.25 } },
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 8000, amount: 0.2 } },
      ],
      energyCost: 1000,
    },
  },
  3182: {
    role: 'striker',
    skill1: {
      name: '锄头一闪',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: 'L5发症の执念',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.14 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '嘘だ！——鬼隐狂乱',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', target: 'frontEnemy', atkRatio: 2.4, canCrit: true },
        { type: 'execute', target: 'frontEnemy', hpRatioThreshold: 0.3 },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  3187: {
    skill1: { name: '御社神护' },
    passive: { name: '百年之约' },
    ultimate: { name: '命运的抵抗' },
  },
  3189: {
    role: 'support',
    skill1: {
      name: '羽入的守护',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1, spRatio: 0.6, flatPower: 45 },
        { type: 'cleanse', target: 'allAllies' },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '绵流之神',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 28, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '跨越无数轮回的奇迹',
      target: 'firstDefeatedAlly',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        { type: 'heal', target: 'allAllies', atkRatio: 0.7, spRatio: 0.6 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.22 },
        },
      ],
      energyCost: 1000,
    },
  },
  3214: {
    role: 'striker',
    skill1: {
      name: '投影·干将莫邪',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.4, spRatio: 0.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 7000, amount: 0.2 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '正义的伙伴',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.14 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '剑之楼台',
      target: 'allEnemies',
      effects: [
        { type: 'damage', atkRatio: 1.2, spRatio: 0.5, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 6000, amount: 0.15 } },
      ],
      energyCost: 1000,
    },
  },
  3215: {
    role: 'arcane',
    skill1: {
      name: '影之侵蚀',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 65, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '被侵蚀的少女',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '黑化樱·此花开耶姬',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.3 },
        },
        { type: 'heal', target: 'self', spRatio: 0.7 },
      ],
      energyCost: 1000,
    },
  },
  3216: {
    role: 'guardian',
    skill1: {
      name: '投影·干将莫邪',
      target: 'self',
      effects: [
        { type: 'shield', target: 'self', defRatio: 1.7, flatPower: 80, durationMs: 7000 },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'taunt', durationMs: 5000 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '贯彻理想的守护者',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.16 },
        },
        { type: 'shield', target: 'self', defRatio: 1, flatPower: 50, durationMs: 30000 },
      ],
    },
    ultimate: {
      name: '无限剑制',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', atkRatio: 1.1, canCrit: true },
        { type: 'shield', target: 'self', defRatio: 2, flatPower: 110, durationMs: 8000 },
      ],
      energyCost: 1000,
    },
  },
  3218: {
    skill1: { name: '魔术卡装填' },
    passive: { name: '爱因兹贝伦血脉' },
    ultimate: { name: '柯普利亚全解放' },
  },
  3221: {
    role: 'striker',
    skill1: {
      name: '起源弹·致命一击',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'lowestHpEnemy',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.22 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '不择手段の理想',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '魔术师杀手の必杀',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'execute', target: 'lowestHpEnemy', hpRatioThreshold: 0.35 },
        { type: 'damage', target: 'lowestHpEnemy', atkRatio: 2.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  3498: {
    role: 'guardian',
    skill1: {
      name: '幻想杀手',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'dispel' },
        { type: 'damage', atkRatio: 1.4, canCrit: true },
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 4000 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '不幸体质',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.14 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '先把你那套幻想给打碎吧',
      target: 'self',
      effects: [
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'taunt', durationMs: 5000 } },
        { type: 'shield', spRatio: 1.2, defRatio: 1, flatPower: 80, durationMs: 8000 },
        { type: 'damage', target: 'allEnemies', atkRatio: 0.8, canCrit: true },
      ],
      energyCost: 1000,
    },
  },
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
    passive: {
      name: '电击使的骄傲',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
  },
  3576: {
    role: 'striker',
    skill1: {
      name: '空间转移突袭',
      target: 'backEnemy',
      effects: [
        { type: 'damage', atkRatio: 2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'backEnemy',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '空间移动的风纪委员',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.45 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.45 },
        },
      ],
    },
    ultimate: {
      name: '姐姐大人只属于我',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        { type: 'execute', target: 'lowestHpEnemy', hpRatioThreshold: 0.25 },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 5000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  3880: {
    role: 'support',
    skill1: {
      name: '关东煮的今川烧执念',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 0.85, flatPower: 55 },
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 5000, amount: 0.2 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '宅趣满溢的日常',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'self', amount: 70 },
      ],
    },
    ultimate: {
      name: '毒舌吐槽的连珠炮',
      target: 'allAllies',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 6000, amount: 0.28 } },
        { type: 'cleanse', target: 'allAllies' },
        { type: 'heal', atkRatio: 0.8, flatPower: 50 },
      ],
      energyCost: 1000,
    },
  },
  4546: {
    role: 'striker',
    skill1: {
      name: 'New Type觉醒',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', target: 'highestAtkEnemy', atkRatio: 2.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8400,
      initialCooldownMs: 1700,
    },
    passive: {
      name: 'New Type的觉醒',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.45 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.45 },
        },
      ],
    },
    ultimate: {
      name: '百式全弹连射',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', atkRatio: 1.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  5088: {
    role: 'tactical',
    skill1: {
      name: '作战指挥',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', atkRatio: 0.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '作战部长的号令',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.45 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
    },
    ultimate: {
      name: '矢岛作战·全军突击',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 8000, amount: 0.35 },
        },
        { type: 'energyGain', target: 'self', amount: 100 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 8000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  5922: {
    role: 'support',
    skill1: {
      name: '闪耀的笑容',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.3 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'critRateUp', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '永远的偶像之光',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '传递给所有人的HONEY HEARTBEAT',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.25 },
        },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.4 },
      ],
      energyCost: 1000,
    },
  },
  5928: {
    role: 'arcane',
    skill1: {
      name: '夜想曲·音波冲击',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'silence', durationMs: 3500 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '凛冽澄澈的歌声',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.22 },
        },
      ],
    },
    ultimate: {
      name: '歌に形はないけれど',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  7043: {
    role: 'arcane',
    skill1: {
      name: 'APTX-4869',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', spRatio: 1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'lowestHpEnemy',
          status: { kind: 'dot', durationMs: 6000, amount: 70, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '科学家的洞察',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.16 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '科学家的赎罪',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 60, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  7998: {
    role: 'support',
    skill1: {
      name: '为小樱量身定制的战衣',
      target: 'lowestHpAlly',
      effects: [
        { type: 'shield', spRatio: 1, defRatio: 0.8, durationMs: 7000 },
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '凝望挚友的镜头',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.45 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '永远的摄影机记录',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 0.9, flatPower: 60 },
        { type: 'applyStatus', status: { kind: 'critRateUp', durationMs: 6000, amount: 0.25 } },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  10439: {
    role: 'support',
    passive: {
      name: '圆环之理的祈愿',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 32, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
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
  10440: {
    role: 'controller',
    passive: {
      name: '时间的守望者',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.45 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '时间停止',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'stun', durationMs: 3000 } },
        { type: 'applyStatus', status: { kind: 'slow', durationMs: 8000, amount: 0.25 } },
      ],
      energyCost: 1000,
    },
  },
  10445: {
    role: 'guardian',
    skill1: {
      name: '治愈魔女之守',
      target: 'self',
      effects: [
        { type: 'shield', defRatio: 1.2, flatPower: 60, durationMs: 7000 },
        { type: 'applyStatus', status: { kind: 'taunt', durationMs: 5000 } },
        {
          type: 'applyStatus',
          status: { kind: 'hot', durationMs: 6000, amount: 30, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '献身的再生之愿',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'hot', durationMs: 90000, amount: 28, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '献身之剑',
      target: 'self',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 8000, amount: 0.35 } },
        { type: 'shield', defRatio: 1.5, flatPower: 100, durationMs: 8000 },
        { type: 'heal', spRatio: 0.8, flatPower: 60 },
      ],
      energyCost: 1000,
    },
  },
  10446: {
    skill1: { name: '契约诱导' },
    passive: { name: '情感观测' },
    ultimate: { name: '因果律干涉' },
  },
  10488: {
    role: 'arcane',
    skill1: {
      name: '缝糸剑·丝带缠绕',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        { type: 'applyStatus', status: { kind: 'slow', durationMs: 6000, amount: 0.2 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '永不满足的甜牙',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.18 },
        },
        { type: 'energyGain', target: 'self', amount: 70 },
      ],
    },
    ultimate: {
      name: '甜食天使·终末制裁',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 8000, amount: 0.25 } },
      ],
      energyCost: 1000,
    },
  },
  10538: {
    role: 'tactical',
    skill1: {
      name: '萌萌哒变身，欢迎回来主人',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.18 },
        },
        { type: 'energyGain', target: 'self', amount: 75 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '天然系店长的款待',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.45 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '女仆咖啡厅の全员服务',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 7000, amount: 0.25 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 90 },
      ],
      energyCost: 1000,
    },
  },
  10564: {
    role: 'controller',
    skill1: {
      name: '混沌的碎片·推理',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.22 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '金发妖精的洞察',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '重构真相之智慧之泉',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 4000 } },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 6000, amount: 0.22 },
        },
      ],
      energyCost: 1000,
    },
  },
  10570: {
    role: 'striker',
    skill1: {
      name: '直死之魔眼',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', target: 'lowestHpEnemy', atkRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'lowestHpEnemy',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.28 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '两仪式·天赋',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.45 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '斩断存在的死线',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'execute', target: 'lowestHpEnemy', hpRatioThreshold: 0.3 },
        { type: 'damage', target: 'lowestHpEnemy', atkRatio: 2.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 8000, amount: 0.35 },
        },
      ],
      energyCost: 1000,
    },
  },
  10596: {
    role: 'arcane',
    passive: {
      name: '宝石魔术的才华',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.2 },
        },
        { type: 'energyGain', target: 'self', amount: 60 },
      ],
    },
    ultimate: {
      name: '宝石魔术',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 0.4, spRatio: 2, canCrit: true },
        {
          type: 'applyStatus',
          status: { kind: 'dot', durationMs: 8000, amount: 90, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  10612: {
    role: 'arcane',
    skill1: {
      name: '吉他独奏·刃',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', target: 'frontEnemy', spRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '生前的遗憾',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.16 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: 'Girls Dead Monster·终章',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  10630: {
    role: 'controller',
    skill1: {
      name: '我最喜欢人类了',
      target: 'highestAtkEnemy',
      effects: [
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'silence', durationMs: 4000 },
        },
        { type: 'damage', atkRatio: 1, canCrit: true },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '折原临也·天赋',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.45 },
        },
      ],
    },
    ultimate: {
      name: '情报贩子的棋局',
      target: 'allEnemies',
      effects: [
        { type: 'dispel', target: 'allEnemies' },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.28 },
        },
      ],
      energyCost: 1000,
    },
  },
  10639: {
    role: 'striker',
    skill1: {
      name: '矢量反射',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, spRatio: 0.3, canCrit: true },
        { type: 'shield', target: 'self', defRatio: 1, flatPower: 60, durationMs: 6000 },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '矢量操控的绝对领域',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.2 },
        },
        { type: 'shield', target: 'self', defRatio: 1, flatPower: 50, durationMs: 90000 },
      ],
    },
    ultimate: {
      name: '矢量崩坏',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.4, spRatio: 0.5, canCrit: true },
        { type: 'execute', hpRatioThreshold: 0.25 },
      ],
      energyCost: 1000,
    },
  },
  10672: {
    role: 'striker',
    skill1: {
      name: '赤红长枪连击',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2, canCrit: true },
        { type: 'heal', target: 'self', atkRatio: 0.4 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '野性的求生本能',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '分裂之枪·穿刺',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', atkRatio: 1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 70, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  10753: {
    role: 'support',
    skill1: {
      name: '闪耀星愿',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.4, flatPower: 60 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '睡懒觉也要闪耀',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
    },
    ultimate: {
      name: '偶像的最强光辉·Show Time',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 0.9, flatPower: 80 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.28 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.22 },
        },
      ],
      energyCost: 1000,
    },
  },
  10902: {
    role: 'striker',
    skill1: {
      name: '直死之视线',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', target: 'lowestHpEnemy', atkRatio: 2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'lowestHpEnemy',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.22 },
        },
      ],
      cooldownMs: 8600,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '善良的旁观者',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.18 },
        },
      ],
    },
    ultimate: {
      name: '看破死之点线',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'execute', target: 'highestAtkEnemy', hpRatioThreshold: 0.3 },
        { type: 'damage', target: 'highestAtkEnemy', atkRatio: 1.5, canCrit: true },
      ],
      energyCost: 1000,
    },
  },
  11598: {
    role: 'support',
    skill1: {
      name: '水乡的问候',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', target: 'lowestHpAlly', spRatio: 1.4 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1600,
    },
    passive: {
      name: '水星的温柔',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '领航员的祝福',
      target: 'allAllies',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        { type: 'heal', target: 'allAllies', spRatio: 0.9 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 6000, amount: 55, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  11833: {
    role: 'support',
    skill1: {
      name: '喜翠庄的款待',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.3, flatPower: 120 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '认真努力的女将',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '肚子饿扁了！·全力开工',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1, flatPower: 150 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.25 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  11853: {
    role: 'support',
    skill1: {
      name: '面码的祈愿',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', spRatio: 0.8, flatPower: 55 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 6000, amount: 50, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '那朵花的名字',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 35, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '找到了哦——重逢之约',
      target: 'firstDefeatedAlly',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        { type: 'heal', target: 'allAllies', spRatio: 0.9, flatPower: 70 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  11856: {
    role: 'controller',
    skill1: {
      name: '乐园的诱惑',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', target: 'frontEnemy', spRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'slow', durationMs: 5000, amount: 0.22 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '风见一姬·天赋',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '灰色的支配',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'stun', durationMs: 2200 } },
        { type: 'damage', target: 'allEnemies', spRatio: 1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  11906: {
    role: 'striker',
    skill1: {
      name: '美绪的桌角·致命一击',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 6000, amount: 0.2 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '日常的暴走',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.16 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '羞耻爆发·全力吐槽',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  11909: {
    role: 'tactical',
    skill1: {
      name: '阪本先生，我说啊',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.2 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '日常里的非日常',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'self', amount: 70 },
      ],
    },
    ultimate: {
      name: '天才少女的大发明',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', target: 'allAllies', amount: 100 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 7000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  12062: {
    role: 'arcane',
    skill1: {
      name: '圣剑之力觉醒',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.7, flatPower: 50, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 5000, amount: 0.2 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '残机之力',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.15 },
        },
        { type: 'shield', target: 'self', defRatio: 1, flatPower: 50, durationMs: 30000 },
      ],
    },
    ultimate: {
      name: '为了守护而挥剑',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          status: { kind: 'dot', durationMs: 6000, amount: 65, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  12063: {
    role: 'support',
    skill1: {
      name: '温柔的歌声',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 0.7 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.18 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '轻音部的羁绊',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '全体大合唱',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 1 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 6000, amount: 60, tickIntervalMs: 2000 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  12106: {
    role: 'arcane',
    skill1: {
      name: '才华横溢の一笔',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', spRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '生活白痴の专注',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.18 },
        },
        { type: 'energyGain', target: 'self', amount: 90 },
      ],
    },
    ultimate: {
      name: '世界级的杰作',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 70, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  12111: {
    role: 'tactical',
    skill1: {
      name: '配音演员的全情投入',
      target: 'allAllies',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 } },
        { type: 'energyGain', amount: 75 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '努力天才的执着',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '梦想成真的那一刻',
      target: 'allAllies',
      effects: [
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 7000, amount: 0.28 } },
        { type: 'energyGain', amount: 100 },
        { type: 'applyStatus', status: { kind: 'critRateUp', durationMs: 6000, amount: 0.2 } },
      ],
      energyCost: 1000,
    },
  },
  12393: {
    role: 'tactical',
    skill1: {
      name: '时间理论',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', amount: 120 },
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 7000, amount: 0.18 } },
      ],
      cooldownMs: 12000,
      initialCooldownMs: 3500,
    },
    passive: {
      name: '牧濑红莉栖·天赋',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
    },
  },
  12423: {
    role: 'tactical',
    skill1: {
      name: '魔术师杨',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', amount: 110 },
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 7000, amount: 0.15 } },
      ],
      cooldownMs: 12000,
      initialCooldownMs: 3500,
    },
    passive: {
      name: '奇迹的杨',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.1 },
        },
        { type: 'energyGain', target: 'self', amount: 70 },
      ],
    },
    ultimate: {
      name: '用兵之妙',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 0.8, spRatio: 1, canCrit: true },
        { type: 'dispel' },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 7000, amount: 0.18 },
        },
      ],
      energyCost: 1000,
    },
  },
  12520: {
    role: 'support',
    skill1: {
      name: '跳跃之舞',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.1, spRatio: 0.6, flatPower: 40 },
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 6000, amount: 0.2 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '真实之泪',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 28, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '眼泪终会干涸',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1, spRatio: 0.7, flatPower: 50 },
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 8000, amount: 0.2 } },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.4 },
      ],
      energyCost: 1000,
    },
  },
  12702: {
    role: 'arcane',
    skill1: {
      name: '野兽模式全开',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '驾驶适格者',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '临时用机·终极冲刺',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 60, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  12887: {
    role: 'controller',
    skill1: {
      name: '名侦探的推理',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'silence', durationMs: 4000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '绝望学园的幸存者',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '揭穿真相的时刻',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'stun', durationMs: 2200 } },
        { type: 'damage', target: 'allEnemies', spRatio: 1.1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  13004: {
    skill1: { name: '存在感守护' },
    passive: { name: '路人光环' },
    ultimate: { name: '大家一起' },
  },
  13005: {
    role: 'striker',
    skill1: {
      name: '极上百合的突袭',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.7, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 5000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '元气的搞事天才',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.14 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '京子无双乱舞',
      target: 'allEnemies',
      effects: [
        { type: 'damage', atkRatio: 1.1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.28 },
        },
      ],
      energyCost: 1000,
    },
  },
  13245: {
    role: 'striker',
    skill1: {
      name: '红色彗星',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 5000, amount: 0.3 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '红色彗星的加速',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '快三倍的速度',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        { type: 'execute', target: 'frontEnemy', hpRatioThreshold: 0.25 },
      ],
      energyCost: 1000,
    },
  },
  13390: {
    role: 'support',
    skill1: {
      name: '在乎的温柔',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', spRatio: 1.5 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '小木曾雪菜·天赋',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 28, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '冬日与烟花的旋律',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', spRatio: 1.1 },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.45 },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  13391: {
    skill1: { name: '寒空的旋律' },
    passive: { name: '雪夜练习曲' },
    ultimate: { name: '未完成的乐章' },
  },
  14557: {
    role: 'striker',
    skill1: {
      name: '火焰姐妹·热血一击',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '月火的执念',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.16 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '阿良良木家的正义拳',
      target: 'allEnemies',
      effects: [
        { type: 'damage', atkRatio: 1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 8000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  14823: {
    role: 'controller',
    skill1: {
      name: '我很好奇！',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.7, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '蔷薇色的好奇心',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.14 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '数据库是我的翅膀',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 4500 },
        },
      ],
      energyCost: 1000,
    },
  },
  14825: {
    role: 'arcane',
    skill1: {
      name: '推理之矢',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 6000, amount: 0.22 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '推理之矢·洞察',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '料理研究会·全力烹调',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.3, canCrit: true },
        {
          type: 'applyStatus',
          status: { kind: 'dot', durationMs: 8000, amount: 70, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  14960: {
    role: 'support',
    skill1: {
      name: 'にっこにっこにー',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 0.9 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.15 },
        },
      ],
      cooldownMs: 8300,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '宇宙No.1可爱',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '把爱心送给大家！',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 1.2 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 8000, amount: 0.3 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  16369: {
    role: 'controller',
    skill1: {
      name: '进化调停',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 0.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 4000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '人类衰退之后',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.14 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '你们真是充满活力呢',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 5000 },
        },
        { type: 'damage', spRatio: 1.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  16489: {
    role: 'striker',
    skill1: {
      name: '星爆气流斩',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', target: 'frontEnemy', atkRatio: 2.1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '黑色剑士',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.15 },
        },
      ],
    },
    ultimate: {
      name: '二刀流·终结之刃',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', target: 'frontEnemy', atkRatio: 2.5, canCrit: true },
        { type: 'execute', target: 'frontEnemy', hpRatioThreshold: 0.25 },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  16684: {
    role: 'controller',
    skill1: {
      name: '推理的凝视',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', spRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.28 },
        },
      ],
      cooldownMs: 8600,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '世界最强侦探',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '我就是正义',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 5000 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 5000, amount: 0.3 },
        },
        { type: 'damage', spRatio: 0.8, canCrit: true },
      ],
      energyCost: 1000,
    },
  },
  16817: {
    role: 'arcane',
    skill1: {
      name: '变形武器·全力轰击',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', target: 'frontEnemy', spRatio: 1.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '跨越星海的心',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.2 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
    },
    ultimate: {
      name: '宇宙最强的爱意',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 70, tickIntervalMs: 2000 },
        },
        { type: 'energyGain', target: 'self', amount: 90 },
      ],
      energyCost: 1000,
    },
  },
  16934: {
    role: 'controller',
    skill1: {
      name: '支配者的裁决',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 5000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '洁白的犯罪系数',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.13 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '心理测量·执行模式',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'stun', durationMs: 1800 } },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  17362: {
    skill1: { name: '邪王真眼' },
    passive: { name: '中二结界' },
    ultimate: { name: '暗黑闪光' },
  },
  17364: {
    role: 'arcane',
    skill1: {
      name: '邪王真眼·爆裂',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '邪王真眼的觉醒',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '契约之门·终末黑炎',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 60, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  17949: {
    role: 'controller',
    skill1: {
      name: '心理掌控',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 3500 } },
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 6000, amount: 0.25 } },
        { type: 'damage', atkRatio: 0.3, spRatio: 0.6, canCrit: true },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '女王',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.14 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '大量心理掌控',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 4000 } },
        { type: 'applyStatus', status: { kind: 'stun', durationMs: 1500 } },
      ],
      energyCost: 1000,
    },
  },
  18041: {
    role: 'controller',
    skill1: {
      name: '希望的踏脚石',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 6000, amount: 0.3 } },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'silence', durationMs: 4000 },
        },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '超高校级的幸运',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 60 },
      ],
    },
    ultimate: {
      name: '绝望终将被希望超越',
      target: 'allEnemies',
      effects: [
        { type: 'dispel', target: 'allEnemies' },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'stun', durationMs: 2200 } },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  18101: {
    role: 'striker',
    skill1: {
      name: '立体机动斩',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.25 },
        },
      ],
      cooldownMs: 8400,
      initialCooldownMs: 1600,
    },
    passive: {
      name: '自由的代价',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '进击的巨人',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.4 },
        },
        { type: 'execute', target: 'frontEnemy', hpRatioThreshold: 0.3 },
      ],
      energyCost: 1000,
    },
  },
  18102: {
    role: 'striker',
  },
  18178: {
    role: 'support',
    skill1: {
      name: '登顶的鼓励',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.3, flatPower: 40 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '重拾的勇气',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 25, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '一步一步向山顶',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1, flatPower: 30 },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  19039: {
    role: 'controller',
    skill1: {
      name: '腹黑毒舌',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', spRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 5000, amount: 0.28 },
        },
      ],
      cooldownMs: 8600,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '果然有问题',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '自我牺牲的解法',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 4000 },
        },
        { type: 'damage', spRatio: 1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  19525: {
    role: 'striker',
    skill1: {
      name: '鏖杀之剑·鏖桀',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '约会拯救世界',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '终焉之剑·终焉',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', atkRatio: 1.4, canCrit: true },
        { type: 'execute', target: 'allEnemies', hpRatioThreshold: 0.22 },
      ],
      energyCost: 1000,
    },
  },
  19526: {
    role: 'arcane',
    skill1: {
      name: '天使的领域',
      target: 'backEnemy',
      effects: [
        { type: 'damage', spRatio: 2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'backEnemy',
          status: { kind: 'spDown', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '无表情的狙击手',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '绝园的天使降临',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 5000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  19529: {
    skill1: { name: '刻刻帝·一之弹' },
    passive: { name: '时之精灵' },
    ultimate: { name: '刻刻帝·终' },
  },
  19546: {
    role: 'striker',
    skill1: { name: '立体机动斩' },
    passive: { name: '人类最强' },
    ultimate: { name: '必杀回旋斩' },
  },
  20363: {
    role: 'support',
    skill1: {
      name: '元气应援',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.4 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'atkUp', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '倒追的勇气',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '少女心的全垒打',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1.1 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.28 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  20405: {
    role: 'controller',
    skill1: {
      name: '无法填补的空洞恋情',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 6000, amount: 0.3 } },
        { type: 'damage', atkRatio: 1.2, canCrit: true },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '人渣本愿的自嘲',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '以爱为名的相互利用',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'slow', durationMs: 5000, amount: 0.28 } },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 6000, amount: 0.28 } },
        { type: 'damage', atkRatio: 0.8, canCrit: true },
      ],
      energyCost: 1000,
    },
  },
  20533: {
    role: 'striker',
    skill1: {
      name: '斧乃木·无表情飞踢',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.8, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 6000, amount: 0.2 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '式神之躯',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '付丧神·例外的例外',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  21276: {
    role: 'striker',
    skill1: {
      name: '剪裁一切的绯红剑',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 5000, amount: 0.25 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '生命纤维之血',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.16 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'hot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '神衣·鲜血 完全同步',
      target: 'self',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 7000, amount: 0.4 } },
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 7000, amount: 0.3 } },
        { type: 'damage', target: 'frontEnemy', atkRatio: 1.5, canCrit: true },
      ],
      energyCost: 1000,
    },
  },
  21368: {
    role: 'tactical',
    skill1: {
      name: '哈喽哈喽~',
      target: 'lowestHpAlly',
      effects: [
        { type: 'energyGain', target: 'lowestHpAlly', amount: 90 },
        { type: 'heal', atkRatio: 0.8 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '乡下孩子的元气',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '呐叽哦呐叽哦~',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.3 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 80 },
        { type: 'heal', target: 'allAllies', atkRatio: 0.7 },
      ],
      energyCost: 1000,
    },
  },
  21371: {
    role: 'controller',
    skill1: {
      name: '羞涩一击',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', target: 'frontEnemy', spRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'slow', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '内向者的隐忍',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '悠哉大王的日常奇迹',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.1, canCrit: true },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'stun', durationMs: 2000 } },
      ],
      energyCost: 1000,
    },
  },
  21599: {
    role: 'arcane',
    skill1: {
      name: '海底沉眠的余温',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.6, flatPower: 45, canCrit: true },
        { type: 'applyStatus', status: { kind: 'slow', durationMs: 5000, amount: 0.2 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '海神的加护',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.16 },
        },
        { type: 'shield', target: 'self', defRatio: 1, flatPower: 50, durationMs: 90000 },
      ],
    },
    ultimate: {
      name: '献祭仪式·汹涌浪潮',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.3, canCrit: true },
        { type: 'applyStatus', status: { kind: 'spDown', durationMs: 6000, amount: 0.25 } },
      ],
      energyCost: 1000,
    },
  },
  22520: {
    role: 'arcane',
    skill1: {
      name: '埃罗芒阿老师的灵感',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'dot', durationMs: 6000, amount: 50, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '兄妹合作的羁绊',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.18 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
    },
    ultimate: {
      name: '世界最棒的妹妹插画',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  22790: {
    role: 'support',
    skill1: {
      name: '神使的祈愿',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.1, spRatio: 0.5, flatPower: 40 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'hot', durationMs: 6000, amount: 55, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '神明的庇佑',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 25, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '献给神的赤诚之心',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 0.9, spRatio: 0.6, flatPower: 50 },
        { type: 'cleanse', target: 'allAllies' },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.22 },
        },
      ],
      energyCost: 1000,
    },
  },
  23425: {
    role: 'arcane',
    skill1: {
      name: '空白，游戏开始',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', spRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'lowestHpEnemy',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '天才少女的头脑',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '『　』永不败北',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 4000 },
        },
      ],
      energyCost: 1000,
    },
  },
  23647: {
    role: 'support',
    skill1: {
      name: 'Rabbit House 的招牌笑容',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 0.9, flatPower: 60 },
        { type: 'cleanse', target: 'allAllies' },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '咖啡香的治愈',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.14 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 22, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '请问您今天要来点兔子吗',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1.1, flatPower: 80 },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.45 },
        {
          type: 'applyStatus',
          status: { kind: 'hot', durationMs: 6000, amount: 55, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  23648: {
    role: 'support',
    skill1: {
      name: '特调一杯',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.2, flatPower: 110 },
        { type: 'cleanse', target: 'lowestHpAlly' },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '小小店员的体贴',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '请问您今天要来点治愈吗？',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 0.9, flatPower: 140 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 6000, amount: 60, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  24092: {
    skill1: { name: '剧本布局' },
    passive: { name: '毒舌剧作家' },
    ultimate: { name: '恋爱节拍杀' },
  },
  24093: {
    skill1: { name: '毒舌吐槽' },
    passive: { name: '傲娇本色' },
    ultimate: { name: '同人志决战' },
  },
  24760: {
    role: 'support',
    skill1: {
      name: '传达的手语',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.5 },
        { type: 'cleanse', target: 'lowestHpAlly' },
      ],
      cooldownMs: 8600,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '温柔的心声',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.14 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
    },
    ultimate: {
      name: '声之形',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 1.1 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.28 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 6000, amount: 55, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  25520: {
    role: 'arcane',
    skill1: {
      name: '冷冽视线',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', target: 'frontEnemy', spRatio: 2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8600,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '凛然如霜',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.17 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '自然的旋律',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 70, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  26003: {
    role: 'support',
    skill1: { name: '自由的音色' },
    passive: { name: '琴弦上的春天' },
    ultimate: { name: '你在春天里' },
  },
  26090: {
    role: 'controller',
    skill1: {
      name: '看透一切の微笑',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1, spRatio: 0.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'spDown', durationMs: 5000, amount: 0.22 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '彩羽ちゃん的算计',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '后辈的温柔陷阱',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 4000 },
        },
        { type: 'damage', target: 'allEnemies', spRatio: 1.1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 5000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  27601: {
    role: 'arcane',
    skill1: {
      name: '火球术·魔法学者',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'dot', durationMs: 6000, amount: 60, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '魔法学院首席',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.2 },
        },
        { type: 'energyGain', target: 'self', amount: 70 },
      ],
    },
    ultimate: {
      name: '禁忌之术·完全回复魔法',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', spRatio: 1.1, flatPower: 80 },
        { type: 'cleanse', target: 'allAllies' },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  27643: {
    role: 'controller',
    skill1: {
      name: '赌上一切的疯狂微笑',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 6000, amount: 0.32 } },
        { type: 'dispel', target: 'highestAtkEnemy' },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '享受生死赌局的战栗',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '沉溺赌局的癫狂',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 4000 } },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 6000, amount: 0.3 } },
        { type: 'damage', atkRatio: 0.9, canCrit: true },
      ],
      energyCost: 1000,
    },
  },
  29048: {
    role: 'guardian',
    skill1: {
      name: '叠障圣女的盾墙',
      target: 'self',
      effects: [
        { type: 'shield', spRatio: 0.5, defRatio: 1.3, durationMs: 8000 },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'taunt', durationMs: 5500 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '人理堡垒的意志',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.2 },
        },
        { type: 'shield', target: 'self', defRatio: 1, flatPower: 50, durationMs: 90000 },
      ],
    },
    ultimate: {
      name: '远及彼方的城塞',
      target: 'allAllies',
      effects: [
        { type: 'shield', defRatio: 1.1, flatPower: 90, durationMs: 8000 },
        { type: 'applyStatus', status: { kind: 'defUp', durationMs: 6000, amount: 0.3 } },
      ],
      energyCost: 1000,
    },
  },
  29212: {
    role: 'guardian',
    skill1: {
      name: '女神的加护',
      target: 'self',
      effects: [
        {
          type: 'shield',
          target: 'allAllies',
          spRatio: 0.6,
          defRatio: 1.2,
          flatPower: 60,
          durationMs: 7000,
        },
        { type: 'applyStatus', target: 'self', status: { kind: 'taunt', durationMs: 5000 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '赫斯缇雅·天赋',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.12 },
        },
        { type: 'shield', target: 'self', defRatio: 1, flatPower: 50, durationMs: 90000 },
      ],
    },
    ultimate: {
      name: '我才是眷族的女神',
      target: 'allAllies',
      effects: [
        {
          type: 'shield',
          target: 'allAllies',
          spRatio: 0.8,
          defRatio: 1.4,
          flatPower: 80,
          durationMs: 8000,
        },
        { type: 'heal', target: 'allAllies', atkRatio: 0.6, spRatio: 0.5 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  29511: {
    skill1: { name: '隐身护持' },
    passive: { name: '姐系可靠' },
    ultimate: { name: '守护约定' },
  },
  32675: {
    role: 'tactical',
    skill1: {
      name: '薯片与可乐的元气补给',
      target: 'allAllies',
      effects: [
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 6000, amount: 0.2 } },
        { type: 'energyGain', amount: 80 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '干物妹的双重人格',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
        { type: 'energyGain', target: 'self', amount: 70 },
      ],
    },
    ultimate: {
      name: '全力全开的小埋',
      target: 'allAllies',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 7000, amount: 0.28 } },
        { type: 'energyGain', amount: 110 },
      ],
      energyCost: 1000,
    },
  },
  35185: {
    role: 'arcane',
    skill1: {
      name: '夏莉奥的星光',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.22 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '新月魔法书',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.17 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '信念即魔法',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 65, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  35277: {
    role: 'controller',
    skill1: {
      name: '大小姐的高慢一喝',
      target: 'highestAtkEnemy',
      effects: [
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.25 },
        },
        { type: 'damage', atkRatio: 0.9, canCrit: true },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '娇小的傲气',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.13 },
        },
      ],
    },
    ultimate: {
      name: '樱井家的威严',
      target: 'allEnemies',
      effects: [
        { type: 'dispel', target: 'allEnemies' },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  35468: {
    role: 'tactical',
    skill1: {
      name: '全力应援！',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.18 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1600,
    },
    passive: {
      name: '灰姑娘的梦',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: 'U149 闪耀舞台',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.3 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.25 },
        },
        { type: 'energyGain', target: 'self', amount: 100 },
      ],
      energyCost: 1000,
    },
  },
  35607: {
    role: 'support',
    skill1: {
      name: '死而复生·从这里开始',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.25 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 80 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '死亡回归',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'hot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '我要拯救大家！',
      target: 'allAllies',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        { type: 'heal', target: 'allAllies', atkRatio: 0.8, flatPower: 70 },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  35608: {
    role: 'arcane',
  },
  35615: {
    skill1: { name: '冰华绽放' },
    passive: { name: '鬼族血脉' },
    ultimate: { name: '冰之棺墓' },
  },
  35650: {
    role: 'support',
    skill1: {
      name: '亲手做的便当',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.1, flatPower: 70 },
        {
          type: 'applyStatus',
          status: { kind: 'hot', durationMs: 6000, amount: 50, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '温暖人心的笑容',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 22, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '为你着想的眼泪',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1, flatPower: 65 },
        { type: 'cleanse', target: 'allAllies' },
        { type: 'applyStatus', status: { kind: 'defUp', durationMs: 6000, amount: 0.22 } },
      ],
      energyCost: 1000,
    },
  },
  35667: {
    role: 'support',
    skill1: {
      name: '再一次的重来',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.1, spRatio: 0.5, flatPower: 40 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '不放弃的勇气',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '我想要拯救大家',
      target: 'firstDefeatedAlly',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.45 },
        { type: 'heal', target: 'allAllies', atkRatio: 0.8, spRatio: 0.5 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 6000, amount: 50, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  35678: {
    role: 'support',
    skill1: {
      name: '净化之光',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', spRatio: 0.9, flatPower: 60 },
        { type: 'cleanse', target: 'allAllies' },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '水之女神の恩宠',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 25, tickIntervalMs: 2000 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
    },
    ultimate: {
      name: '女神阿克娅の复活术',
      target: 'firstDefeatedAlly',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.55 },
        { type: 'heal', target: 'allAllies', spRatio: 0.8, flatPower: 70 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.22 },
        },
      ],
      energyCost: 1000,
    },
  },
  35683: {
    role: 'guardian',
    skill1: {
      name: '以身承之',
      target: 'self',
      effects: [
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'taunt', durationMs: 5000 } },
        { type: 'shield', target: 'self', defRatio: 2, durationMs: 7000 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1600,
    },
    passive: {
      name: '受虐的觉悟',
      target: 'self',
      effects: [
        { type: 'applyStatus', target: 'self', status: { kind: 'taunt', durationMs: 90000 } },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.2 },
        },
      ],
    },
    ultimate: {
      name: '圣骑士的耻辱防御',
      target: 'self',
      effects: [
        { type: 'shield', target: 'allAllies', defRatio: 1.6, durationMs: 8000 },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 8000, amount: 0.4 },
        },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'taunt', durationMs: 6000 },
        },
      ],
      energyCost: 1000,
    },
  },
  35687: {
    role: 'arcane',
    skill1: {
      name: '红魔族的初级魔法讲师',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 6000, amount: 0.25 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '红魔之眼的魔力',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.15 },
        },
      ],
    },
    ultimate: {
      name: '爆裂魔法的传道者',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          status: { kind: 'dot', durationMs: 6000, amount: 70, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  35834: {
    role: 'guardian',
    skill1: {
      name: '认真的觉悟',
      target: 'self',
      effects: [
        { type: 'shield', target: 'self', defRatio: 1.2, flatPower: 60, durationMs: 7000 },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'taunt', durationMs: 5000 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '沉稳如山',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.18 },
        },
        { type: 'shield', target: 'self', defRatio: 1, flatPower: 50, durationMs: 30000 },
      ],
    },
    ultimate: {
      name: '重来一次的人生',
      target: 'self',
      effects: [
        { type: 'shield', target: 'allAllies', defRatio: 0.9, flatPower: 40, durationMs: 7000 },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.35 },
        },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'taunt', durationMs: 5000 } },
      ],
      energyCost: 1000,
    },
  },
  36488: {
    role: 'support',
    skill1: {
      name: '青叶加油！',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', target: 'lowestHpAlly', atkRatio: 1.4 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.18 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1600,
    },
    passive: {
      name: '职人精神',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '新人上线，全力开发！',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 1.3 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 8000, amount: 0.3 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  36489: {
    role: 'support',
    skill1: {
      name: '抽象派的画笔',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.3 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.18 },
        },
      ],
      cooldownMs: 8600,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '抽象派的灵感',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '美术社大有问题',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.3 },
        },
        { type: 'heal', target: 'allAllies', atkRatio: 0.9 },
        { type: 'energyGain', target: 'allAllies', amount: 80 },
      ],
      energyCost: 1000,
    },
  },
  36497: {
    role: 'tactical',
    skill1: {
      name: '王牌程序员·加速冲刺',
      target: 'allAllies',
      effects: [
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 6000, amount: 0.22 } },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '游戏开发者的执念',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
    },
    ultimate: {
      name: '通宵赶工·全力发售',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', amount: 100 },
        { type: 'applyStatus', status: { kind: 'spUp', durationMs: 8000, amount: 0.25 } },
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 8000, amount: 0.2 } },
      ],
      energyCost: 1000,
    },
  },
  37242: {
    role: 'support',
    skill1: {
      name: '结绳之力',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 0.8 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 5000, amount: 0.15 },
        },
      ],
      cooldownMs: 8700,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '结·三年的错位',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 20, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '黄昏之时的重逢',
      target: 'firstDefeatedAlly',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        { type: 'heal', target: 'allAllies', atkRatio: 0.9 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 6000, amount: 60, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  37344: {
    role: 'support',
    skill1: {
      name: '代笔的心意',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', spRatio: 1.6 },
        { type: 'cleanse', target: 'lowestHpAlly' },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '习得情感的心',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.08 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '我爱你——传达心意的信',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', spRatio: 1 },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 8000, amount: 60, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  37455: {
    role: 'striker',
    skill1: {
      name: '刺喉枪·贯穿',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '赤目的猎人',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '猎杀卡巴内的少女',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        { type: 'execute', hpRatioThreshold: 0.3 },
      ],
      energyCost: 1000,
    },
  },
  38065: {
    role: 'controller',
    skill1: {
      name: '浪速的白雪姬',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'silence', durationMs: 4000 },
        },
      ],
      cooldownMs: 8400,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '追赶师兄的执着',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '女流棋士的绝杀',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'execute', target: 'lowestHpEnemy', hpRatioThreshold: 0.3 },
        { type: 'damage', target: 'lowestHpEnemy', atkRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  38478: {
    role: 'support',
    skill1: {
      name: '全力应援',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', target: 'lowestHpAlly', atkRatio: 1.5 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'hot', durationMs: 6000, amount: 45, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8200,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '业界闪光',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
        { type: 'energyGain', target: 'self', amount: 70 },
      ],
    },
    ultimate: {
      name: '声优魂·再起演出',
      target: 'firstDefeatedAlly',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        { type: 'heal', target: 'allAllies', atkRatio: 1 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 8000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  40739: {
    skill1: { name: '青鸟的呼吸' },
    passive: { name: '第三乐章' },
    ultimate: { name: '莉兹与青鸟' },
  },
  41748: {
    role: 'controller',
    skill1: {
      name: '无意识的绝对魅惑',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'taunt', durationMs: 5000 } },
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 5000, amount: 0.25 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '绝世美貌的魅惑',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '倾国倾城的一瞥',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'stun', durationMs: 2200 } },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 6000, amount: 0.28 } },
      ],
      energyCost: 1000,
    },
  },
  41849: {
    role: 'controller',
    skill1: {
      name: '捉弄一下你哦',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 0.9, spRatio: 1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 5000, amount: 0.22 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '永远赢不了的游戏',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '赌注·你输定了',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'stun', durationMs: 2200 } },
        { type: 'damage', target: 'allEnemies', spRatio: 1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 5000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  42276: {
    role: 'support',
    skill1: {
      name: '双簧管的呼吸',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.4 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.18 },
        },
      ],
      cooldownMs: 8600,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '追逐希美的背影',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 70 },
      ],
    },
    ultimate: {
      name: '想成为特别的人',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 1 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.25 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  43536: {
    role: 'support',
    skill1: {
      name: '别叫我八谷！',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', target: 'lowestHpAlly', atkRatio: 1.3, flatPower: 70 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.18 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '泳装少女的元气',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 28, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '潜水部的羁绊',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 1, flatPower: 80 },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.45 },
      ],
      energyCost: 1000,
    },
  },
  46462: {
    role: 'arcane',
    skill1: {
      name: '泥沼水流·全力魔法',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'slow', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '前世宅男的魔法才能',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.2 },
        },
      ],
    },
    ultimate: {
      name: '无咏唱·灭却魔法',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.22 },
        },
      ],
      energyCost: 1000,
    },
  },
  46463: {
    role: 'arcane',
    skill1: {
      name: '无咏唱魔术',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 2.1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'silence', durationMs: 3000 },
        },
      ],
      cooldownMs: 8600,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '守护你的誓言',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.16 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '精灵之王的加护',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.25 },
        },
        { type: 'heal', target: 'lowestHpAlly', spRatio: 0.6 },
      ],
      energyCost: 1000,
    },
  },
  46582: {
    role: 'controller',
    skill1: {
      name: '记忆篡改',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', spRatio: 1.7, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 5000, amount: 0.28 },
        },
      ],
      cooldownMs: 8600,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '预知能力',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '重启的世界',
      target: 'allEnemies',
      effects: [
        { type: 'dispel', target: 'allEnemies' },
        { type: 'applyStatus', target: 'frontEnemy', status: { kind: 'stun', durationMs: 2500 } },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 5000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  47659: {
    role: 'arcane',
    skill1: {
      name: '龙炎吐息',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', target: 'frontEnemy', spRatio: 1.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'dot', durationMs: 6000, amount: 70, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '混沌的真龙',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.22 },
        },
      ],
    },
    ultimate: {
      name: '混沌之龙·灭世业火',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 80, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  47695: {
    role: 'arcane',
    skill1: {
      name: '雷电吐息',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 0.2, spRatio: 1.3, canCrit: true },
        {
          type: 'applyStatus',
          status: { kind: 'dot', durationMs: 6000, amount: 40, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '上古之龙',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '龙之逆鳞',
      target: 'allEnemies',
      effects: [
        { type: 'damage', atkRatio: 0.4, spRatio: 1.5, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 7000, amount: 0.2 } },
      ],
      energyCost: 1000,
    },
  },
  50578: {
    role: 'striker',
    skill1: {
      name: '帝王的末脚',
      target: 'backEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 6000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '宿敌之心的觉醒',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.16 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '不败神话·复活的帝王',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        { type: 'heal', target: 'self', atkRatio: 0.6 },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 8000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  52876: {
    role: 'arcane',
    skill1: {
      name: '魔法种族的天才棋手',
      target: 'backEnemy',
      effects: [
        { type: 'damage', spRatio: 1.5, canCrit: true },
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 3500 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '渴望心灵相通的机凯种',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.2 },
        },
      ],
    },
    ultimate: {
      name: '唯有和平方能取胜',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.3, canCrit: true },
        { type: 'applyStatus', status: { kind: 'spDown', durationMs: 6000, amount: 0.3 } },
        { type: 'dispel', target: 'allEnemies' },
      ],
      energyCost: 1000,
    },
  },
  53767: {
    role: 'controller',
    skill1: {
      name: '冷静的算计',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 6000, amount: 0.3 } },
        { type: 'dispel', target: 'highestAtkEnemy' },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '深藏不露的实力',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '我要爬到A班',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.25 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 4000 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  54943: {
    role: 'support',
    skill1: {
      name: '祝福之触',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', spRatio: 1.5 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'hot', durationMs: 6000, amount: 50, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '深渊的祝福',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 32, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '深渊祝福·不灭的信念',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', spRatio: 1 },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.4 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 8000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  56775: {
    skill1: { name: '篝火庇护' },
    passive: { name: '露营慢活' },
    ultimate: { name: '满天星空' },
  },
  56778: {
    role: 'guardian',
    skill1: {
      name: '野营铁壁·篝火结界',
      target: 'self',
      effects: [
        { type: 'shield', defRatio: 1.6, flatPower: 80, durationMs: 7000 },
        { type: 'applyStatus', target: 'self', status: { kind: 'taunt', durationMs: 5000 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '咖喱面的守护',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.2 },
        },
        { type: 'shield', target: 'self', defRatio: 1.5, flatPower: 40, durationMs: 90000 },
      ],
    },
    ultimate: {
      name: '全员温暖の露营时光',
      target: 'allAllies',
      effects: [
        { type: 'shield', target: 'allAllies', defRatio: 1.3, flatPower: 90, durationMs: 8000 },
        { type: 'heal', target: 'allAllies', flatPower: 60 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  57715: {
    role: 'tactical',
    skill1: {
      name: '指挥官的号令',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 5000, amount: 0.18 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '羁绊超越战区',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.15 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 80 },
      ],
    },
    ultimate: {
      name: '血色女王的战术',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.3 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  57751: {
    role: 'striker',
    skill1: { name: '突击冲锋' },
    passive: { name: '亲爱的' },
    ultimate: { name: '螺旋突刺' },
  },
  57898: {
    role: 'guardian',
    skill1: {
      name: '守护巢穴',
      target: 'self',
      effects: [
        { type: 'shield', target: 'self', defRatio: 1.6, durationMs: 7000 },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'taunt', durationMs: 5000 } },
      ],
      cooldownMs: 8400,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '红色骑士的执念',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.18 },
        },
        { type: 'shield', target: 'self', spRatio: 1.2, flatPower: 50, durationMs: 90000 },
      ],
    },
    ultimate: {
      name: '叫龙骑士的觉悟',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', atkRatio: 1, canCrit: true },
        { type: 'shield', target: 'allAllies', defRatio: 2, durationMs: 8000 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  58444: {
    role: 'support',
    skill1: {
      name: '妹妹的照料',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.3, flatPower: 55 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'hot', durationMs: 6000, amount: 60, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '手足无措の温柔',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 22, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '变身少女の元气全开',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 0.9, flatPower: 75 },
        { type: 'cleanse', target: 'allAllies' },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.22 },
        },
      ],
      energyCost: 1000,
    },
  },
  58445: {
    role: 'tactical',
    skill1: {
      name: '变成妹妹的早晨',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.2 },
        },
        { type: 'energyGain', target: 'self', amount: 75 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '手足无措的日常',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 70 },
      ],
    },
    ultimate: {
      name: '别当欧尼酱了！',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', target: 'self', amount: 100 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.18 },
        },
      ],
      energyCost: 1000,
    },
  },
  59846: {
    skill1: { name: '夏日守望' },
    passive: { name: '温柔坚守' },
    ultimate: { name: '不让你消失' },
  },
  59847: {
    role: 'controller',
    skill1: {
      name: '口袋的封印',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.5, canCrit: true },
        { type: 'applyStatus', target: 'frontEnemy', status: { kind: 'stun', durationMs: 2000 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '夏日口袋的秘密',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.15 },
        },
      ],
    },
    ultimate: {
      name: '夏日的终结·时之停滞',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 0.9, canCrit: true },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'stun', durationMs: 2500 } },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  59848: {
    skill1: { name: '并肩守护' },
    passive: { name: '沉静坚守' },
    ultimate: { name: '守望夏日' },
  },
  59849: {
    role: 'arcane',
    skill1: {
      name: '文德斯之术',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', spRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'dot', durationMs: 6000, amount: 50, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '异界的访客',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.22 },
        },
      ],
    },
    ultimate: {
      name: '彼方之界·魔力奔流',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  61330: {
    role: 'controller',
    skill1: {
      name: '毒物鉴定',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 0.6, spRatio: 1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'dot', durationMs: 6000, amount: 60, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '毒物的探求者',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '推理揭晓·投毒者伏诛',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 0.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.3 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 4000 },
        },
      ],
      energyCost: 1000,
    },
  },
  61405: {
    role: 'striker',
    skill1: {
      name: '傲娇的正拳',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '五胞胎的骄傲',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.15 },
        },
      ],
    },
    ultimate: {
      name: '二乃的真心一击',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        { type: 'execute', target: 'highestAtkEnemy', hpRatioThreshold: 0.22 },
      ],
      energyCost: 1000,
    },
  },
  61419: {
    role: 'support',
    skill1: {
      name: '岛上的重逢',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', spRatio: 1.4 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '时光的孩子',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.14 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
    },
    ultimate: {
      name: '永远的夏天',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', spRatio: 1 },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  61552: {
    role: 'support',
    skill1: {
      name: '枫的温柔笔记',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.2, spRatio: 0.6, flatPower: 45 },
        { type: 'cleanse', target: 'lowestHpAlly' },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '另一个花枫',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 28, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '青春期症候群·重生的心',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1, spRatio: 0.7, flatPower: 55 },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.45 },
        {
          type: 'applyStatus',
          status: { kind: 'hot', durationMs: 8000, amount: 55, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  61942: {
    role: 'striker',
    skill1: {
      name: '格斗游戏的对决',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '绝不认输',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.45 },
        },
      ],
    },
    ultimate: {
      name: '一败涂地的连招',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        { type: 'execute', target: 'frontEnemy', hpRatioThreshold: 0.25 },
      ],
      energyCost: 1000,
    },
  },
  63028: {
    role: 'support',
    skill1: {
      name: '特别的星辰',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.4, flatPower: 40 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '找到自我的光',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '终将成为你',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 0.9, flatPower: 30 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 6000, amount: 50, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  63862: {
    role: 'support',
    skill1: {
      name: '温柔守护',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', target: 'lowestHpAlly', atkRatio: 0.9, spRatio: 0.5 },
        { type: 'shield', target: 'lowestHpAlly', spRatio: 0.6, durationMs: 6000 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '羁绊之约',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 28, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '岛屿的奇迹',
      target: 'firstDefeatedAlly',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        { type: 'heal', target: 'allAllies', atkRatio: 0.7, spRatio: 0.4 },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  64712: {
    role: 'striker',
    skill1: {
      name: '煌姿闪耀·斩击',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '舞台零号位',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.45 },
        },
      ],
    },
    ultimate: {
      name: '我是舞台少女·爱城华恋',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.35 },
        },
      ],
      energyCost: 1000,
    },
  },
  64716: {
    role: 'striker',
    skill1: {
      name: '星光斩',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '夺目的position zero',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.45 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.45 },
        },
      ],
    },
    ultimate: {
      name: '闪耀的Revue·夺星',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.3 },
        },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  64717: {
    role: 'controller',
    skill1: {
      name: '无限重演',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1, spRatio: 0.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '命运的舞台监督',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.45 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '百慕大三角·收束终演',
      target: 'allEnemies',
      effects: [
        { type: 'damage', atkRatio: 0.6, spRatio: 0.7, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 5000 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  65006: {
    role: 'support',
    skill1: {
      name: '圣诞节的约定',
      target: 'lowestHpAlly',
      effects: [{ type: 'heal', atkRatio: 1.5, flatPower: 60 }, { type: 'cleanse' }],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '牧之原的祝福',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '跨越时间线的守护',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 0.9, flatPower: 85 },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.45 },
        { type: 'applyStatus', status: { kind: 'defUp', durationMs: 6000, amount: 0.2 } },
      ],
      energyCost: 1000,
    },
  },
  65986: {
    role: 'support',
    skill1: {
      name: '昭和的旋律',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 0.6, spRatio: 0.4 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.18 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1600,
    },
    passive: {
      name: '不灭的偶像魂',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '佐贺偶像·传说之舞',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 0.9, spRatio: 0.5 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.25 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  66614: {
    role: 'controller',
    skill1: {
      name: '一只眼一条腿的智慧之神',
      target: 'frontEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 4500 } },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 6000, amount: 0.3 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '怪异的调停者',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.45 },
        },
      ],
    },
    ultimate: {
      name: '编织虚构的推理',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'slow', durationMs: 5000, amount: 0.3 } },
        { type: 'dispel', target: 'allEnemies' },
        { type: 'damage', spRatio: 1, canCrit: true },
      ],
      energyCost: 1000,
    },
  },
  66717: {
    role: 'support',
    skill1: {
      name: '阳台上的漫长夜谈',
      target: 'lowestHpAlly',
      effects: [{ type: 'heal', atkRatio: 1.4, flatPower: 60 }, { type: 'cleanse' }],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '无家可归的旅人',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '让我留在这里，可以吗',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1, flatPower: 90 },
        {
          type: 'applyStatus',
          status: { kind: 'hot', durationMs: 6000, amount: 55, tickIntervalMs: 2000 },
        },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.4 },
      ],
      energyCost: 1000,
    },
  },
  66729: {
    role: 'support',
    skill1: {
      name: '画家姐姐的关怀',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', target: 'lowestHpAlly', atkRatio: 1.2, flatPower: 70 },
        { type: 'cleanse', target: 'lowestHpAlly' },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '被治愈的心',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 26, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '描绘温暖的画布',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 0.9, flatPower: 70 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 6000, amount: 55, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  66899: {
    role: 'tactical',
    skill1: {
      name: '如何让对方先动手',
      target: 'self',
      effects: [
        { type: 'energyGain', target: 'self', amount: 100 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.3 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1600,
    },
    passive: {
      name: '天才辈出四宫家',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.45 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 80 },
      ],
    },
    ultimate: {
      name: '头脑战·完全胜利',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 8000, amount: 0.35 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'critRateUp', durationMs: 8000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  68978: {
    role: 'support',
    skill1: {
      name: '晴天祈祷',
      target: 'allAllies',
      effects: [{ type: 'heal', spRatio: 0.5, flatPower: 30 }, { type: 'cleanse' }],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '100%的晴女',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '天气之子',
      target: 'allAllies',
      effects: [
        { type: 'heal', spRatio: 0.7, flatPower: 90 },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.4 },
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 6000, amount: 0.15 } },
      ],
      energyCost: 1000,
    },
  },
  69820: {
    role: 'tactical',
    skill1: {
      name: '海盗谋略',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', target: 'highestAtkEnemy', atkRatio: 1.7, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '老谋深算',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '为狼者，为狼所噬',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 8000, amount: 0.35 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 8000, amount: 0.3 },
        },
        { type: 'energyGain', target: 'self', amount: 100 },
      ],
      energyCost: 1000,
    },
  },
  70609: {
    role: 'controller',
    skill1: {
      name: '夏美子的失败魔法',
      target: 'frontEnemy',
      effects: [
        { type: 'applyStatus', target: 'frontEnemy', status: { kind: 'stun', durationMs: 2000 } },
        { type: 'damage', spRatio: 0.9, canCrit: true },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '废柴魔族的逆袭',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.15 },
        },
      ],
    },
    ultimate: {
      name: '魔族血脉的诅咒',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 6000, amount: 0.25 } },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  70610: {
    role: 'striker',
    skill1: {
      name: '魔法少女的正义制裁',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.22 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '开朗的正义使者',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '驱魔血统的觉醒',
      target: 'allEnemies',
      effects: [
        { type: 'damage', atkRatio: 1, canCrit: true },
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 6000, amount: 0.25 } },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 5000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  71337: {
    role: 'striker',
    skill1: { name: '支配压制' },
    passive: { name: '支配之魔' },
    ultimate: { name: '万人践踏' },
  },
  71478: {
    role: 'striker',
    skill1: {
      name: '荆棘女王·瞬杀',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 6000, amount: 0.25 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '花田家的守护',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '杀手约尔·夺命一击',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'execute', hpRatioThreshold: 0.3 },
        { type: 'damage', atkRatio: 2.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  71479: {
    role: 'support',
    skill1: {
      name: '读心',
      target: 'allAllies',
      effects: [
        { type: 'cleanse' },
        { type: 'energyGain', amount: 70 },
        { type: 'applyStatus', status: { kind: 'spUp', durationMs: 6000, amount: 0.12 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '读心术',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '哇酷哇酷',
      target: 'allAllies',
      effects: [
        { type: 'heal', spRatio: 0.55, flatPower: 60 },
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 6000, amount: 0.18 } },
        { type: 'applyStatus', status: { kind: 'critRateUp', durationMs: 6000, amount: 0.12 } },
      ],
      energyCost: 1000,
    },
  },
  72355: {
    skill1: { name: '旅人魔术' },
    passive: { name: '灰之魔女' },
    ultimate: { name: '星降之夜' },
  },
  73191: {
    role: 'support',
    skill1: {
      name: '专业女友的演技',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.2, spRatio: 0.6, flatPower: 40 },
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 6000, amount: 0.18 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '租借的真心',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 25, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '追逐梦想的女主角',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1, spRatio: 0.7, flatPower: 50 },
        { type: 'cleanse', target: 'allAllies' },
        { type: 'applyStatus', status: { kind: 'critRateUp', durationMs: 8000, amount: 0.2 } },
      ],
      energyCost: 1000,
    },
  },
  73831: {
    role: 'controller',
    skill1: {
      name: '处刑之刃',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', target: 'highestAtkEnemy', spRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'silence', durationMs: 4000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '纯粹概念·抹消',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '导力抹消·纯粹概念',
      target: 'allEnemies',
      effects: [
        { type: 'dispel', target: 'allEnemies' },
        { type: 'damage', target: 'allEnemies', spRatio: 1.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 4000 },
        },
      ],
      energyCost: 1000,
    },
  },
  74255: {
    role: 'guardian',
    skill1: {
      name: '高性能机器人的守护',
      target: 'self',
      effects: [
        { type: 'shield', target: 'self', defRatio: 2.2, durationMs: 7000 },
        { type: 'applyStatus', target: 'self', status: { kind: 'taunt', durationMs: 5000 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '自主学习程序',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.18 },
        },
        { type: 'shield', target: 'allAllies', defRatio: 1, flatPower: 50, durationMs: 30000 },
      ],
    },
    ultimate: {
      name: '挚爱时光的守望',
      target: 'allAllies',
      effects: [
        { type: 'shield', target: 'allAllies', defRatio: 1.6, durationMs: 8000 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 8000, amount: 0.3 },
        },
        { type: 'heal', target: 'allAllies', atkRatio: 0.6 },
      ],
      energyCost: 1000,
    },
  },
  76270: {
    role: 'support',
    skill1: {
      name: '隔壁天使的关照',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.1, spRatio: 0.4 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.18 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '完美的邻家女孩',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '温柔的家常菜',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 0.9 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 6000, amount: 45, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  77208: {
    role: 'tactical',
    skill1: {
      name: '我最喜欢的地方就是这里！',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.22 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '闪耀的偶像之魂',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 80 },
      ],
    },
    ultimate: {
      name: '跨越大海的Superstar',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', target: 'allAllies', amount: 100 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.28 },
        },
        { type: 'heal', target: 'allAllies', atkRatio: 0.6 },
      ],
      energyCost: 1000,
    },
  },
  77400: {
    role: 'guardian',
    skill1: {
      name: '美食广场的座位守护',
      target: 'self',
      effects: [
        { type: 'shield', spRatio: 0.5, defRatio: 1.4, durationMs: 7000 },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'taunt', durationMs: 5000 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '日常的坚守',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '今天也在这里等你',
      target: 'allAllies',
      effects: [
        { type: 'shield', spRatio: 0.6, defRatio: 1.6, durationMs: 8000 },
        { type: 'applyStatus', status: { kind: 'defUp', durationMs: 8000, amount: 0.25 } },
        { type: 'heal', atkRatio: 0.7, flatPower: 40 },
      ],
      energyCost: 1000,
    },
  },
  86246: {
    role: 'arcane',
  },
  88130: {
    role: 'arcane',
    skill1: {
      name: '梦幻光辉·聚光灯',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'spDown', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '梦芽的心跳',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.18 },
        },
        { type: 'energyGain', target: 'self', amount: 70 },
      ],
    },
    ultimate: {
      name: '电光合体·超装光辉',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.22 },
        },
      ],
      energyCost: 1000,
    },
  },
  88208: {
    role: 'guardian',
    skill1: {
      name: '勇者的守护之剑',
      target: 'self',
      effects: [
        { type: 'shield', spRatio: 0.6, defRatio: 1.2, durationMs: 8000 },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'taunt', durationMs: 5500 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '被铭记的英雄意志',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '如今我也成了英雄',
      target: 'allAllies',
      effects: [
        { type: 'shield', defRatio: 1, flatPower: 90, durationMs: 8000 },
        { type: 'applyStatus', status: { kind: 'defUp', durationMs: 6000, amount: 0.3 } },
        { type: 'heal', atkRatio: 0.7, flatPower: 50 },
      ],
      energyCost: 1000,
    },
  },
  88670: {
    role: 'guardian',
    skill1: {
      name: '奇蛋的守护者',
      target: 'self',
      effects: [
        { type: 'shield', target: 'self', defRatio: 1.8, flatPower: 80, durationMs: 7000 },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'taunt', durationMs: 5000 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '被选中的战士',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.18 },
        },
        { type: 'shield', target: 'self', defRatio: 1, flatPower: 50, durationMs: 30000 },
      ],
    },
    ultimate: {
      name: '为了拯救她而战',
      target: 'allAllies',
      effects: [
        { type: 'shield', target: 'allAllies', defRatio: 2, flatPower: 120, durationMs: 8000 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 7000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  90574: {
    role: 'support',
    skill1: {
      name: '温柔的注视',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.4 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'defUp', durationMs: 5000, amount: 0.22 },
        },
      ],
      cooldownMs: 8600,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '图书委员的秘密',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 22, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '心里危险的悸动',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.25 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  91665: {
    role: 'support',
    skill1: {
      name: '影子的守护',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.1, spRatio: 0.4 },
        { type: 'cleanse', target: 'lowestHpAlly' },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '日代村的记忆',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 25, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '重返那个夏天',
      target: 'firstDefeatedAlly',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        { type: 'heal', target: 'allAllies', atkRatio: 0.8 },
      ],
      energyCost: 1000,
    },
  },
  92177: {
    role: 'support',
    skill1: {
      name: '冰上的鼓励',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.3, flatPower: 40 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'haste', durationMs: 6000, amount: 0.18 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '夜鹫的翱翔',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '金牌得主的自由滑',
      target: 'firstDefeatedAlly',
      effects: [
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.5 },
        { type: 'heal', target: 'allAllies', atkRatio: 0.8, flatPower: 30 },
      ],
      energyCost: 1000,
    },
  },
  95935: {
    role: 'controller',
    skill1: {
      name: '漂流彼方的呼唤',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', spRatio: 1.1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.22 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '沉默的守望者',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '迷失少年的漩涡',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 6000, amount: 0.25 },
        },
        { type: 'applyStatus', target: 'frontEnemy', status: { kind: 'stun', durationMs: 2000 } },
      ],
      energyCost: 1000,
    },
  },
  97302: {
    role: 'support',
    skill1: {
      name: '俄语的悄声鼓励',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.1, flatPower: 100 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '遮羞的俄语',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: 'Что?·藏不住的真心',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 0.9, flatPower: 130 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.25 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  99737: {
    role: 'arcane',
    skill1: {
      name: '魔法学·空之飞行实验',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 0.9, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', durationMs: 6000, amount: 0.2 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '异端的魔法学者',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.2 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
    },
    ultimate: {
      name: '魔法革命·禁忌兵装',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          status: { kind: 'dot', durationMs: 8000, amount: 65, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  100857: {
    role: 'striker',
    skill1: {
      name: '相合的刃',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '手起刀落',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.22 },
        },
      ],
    },
    ultimate: {
      name: '一刀入魂·裁断',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        { type: 'execute', hpRatioThreshold: 0.25 },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  101553: {
    role: 'controller',
    skill1: {
      name: '恶之女干部·登场',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.1, canCrit: true },
        { type: 'applyStatus', status: { kind: 'stun', durationMs: 2000 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '魔法少女的宿敌',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '黑暗魔法·堕落宣言',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 4500 } },
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 8000, amount: 0.25 } },
        { type: 'damage', spRatio: 0.9, canCrit: true },
      ],
      energyCost: 1000,
    },
  },
  102090: {
    skill1: { name: '同好守护' },
    passive: { name: '闪耀直率' },
    ultimate: { name: 'cosplay全开' },
  },
  102126: {
    role: 'support',
    skill1: {
      name: '闪耀吧，B小町',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 0.7, flatPower: 60 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.15 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '永远的爱豆之光',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '偶像的第一课·说谎',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 1.1, flatPower: 90 },
        { type: 'cleanse', target: 'allAllies' },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 6000, amount: 60, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  102486: {
    role: 'controller',
    skill1: {
      name: '吸血的低语',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'slow', durationMs: 5000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '永恒的少女',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 90000, amount: 24, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '彻夜之歌的诱惑',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'stun', durationMs: 2000 } },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.22 },
        },
      ],
      energyCost: 1000,
    },
  },
  102530: {
    role: 'controller',
    skill1: {
      name: '影之窥探',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'slow', durationMs: 6000, amount: 0.25 } },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.22 },
        },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '影子的真相',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '循环的终结',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'stun', durationMs: 2000 } },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  104093: {
    role: 'arcane',
    skill1: {
      name: '冰霜精灵召唤',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', spRatio: 1.7, canCrit: true },
        {
          type: 'applyStatus',
          target: 'lowestHpEnemy',
          status: { kind: 'slow', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '被驱逐的贤者',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '异世界返る·极大魔法',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 70, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  104598: {
    role: 'tactical',
    skill1: {
      name: '孔明的策略',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.2 },
        },
        { type: 'energyGain', target: 'self', amount: 90 },
      ],
      cooldownMs: 8600,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '军师的临场指挥',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 75 },
      ],
    },
    ultimate: {
      name: '传说主唱的舞台',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', target: 'allAllies', amount: 110 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.28 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.28 },
        },
      ],
      energyCost: 1000,
    },
  },
  107704: {
    role: 'support',
    skill1: {
      name: '拳击手的鼓舞',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', target: 'lowestHpAlly', atkRatio: 1.3 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1600,
    },
    passive: {
      name: '不服输的心',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'allAllies', amount: 60 },
      ],
    },
    ultimate: {
      name: '永不认输的斗志',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 0.9 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 8000, amount: 0.3 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  108660: {
    role: 'arcane',
    skill1: {
      name: '契约之吻',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', target: 'lowestHpEnemy', spRatio: 1.7, canCrit: true },
        {
          type: 'applyStatus',
          target: 'lowestHpEnemy',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.22 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '血之契约',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '血族的黑夜降临',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.35, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 75, tickIntervalMs: 2000 },
        },
        { type: 'heal', target: 'self', spRatio: 0.6 },
      ],
      energyCost: 1000,
    },
  },
  108663: {
    role: 'striker',
    skill1: {
      name: '不杀的枪术',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', target: 'frontEnemy', atkRatio: 1.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.25 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '超凡的动体视力',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.22 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '超凡的射击·全弹连射',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', atkRatio: 1.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 8000, amount: 0.3 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 5000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  108664: {
    role: 'striker',
    skill1: {
      name: '武装射击',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '冷静的枪口',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '泷奈式歼灭战术',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', atkRatio: 1.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.3 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 4000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  109775: {
    role: 'arcane',
    skill1: {
      name: '无咏唱魔术',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', spRatio: 1.7, canCrit: true },
        {
          type: 'applyStatus',
          target: 'lowestHpEnemy',
          status: { kind: 'silence', durationMs: 3500 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '怕生的天才',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.2 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
    },
    ultimate: {
      name: '沉默魔女的星辉',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  111327: {
    role: 'controller',
    skill1: {
      name: '冷静观察',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', target: 'highestAtkEnemy', atkRatio: 1.3, spRatio: 0.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 5000, amount: 0.22 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '冷静的旁观者',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '败犬逆袭剧本',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 4000 },
        },
      ],
      energyCost: 1000,
    },
  },
  111330: {
    role: 'controller',
    skill1: {
      name: '毒舌吐槽',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 0.9, spRatio: 1, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'silence', durationMs: 3500 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '败犬也要努力',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '败犬女主の逆袭宣言',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 5000, amount: 0.24 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 5000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  111919: {
    role: 'tactical',
    skill1: {
      name: '我的高达',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '决斗委员会长',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
        { type: 'energyGain', target: 'self', amount: 70 },
      ],
    },
    ultimate: {
      name: '我是米奥莉奈·伦布兰',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.28 },
        },
        { type: 'energyGain', target: 'self', amount: 110 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.18 },
        },
      ],
      energyCost: 1000,
    },
  },
  112127: {
    role: 'striker',
    skill1: {
      name: '全力一击的驱魔',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '妖怪辣妹的怪力',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.22 },
        },
      ],
    },
    ultimate: {
      name: '驱魔一族的最强连击',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.2, canCrit: true },
        { type: 'execute', hpRatioThreshold: 0.28 },
      ],
      energyCost: 1000,
    },
  },
  114156: {
    role: 'tactical',
    skill1: {
      name: '义妹的冷静距离感',
      target: 'self',
      effects: [
        { type: 'energyGain', amount: 100 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 5000, amount: 0.22 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '恰到好处的体贴',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '逐渐靠近的心意',
      target: 'allAllies',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 6000, amount: 0.25 } },
        { type: 'energyGain', amount: 90 },
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 5000, amount: 0.25 } },
      ],
      energyCost: 1000,
    },
  },
  116352: {
    role: 'striker',
    skill1: {
      name: '赛博狂人义体化',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.25 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '触网即燃的Edgerunner',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '月球边缘的最后飞驰',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        { type: 'execute', hpRatioThreshold: 0.3 },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 5000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  116353: {
    role: 'striker',
    skill1: {
      name: '单分子线切割',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', target: 'highestAtkEnemy', atkRatio: 2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    passive: {
      name: '月球之梦',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '黑客帝国·致命突袭',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', target: 'lowestHpEnemy', atkRatio: 2.4, canCrit: true },
        { type: 'execute', target: 'lowestHpEnemy', hpRatioThreshold: 0.25 },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 8000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  126611: {
    role: 'support',
    skill1: {
      name: '唐音的元气加油',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 0.8, spRatio: 0.5, flatPower: 35 },
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 6000, amount: 0.18 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '热血直球少女',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '第100个女朋友的告白',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1, spRatio: 0.6, flatPower: 55 },
        { type: 'cleanse', target: 'allAllies' },
        {
          type: 'applyStatus',
          status: { kind: 'hot', durationMs: 8000, amount: 55, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  127790: {
    skill1: { name: '迷途之声' },
    passive: { name: '不想成为一个人' },
    ultimate: { name: '为了不再迷路' },
  },
  127792: {
    role: 'tactical',
    skill1: {
      name: '随性の即兴独奏',
      target: 'self',
      effects: [
        { type: 'energyGain', amount: 110 },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 6000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '随性的即兴节奏',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'self', amount: 70 },
      ],
    },
    ultimate: {
      name: '自由不羁の吉他咏叹',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', target: 'allAllies', amount: 90 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.28 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  127793: {
    role: 'controller',
    skill1: {
      name: '春日影',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', spRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'lowestHpEnemy',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '破碎的乐队',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '为什么要演奏春日影！',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 6000, amount: 0.35 },
        },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'silence', durationMs: 3500 },
        },
      ],
      energyCost: 1000,
    },
  },
  127794: {
    role: 'tactical',
    skill1: {
      name: '节拍死守',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.2 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '乐队的支柱',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: 'MyGO!!!!!·压轴鼓点',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.3 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.25 },
        },
        { type: 'energyGain', target: 'self', amount: 100 },
      ],
      energyCost: 1000,
    },
  },
  130664: {
    role: 'striker',
    skill1: {
      name: '迷茫地嘶吼',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8400,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '不服输的倔强',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '哭泣少女乐队',
      target: 'allEnemies',
      effects: [
        { type: 'damage', atkRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.35 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  130666: {
    role: 'tactical',
    skill1: {
      name: '无名之诗·前奏',
      target: 'allAllies',
      effects: [
        { type: 'applyStatus', status: { kind: 'haste', durationMs: 6000, amount: 0.2 } },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '东京之愤',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '空洞之心·Live',
      target: 'allAllies',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkUp', durationMs: 8000, amount: 0.3 } },
        { type: 'energyGain', target: 'self', amount: 100 },
      ],
      energyCost: 1000,
    },
  },
  130668: {
    role: 'striker',
    skill1: {
      name: '键盘手的怒吼',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '不服输的乐队魂',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '哭泣女孩的合奏',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.3, canCrit: true },
        { type: 'execute', target: 'frontEnemy', hpRatioThreshold: 0.25 },
      ],
      energyCost: 1000,
    },
  },
  132476: {
    role: 'arcane',
    skill1: {
      name: '圣咏·奏鸣',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', spRatio: 1.7, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: 'Oblivionis的领唱',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.22 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
    },
    ultimate: {
      name: 'Ave Mujica·假面安魂曲',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 5000 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  132477: {
    role: 'guardian',
    skill1: {
      name: '沉默的守护',
      target: 'self',
      effects: [
        { type: 'shield', spRatio: 0.8, defRatio: 1.2, flatPower: 100, durationMs: 7000 },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'taunt', durationMs: 5000 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '背负一切的姐姐',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.22 },
        },
        { type: 'shield', target: 'allAllies', defRatio: 1, flatPower: 50, durationMs: 30000 },
      ],
    },
    ultimate: {
      name: 'Mortis·守护者的假面',
      target: 'allAllies',
      effects: [
        { type: 'shield', spRatio: 0.6, defRatio: 1, flatPower: 130, durationMs: 8000 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.3 },
        },
        { type: 'cleanse', target: 'allAllies' },
      ],
      energyCost: 1000,
    },
  },
  132479: {
    skill1: { name: '假面序曲' },
    passive: { name: '初华绽放' },
    ultimate: { name: '谢幕安可' },
  },
  132924: {
    role: 'striker',
    skill1: {
      name: '贝斯手的暗涌',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.8, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'defDown', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '沉默的低音',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: 'Ave Mujica的献祭',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 2.2, canCrit: true },
        { type: 'execute', target: 'frontEnemy', hpRatioThreshold: 0.2 },
      ],
      energyCost: 1000,
    },
  },
  133285: {
    role: 'tactical',
    skill1: {
      name: '键盘的旋律',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.2 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: 'Ave Mujica的合音',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
        { type: 'energyGain', target: 'self', amount: 80 },
      ],
    },
    ultimate: {
      name: 'Timoris·加速的乐章',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.3 },
        },
        { type: 'energyGain', target: 'self', amount: 110 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  134703: {
    role: 'arcane',
    skill1: {
      name: '复古像素弹幕',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', spRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'frontEnemy',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '穿越次元的玩家',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.2 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: 'GAME OVER·另一层',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 70, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  137906: {
    role: 'controller',
    skill1: {
      name: '机械女仆的锁定',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'silence', durationMs: 4000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '魔王的心腹',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '2099年的制裁',
      target: 'allEnemies',
      effects: [
        { type: 'damage', target: 'allEnemies', atkRatio: 0.9, canCrit: true },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'stun', durationMs: 2200 } },
      ],
      energyCost: 1000,
    },
  },
  149129: {
    role: 'controller',
    skill1: {
      name: '北欧战神的沙拉碗',
      target: 'frontEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'stun', durationMs: 2000 } },
        { type: 'damage', atkRatio: 1.3, canCrit: true },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '沙拉碗的怪人',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.15 },
        },
      ],
    },
    ultimate: {
      name: '众神黄昏的余威',
      target: 'allEnemies',
      effects: [
        { type: 'applyStatus', status: { kind: 'slow', durationMs: 5000, amount: 0.3 } },
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 6000, amount: 0.28 } },
        { type: 'damage', atkRatio: 0.8, canCrit: true },
      ],
      energyCost: 1000,
    },
  },
  150624: {
    role: 'controller',
    skill1: {
      name: '小市民的观察',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', target: 'highestAtkEnemy', atkRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'atkDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1700,
    },
    passive: {
      name: '互惠关系',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'defDown', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '看穿一切的推理',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 4500 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.28 },
        },
        { type: 'damage', target: 'allEnemies', spRatio: 0.7, canCrit: true },
      ],
      energyCost: 1000,
    },
  },
  157752: {
    role: 'support',
    skill1: {
      name: '轻抚发梢的关怀',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.3, flatPower: 55 },
        { type: 'applyStatus', status: { kind: 'defUp', durationMs: 6000, amount: 0.2 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '薰香缭绕的温柔',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 25, tickIntervalMs: 2000 },
        },
      ],
    },
    ultimate: {
      name: '花朵为你而绽放',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 0.9, flatPower: 80 },
        { type: 'cleanse' },
        {
          type: 'applyStatus',
          status: { kind: 'hot', durationMs: 6000, amount: 50, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  162008: {
    role: 'support',
    skill1: {
      name: '定格温柔的快门',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.3, flatPower: 55 },
        {
          type: 'applyStatus',
          status: { kind: 'hot', durationMs: 6000, amount: 45, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '黑白之间的宁静',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '留住此刻的黑白影像',
      target: 'allAllies',
      effects: [
        { type: 'heal', atkRatio: 1, flatPower: 80 },
        { type: 'cleanse' },
        { type: 'applyStatus', status: { kind: 'defUp', durationMs: 6000, amount: 0.2 } },
      ],
      energyCost: 1000,
    },
  },
  162158: {
    role: 'arcane',
    skill1: {
      name: '章鱼哔之侵蚀',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', spRatio: 1.5, canCrit: true },
        {
          type: 'applyStatus',
          target: 'lowestHpEnemy',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '真理奈的凝视',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.15 },
        },
      ],
    },
    ultimate: {
      name: '扭曲原罪·吞噬',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 55, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  166837: {
    role: 'controller',
    skill1: {
      name: '婚姻的枷锁',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkDown', durationMs: 6000, amount: 0.28 } },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'slow', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '名为爱情的毒',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 90000, amount: 35, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'atkDown', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '这段关系的剧毒',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'silence', durationMs: 4000 },
        },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 55, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
  167824: {
    role: 'striker',
    skill1: {
      name: '机体同调突袭',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', target: 'frontEnemy', atkRatio: 2, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 6000, amount: 0.18 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1600,
    },
    passive: {
      name: '宇宙世纪之魂',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'atkUp', durationMs: 90000, amount: 0.15 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
      ],
    },
    ultimate: {
      name: '让叶觉醒·全域压制',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', target: 'highestAtkEnemy', atkRatio: 2.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 8000, amount: 0.35 },
        },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'slow', durationMs: 5000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  167988: {
    role: 'tactical',
    skill1: {
      name: '街机女王的连段',
      target: 'allEnemies',
      effects: [
        { type: 'damage', atkRatio: 0.7, spRatio: 0.3, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 5000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '游戏中心的常客',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 90000, amount: 0.12 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '一币通关·完美收官',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', target: 'allAllies', amount: 110 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'haste', durationMs: 6000, amount: 0.3 },
        },
      ],
      energyCost: 1000,
    },
  },
  170104: {
    role: 'guardian',
    skill1: {
      name: '末世酒店的门房',
      target: 'self',
      effects: [
        { type: 'shield', spRatio: 0.9, defRatio: 0.6, durationMs: 7000 },
        { type: 'applyStatus', target: 'allEnemies', status: { kind: 'taunt', durationMs: 5000 } },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '世界终末的守望',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.2 },
        },
        { type: 'shield', target: 'self', defRatio: 1, flatPower: 50, durationMs: 90000 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.08 },
        },
      ],
    },
    ultimate: {
      name: '永远的待客之道',
      target: 'allAllies',
      effects: [
        { type: 'shield', target: 'allAllies', spRatio: 0.7, defRatio: 0.5, durationMs: 7000 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.22 },
        },
      ],
      energyCost: 1000,
    },
  },
  172764: {
    role: 'support',
    skill1: {
      name: '今日的暖心定食',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1, spRatio: 0.4 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'hot', durationMs: 6000, amount: 55, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '妈妈的味道',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 30, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '时光流逝，饭菜依旧美味',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 1.1, spRatio: 0.5 },
        { type: 'cleanse', target: 'allAllies' },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'defUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  172765: {
    role: 'support',
    skill1: {
      name: '温热的家常味',
      target: 'lowestHpAlly',
      effects: [
        { type: 'heal', atkRatio: 1.1, spRatio: 0.4 },
        {
          type: 'applyStatus',
          target: 'lowestHpAlly',
          status: { kind: 'hot', durationMs: 6000, amount: 45, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    passive: {
      name: '不变的温暖',
      target: 'allAllies',
      effects: [
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'hot', durationMs: 90000, amount: 25, tickIntervalMs: 2000 },
        },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '岁月依旧的团圆饭',
      target: 'allAllies',
      effects: [
        { type: 'heal', target: 'allAllies', atkRatio: 0.9 },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', durationMs: 6000, amount: 0.2 },
        },
      ],
      energyCost: 1000,
    },
  },
  189813: {
    role: 'arcane',
    skill1: {
      name: '月光辉射',
      target: 'lowestHpEnemy',
      effects: [
        { type: 'damage', spRatio: 1.6, canCrit: true },
        {
          type: 'applyStatus',
          target: 'lowestHpEnemy',
          status: { kind: 'spDown', durationMs: 6000, amount: 0.2 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 1900,
    },
    passive: {
      name: '月之公主',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.22 },
        },
        { type: 'energyGain', target: 'self', amount: 70 },
      ],
    },
    ultimate: {
      name: '超时空·辉夜升天',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.45, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'slow', durationMs: 6000, amount: 0.25 },
        },
      ],
      energyCost: 1000,
    },
  },
  189814: {
    skill1: { name: '时空错位' },
    passive: { name: '因果观测' },
    ultimate: { name: '时轴封锁' },
  },
  189815: {
    role: 'arcane',
    skill1: {
      name: '超时空·辉夜之光',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', spRatio: 1.7, canCrit: true },
        {
          type: 'applyStatus',
          target: 'highestAtkEnemy',
          status: { kind: 'defDown', durationMs: 6000, amount: 0.25 },
        },
      ],
      cooldownMs: 8500,
      initialCooldownMs: 2000,
    },
    passive: {
      name: '辉夜的神威',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'spUp', durationMs: 90000, amount: 0.18 },
        },
        {
          type: 'applyStatus',
          target: 'self',
          status: { kind: 'critRateUp', durationMs: 90000, amount: 0.1 },
        },
      ],
    },
    ultimate: {
      name: '月光公主·天穹裁决',
      target: 'allEnemies',
      effects: [
        { type: 'damage', spRatio: 1.4, canCrit: true },
        {
          type: 'applyStatus',
          target: 'allEnemies',
          status: { kind: 'dot', durationMs: 6000, amount: 70, tickIntervalMs: 2000 },
        },
      ],
      energyCost: 1000,
    },
  },
}
