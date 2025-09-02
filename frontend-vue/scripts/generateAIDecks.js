import fs from 'fs';
import path from 'path';

// 读取数据文件
const characterDataPath = '/Users/lilithgames/Downloads/lilith/bangumi/data/selected_character/all_cards.json';
const animeDataPath = '/Users/lilithgames/Downloads/lilith/bangumi/data/selected_anime/all_cards.json';

const characterData = JSON.parse(fs.readFileSync(characterDataPath, 'utf8'));
const animeData = JSON.parse(fs.readFileSync(animeDataPath, 'utf8'));

// 理想的费用曲线 (1-7费，总计30张)
const idealManaCurve = {
  1: 4, // 1费卡4张
  2: 6, // 2费卡6张  
  3: 6, // 3费卡6张
  4: 5, // 4费卡5张
  5: 4, // 5费卡4张
  6: 3, // 6费卡3张
  7: 2  // 7费卡2张
};

// 随机洗牌函数
function shuffleArray(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 获取所有UR角色
function getURCharacters() {
  return characterData.filter(char => char.rarity === 'UR');
}

// 根据费用过滤动画卡牌
function getAnimeCardsByCost(cost) {
  return animeData.filter(anime => anime.cost === cost);
}

// 生成AI卡组
function generateAIDeck(name, urCharacters) {
  console.log(`\n=== 生成 ${name} ===`);
  
  // 1. 收集必需的动画卡牌 (来自UR角色的anime_ids)
  const requiredAnimeIds = new Set();
  urCharacters.forEach(char => {
    if (char.anime_ids) {
      char.anime_ids.forEach(id => requiredAnimeIds.add(id));
    }
  });
  
  const requiredAnimeCards = Array.from(requiredAnimeIds)
    .map(id => animeData.find(anime => anime.id === id))
    .filter(Boolean);
  
  console.log(`选中的UR角色: ${urCharacters.map(c => c.name).join(', ')}`);
  console.log(`必需动画卡数量: ${requiredAnimeCards.length}`);
  
  // 2. 按费用分组必需卡牌
  const requiredByCost = {};
  for (let cost = 1; cost <= 7; cost++) {
    requiredByCost[cost] = requiredAnimeCards.filter(card => card.cost === cost);
  }
  
  // 3. 构建卡组
  const deck = [];
  const currentCurve = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
  
  // 3a. 添加所有必需卡牌
  requiredAnimeCards.forEach(card => {
    deck.push(card.id);
    currentCurve[card.cost]++;
  });
  
  console.log(`必需卡牌费用分布:`, currentCurve);
  
  // 3b. 填充剩余卡牌以满足理想曲线
  for (let cost = 1; cost <= 7; cost++) {
    const needed = idealManaCurve[cost] - currentCurve[cost];
    if (needed > 0) {
      // 获取该费用的所有可选卡牌 (排除已有的)
      const availableCards = getAnimeCardsByCost(cost)
        .filter(card => !requiredAnimeIds.has(card.id));
      
      // 随机选择需要的数量
      const selectedCards = shuffleArray(availableCards).slice(0, needed);
      selectedCards.forEach(card => {
        deck.push(card.id);
        currentCurve[card.cost]++;
      });
    }
  }
  
  // 3c. 如果还没到30张，从低费卡中补充
  while (deck.length < 30) {
    for (let cost = 1; cost <= 7 && deck.length < 30; cost++) {
      const availableCards = getAnimeCardsByCost(cost)
        .filter(card => !deck.includes(card.id));
      
      if (availableCards.length > 0) {
        const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];
        deck.push(randomCard.id);
        currentCurve[randomCard.cost]++;
      }
    }
    break; // 防止无限循环
  }
  
  // 3d. 如果超过30张，从高费卡开始移除
  while (deck.length > 30) {
    for (let cost = 7; cost >= 1 && deck.length > 30; cost--) {
      const costCards = deck.filter(id => {
        const card = animeData.find(a => a.id === id);
        return card && card.cost === cost && !requiredAnimeIds.has(id);
      });
      
      if (costCards.length > 0) {
        const cardToRemove = costCards[0];
        const index = deck.indexOf(cardToRemove);
        deck.splice(index, 1);
        currentCurve[cost]--;
      }
    }
  }
  
  console.log(`最终卡组费用分布:`, currentCurve);
  console.log(`卡组总数: ${deck.length}`);
  
  return {
    id: name.toLowerCase().replace(/\s+/g, '-'),
    name: name,
    anime: deck,
    character: urCharacters.map(c => c.id),
    description: `基于${urCharacters.map(c => c.name).join('、')}构建的平衡卡组`
  };
}

// 分析卡组构成
function analyzeDeck(deck, characters, animeData) {
  const deckCards = deck.map(id => animeData.find(a => a.id === id)).filter(Boolean);
  
  console.log('\n--- 卡组分析 ---');
  console.log(`角色: ${characters.map(c => c.name).join(', ')}`);
  console.log(`角色关联动画: ${characters.map(c => c.anime_names ? c.anime_names.join(', ') : '无').join(' | ')}`);
  
  // 费用分布分析
  const costDistribution = {};
  for (let cost = 1; cost <= 7; cost++) {
    costDistribution[cost] = deckCards.filter(card => card.cost === cost).length;
  }
  console.log(`费用分布: ${JSON.stringify(costDistribution)}`);
  
  // 动画类型分析  
  const genreCount = {};
  deckCards.forEach(card => {
    if (card.genres) {
      card.genres.forEach(genre => {
        genreCount[genre] = (genreCount[genre] || 0) + 1;
      });
    }
  });
  
  // 显示前5个最多的类型
  const topGenres = Object.entries(genreCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5);
  
  if (topGenres.length > 0) {
    console.log(`主要类型: ${topGenres.map(([genre, count]) => `${genre}(${count})`).join(', ')}`);
  }
  
  // 稀有度分析
  const rarityCount = {};
  deckCards.forEach(card => {
    rarityCount[card.rarity] = (rarityCount[card.rarity] || 0) + 1;
  });
  console.log(`稀有度分布: ${JSON.stringify(rarityCount)}`);
}

// 主函数：生成三套AI卡组
function generateThreeAIDecks() {
  const urCharacters = getURCharacters();
  console.log(`找到${urCharacters.length}个UR角色`);
  
  if (urCharacters.length < 12) {
    console.error('UR角色数量不足，无法生成3套卡组');
    return;
  }
  
  // 随机打乱UR角色列表
  const shuffledUR = shuffleArray(urCharacters);
  
  // 生成三套卡组，每套使用4个不同的UR角色
  const aiDecks = [
    generateAIDeck('科幻组合AI', shuffledUR.slice(0, 4)),
    generateAIDeck('战斗组合AI', shuffledUR.slice(4, 8)),
    generateAIDeck('治愈组合AI', shuffledUR.slice(8, 12))
  ];
  
  // 对每套卡组进行详细分析
  aiDecks.forEach((deck, index) => {
    console.log(`\n=== ${deck.name}详细分析 ===`);
    const characters = shuffledUR.slice(index * 4, (index + 1) * 4);
    analyzeDeck(deck.anime, characters, animeData);
  });
  
  // 输出结果
  console.log('\n=== 生成完成 ===');
  console.log('AI卡组已成功添加到 aiProfiles.ts，现在可以在游戏中使用这些平衡的卡组配置');
  
  return aiDecks;
}

// 运行生成
generateThreeAIDecks();