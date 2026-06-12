/**
 * 小队战数值公式 —— 纯函数（随机源注入）。
 * 原 utils/battleCalculator；这是全仓唯一一份伤害公式（SquadBattleView 的复制版已删除）。
 * 公式受 engine/squad/combat.test.ts 锁定，详见 docs/挑战塔系统.md。
 */
import type { RNG } from '../rng';

export interface BattleStats {
  hp: number;
  atk: number;
  def: number;
  sp: number;
  spd: number;
}

export interface BattleResult {
  damage: number;
  isCriticalHit: boolean; // 连击
  attackerRemainHP: number;
  defenderRemainHP: number;
  winner: 'attacker' | 'defender' | null;
}

/** 减伤率 = DEF / (1000 + DEF) */
export function calculateDamageReduction(def: number): number {
  return def / (1000 + def);
}

/** 增伤率 = SP / (1000 + SP) */
export function calculateDamageBonus(sp: number): number {
  return sp / (1000 + sp);
}

/** 连击概率 = min(SPD/10, 50)% */
export function calculateCriticalRate(spd: number): number {
  return Math.min(spd / 10, 50) / 100;
}

export function rollCriticalHit(spd: number, rng: RNG): boolean {
  return rng.next() < calculateCriticalRate(spd);
}

/** 单次攻击：ATK × (1+增伤) × (1−减伤)，连击 ×1.3，向下取整，下限 1。 */
export function calculateAttackDamage(
  attackerStats: BattleStats,
  defenderStats: BattleStats,
  rng: RNG,
): { damage: number; isCriticalHit: boolean } {
  const baseAttack = attackerStats.atk;
  const damageBonus = calculateDamageBonus(attackerStats.sp);
  const damageReduction = calculateDamageReduction(defenderStats.def);
  const isCriticalHit = rollCriticalHit(attackerStats.spd, rng);

  let damage = baseAttack * (1 + damageBonus) * (1 - damageReduction);
  if (isCriticalHit) {
    damage *= 1.3;
  }
  damage = Math.max(1, Math.floor(damage));

  return { damage, isCriticalHit };
}

/** 模拟完整战斗（固定轮流，玩家先手，至多 100 回合）。 */
export function simulateBattle(playerStats: BattleStats, enemyStats: BattleStats, rng: RNG): BattleResult {
  let playerHP = playerStats.hp;
  let enemyHP = enemyStats.hp;
  let isPlayerTurn = true;
  let totalDamage = 0;
  let criticalHits = 0;

  let rounds = 0;
  const maxRounds = 100;

  while (playerHP > 0 && enemyHP > 0 && rounds < maxRounds) {
    rounds++;
    if (isPlayerTurn) {
      const attackResult = calculateAttackDamage(playerStats, enemyStats, rng);
      enemyHP -= attackResult.damage;
      totalDamage += attackResult.damage;
      if (attackResult.isCriticalHit) criticalHits++;
    } else {
      const attackResult = calculateAttackDamage(enemyStats, playerStats, rng);
      playerHP -= attackResult.damage;
    }
    isPlayerTurn = !isPlayerTurn;
  }

  let winner: 'attacker' | 'defender' | null = null;
  if (playerHP <= 0 && enemyHP <= 0) {
    winner = null;
  } else if (enemyHP <= 0) {
    winner = 'attacker';
  } else if (playerHP <= 0) {
    winner = 'defender';
  }

  return {
    damage: totalDamage,
    isCriticalHit: criticalHits > 0,
    attackerRemainHP: Math.max(0, playerHP),
    defenderRemainHP: Math.max(0, enemyHP),
    winner,
  };
}

/** 战力评分（用于匹配对手难度）。 */
export function calculateBattlePower(stats: BattleStats): number {
  const attackPower = stats.atk * (1 + calculateDamageBonus(stats.sp));
  const defensePower = stats.hp * (1 - calculateDamageReduction(stats.def));
  const speedBonus = 1 + calculateCriticalRate(stats.spd) * 0.3;
  return Math.floor((attackPower + defensePower * 0.5) * speedBonus);
}

export interface NurtureAttributes {
  charm: number;
  intelligence: number;
  strength: number;
}

export interface BattleEnhancements {
  hp: number;
  atk: number;
  def: number;
  sp: number;
  spd: number;
}

/** 最终战斗属性 = 基础 ×(1+强化%) + 养成属性换算加成。 */
export function generateBattleStats(
  baseStats: BattleStats,
  nurtureAttributes: NurtureAttributes,
  battleEnhancements: BattleEnhancements,
): BattleStats {
  const attributeBonus = {
    atk: Math.floor(nurtureAttributes.strength * 0.5), // 体力影响攻击
    def: Math.floor(nurtureAttributes.strength * 0.3), // 体力影响防御
    sp: Math.floor(nurtureAttributes.intelligence * 0.4), // 智力影响技能
    spd: Math.floor(nurtureAttributes.charm * 0.3), // 魅力影响速度
    hp: Math.floor((nurtureAttributes.strength + nurtureAttributes.charm) * 0.2),
  };

  return {
    hp: Math.floor(baseStats.hp * (1 + battleEnhancements.hp / 100) + attributeBonus.hp),
    atk: Math.floor(baseStats.atk * (1 + battleEnhancements.atk / 100) + attributeBonus.atk),
    def: Math.floor(baseStats.def * (1 + battleEnhancements.def / 100) + attributeBonus.def),
    sp: Math.floor(baseStats.sp * (1 + battleEnhancements.sp / 100) + attributeBonus.sp),
    spd: Math.floor(baseStats.spd * (1 + battleEnhancements.spd / 100) + attributeBonus.spd),
  };
}
