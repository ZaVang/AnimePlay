// stores/guess.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useGameDataStore } from './gameDataStore';
import { assetUrl } from '@/utils/assetUrl';
import type { CharacterCard, Rarity } from '@/types/card';

// 游戏阶段配置
export interface GameStage {
  level: number;           // 阶段等级 (1-4)
  pixelSize: number;       // 像素化大小 (8, 16, 32, 原始)
  label: string;           // 阶段标签
  description: string;     // 描述
}

export const GAME_STAGES: GameStage[] = [
  { level: 1, pixelSize: 8, label: '极难', description: '8×8 像素' },
  { level: 2, pixelSize: 16, label: '困难', description: '16×16 像素' },
  { level: 3, pixelSize: 32, label: '中等', description: '32×32 像素' },
  { level: 4, pixelSize: 0, label: '简单', description: '原图' },
];

// 稀有度权重配置
const RARITY_WEIGHTS: Record<Rarity, { weight: number; baseScore: number }> = {
  'UR': { weight: 1, baseScore: 100 },
  'SSR': { weight: 3, baseScore: 70 },
  'HR': { weight: 5, baseScore: 50 },
  'SR': { weight: 15, baseScore: 30 },
  'R': { weight: 30, baseScore: 15 },
  'N': { weight: 46, baseScore: 10 },
};

// 游戏记录
export interface GameRecord {
  id: string;
  characterId: number;
  characterName: string;
  rarity: Rarity;
  attempts: number;
  score: number;
  timestamp: number;
}

// 模糊匹配函数
function fuzzyMatch(input: string, target: string): boolean {
  // 规范化字符串：去除空格、转小写、繁简体转换
  const normalize = (str: string): string => {
    return str
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[\u3400-\u4DBF\u4E00-\u9FFF]/g, (char) => {
        // 简繁体转换表（常用字）
        const traditionalToSimplified: Record<string, string> = {
          '萬': '万', '與': '与', '義': '义', '億': '亿', '擬': '拟',
          '臨': '临', '衛': '卫', '沖': '冲', '決': '决', '幾': '几',
          '處': '处', '來': '来', '術': '术', '樣': '样', '澤': '泽',
          '爲': '为', '異': '异', '總': '总', '縱': '纵', '專業': '专业',
          '區': '区', '嚴': '严', '發': '发', '舊': '旧', '葉': '叶',
          '詩': '诗', '讀': '读', '論': '论', '謬': '谬', '謙': '谦',
        };
        return traditionalToSimplified[char] || char;
      });
  };

  const normalizedInput = normalize(input);
  const normalizedTarget = normalize(target);

  // 完全匹配
  if (normalizedTarget.includes(normalizedInput) || normalizedInput.includes(normalizedTarget)) {
    return true;
  }

  // 包含关系检查（双向）
  return normalizedTarget.includes(normalizedInput) || normalizedInput.includes(normalizedTarget);
}

