// stores/guess.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { useGameDataStore } from './gameDataStore';
import type { CharacterCard, Rarity } from '@/types/card';

// 游戏阶段配置
export interface GameStage {
  level: number;           // 阶段等级 (1-4)
  pixelSize: number;       // 像素化大小 (8, 16, 32, 原始)
  displayRatio: number;    // 显示区域比例 (0.3, 0.5, 0.8, 1.0)
  label: string;           // 阶段标签
  hint: string;           // 提示文字
}

export const GAME_STAGES: GameStage[] = [
  { level: 1, pixelSize: 8, displayRatio: 0.3, label: 'Level 1', hint: '只能看到眼睛部分哦~' },
  { level: 2, pixelSize: 16, displayRatio: 0.45, label: 'Level 2', hint: '能看到更多细节了！' },
  { level: 3, pixelSize: 32, displayRatio: 0.65, label: 'Level 3', hint: '快要看到全貌了！' },
  { level: 4, pixelSize: 0, displayRatio: 1.0, label: 'Final', hint: '全图展示，必须答对！' },
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
  const currentCharacter = ref<CharacterCard | null>(null);
  const currentStage = ref(1);
  const attempts = ref(0);
  const isGameActive = ref(false);
  const isGameOver = ref(false);
  const lastGuess = ref('');
  const showResult = ref(false);
  const isCorrect = ref(false);
  const imageLoaded = ref(false);
  const imageError = ref(false);

  // 历史记录
  const gameRecords = ref<GameRecord[]>([]);
  const highScore = ref(0);

  // 计算当前阶段信息
  const currentStageInfo = computed((): GameStage => {
    return GAME_STAGES[currentStage.value - 1] || GAME_STAGES[0];
  });

  // 计算得分
  const currentScore = computed(() => {
    if (!currentCharacter.value) return 0;
    const rarityConfig = RARITY_WEIGHTS[currentCharacter.value.rarity as Rarity] || RARITY_WEIGHTS['R'];
    const attemptsMultiplier = Math.max(0.5, 1 - (attempts.value - 1) * 0.15);
    return Math.round(rarityConfig.baseScore * attemptsMultiplier);
  });

  // 剩余尝试次数
  const remainingAttempts = computed(() => {
    return 4 - attempts.value;
  });

  // 初始化：从 localStorage 加载历史记录和高分
  function loadHistory() {
    try {
      const savedRecords = localStorage.getItem('guess-game-records');
      const savedHighScore = localStorage.getItem('guess-game-highscore');
      if (savedRecords) {
        gameRecords.value = JSON.parse(savedRecords);
      }
      if (savedHighScore) {
        highScore.value = parseInt(savedHighScore, 10);
      }
    } catch (e) {
      console.error('Failed to load guess game history:', e);
    }
  }

  // 保存到 localStorage
  function saveHistory() {
    try {
      localStorage.setItem('guess-game-records', JSON.stringify(gameRecords.value.slice(0, 50)));
      localStorage.setItem('guess-game-highscore', highScore.value.toString());
    } catch (e) {
      console.error('Failed to save guess game history:', e);
    }
  }

  // 根据稀有度加权随机选择角色
  function selectRandomCharacter(): CharacterCard | null {
    const cards = gameDataStore.allCharacterCards;
    if (cards.length === 0) return null;

    // 计算总权重
    const totalWeight = cards.reduce((sum, card) => {
      const rarityConfig = RARITY_WEIGHTS[card.rarity as Rarity] || RARITY_WEIGHTS['R'];
      return sum + rarityConfig.weight;
    }, 0);

    // 加权随机选择
    let random = Math.random() * totalWeight;
    for (const card of cards) {
      const rarityConfig = RARITY_WEIGHTS[card.rarity as Rarity] || RARITY_WEIGHTS['R'];
      random -= rarityConfig.weight;
      if (random <= 0) {
        return card;
      }
    }

    // Fallback
    return cards[Math.floor(Math.random() * cards.length)];
  }

  // 开始新游戏
  function startNewGame() {
    currentCharacter.value = selectRandomCharacter();
    currentStage.value = 1;
    attempts.value = 0;
    isGameActive.value = true;
    isGameOver.value = false;
    lastGuess.value = '';
    showResult.value = false;
    isCorrect.value = false;
    imageLoaded.value = false;
    imageError.value = false;
  }

  // 猜测角色名
  function guessCharacter(guess: string): { correct: boolean; message: string } {
    if (!currentCharacter.value || !isGameActive.value) {
      return { correct: false, message: '游戏未开始' };
    }

    lastGuess.value = guess;
    attempts.value++;

    const characterName = currentCharacter.value.name;
    const characterOriginalName = (currentCharacter.value as any).original_name || '';

    // 模糊匹配
    if (fuzzyMatch(guess, characterName) || fuzzyMatch(guess, characterOriginalName)) {
      isCorrect.value = true;
      isGameOver.value = true;
      showResult.value = true;

      // 计算并保存分数
      const score = currentScore.value;
      if (score > highScore.value) {
        highScore.value = score;
      }

      // 记录游戏
      const record: GameRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        characterId: currentCharacter.value.id,
        characterName: characterName,
        rarity: currentCharacter.value.rarity as Rarity,
        attempts: attempts.value,
        score: score,
        timestamp: Date.now(),
      };
      gameRecords.value.unshift(record);
      if (gameRecords.value.length > 50) {
        gameRecords.value = gameRecords.value.slice(0, 50);
      }
      saveHistory();

      return { correct: true, message: `正确！+${score}分` };
    }

    // 猜错，进入下一阶段
    if (currentStage.value < 4) {
      currentStage.value++;
      return { correct: false, message: currentStageInfo.value.hint };
    } else {
      // 第四阶段仍未答对，游戏结束
      isCorrect.value = false;
      isGameOver.value = true;
      showResult.value = true;

      // 记录游戏（得分为0）
      const record: GameRecord = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        characterId: currentCharacter.value.id,
        characterName: characterName,
        rarity: currentCharacter.value.rarity as Rarity,
        attempts: attempts.value,
        score: 0,
        timestamp: Date.now(),
      };
      gameRecords.value.unshift(record);
      saveHistory();

      return { correct: false, message: `正确答案是：${characterName}` };
    }
  }

  // 获取角色图片URL
  function getCharacterImageUrl(): string {
    if (!currentCharacter.value) return '';
    return `/data/images/character/${currentCharacter.value.id}.jpg`;
  }

  // 获取原始图片URL（用于回退）
  function getOriginalImageUrl(): string {
    if (!currentCharacter.value) return '';
    return currentCharacter.value.image_path || '';
  }

  // 清除历史记录
  function clearHistory() {
    gameRecords.value = [];
    highScore.value = 0;
    saveHistory();
  }

  // 初始化加载历史
  loadHistory();

  return {
    // 状态
    currentCharacter,
    currentStage,
    attempts,
    isGameActive,
    isGameOver,
    lastGuess,
    showResult,
    isCorrect,
    imageLoaded,
    imageError,
    gameRecords,
    highScore,
    // 计算属性
    currentStageInfo,
    currentScore,
    remainingAttempts,
    // 方法
    startNewGame,
    guessCharacter,
    getCharacterImageUrl,
    getOriginalImageUrl,
    clearHistory,
    GAME_STAGES,
  };
});
