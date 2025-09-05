/**
 * 简化版战斗属性计算系统
 * 基于角色的基础属性（ATK, DEF, SP, SPD）进行数值计算
 */

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

/**
 * 计算减伤率
 * 公式: DEF/(1000+DEF)
 */
export function calculateDamageReduction(def: number): number {
  return def / (1000 + def);
}

/**
 * 计算增伤率  
 * 公式: SP/(1000+SP)
 */
export function calculateDamageBonus(sp: number): number {
  return sp / (1000 + sp);
}

/**
 * 计算连击概率
 * 公式: min(SPD/10, 50)% 
 */
export function calculateCriticalRate(spd: number): number {
  return Math.min(spd / 10, 50) / 100;
}

/**
 * 判断是否触发连击
 */
export function rollCriticalHit(spd: number): boolean {
  const critRate = calculateCriticalRate(spd);
  return Math.random() < critRate;
}

/**
 * 计算单次攻击伤害
 */
export function calculateAttackDamage(
  attackerStats: BattleStats,
  defenderStats: BattleStats
): { damage: number; isCriticalHit: boolean } {
  const baseAttack = attackerStats.atk;
  const damageBonus = calculateDamageBonus(attackerStats.sp);
  const damageReduction = calculateDamageReduction(defenderStats.def);
  const isCriticalHit = rollCriticalHit(attackerStats.spd);
  
  // 基础伤害计算
  let damage = baseAttack * (1 + damageBonus) * (1 - damageReduction);
  
  // 连击伤害加成
  if (isCriticalHit) {
    damage *= 1.3;
  }
  
  // 伤害最小为1
  damage = Math.max(1, Math.floor(damage));
  
  return { damage, isCriticalHit };
}

/**
 * 模拟完整战斗（固定轮流，玩家先手）
 * 返回战斗结果
 */
export function simulateBattle(
  playerStats: BattleStats,
  enemyStats: BattleStats
): BattleResult {
  let playerHP = playerStats.hp;
  let enemyHP = enemyStats.hp;
  let isPlayerTurn = true; // 玩家先手
  let totalDamage = 0;
  let criticalHits = 0;
  
  // 最多进行100回合，避免无限循环
  let rounds = 0;
  const maxRounds = 100;
  
  while (playerHP > 0 && enemyHP > 0 && rounds < maxRounds) {
    rounds++;
    
    if (isPlayerTurn) {
      // 玩家攻击敌人
      const attackResult = calculateAttackDamage(playerStats, enemyStats);
      enemyHP -= attackResult.damage;
      totalDamage += attackResult.damage;
      
      if (attackResult.isCriticalHit) {
        criticalHits++;
      }
    } else {
      // 敌人攻击玩家
      const attackResult = calculateAttackDamage(enemyStats, playerStats);
      playerHP -= attackResult.damage;
    }
    
    // 切换回合
    isPlayerTurn = !isPlayerTurn;
  }
  
  // 确定获胜者
  let winner: 'attacker' | 'defender' | null = null;
  if (playerHP <= 0 && enemyHP <= 0) {
    winner = null; // 平局
  } else if (enemyHP <= 0) {
    winner = 'attacker'; // 玩家获胜
  } else if (playerHP <= 0) {
    winner = 'defender'; // 敌人获胜
  }
  
  return {
    damage: totalDamage,
    isCriticalHit: criticalHits > 0,
    attackerRemainHP: Math.max(0, playerHP),
    defenderRemainHP: Math.max(0, enemyHP),
    winner
  };
}

/**
 * 计算战斗力评分（用于匹配对手难度）
 */
export function calculateBattlePower(stats: BattleStats): number {
  const attackPower = stats.atk * (1 + calculateDamageBonus(stats.sp));
  const defensePower = stats.hp * (1 - calculateDamageReduction(stats.def));
  const speedBonus = 1 + calculateCriticalRate(stats.spd) * 0.3;
  
  return Math.floor((attackPower + defensePower * 0.5) * speedBonus);
}

/**
 * 生成基于角色基础属性的战斗状态
 * 结合养成属性加成
 */
export function generateBattleStats(
  baseStats: BattleStats,
  nurtureAttributes: {
    charm: number;
    intelligence: number; 
    strength: number;
  },
  battleEnhancements: {
    hp: number;
    atk: number;
    def: number;
    sp: number;
    spd: number;
  }
): BattleStats {
  // 养成属性对战斗属性的影响
  const attributeBonus = {
    atk: Math.floor(nurtureAttributes.strength * 0.5), // 体力影响攻击
    def: Math.floor(nurtureAttributes.strength * 0.3), // 体力影响防御  
    sp: Math.floor(nurtureAttributes.intelligence * 0.4), // 智力影响技能
    spd: Math.floor(nurtureAttributes.charm * 0.3), // 魅力影响速度
    hp: Math.floor((nurtureAttributes.strength + nurtureAttributes.charm) * 0.2)
  };
  
  return {
    hp: Math.floor(baseStats.hp * (1 + battleEnhancements.hp / 100) + attributeBonus.hp),
    atk: Math.floor(baseStats.atk * (1 + battleEnhancements.atk / 100) + attributeBonus.atk),
    def: Math.floor(baseStats.def * (1 + battleEnhancements.def / 100) + attributeBonus.def),
    sp: Math.floor(baseStats.sp * (1 + battleEnhancements.sp / 100) + attributeBonus.sp),
    spd: Math.floor(baseStats.spd * (1 + battleEnhancements.spd / 100) + attributeBonus.spd)
  };
}