export const useGuessStore = defineStore('guess', () => {
  const gameDataStore = useGameDataStore();

  // 游戏状态
  const isGameActive = ref(false);
  const isGameOver = ref(false);
  const isCorrect = ref(false);
  const showResult = ref(false);
  const currentStage = ref(1);
  const attempts = ref(0);
  const currentScore = ref(0);
  const highScore = ref(0);
  const imageLoaded = ref(false);
  const imageError = ref(false);
  const isDataLoading = ref(false);

  // 当前角色
  const currentCharacter = ref<CharacterCard | null>(null);

  // 游戏记录
  const gameRecords = ref<GameRecord[]>([]);

  // 剩余尝试次数
  const remainingAttempts = computed(() => {
    return Math.max(0, 4 - attempts.value);
  });

  // 当前阶段信息
  const currentStageInfo = computed(() => {
    return GAME_STAGES[currentStage.value - 1] || GAME_STAGES[0];
  });

  // 获取角色图片 URL
  function getCharacterImageUrl(): string {
    if (!currentCharacter.value) return '';
    // 使用本地图片路径（.jpg 格式）
    return assetUrl(`/data/images/character/${currentCharacter.value.id}.jpg`);
  }

  // 根据稀有度随机选择角色
  function selectRandomCharacter(): CharacterCard | null {
    const characters = gameDataStore.allCharacterCards;
    if (!characters || characters.length === 0) return null;

    // 计算总权重
    let totalWeight = 0;
    const weightedCharacters: { character: CharacterCard; weight: number }[] = [];

    for (const char of characters) {
      const rarityConfig = RARITY_WEIGHTS[char.rarity as Rarity];
      if (rarityConfig) {
        totalWeight += rarityConfig.weight;
        weightedCharacters.push({ character: char, weight: rarityConfig.weight });
      }
    }

    // 随机选择
    const random = Math.random() * totalWeight;
    let cumulative = 0;

    for (const item of weightedCharacters) {
      cumulative += item.weight;
      if (random <= cumulative) {
        return item.character;
      }
    }

    // 默认返回第一个
    return characters[0];
  }

  // 计算得分
  function calculateScore(): number {
    if (!currentCharacter.value) return 0;

    const rarityConfig = RARITY_WEIGHTS[currentCharacter.value.rarity as Rarity];
    const baseScore = rarityConfig?.baseScore || 10;

    // 根据尝试次数计算倍率
    const attemptMultiplier = Math.max(0.25, 1 - (attempts.value - 1) * 0.25);

    return Math.round(baseScore * attemptMultiplier);
  }

  // 开始新游戏
  async function startNewGame() {
    // 确保数据已加载
    if (gameDataStore.allCharacterCards.length === 0 && !gameDataStore.isLoading) {
      isDataLoading.value = true;
      await gameDataStore.fetchGameData();
      isDataLoading.value = false;
    }

    currentCharacter.value = selectRandomCharacter();
    isGameActive.value = true;
    isGameOver.value = false;
    isCorrect.value = false;
    showResult.value = false;
    currentStage.value = 1;
    attempts.value = 0;
    currentScore.value = 0;
    imageLoaded.value = false;
    imageError.value = false;
  }

  // 猜测角色
  function guessCharacter(guess: string): { correct: boolean; message: string } {
    if (!currentCharacter.value) {
      return { correct: false, message: '游戏未开始' };
    }

    attempts.value++;

    // 检查猜测是否正确
    const isMatch = fuzzyMatch(guess, currentCharacter.value.name) ||
      fuzzyMatch(guess, currentCharacter.value.original_name || '');

    if (isMatch) {
      isCorrect.value = true;
      isGameOver.value = true;
      showResult.value = true;
      currentScore.value = calculateScore();

      // 更新最高分
      if (currentScore.value > highScore.value) {
        highScore.value = currentScore.value;
      }

      // 添加游戏记录
      gameRecords.value.unshift({
        id: Date.now().toString(),
        characterId: currentCharacter.value.id,
        characterName: currentCharacter.value.name,
        rarity: currentCharacter.value.rarity as Rarity,
        attempts: attempts.value,
        score: currentScore.value,
        timestamp: Date.now(),
      });

      return { correct: true, message: `猜对了！获得 ${currentScore.value} 分！` };
    }

    // 猜错，进入下一阶段
    if (currentStage.value < GAME_STAGES.length) {
      currentStage.value++;
      return { correct: false, message: '猜错了，图片变得更清晰了...' };
    }

    // 最后一次机会也猜错
    isGameOver.value = true;
    showResult.value = true;

    // 添加失败记录
    gameRecords.value.unshift({
      id: Date.now().toString(),
      characterId: currentCharacter.value.id,
      characterName: currentCharacter.value.name,
      rarity: currentCharacter.value.rarity as Rarity,
      attempts: attempts.value,
      score: 0,
      timestamp: Date.now(),
    });

    return { correct: false, message: `游戏结束！正确答案是：${currentCharacter.value.name}` };
  }

  // --- 持久化装配（最高分进存档 v3；对局记录为会话态） ---

  function serialize(): { highScore: number } {
    return { highScore: highScore.value };
  }

  function deserialize(data: { highScore: number }) {
    highScore.value = data?.highScore ?? 0;
  }

  function reset() {
    highScore.value = 0;
    gameRecords.value = [];
    isGameActive.value = false;
    isGameOver.value = false;
    showResult.value = false;
  }

  return {
    // 状态
    isGameActive,
    isGameOver,
    isCorrect,
    showResult,
    currentStage,
    attempts,
    currentScore,
    highScore,
    imageLoaded,
    imageError,
    isDataLoading,
    currentCharacter,
    gameRecords,

    // 计算属性
    remainingAttempts,
    currentStageInfo,

    // 方法
    getCharacterImageUrl,
    startNewGame,
    guessCharacter,
    serialize,
    deserialize,
    reset,
  };
});
