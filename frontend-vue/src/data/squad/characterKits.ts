// 小队战「逐角色 kit」统一配置（声明式数据，无逻辑）。
// Step 2 统一形状（2026-07-03）：原 EXPLICIT_ARCHETYPE / SIGNATURE_KIT_OVERRIDES /
// HR_SKILL_NAME_OVERRIDES 三张表合并为一张按 character.id 键的 CHARACTER_KITS——
// 一个角色一条目，可同时声明 role + 各槽 {name / target+effects / CD}。装配逻辑（squadSkillKits.ts）
// 读本表并回落到 archetypeTemplates.ts 的模板。逐角色补设计（尤其 SSR）直接在本表加/改条目即可。
// 语义（与拆分前 1:1 等价，见 kit 输出等价测试）：
//   · role         —— 钉定位（原 EXPLICIT_ARCHETYPE），未设则走正则/stats 推断；
//   · slot.effects  —— 该槽专属效果（原 SIGNATURE，仅 skill1/ultimate 曾用；名优先级最高）；
//   · slot.name-only（无 effects）—— 只改技能名（原 HR 名表；优先级低于角色个人技名）。
// 现状与三步方案见 docs/orch/squad-skill-design-audit-2026-07-03.md。

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

/** 一个角色的完整 kit 覆盖（缺省的槽/字段回落原型模板 + 通名）。normalAttack 目前恒通用，暂不开放覆盖。 */
export interface CharacterKitConfig {
  role?: SquadArchetype
  skill1?: SquadSlotConfig
  skill2?: SquadSlotConfig
  passive?: SquadSlotConfig
  ultimate?: SquadSlotConfig
}

/** 暂缺设计、临时排除出小队战的角色 id（占位，空数组 = 无排除）。 */
export const SQUAD_SKILL_PENDING_DESIGN_IDS: readonly number[] = []

