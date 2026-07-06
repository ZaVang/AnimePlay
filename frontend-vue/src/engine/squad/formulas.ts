import type { RNG } from '../rng';
import type { BattleStats } from './combat';
import type { BattleModifiers } from './types';

export const DEFAULT_BATTLE_MODIFIERS: BattleModifiers = {
  critRate: 0,
  critDamage: 1.5,
  damageUp: 0,
  damageTakenUp: 0,
  healUp: 0,
  shieldUp: 0,
};

export const DEFAULT_CRIT_RATE = DEFAULT_BATTLE_MODIFIERS.critRate;
export const DEFAULT_CRIT_DAMAGE = DEFAULT_BATTLE_MODIFIERS.critDamage;

/**
 * SB-T3: squad 战斗规则的全体基础暴击率（非引擎默认——DEFAULT_BATTLE_MODIFIERS.critRate 保持 0
 * 以守住引擎纯净默认语义与既有测试）。由 createRuntimeUnit 注入每个运行时单位的 base critRate，
 * 使纯引擎战 / 塔战 / 测试三条消费端统一拿到基础暴击。critRateUp 状态通路（getEffectiveModifiers）
 * 在此基础上叠加，SB-T5 落地后多来源 critRateUp 按来源累加 → 一条完整暴击成长轴。
 */
export const BASE_CRIT_RATE = 0.05;

export interface DamageContext {
  critRate?: number;
  critDamage?: number;
  damageUp?: number;
  damageTakenUp?: number;
}

export interface LegacyDamageResult {
  damage: number;
  isCritical: boolean;
}

export interface SkillDamagePower {
  coefficient: number;
  scaling: 'atk' | 'sp';
}

export interface HealingPower {
  spCoefficient?: number;
  atkCoefficient?: number;
}

export interface ShieldPower {
  spCoefficient?: number;
  defCoefficient?: number;
}

