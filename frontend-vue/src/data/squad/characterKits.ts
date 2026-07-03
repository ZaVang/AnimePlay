// 小队战「逐角色覆盖」配置（声明式数据，无逻辑）。
// Step 1 拆分（2026-07-03）：从 squadSkillKits.ts 抽出——这里放三张按 character.id 键的覆盖表
// （定位钉表 / 招牌 effect 覆盖 / HR 名覆盖）+ 暂缓设计排除表；装配逻辑读这些表并回落到
// archetypeTemplates.ts 的模板。目标：per-character 技能配置与主逻辑分离，便于逐角色补设计。
// 现状与后续三步方案见 docs/orch/squad-skill-design-audit-2026-07-03.md。

import type { SkillEffect, TargetSelector } from '@/engine/squad/types';
import type { SquadArchetype } from './archetypeTemplates';

/** 暂缺设计、临时排除出小队战的角色 id（占位，空数组 = 无排除）。 */
export const SQUAD_SKILL_PENDING_DESIGN_IDS: readonly number[] = [];

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
export const EXPLICIT_ARCHETYPE: Record<number, SquadArchetype> = {
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
export interface SignatureSlotOverride {
  name: string;
  target: TargetSelector;
  effects: readonly SkillEffect[];
  cooldownMs?: number;
  initialCooldownMs?: number;
  energyCost?: number;
}

export interface SignatureKitOverride {
  /** 显式定位（供未来 UI / SA-T3 头部映射消费；本轮不改成长，仅记录人设倾向）。 */
  role: SquadArchetype;
  skill1?: SignatureSlotOverride;
  ultimate?: SignatureSlotOverride;
}

export const SIGNATURE_KIT_OVERRIDES: Record<number, SignatureKitOverride> = {
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
export interface HrSkillNameOverride {
  skill1?: string;
  skill2?: string;
  passive?: string;
  ultimate?: string;
}

export const HR_SKILL_NAME_OVERRIDES: Record<number, HrSkillNameOverride> = {
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
