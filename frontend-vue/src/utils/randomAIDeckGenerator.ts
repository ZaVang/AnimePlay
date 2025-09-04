import type { AnimeCard, CharacterCard } from '@/types/card';

// 理想的费用曲线 (1-7费，总计30张)
const idealManaCurve: Record<number, number> = {
  1: 4, // 1费卡4张
  2: 6, // 2费卡6张  
  3: 6, // 3费卡6张
  4: 5, // 4费卡5张
  5: 4, // 5费卡4张
  6: 3, // 6费卡3张
  7: 2  // 7费卡2张
};

// 随机洗牌函数
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 获取UR角色列表
function getURCharacters(allCharacters: CharacterCard[]): CharacterCard[] {
  return allCharacters.filter(char => char.rarity === 'UR');
}

// 根据费用筛选动画卡牌
function getAnimeCardsByCost(cost: number, allAnime: AnimeCard[]): AnimeCard[] {
  return allAnime.filter(anime => anime.cost === cost);
}

/**
 * 生成随机AI卡组
 * @param allAnime 所有可用的动画卡牌
 * @param allCharacters 所有可用的角色卡牌
 * @returns 包含动画卡ID数组和角色卡ID数组的对象
 */
export function generateRandomAIDeck(
  allAnime: AnimeCard[],
  allCharacters: CharacterCard[]
): { anime: number[]; character: number[] } {
  console.log('🎲 开始生成随机AI卡组');
  
  // 1. 随机选择4个UR角色
  const urCharacters = getURCharacters(allCharacters);
  if (urCharacters.length < 4) {
    console.warn('UR角色数量不足，使用所有可用UR角色');
  }
  
  const shuffledUR = shuffleArray(urCharacters);
  const selectedCharacters = shuffledUR.slice(0, Math.min(4, shuffledUR.length));
  
  console.log(`🎭 选中的UR角色: ${selectedCharacters.map(c => c.name).join(', ')}`);
  
  // 2. 收集角色相关的动画卡牌ID
  const requiredAnimeIds = new Set<number>();
  selectedCharacters.forEach(char => {
    if (char.anime_ids && Array.isArray(char.anime_ids)) {
      char.anime_ids.forEach(id => {
        if (typeof id === 'number') {
          requiredAnimeIds.add(id);
        }
      });
    }
  });
  
  const requiredAnimeCards = Array.from(requiredAnimeIds)
    .map(id => allAnime.find(anime => anime.id === id))
    .filter((card): card is AnimeCard => card !== undefined);
  
  console.log(`📚 必需动画卡数量: ${requiredAnimeCards.length}`);
  
  // 3. 按费用分组必需卡牌
  const requiredByCost: Record<number, AnimeCard[]> = {};
  for (let cost = 1; cost <= 7; cost++) {
    requiredByCost[cost] = requiredAnimeCards.filter(card => card.cost === cost);
  }
  
  // 4. 构建卡组
  const deck: number[] = [];
  const currentCurve: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  
  // 4a. 添加所有必需卡牌
  requiredAnimeCards.forEach(card => {
    deck.push(card.id);
    currentCurve[card.cost]++;
  });
  
  console.log(`💳 必需卡牌费用分布:`, currentCurve);
  
  // 4b. 填充剩余卡牌以满足理想曲线
  for (let cost = 1; cost <= 7; cost++) {
    const needed = idealManaCurve[cost] - currentCurve[cost];
    if (needed > 0) {
      // 获取该费用的所有可选卡牌 (排除已有的)
      const availableCards = getAnimeCardsByCost(cost, allAnime)
        .filter(card => !requiredAnimeIds.has(card.id));
      
      // 随机选择需要的数量
      const selectedCards = shuffleArray(availableCards).slice(0, needed);
      selectedCards.forEach(card => {
        deck.push(card.id);
        currentCurve[card.cost]++;
      });
    }
  }
  
  // 4c. 如果还没到30张，从低费卡中补充
  while (deck.length < 30) {
    let filled = false;
    for (let cost = 1; cost <= 7 && deck.length < 30; cost++) {
      const availableCards = getAnimeCardsByCost(cost, allAnime)
        .filter(card => !deck.includes(card.id));
      
      if (availableCards.length > 0) {
        const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
        deck.push(randomCard.id);
        currentCurve[randomCard.cost]++;
        filled = true;
      }
    }
    if (!filled) break; // 防止无限循环
  }
  
  // 4d. 如果超过30张，从高费卡开始移除非必需卡牌
  while (deck.length > 30) {
    let removed = false;
    for (let cost = 7; cost >= 1 && deck.length > 30; cost--) {
      const costCards = deck.filter(id => {
        const card = allAnime.find(a => a.id === id);
        return card && card.cost === cost && !requiredAnimeIds.has(id);
      });
      
      if (costCards.length > 0) {
        const cardToRemove = costCards[0];
        const index = deck.indexOf(cardToRemove);
        deck.splice(index, 1);
        currentCurve[cost]--;
        removed = true;
      }
    }
    if (!removed) break; // 防止无限循环
  }
  
  console.log(`⚖️ 最终卡组费用分布:`, currentCurve);
  console.log(`📦 卡组总数: ${deck.length}`);
  
  const result = {
    anime: deck,
    character: selectedCharacters.map(c => c.id)
  };
  
  console.log('✅ 随机AI卡组生成完成');
  return result;
}

/**
 * 生成多样化的随机AI卡组（确保每次都不同）
 * @param allAnime 所有可用的动画卡牌
 * @param allCharacters 所有可用的角色卡牌
 * @param seed 可选的随机种子，用于测试
 * @returns 包含动画卡ID数组和角色卡ID数组的对象
 */
export function generateDiversifiedRandomAIDeck(
  allAnime: AnimeCard[],
  allCharacters: CharacterCard[],
  seed?: number
): { anime: number[]; character: number[] } {
  // 如果提供了种子，设置随机数种子（用于测试）
  if (seed !== undefined) {
    // 简单的种子随机数生成器
    let seedValue = seed;
    Math.random = () => {
      seedValue = (seedValue * 9301 + 49297) % 233280;
      return seedValue / 233280;
    };
  }
  
  return generateRandomAIDeck(allAnime, allCharacters);
}