export function clamp(min: number, max: number, value: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateDefenseMultiplier(def: number): number {
  return 1000 / (1000 + Math.max(0, def));
}

export function calculateTimedDamageReduction(def: number): number {
  return Math.max(0, def) / (1000 + Math.max(0, def));
}

export const calculateDefenseReduction = calculateTimedDamageReduction;

export function rollVariance(rng: RNG): number {
  return 0.95 + rng.next() * 0.1;
}

export const rollDamageVariance = rollVariance;

export interface DamageFormulaInput {
  attacker: BattleStats;
  defender: BattleStats;
  modifiers: Pick<BattleModifiers, 'critRate' | 'critDamage' | 'damageUp'>;
  defenderModifiers: Pick<BattleModifiers, 'damageTakenUp'>;
  rng: RNG;
  atkRatio?: number;
  spRatio?: number;
  flatPower?: number;
  canCrit?: boolean;
}

export interface DamageFormulaResult {
  amount: number;
  isCritical: boolean;
  variance: number;
}

export function calculateTimedDamage(input: DamageFormulaInput): DamageFormulaResult {
  const raw =
    input.attacker.atk * (input.atkRatio ?? 1) +
    input.attacker.sp * (input.spRatio ?? 0) +
    (input.flatPower ?? 0);
  const variance = rollVariance(input.rng);
  const canCrit = input.canCrit ?? true;
  const critRate = canCrit ? clamp(0, 1, input.modifiers.critRate) : 0;
  const isCritical = input.rng.chance(critRate);
  const critMultiplier = isCritical ? Math.max(1, input.modifiers.critDamage) : 1;
  const modifier = (1 + input.modifiers.damageUp) * (1 + input.defenderModifiers.damageTakenUp);
  const damage = raw * calculateDefenseMultiplier(input.defender.def) * variance * critMultiplier * modifier;
  return {
    amount: Math.max(1, Math.floor(damage)),
    isCritical,
    variance,
  };
}

function contextModifiers(ctx: DamageContext = {}): Pick<BattleModifiers, 'critRate' | 'critDamage' | 'damageUp'> {
  return {
    critRate: ctx.critRate ?? DEFAULT_CRIT_RATE,
    critDamage: ctx.critDamage ?? DEFAULT_CRIT_DAMAGE,
    damageUp: ctx.damageUp ?? 0,
  };
}

export function calculateBasicAttackDamage(
  attacker: BattleStats,
  defender: BattleStats,
  rng: RNG,
  ctx: DamageContext = {},
): LegacyDamageResult {
  const result = calculateTimedDamage({
    attacker,
    defender,
    modifiers: contextModifiers(ctx),
    defenderModifiers: { damageTakenUp: ctx.damageTakenUp ?? 0 },
    rng,
    atkRatio: 1,
    spRatio: 0,
  });
  return { damage: result.amount, isCritical: result.isCritical };
}

export function calculateSkillDamage(
  attacker: BattleStats,
  defender: BattleStats,
  power: SkillDamagePower,
  rng: RNG,
  ctx: DamageContext = {},
): LegacyDamageResult {
  const result = calculateTimedDamage({
    attacker,
    defender,
    modifiers: contextModifiers(ctx),
    defenderModifiers: { damageTakenUp: ctx.damageTakenUp ?? 0 },
    rng,
    atkRatio: power.scaling === 'atk' ? power.coefficient : 0,
    spRatio: power.scaling === 'sp' ? power.coefficient : 0,
  });
  return { damage: result.amount, isCritical: result.isCritical };
}

export interface HealFormulaInput {
  caster: BattleStats;
  modifiers: Pick<BattleModifiers, 'healUp'>;
  atkRatio?: number;
  spRatio?: number;
  flatPower?: number;
}

export function calculateTimedHeal(input: HealFormulaInput): number {
  const raw =
    input.caster.atk * (input.atkRatio ?? 0) +
    input.caster.sp * (input.spRatio ?? 1) +
    (input.flatPower ?? 0);
  return Math.max(0, Math.floor(raw * (1 + input.modifiers.healUp)));
}

export function calculateHealing(caster: BattleStats, _target: BattleStats, power: HealingPower): number {
  return calculateTimedHeal({
    caster,
    modifiers: { healUp: 0 },
    spRatio: power.spCoefficient ?? 0,
    atkRatio: power.atkCoefficient ?? 0,
  });
}

export interface ShieldFormulaInput {
  caster: BattleStats;
  modifiers: Pick<BattleModifiers, 'shieldUp'>;
  spRatio?: number;
  defRatio?: number;
  flatPower?: number;
}

export function calculateTimedShield(input: ShieldFormulaInput): number {
  const raw =
    input.caster.sp * (input.spRatio ?? 1) +
    input.caster.def * (input.defRatio ?? 0) +
    (input.flatPower ?? 0);
  return Math.max(0, Math.floor(raw * (1 + input.modifiers.shieldUp)));
}

export function calculateShield(caster: BattleStats, _target: BattleStats, power: ShieldPower): number {
  return calculateTimedShield({
    caster,
    modifiers: { shieldUp: 0 },
    spRatio: power.spCoefficient ?? 0,
    defRatio: power.defCoefficient ?? 0,
  });
}

export function calculateActionIntervalMs(
  spd: number,
  speedModifier: { haste: number; slow: number } = { haste: 0, slow: 0 },
): number {
  const safeSpd = Math.max(-499, spd);
  const base = 3000 / (1 + safeSpd / 500);
  const adjusted = base / (1 + Math.max(0, speedModifier.haste)) * (1 + Math.max(0, speedModifier.slow));
  return Math.round(clamp(1200, 4500, adjusted));
}

export function energyFromDamage(damage: number, maxHp: number): number {
  if (damage <= 0 || maxHp <= 0) return 0;
  // 问题②：受击充能上调（cap 100→150，斜率 300→420），配合定位 onHit 系数让坦克/前排更快攒大招。
  return Math.floor(clamp(0, 150, (damage / maxHp) * 420));
}
