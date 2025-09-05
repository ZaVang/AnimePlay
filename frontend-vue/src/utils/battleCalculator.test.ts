/**
 * 战斗计算系统测试
 */

import {
  calculateDamageReduction,
  calculateDamageBonus,
  calculateCriticalRate,
  calculateAttackDamage,
  simulateBattle,
  calculateBattlePower,
  generateBattleStats,
  type BattleStats
} from './battleCalculator';

// 测试基础计算函数
function testBasicCalculations() {
  console.log('=== 测试基础计算函数 ===');
  
  // 测试减伤率计算
  console.log('减伤率测试:');
  console.log(`DEF=100: ${(calculateDamageReduction(100) * 100).toFixed(1)}%`);
  console.log(`DEF=500: ${(calculateDamageReduction(500) * 100).toFixed(1)}%`);
  console.log(`DEF=1000: ${(calculateDamageReduction(1000) * 100).toFixed(1)}%`);
  
  // 测试增伤率计算
  console.log('\n增伤率测试:');
  console.log(`SP=100: ${(calculateDamageBonus(100) * 100).toFixed(1)}%`);
  console.log(`SP=500: ${(calculateDamageBonus(500) * 100).toFixed(1)}%`);
  console.log(`SP=1000: ${(calculateDamageBonus(1000) * 100).toFixed(1)}%`);
  
  // 测试连击率计算
  console.log('\n连击率测试:');
  console.log(`SPD=100: ${(calculateCriticalRate(100) * 100).toFixed(1)}%`);
  console.log(`SPD=300: ${(calculateCriticalRate(300) * 100).toFixed(1)}%`);
  console.log(`SPD=600: ${(calculateCriticalRate(600) * 100).toFixed(1)}%`);
}

// 测试单次攻击计算
function testAttackDamage() {
  console.log('\n=== 测试单次攻击计算 ===');
  
  const attacker: BattleStats = { hp: 100, atk: 200, def: 50, sp: 100, spd: 150 };
  const defender: BattleStats = { hp: 120, atk: 180, def: 100, sp: 80, spd: 120 };
  
  console.log('攻击者:', attacker);
  console.log('防御者:', defender);
  
  // 进行多次攻击测试
  let totalDamage = 0;
  let critCount = 0;
  const testRounds = 10;
  
  for (let i = 0; i < testRounds; i++) {
    const result = calculateAttackDamage(attacker, defender);
    totalDamage += result.damage;
    if (result.isCriticalHit) critCount++;
    console.log(`第${i+1}次攻击: ${result.damage}伤害 ${result.isCriticalHit ? '(连击!)' : ''}`);
  }
  
  console.log(`\n平均伤害: ${(totalDamage / testRounds).toFixed(1)}`);
  console.log(`连击率: ${(critCount / testRounds * 100).toFixed(1)}%`);
}

// 测试完整战斗
function testFullBattle() {
  console.log('\n=== 测试完整战斗 ===');
  
  const player: BattleStats = { hp: 150, atk: 200, def: 80, sp: 120, spd: 160 };
  const enemy: BattleStats = { hp: 140, atk: 180, def: 100, sp: 100, spd: 140 };
  
  console.log('玩家:', player);
  console.log('敌人:', enemy);
  console.log(`玩家战斗力: ${calculateBattlePower(player)}`);
  console.log(`敌人战斗力: ${calculateBattlePower(enemy)}`);
  
  const battleResult = simulateBattle(player, enemy);
  
  console.log('\n战斗结果:');
  console.log(`总伤害: ${battleResult.damage}`);
  console.log(`有连击: ${battleResult.isCriticalHit ? '是' : '否'}`);
  console.log(`玩家剩余HP: ${battleResult.attackerRemainHP}`);
  console.log(`敌人剩余HP: ${battleResult.defenderRemainHP}`);
  console.log(`获胜者: ${battleResult.winner === 'attacker' ? '玩家' : battleResult.winner === 'defender' ? '敌人' : '平局'}`);
}

// 测试养成属性对战斗属性的影响
function testNurtureIntegration() {
  console.log('\n=== 测试养成属性影响 ===');
  
  const baseStats: BattleStats = { hp: 100, atk: 50, def: 30, sp: 40, spd: 60 };
  const nurtureAttributes = { charm: 80, intelligence: 70, strength: 90 };
  const battleEnhancements = { hp: 20, atk: 15, def: 10, sp: 25, spd: 5 };
  
  console.log('基础战斗属性:', baseStats);
  console.log('养成属性:', nurtureAttributes);
  console.log('战斗加成:', battleEnhancements);
  
  const finalStats = generateBattleStats(baseStats, nurtureAttributes, battleEnhancements);
  
  console.log('最终战斗属性:', finalStats);
  console.log(`最终战斗力: ${calculateBattlePower(finalStats)}`);
}

// 运行所有测试
export function runBattleSystemTests() {
  console.log('🚀 开始战斗系统测试...\n');
  
  testBasicCalculations();
  testAttackDamage();
  testFullBattle();
  testNurtureIntegration();
  
  console.log('\n✅ 战斗系统测试完成！');
}

// 如果直接运行此文件，执行测试
if (typeof window === 'undefined') {
  runBattleSystemTests();
}