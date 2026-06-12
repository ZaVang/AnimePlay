/**
 * 随机AI卡组生成器测试工具
 * 用于在开发环境中测试和调试随机AI生成功能
 */

import { generateRandomAIDeck } from '@/engine/ai/randomDeck';
import { defaultRng } from '@/engine/rng';
import type { AnimeCard, CharacterCard } from '@/types/card';

/**
 * 测试随机AI卡组生成
 * @param allAnime 所有动画卡牌
 * @param allCharacters 所有角色卡牌
 */
export function testRandomAIGeneration(allAnime: AnimeCard[], allCharacters: CharacterCard[]) {
  console.group('🎲 随机AI卡组生成测试');
  
  if (allAnime.length === 0 || allCharacters.length === 0) {
    console.error('❌ 测试失败：缺少卡牌数据');
    console.groupEnd();
    return;
  }
  
  console.log(`📊 数据概况: ${allAnime.length}张动画卡, ${allCharacters.length}张角色卡`);
  
  // 生成多个随机AI卡组进行对比
  const testRounds = 3;
  const results = [];
  
  for (let i = 1; i <= testRounds; i++) {
    console.log(`\n🎯 测试轮次 ${i}:`);
    const result = generateRandomAIDeck(allAnime, allCharacters, defaultRng);
    
    // 分析生成的卡组
    const analysis = analyzeDeck(result, allAnime, allCharacters);
    results.push(analysis);
    
    console.log(`  📦 卡组大小: ${result.anime.length}张动画卡, ${result.character.length}张角色卡`);
    console.log(`  💰 费用分布: ${JSON.stringify(analysis.costDistribution)}`);
    console.log(`  ⭐ 稀有度分布: ${JSON.stringify(analysis.rarityDistribution)}`);
    console.log(`  🎭 角色名称: ${analysis.characterNames.join(', ')}`);
  }
  
  // 分析多轮测试结果
  console.log('\n📈 多轮测试分析:');
  const diversityScore = calculateDiversityScore(results);
  console.log(`  🌈 多样性评分: ${diversityScore.toFixed(2)}/100`);
  console.log(`  🔄 重复度检查: ${checkDuplicateDecks(results) ? '发现重复' : '无重复'}`);
  
  console.groupEnd();
  return results;
}

/**
 * 分析卡组构成
 */
function analyzeDeck(deck: { anime: number[]; character: number[] }, allAnime: AnimeCard[], allCharacters: CharacterCard[]) {
  const deckAnime = deck.anime.map(id => allAnime.find(card => card.id === id)).filter(Boolean) as AnimeCard[];
  const deckChars = deck.character.map(id => allCharacters.find(card => card.id === id)).filter(Boolean) as CharacterCard[];
  
  // 费用分布分析
  const costDistribution: Record<number, number> = {};
  for (let cost = 1; cost <= 7; cost++) {
    costDistribution[cost] = deckAnime.filter(card => card.cost === cost).length;
  }
  
  // 稀有度分布分析
  const rarityDistribution: Record<string, number> = {};
  deckAnime.forEach(card => {
    rarityDistribution[card.rarity] = (rarityDistribution[card.rarity] || 0) + 1;
  });
  
  return {
    costDistribution,
    rarityDistribution,
    characterNames: deckChars.map(char => char.name),
    animeIds: deck.anime,
    characterIds: deck.character,
    totalCards: deckAnime.length
  };
}

/**
 * 计算多个卡组的多样性评分
 */
function calculateDiversityScore(results: ReturnType<typeof analyzeDeck>[]): number {
  if (results.length < 2) return 100;
  
  let diversitySum = 0;
  let comparisons = 0;
  
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const similarity = calculateSimilarity(results[i], results[j]);
      diversitySum += (100 - similarity);
      comparisons++;
    }
  }
  
  return comparisons > 0 ? diversitySum / comparisons : 100;
}

/**
 * 计算两个卡组的相似度
 */
function calculateSimilarity(deck1: ReturnType<typeof analyzeDeck>, deck2: ReturnType<typeof analyzeDeck>): number {
  // 计算卡牌ID重叠度
  const anime1Set = new Set(deck1.animeIds);
  const anime2Set = new Set(deck2.animeIds);
  const animeOverlap = [...anime1Set].filter(id => anime2Set.has(id)).length;
  const animeTotal = Math.max(anime1Set.size, anime2Set.size);
  
  const char1Set = new Set(deck1.characterIds);
  const char2Set = new Set(deck2.characterIds);
  const charOverlap = [...char1Set].filter(id => char2Set.has(id)).length;
  const charTotal = Math.max(char1Set.size, char2Set.size);
  
  const animeSimilarity = animeTotal > 0 ? (animeOverlap / animeTotal) * 100 : 0;
  const charSimilarity = charTotal > 0 ? (charOverlap / charTotal) * 100 : 0;
  
  return (animeSimilarity * 0.7 + charSimilarity * 0.3); // 动画卡权重更高
}

/**
 * 检查是否有完全相同的卡组
 */
function checkDuplicateDecks(results: ReturnType<typeof analyzeDeck>[]): boolean {
  for (let i = 0; i < results.length; i++) {
    for (let j = i + 1; j < results.length; j++) {
      const deck1 = results[i];
      const deck2 = results[j];
      
      if (JSON.stringify(deck1.animeIds.sort()) === JSON.stringify(deck2.animeIds.sort()) &&
          JSON.stringify(deck1.characterIds.sort()) === JSON.stringify(deck2.characterIds.sort())) {
        return true;
      }
    }
  }
  return false;
}

/**
 * 在开发环境下自动绑定到window对象
 */
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__testRandomAI = (
    allAnime: AnimeCard[],
    allCharacters: CharacterCard[],
  ) => {
    return testRandomAIGeneration(allAnime, allCharacters);
  };
  
  console.log('🧪 随机AI测试工具已加载，在游戏数据加载后输入以下命令测试:');
  console.log('__testRandomAI(gameDataStore.allAnimeCards, gameDataStore.allCharacterCards)');
}