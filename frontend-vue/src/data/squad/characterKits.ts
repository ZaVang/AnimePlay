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

  // ==========================================================================
  // SSR 逐角色设计（Step 3 · 2026-07-03 首批小样，覆盖全部 6 定位）
  // 给 SSR 补「专属 role + skill1/ultimate 手写 effect + skill2/passive 名」，让 SSR 不再是通用克隆。
  // 只用 9 种合法 squad effect；description 由 describeSquadSkill 自动派生（禁手写）。
  // ==========================================================================

  // striker · 一方通行（某科学的一方通行）——矢量反射：单体高伤自带反射护盾，大招矢量崩坏斩杀残血。
  10639: {
    role: 'striker',
    skill1: {
      name: '矢量反射',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 1.9, spRatio: 0.3, canCrit: true },
        { type: 'shield', target: 'self', defRatio: 1.0, flatPower: 60, durationMs: 6000 },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
    skill2: { name: '白翼' },
    passive: { name: '一方通行' },
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

  // striker · 卫宫士郎（Fate/stay night）——投影魔术：连击自强，大招剑之楼台群体破防。
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
          status: { kind: 'atkUp', amount: 0.2, durationMs: 7000 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    skill2: { name: '强化魔术' },
    passive: { name: '正义的伙伴' },
    ultimate: {
      name: '剑之楼台',
      target: 'allEnemies',
      effects: [
        { type: 'damage', atkRatio: 1.2, spRatio: 0.5, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', amount: 0.15, durationMs: 6000 } },
      ],
      energyCost: 1000,
    },
  },

  // controller · 食蜂操祈（某科学的超电磁炮）——心理掌控：点名封技降攻，大招大量心理掌控群体沉默+眩晕。
  17949: {
    role: 'controller',
    skill1: {
      name: '心理掌控',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'applyStatus', status: { kind: 'silence', durationMs: 3500 } },
        { type: 'applyStatus', status: { kind: 'atkDown', amount: 0.25, durationMs: 6000 } },
        { type: 'damage', atkRatio: 0.3, spRatio: 0.6, canCrit: true },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 2000,
    },
    skill2: { name: '心理定势' },
    passive: { name: '女王' },
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

  // guardian · 美树沙耶香（魔法少女小圆）——治愈魔女之守：护盾+嘲讽+自回血，大招献身之剑自强硬抗。
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
          status: { kind: 'hot', amount: 30, durationMs: 6000, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 9000,
      initialCooldownMs: 1500,
    },
    skill2: { name: '蓝色的誓约' },
    passive: { name: '再生' },
    ultimate: {
      name: '献身之剑',
      target: 'self',
      effects: [
        { type: 'applyStatus', status: { kind: 'atkUp', amount: 0.35, durationMs: 8000 } },
        { type: 'shield', defRatio: 1.5, flatPower: 100, durationMs: 8000 },
        { type: 'heal', spRatio: 0.8, flatPower: 60 },
      ],
      energyCost: 1000,
    },
  },

  // arcane · 康娜卡姆依（小林家的龙女仆）——雷电吐息：单体术式+持续雷伤，大招龙之逆鳞群体破防。
  47695: {
    role: 'arcane',
    skill1: {
      name: '雷电吐息',
      target: 'frontEnemy',
      effects: [
        { type: 'damage', atkRatio: 0.2, spRatio: 1.3, canCrit: true },
        {
          type: 'applyStatus',
          status: { kind: 'dot', amount: 40, durationMs: 6000, tickIntervalMs: 2000 },
        },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    skill2: { name: '电球' },
    passive: { name: '上古之龙' },
    ultimate: {
      name: '龙之逆鳞',
      target: 'allEnemies',
      effects: [
        { type: 'damage', atkRatio: 0.4, spRatio: 1.5, canCrit: true },
        { type: 'applyStatus', status: { kind: 'defDown', amount: 0.2, durationMs: 7000 } },
      ],
      energyCost: 1000,
    },
  },

  // tactical · 杨文里（银河英雄传说）——魔术师杨：全队充能+加速抢节奏，大招用兵之妙点杀+全队加攻。
  12423: {
    role: 'tactical',
    skill1: {
      name: '魔术师杨',
      target: 'allAllies',
      effects: [
        { type: 'energyGain', amount: 110 },
        { type: 'applyStatus', status: { kind: 'haste', amount: 0.15, durationMs: 7000 } },
      ],
      cooldownMs: 12000,
      initialCooldownMs: 3500,
    },
    skill2: { name: '回廊之战' },
    passive: { name: '奇迹的杨' },
    ultimate: {
      name: '用兵之妙',
      target: 'highestAtkEnemy',
      effects: [
        { type: 'damage', atkRatio: 0.8, spRatio: 1.0, canCrit: true },
        { type: 'dispel' },
        {
          type: 'applyStatus',
          target: 'allAllies',
          status: { kind: 'atkUp', amount: 0.18, durationMs: 7000 },
        },
      ],
      energyCost: 1000,
    },
  },

  // support · 天野阳菜（天气之子）——晴天祈祷：群疗+净化，大招天气之子群疗+复活+加速。
  68978: {
    role: 'support',
    skill1: {
      name: '晴天祈祷',
      target: 'allAllies',
      effects: [{ type: 'heal', spRatio: 0.5, flatPower: 30 }, { type: 'cleanse' }],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    skill2: { name: '晴间' },
    passive: { name: '100%的晴女' },
    ultimate: {
      name: '天气之子',
      target: 'allAllies',
      effects: [
        { type: 'heal', spRatio: 0.7, flatPower: 90 },
        { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.4 },
        { type: 'applyStatus', status: { kind: 'haste', amount: 0.15, durationMs: 6000 } },
      ],
      energyCost: 1000,
    },
  },

  // support · 阿尼亚·福杰（间谍过家家）——读心：全队净化+充能+SP提升（预知敌意），大招哇酷哇酷群疗+加速+暴击。
  71479: {
    role: 'support',
    skill1: {
      name: '读心',
      target: 'allAllies',
      effects: [
        { type: 'cleanse' },
        { type: 'energyGain', amount: 70 },
        { type: 'applyStatus', status: { kind: 'spUp', amount: 0.12, durationMs: 6000 } },
      ],
      cooldownMs: 8000,
      initialCooldownMs: 1500,
    },
    skill2: { name: '花生大人' },
    passive: { name: '读心术' },
    ultimate: {
      name: '哇酷哇酷',
      target: 'allAllies',
      effects: [
        { type: 'heal', spRatio: 0.55, flatPower: 60 },
        { type: 'applyStatus', status: { kind: 'haste', amount: 0.18, durationMs: 6000 } },
        { type: 'applyStatus', status: { kind: 'critRateUp', amount: 0.12, durationMs: 6000 } },
      ],
      energyCost: 1000,
    },
  },

  // ==========================================================================
  // SSR 逐角色设计（Step 3 · 铺量 133，覆盖首批 8 小样外的全部 SSR）
  // 由 8+2 个 workflow agent 按同一 spec 生成 + 人工 balance-lint 校验（0 warning）。
  // 粒度同小样：role + skill1/ultimate 手写 effect + skill2/passive 招牌名。
  // ==========================================================================
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
    skill2: { name: '寻找爸爸的礼物' },
    passive: { name: '梦幻世界的少女' },
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
    skill2: { name: '雕刻刀不停歇' },
    passive: { name: '被遗忘之人的守望' },
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
    skill2: { name: '人形电脑' },
    passive: { name: '唧的记忆' },
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
    skill2: { name: '吐槽役的觉悟' },
    passive: { name: '被卷入的日常' },
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
    skill2: { name: '团里的吉祥物' },
    passive: { name: '迷糊的未来人' },
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
    skill2: { name: '谁是矮子啊！' },
    passive: { name: '钢之意志' },
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
    skill2: { name: '旅途中的烟斗' },
    passive: { name: '与蟲共存' },
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
    skill2: { name: '永远的十四岁食欲' },
    passive: { name: '夜兔族之血' },
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
    skill2: { name: '无限增殖之刃' },
    passive: { name: '达克尼斯的杀意' },
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
    skill2: { name: '李舜生的面具' },
    passive: { name: '无偿的能力者' },
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
    skill2: { name: '黑之契约者' },
    passive: { name: '能力回收的代价' },
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
    skill2: { name: '撕下伪装的毒舌' },
    passive: { name: '完美天使的假面' },
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
    skill2: { name: '白色相簿的旋律' },
    passive: { name: '偶像的执念' },
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
    skill2: { name: '承太郎的拳头' },
    passive: { name: '沉着冷静的高中生' },
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
    skill2: { name: '篮球场的王牌' },
    passive: { name: '光坂的传说' },
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
    skill2: { name: '无能力者的骄傲' },
    passive: { name: '学园都市的普通人' },
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
    skill2: { name: '无畏突进' },
    passive: { name: '相信自己的螺旋' },
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
    skill2: { name: '禁书封印' },
    passive: { name: '完全记忆能力' },
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
    skill2: { name: '沉默的智慧' },
    passive: { name: '天才指挥官' },
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
    skill2: { name: '命运的岔路' },
    passive: { name: '绵流之神' },
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
    skill2: { name: '身体由剑构成' },
    passive: { name: '正义的伙伴' },
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
    skill2: { name: '英雄总是迟到的' },
    passive: { name: '不幸体质' },
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
    skill2: { name: '泉家的姐姐' },
    passive: { name: '宅趣满溢的日常' },
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
    skill2: { name: '感应波共鸣' },
    passive: { name: '少年的愤怒' },
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
    skill2: { name: '绝对音感' },
    passive: { name: '千早的歌声' },
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
    skill2: { name: '大道寺家的千金' },
    passive: { name: '凝望挚友的镜头' },
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
    skill2: { name: '哥特甜心' },
    passive: { name: '永不满足的甜牙' },
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
    skill2: { name: '元气满满的招待' },
    passive: { name: '天然系店长' },
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
    skill2: { name: '无聊到快死了' },
    passive: { name: '金发妖精的洞察' },
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
    skill2: { name: '摇滚灵魂' },
    passive: { name: '生前的遗憾' },
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
    skill2: { name: '飞刀戏耍' },
    passive: { name: '临也的操弄' },
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
    skill2: { name: '平凡的坚定' },
    passive: { name: '善良的旁观者' },
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
    skill2: { name: '对相坂的暗恋' },
    passive: { name: '日常的暴走' },
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
    skill2: { name: '鲨鱼软糖的诱惑' },
    passive: { name: '日常里的非日常' },
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
    skill2: { name: '命运石之门的抉择' },
    passive: { name: '残机之力' },
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
    skill2: { name: '为了梦想不眠不休' },
    passive: { name: '努力天才的执着' },
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
    skill2: { name: '凤蝶的守护' },
    passive: { name: '真实之泪' },
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
    skill2: { name: '眼镜的秘密' },
    passive: { name: '驾驶适格者' },
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
    skill2: { name: '娱乐部部长' },
    passive: { name: '元气的搞事天才' },
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
    skill2: { name: '戴面具的男人' },
    passive: { name: '新吉翁的理想' },
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
    skill2: { name: '怪异的死同类' },
    passive: { name: '月火的执念' },
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
    skill2: { name: '对折木的心意' },
    passive: { name: '巧克力的记忆' },
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
    skill2: { name: '偶像的微笑' },
    passive: { name: '宇宙No.1可爱' },
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
    skill2: { name: '疾风回旋' },
    passive: { name: '黑色剑士' },
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
    skill2: { name: '公安监视官' },
    passive: { name: '洁白的犯罪系数' },
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
    skill2: { name: '假想空间穿刺' },
    passive: { name: '邪王真眼的觉醒' },
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
    skill2: { name: '命运的骰子' },
    passive: { name: '超高校级的幸运' },
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
    skill2: { name: '背包里的温暖' },
    passive: { name: '重拾的勇气' },
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
    skill2: { name: '精灵之力' },
    passive: { name: '约会拯救世界' },
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
    skill2: { name: '替代品的拥抱' },
    passive: { name: '人渣本愿的自嘲' },
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
    skill2: { name: '童女的伪装' },
    passive: { name: '式神之躯' },
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
    skill2: { name: '神衣·鲜血' },
    passive: { name: '生命纤维之血' },
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
    skill2: { name: '乡下的宁静' },
    passive: { name: '内向的力量' },
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
    skill2: { name: '涌上心头的思念之潮' },
    passive: { name: '海神的加护' },
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
    skill2: { name: '社务所的日常' },
    passive: { name: '神明的庇佑' },
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
    skill2: { name: '绝对的计算' },
    passive: { name: '天才少女的头脑' },
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
    skill2: { name: '元气满满的看板娘' },
    passive: { name: '咖啡香的治愈' },
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
    skill2: { name: '我行我素' },
    passive: { name: '凛然如霜' },
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
    skill2: { name: '蛇喰家的女王' },
    passive: { name: '享受生死赌局的战栗' },
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
    skill2: { name: '后辈的守护决意' },
    passive: { name: '人理堡垒的意志' },
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
    skill2: { name: '赫斯缇雅之刃' },
    passive: { name: '贫乏神的执念' },
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
    skill2: { name: 'UMR的隐藏实力' },
    passive: { name: '干物妹的双重人格' },
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
    skill2: { name: '闪耀之箭' },
    passive: { name: '新月魔法书' },
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
    skill2: { name: '才不是为了你呢' },
    passive: { name: '娇小的傲气' },
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
    skill2: { name: '小小的骄傲' },
    passive: { name: '灰姑娘的梦' },
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
    skill2: { name: '不屈的凡人' },
    passive: { name: '死亡回归' },
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
    skill2: { name: '开朗的高中少女' },
    passive: { name: '温暖人心的笑容' },
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
    skill2: { name: '雪原的求救信号' },
    passive: { name: '不放弃的勇气' },
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
    skill2: { name: '不动之盾' },
    passive: { name: '受虐的觉悟' },
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
    skill2: { name: '上级魔法的骄傲' },
    passive: { name: '红魔之眼的魔力' },
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
    skill2: { name: '班长的责任' },
    passive: { name: '沉稳如山' },
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
    skill2: { name: '熬夜赶稿' },
    passive: { name: '职人精神' },
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
    skill2: { name: '叼烟的天才' },
    passive: { name: '游戏开发者的执念' },
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
    skill2: { name: '无名的疾走' },
    passive: { name: '赤目的猎人' },
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
    skill2: { name: '台本研读' },
    passive: { name: '业界闪光' },
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
    skill2: { name: '所有人都为我倾倒' },
    passive: { name: '绝世美貌的魅惑' },
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
    skill2: { name: '水中的温柔' },
    passive: { name: '泳装少女的元气' },
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
    skill2: { name: '到了异世界就拿出真本事' },
    passive: { name: '前世宅男的魔法才能' },
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
    skill2: { name: '龙之威压' },
    passive: { name: '混沌的真龙' },
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
    skill2: { name: 'Ex·machina的智慧' },
    passive: { name: '渴望心灵相通的机凯种' },
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
    skill2: { name: '实力至上' },
    passive: { name: '深藏不露的实力' },
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
    skill2: { name: '宅家游戏' },
    passive: { name: '手足无措的日常' },
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
    skill2: { name: '才不是为了你' },
    passive: { name: '五胞胎的骄傲' },
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
    skill2: { name: '写给未来的日记' },
    passive: { name: '另一个花枫' },
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
    skill2: { name: '街机厅的青春' },
    passive: { name: '绝不认输' },
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
    skill2: { name: '无法喜欢上你' },
    passive: { name: '找到自我的光' },
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
    skill2: { name: '并肩同行' },
    passive: { name: '羁绊之约' },
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
    skill2: { name: '命运的约定' },
    passive: { name: '舞台零号位' },
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
  65006: {
    role: 'support',
    skill1: {
      name: '圣诞节的约定',
      target: 'lowestHpAlly',
      effects: [{ type: 'heal', atkRatio: 1.5, flatPower: 60 }, { type: 'cleanse' }],
      cooldownMs: 8500,
      initialCooldownMs: 1800,
    },
    skill2: { name: '青春期综合症的温柔' },
    passive: { name: '牧之原的祝福' },
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
    skill2: { name: '传说再临' },
    passive: { name: '不灭的偶像魂' },
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
    skill2: { name: '妖怪的智慧之神' },
    passive: { name: '怪异的调停者' },
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
    skill2: { name: '递给你一支香烟' },
    passive: { name: '无家可归的旅人' },
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
    skill2: { name: '成熟的温柔' },
    passive: { name: '被治愈的心' },
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
    skill2: { name: '北欧诡道' },
    passive: { name: '老谋深算' },
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
    skill2: { name: '光之一族の宿敌' },
    passive: { name: '废柴魔族的逆袭' },
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
    skill2: { name: '光明系魔法少女' },
    passive: { name: '开朗的正义使者' },
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
    skill2: { name: '为了家人的匕首' },
    passive: { name: '花田家的守护' },
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
    skill2: { name: '祖母的约定' },
    passive: { name: '租借的真心' },
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
    skill2: { name: '真昼天使' },
    passive: { name: '完美的邻家女孩' },
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
    skill2: { name: '上海来的转学生' },
    passive: { name: '闪耀的偶像之魂' },
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
    skill2: { name: '静候的温柔' },
    passive: { name: '日常的坚守' },
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
    skill2: { name: '勇者一行的领袖' },
    passive: { name: '被铭记的英雄意志' },
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
    skill2: { name: '永不放弃的挥棒' },
    passive: { name: '被选中的战士' },
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
    skill2: { name: '温柔的舟' },
    passive: { name: '日代村的记忆' },
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
    skill2: { name: '追逐梦想的旋转' },
    passive: { name: '夜鹫的翱翔' },
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
    skill2: { name: '彼方世界的迷途' },
    passive: { name: '沉默的守望者' },
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
    skill2: { name: '对天才千金的爱' },
    passive: { name: '异端的魔法学者' },
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
    skill2: { name: '反派的美学' },
    passive: { name: '魔法少女的宿敌' },
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
    skill2: { name: '台风级的粉丝服务' },
    passive: { name: '永远的爱豆之光' },
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
    skill2: { name: '夜之眷属' },
    passive: { name: '永恒的少女' },
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
    skill2: { name: '夏日重现' },
    passive: { name: '影子的真相' },
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
    skill2: { name: '七贤人的秘密' },
    passive: { name: '怕生的天才' },
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
    skill2: { name: '旁观者的直觉' },
    passive: { name: '太多了' },
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
    skill2: { name: '地球寮的伙伴' },
    passive: { name: '决斗委员会长' },
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
    skill2: { name: '别小看辣妹的战斗力' },
    passive: { name: '妖怪辣妹的怪力' },
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
    skill2: { name: '打工少女的效率' },
    passive: { name: '恰到好处的体贴' },
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
    skill2: { name: '军用义体过载' },
    passive: { name: '触网即燃的Edgerunner' },
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
    skill2: { name: '命中注定的恋爱' },
    passive: { name: '热血直球少女' },
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
    skill2: { name: '怒吼的吉他' },
    passive: { name: '东京之愤' },
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
    skill2: { name: '叛逆的和弦' },
    passive: { name: '不服输的乐队魂' },
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
    skill2: { name: '假面之下' },
    passive: { name: '沉默的低音' },
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
    skill2: { name: '16位色的感动' },
    passive: { name: '穿越次元的玩家' },
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
    skill2: { name: '忠诚的协议' },
    passive: { name: '魔王的心腹' },
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
    skill2: { name: '异世界的战神' },
    passive: { name: '沙拉碗的怪人' },
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
    skill2: { name: '凛然绽放的守护' },
    passive: { name: '薰香缭绕的温柔' },
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
    skill2: { name: '单色胶片的记忆' },
    passive: { name: '黑白之间的宁静' },
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
    skill2: { name: '触手缠绕' },
    passive: { name: '真理奈的凝视' },
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
    skill2: { name: '无法逃离的束缚' },
    passive: { name: '名为爱情的毒' },
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
    skill2: { name: '高分刷新' },
    passive: { name: '游戏中心的常客' },
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
    skill2: { name: '不眠的接待员' },
    passive: { name: '世界终末的守望' },
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
    skill2: { name: '围坐一桌' },
    passive: { name: '妈妈的味道' },
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
    skill2: { name: '厨房的守护' },
    passive: { name: '不变的温暖' },
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
    skill2: { name: '跨越时空的羁绊' },
    passive: { name: '辉夜的神威' },
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