export const CHARACTER_KITS: Record<number, CharacterKitConfig> = {
  49: {
    role: 'controller',
    ultimate: {
      name: '信息操作',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          status: {
            kind: 'silence',
            durationMs: 6000,
          },
        },
        {
          type: 'applyStatus',
          status: {
            kind: 'defDown',
            amount: 0.2,
            durationMs: 8000,
          },
        },
      ],
      energyCost: 1000,
    },
  },
  273: {
    role: 'striker',
  },
  303: {
    role: 'guardian',
    skill1: {
      name: 'AT力场',
      target: 'self',
      effects: [
        {
          type: 'shield',
          spRatio: 0.6,
          defRatio: 1.8,
          flatPower: 120,
          durationMs: 8000,
        },
        {
          type: 'applyStatus',
          status: {
            kind: 'taunt',
            durationMs: 6000,
          },
        },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 1500,
    },
  },
  304: {
    role: 'striker',
    skill1: {
      name: '同步率爆发',
      target: 'self',
      effects: [
        {
          type: 'applyStatus',
          status: {
            kind: 'atkUp',
            amount: 0.45,
            durationMs: 8000,
          },
        },
        {
          type: 'applyStatus',
          status: {
            kind: 'critRateUp',
            amount: 0.25,
            durationMs: 8000,
          },
        },
        {
          type: 'applyStatus',
          status: {
            kind: 'haste',
            amount: 0.2,
            durationMs: 8000,
          },
        },
      ],
      cooldownMs: 11000,
      initialCooldownMs: 3000,
    },
  },
  336: {
    skill1: {
      name: '救赎契约',
    },
    skill2: {
      name: '并肩同行',
    },
    passive: {
      name: '不再孤独',
    },
    ultimate: {
      name: '走出房间',
    },
  },
  671: {
    skill1: {
      name: '专属守护',
    },
    skill2: {
      name: '日记预知',
    },
    passive: {
      name: '病娇执念',
    },
    ultimate: {
      name: '为你挡下一切',
    },
  },
  706: {
    role: 'controller',
    skill1: {
      name: '毒舌反击',
      target: 'highestAtkEnemy',
      effects: [
        {
          type: 'dispel',
        },
        {
          type: 'applyStatus',
          status: {
            kind: 'atkDown',
            amount: 0.35,
            durationMs: 7000,
          },
        },
        {
          type: 'applyStatus',
          status: {
            kind: 'silence',
            durationMs: 3500,
          },
        },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
  },
  1211: {
    role: 'striker',
    ultimate: {
      name: '吸血冲击',
      target: 'lowestHpEnemy',
      effects: [
        {
          type: 'damage',
          atkRatio: 1.8,
          spRatio: 0.4,
          canCrit: true,
        },
        {
          type: 'execute',
          hpRatioThreshold: 0.3,
        },
        {
          type: 'heal',
          target: 'self',
          spRatio: 0.6,
          flatPower: 60,
        },
      ],
      energyCost: 1000,
    },
  },
  3187: {
    skill1: {
      name: '御社神护',
    },
    skill2: {
      name: '轮回坚守',
    },
    passive: {
      name: '百年之约',
    },
    ultimate: {
      name: '命运的抵抗',
    },
  },
  3218: {
    skill1: {
      name: '魔术卡装填',
    },
    skill2: {
      name: '英灵借力',
    },
    passive: {
      name: '爱因兹贝伦血脉',
    },
    ultimate: {
      name: '柯普利亚全解放',
    },
  },
  3575: {
    role: 'striker',
    skill1: {
      name: '超电磁炮',
      target: 'highestAtkEnemy',
      effects: [
        {
          type: 'damage',
          atkRatio: 2.05,
          spRatio: 0.3,
          canCrit: true,
        },
        {
          type: 'applyStatus',
          status: {
            kind: 'silence',
            durationMs: 4000,
          },
        },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
  },
  10439: {
    role: 'support',
    ultimate: {
      name: '圆环之理',
      target: 'allAllies',
      effects: [
        {
          type: 'heal',
          spRatio: 1,
          flatPower: 120,
        },
        {
          type: 'cleanse',
        },
        {
          type: 'revive',
          target: 'firstDefeatedAlly',
          hpRatio: 0.6,
        },
      ],
      energyCost: 1000,
    },
  },
  10440: {
    role: 'controller',
    ultimate: {
      name: '时间停止',
      target: 'allEnemies',
      effects: [
        {
          type: 'applyStatus',
          status: {
            kind: 'stun',
            durationMs: 3000,
          },
        },
        {
          type: 'applyStatus',
          status: {
            kind: 'slow',
            amount: 0.25,
            durationMs: 8000,
          },
        },
      ],
      energyCost: 1000,
    },
  },
  10446: {
    skill1: {
      name: '契约诱导',
    },
    skill2: {
      name: '愿望回收',
    },
    passive: {
      name: '情感观测',
    },
    ultimate: {
      name: '因果律干涉',
    },
  },
  10596: {
    role: 'arcane',
    ultimate: {
      name: '宝石魔术',
      target: 'highestAtkEnemy',
      effects: [
        {
          type: 'damage',
          atkRatio: 0.4,
          spRatio: 2,
          canCrit: true,
        },
        {
          type: 'applyStatus',
          status: {
            kind: 'dot',
            amount: 90,
            durationMs: 8000,
            tickIntervalMs: 2000,
          },
        },
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
        {
          type: 'energyGain',
          amount: 120,
        },
        {
          type: 'applyStatus',
          status: {
            kind: 'haste',
            amount: 0.18,
            durationMs: 7000,
          },
        },
      ],
      cooldownMs: 12000,
      initialCooldownMs: 3500,
    },
  },
  13004: {
    skill1: {
      name: '存在感守护',
    },
    skill2: {
      name: '暖心陪伴',
    },
    passive: {
      name: '路人光环',
    },
    ultimate: {
      name: '大家一起',
    },
  },
  13391: {
    skill1: {
      name: '寒空的旋律',
    },
    skill2: {
      name: '琴音共鸣',
    },
    passive: {
      name: '雪夜练习曲',
    },
    ultimate: {
      name: '未完成的乐章',
    },
  },
  17362: {
    skill1: {
      name: '邪王真眼',
    },
    skill2: {
      name: '契约结界',
    },
    passive: {
      name: '中二结界',
    },
    ultimate: {
      name: '暗黑闪光',
    },
  },
  18102: {
    role: 'striker',
  },
  19529: {
    skill1: {
      name: '刻刻帝·一之弹',
    },
    skill2: {
      name: '影之分身',
    },
    passive: {
      name: '时之精灵',
    },
    ultimate: {
      name: '刻刻帝·终',
    },
  },
  19546: {
    role: 'striker',
    skill1: {
      name: '立体机动斩',
    },
    skill2: {
      name: '疾风连刃',
    },
    passive: {
      name: '人类最强',
    },
    ultimate: {
      name: '必杀回旋斩',
    },
  },
  24092: {
    skill1: {
      name: '剧本布局',
    },
    skill2: {
      name: '致命吐槽',
    },
    passive: {
      name: '毒舌剧作家',
    },
    ultimate: {
      name: '恋爱节拍杀',
    },
  },
  24093: {
    skill1: {
      name: '毒舌吐槽',
    },
    skill2: {
      name: '锐利笔锋',
    },
    passive: {
      name: '傲娇本色',
    },
    ultimate: {
      name: '同人志决战',
    },
  },
  26003: {
    role: 'support',
    skill1: {
      name: '自由的音色',
    },
    skill2: {
      name: '即兴华彩',
    },
    passive: {
      name: '琴弦上的春天',
    },
    ultimate: {
      name: '你在春天里',
    },
  },
  29511: {
    skill1: {
      name: '隐身护持',
    },
    skill2: {
      name: '能力压制',
    },
    passive: {
      name: '姐系可靠',
    },
    ultimate: {
      name: '守护约定',
    },
  },
  35608: {
    role: 'arcane',
  },
  35615: {
    skill1: {
      name: '冰华绽放',
    },
    skill2: {
      name: '流星锤连击',
    },
    passive: {
      name: '鬼族血脉',
    },
    ultimate: {
      name: '冰之棺墓',
    },
  },
  40739: {
    skill1: {
      name: '青鸟的呼吸',
    },
    skill2: {
      name: '双簧共鸣',
    },
    passive: {
      name: '第三乐章',
    },
    ultimate: {
      name: '莉兹与青鸟',
    },
  },
  56775: {
    skill1: {
      name: '篝火庇护',
    },
    skill2: {
      name: '温暖分享',
    },
    passive: {
      name: '露营慢活',
    },
    ultimate: {
      name: '满天星空',
    },
  },
  57751: {
    role: 'striker',
    skill1: {
      name: '突击冲锋',
    },
    skill2: {
      name: '猛兽本能',
    },
    passive: {
      name: '亲爱的',
    },
    ultimate: {
      name: '螺旋突刺',
    },
  },
  59846: {
    skill1: {
      name: '夏日守望',
    },
    skill2: {
      name: '海风庇护',
    },
    passive: {
      name: '温柔坚守',
    },
    ultimate: {
      name: '不让你消失',
    },
  },
  59848: {
    skill1: {
      name: '并肩守护',
    },
    skill2: {
      name: '海边约定',
    },
    passive: {
      name: '沉静坚守',
    },
    ultimate: {
      name: '守望夏日',
    },
  },
  71337: {
    role: 'striker',
    skill1: {
      name: '支配压制',
    },
    skill2: {
      name: '锁链束缚',
    },
    passive: {
      name: '支配之魔',
    },
    ultimate: {
      name: '万人践踏',
    },
  },
  72355: {
    skill1: {
      name: '旅人魔术',
    },
    skill2: {
      name: '风纹咒式',
    },
    passive: {
      name: '灰之魔女',
    },
    ultimate: {
      name: '星降之夜',
    },
  },
  86246: {
    role: 'arcane',
  },
  102090: {
    skill1: {
      name: '同好守护',
    },
    skill2: {
      name: '元气应援',
    },
    passive: {
      name: '闪耀直率',
    },
    ultimate: {
      name: 'cosplay全开',
    },
  },
  127790: {
    skill1: {
      name: '迷途之声',
    },
    skill2: {
      name: '春日影',
    },
    passive: {
      name: '不想成为一个人',
    },
    ultimate: {
      name: '为了不再迷路',
    },
  },
  132479: {
    skill1: {
      name: '假面序曲',
    },
    skill2: {
      name: '舞台和声',
    },
    passive: {
      name: '初华绽放',
    },
    ultimate: {
      name: '谢幕安可',
    },
  },
  189814: {
    skill1: {
      name: '时空错位',
    },
    skill2: {
      name: '解析视界',
    },
    passive: {
      name: '因果观测',
    },
    ultimate: {
      name: '时轴封锁',
    },
  },
}
