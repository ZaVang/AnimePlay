// 小队战「定位原型」模板配置（声明式数据，无逻辑）。
// Step 1 拆分（2026-07-03）：从 squadSkillKits.ts 抽出——这里只放「6 套共享模板 + 通名标签」，
// 装配 / 归类 / 校验逻辑留在 squadSkillKits.ts。未命中 per-character 覆盖（见 characterKits.ts）的
// 角色，技能效果全部回落到本文件的模板。详见 docs/orch/squad-skill-design-audit-2026-07-03.md。

import type { SkillEffect, TargetSelector, SquadPosition } from '@/engine/squad/types'

/** 小队战角色定位原型（6 类）——决定未命中 per-character 覆盖时的技能模板与通名。 */
export type SquadArchetype =
  | 'striker'
  | 'guardian'
  | 'support'
  | 'controller'
  | 'arcane'
  | 'tactical'

/** 被动/长效状态的「整场战斗」时长基准（≥ 此值时描述记为「整场战斗」）。 */
export const PASSIVE_DURATION_MS = 90_000

/** 各定位的通名标签（无个人技名 / 无覆盖时回落到 `${角色名}·${label}`）。 */
export const archetypeLabels: Record<
  SquadArchetype,
  {
    skill1: string
    passive: string
    ultimate: string
  }
> = {
  striker: { skill1: '破阵强袭', passive: '胜负直觉', ultimate: '终幕斩击' },
  guardian: { skill1: '守护结界', passive: '坚壁气场', ultimate: '全域庇护' },
  support: { skill1: '共鸣急救', passive: '协奏气场', ultimate: '谢幕安可' },
  controller: { skill1: '封锁指令', passive: '压迫领域', ultimate: '全域拘束' },
  arcane: { skill1: '术式爆发', passive: '秘仪回路', ultimate: '星辉裁决' },
  tactical: { skill1: '战术穿插', passive: '先读阵线', ultimate: '决策终局' },
}

// —— PCR 式「职业 + 固有站位」展示层元数据（2026-07-04）——
// 复用已有的 6 档 role，把每档映射到一个「玩家可读职业名 + 固有前中后站位」。
// 站位喂给引擎的 SquadUnitSetup.position（现成的站位减伤 + 前后排选敌立即生效），
// 职业名只做 UI 展示。逐角色不再手工赋站位——由 role 推导（全 318 出战角色已有 role）。

/** 6 档 role → 固有站位（前排扛伤/中排近战/后排法术治疗）。 */
export const ROLE_TO_POSITION: Record<SquadArchetype, SquadPosition> = {
  guardian: 'front',
  striker: 'middle',
  tactical: 'middle',
  arcane: 'back',
  support: 'back',
  controller: 'back',
}

/** 站位前→后排序权重（前排最前）。供编队阵型预览与战场排列。 */
export const SQUAD_POSITION_ORDER: Record<SquadPosition, number> = {
  front: 0,
  middle: 1,
  back: 2,
}

export interface SquadRoleMeta {
  /** 玩家可读职业名（坦克/战士/奶妈…）。 */
  label: string
  /** 职业图标 emoji（一眼可辨）。 */
  icon: string
  /** 一句话定位说明。 */
  blurb: string
}

/** 6 档 role → 职业展示元数据。 */
export const ROLE_META: Record<SquadArchetype, SquadRoleMeta> = {
  guardian: { label: '坦克', icon: '🛡️', blurb: '前排扛伤害、拉仇恨护住队友' },
  striker: { label: '战士', icon: '⚔️', blurb: '中排近战爆发输出' },
  tactical: { label: '游击', icon: '🎯', blurb: '中排高速突袭、切后排' },
  arcane: { label: '法师', icon: '🔮', blurb: '后排法术远程输出' },
  support: { label: '奶妈', icon: '💗', blurb: '后排治疗与增益' },
  controller: { label: '控场', icon: '🌀', blurb: '后排控制与削弱敌人' },
}

/**
 * PCR 式「每定位」蓄能系数（问题②）：onAttack=自身行动充能倍率，onHit=受击充能倍率。
 * 坦克受击充能快（冲在前面挨打→攒大招），输出/游击攻击充能快，法师靠施法、后排少挨打。
 * 由 View 注入进 SquadUnitSetup.energyGain，引擎乘算——引擎保持纯净、不反向依赖本表。
 */
export const ENERGY_BY_ROLE: Record<SquadArchetype, { onAttack: number; onHit: number }> = {
  guardian: { onAttack: 0.85, onHit: 1.6 },
  striker: { onAttack: 1.3, onHit: 1.0 },
  tactical: { onAttack: 1.25, onHit: 1.05 },
  arcane: { onAttack: 1.2, onHit: 0.9 },
  support: { onAttack: 1.1, onHit: 1.2 },
  controller: { onAttack: 1.15, onHit: 1.05 },
}

/** 站位 → 展示元数据（标签 + 简称 + 用于配色的 tone）。 */
export const POSITION_META: Record<SquadPosition, { label: string; short: string; tone: SquadPosition }> = {
  front: { label: '前排', short: '前', tone: 'front' },
  middle: { label: '中排', short: '中', tone: 'middle' },
  back: { label: '后排', short: '后', tone: 'back' },
}

/** 各定位的共享技能效果模板（skill1/passive/ultimate 的 target + effects）。 */
export function archetypeEffects(archetype: SquadArchetype): {
  skill1: { target: TargetSelector; effects: readonly SkillEffect[] }
  passive: { target: TargetSelector; effects: readonly SkillEffect[] }
  ultimate: { target: TargetSelector; effects: readonly SkillEffect[] }
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
        passive: {
          target: 'allAllies',
          effects: [
            {
              type: 'applyStatus',
              status: { kind: 'defUp', amount: 0.1, durationMs: PASSIVE_DURATION_MS },
            },
          ],
        },
        ultimate: {
          target: 'allAllies',
          effects: [
            { type: 'shield', spRatio: 0.7, defRatio: 0.9, flatPower: 80, durationMs: 9000 },
            { type: 'cleanse' },
            { type: 'heal', target: 'lowestHpAlly', spRatio: 0.8, flatPower: 50 },
          ],
        },
      }
    case 'support':
      return {
        skill1: {
          target: 'lowestHpAlly',
          effects: [
            { type: 'heal', spRatio: 0.9, flatPower: 35 },
            { type: 'energyGain', amount: 80 },
          ],
        },
        passive: {
          target: 'allAllies',
          effects: [
            {
              type: 'applyStatus',
              status: { kind: 'spUp', amount: 0.08, durationMs: PASSIVE_DURATION_MS },
            },
          ],
        },
        ultimate: {
          target: 'allAllies',
          effects: [
            { type: 'heal', spRatio: 0.65, flatPower: 80 },
            { type: 'cleanse' },
            { type: 'revive', target: 'firstDefeatedAlly', hpRatio: 0.35 },
          ],
        },
      }
    case 'controller':
      return {
        skill1: {
          target: 'frontEnemy',
          effects: [
            { type: 'damage', atkRatio: 0.3, spRatio: 0.8, canCrit: true },
            { type: 'applyStatus', status: { kind: 'silence', durationMs: 3500 } },
          ],
        },
        passive: {
          target: 'allEnemies',
          effects: [
            {
              type: 'applyStatus',
              status: { kind: 'slow', amount: 0.08, durationMs: PASSIVE_DURATION_MS },
            },
          ],
        },
        ultimate: {
          target: 'allEnemies',
          effects: [
            { type: 'damage', atkRatio: 0.6, spRatio: 1, canCrit: true },
            { type: 'applyStatus', status: { kind: 'stun', durationMs: 1200 } },
            { type: 'applyStatus', status: { kind: 'slow', amount: 0.2, durationMs: 6000 } },
          ],
        },
      }
    case 'arcane':
      return {
        skill1: {
          target: 'frontEnemy',
          effects: [
            { type: 'damage', atkRatio: 0.2, spRatio: 1.2, canCrit: true },
            {
              type: 'applyStatus',
              status: { kind: 'dot', amount: 45, durationMs: 6000, tickIntervalMs: 2000 },
            },
          ],
        },
        passive: {
          target: 'self',
          effects: [
            {
              type: 'applyStatus',
              status: { kind: 'spUp', amount: 0.12, durationMs: PASSIVE_DURATION_MS },
            },
          ],
        },
        ultimate: {
          target: 'allEnemies',
          effects: [
            { type: 'damage', atkRatio: 0.4, spRatio: 1.45, canCrit: true },
            { type: 'applyStatus', status: { kind: 'defDown', amount: 0.18, durationMs: 7000 } },
          ],
        },
      }
    case 'tactical':
      return {
        skill1: {
          target: 'backEnemy',
          effects: [
            { type: 'damage', atkRatio: 0.8, spRatio: 0.6, canCrit: true },
            { type: 'applyStatus', status: { kind: 'slow', amount: 0.18, durationMs: 5000 } },
          ],
        },
        passive: {
          target: 'allAllies',
          effects: [
            {
              type: 'applyStatus',
              status: { kind: 'haste', amount: 0.08, durationMs: PASSIVE_DURATION_MS },
            },
          ],
        },
        ultimate: {
          target: 'highestAtkEnemy',
          effects: [
            { type: 'damage', atkRatio: 0.8, spRatio: 1.2, canCrit: true },
            { type: 'dispel' },
            { type: 'applyStatus', status: { kind: 'silence', durationMs: 5000 } },
          ],
        },
      }
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
        passive: {
          target: 'self',
          effects: [
            {
              type: 'applyStatus',
              status: { kind: 'critRateUp', amount: 0.1, durationMs: PASSIVE_DURATION_MS },
            },
          ],
        },
        ultimate: {
          target: 'lowestHpEnemy',
          effects: [
            { type: 'damage', atkRatio: 2.2, spRatio: 0.6, canCrit: true },
            { type: 'execute', hpRatioThreshold: 0.16 },
          ],
        },
      }
  }
}
