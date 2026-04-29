<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useGuessStore, GAME_STAGES } from '@/stores/guess';
import { GAME_CONFIG } from '@/config/gameConfig';

type FeedbackType = 'success' | 'error' | 'info' | '';

const guessStore = useGuessStore();
const guessInput = ref('');
const feedbackMessage = ref('');
const feedbackType = ref<FeedbackType>('');
const canvasRef = ref<HTMLCanvasElement | null>(null);
const originalImage = ref<HTMLImageElement | null>(null);
const isAnimating = ref(false);

// 稀有度颜色
const rarityColors: Record<string, string> = {
  'N': '#9CA3AF',
  'R': '#3B82F6',
  'SR': '#8B5CF6',
  'SSR': '#F59E0B',
  'HR': '#EC4899',
  'UR': '#EF4444',
};

// 获取稀有度配置
const rarityConfig = computed(() => {
  if (!guessStore.currentCharacter) return null;
  return GAME_CONFIG.characterSystem.rarityConfig[guessStore.currentCharacter.rarity] || null;
});

// 加载图片
function loadImage() {
  if (!guessStore.currentCharacter) return;
  
  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  img.onload = () => {
    originalImage.value = img;
    guessStore.imageLoaded = true;
    guessStore.imageError = false;
    processImage();
  };
  
  img.onerror = () => {
    // 尝试备用URL
    const backupUrl = guessStore.getOriginalImageUrl();
    if (backupUrl) {
      const backupImg = new Image();
      backupImg.crossOrigin = 'anonymous';
      backupImg.onload = () => {
        originalImage.value = backupImg;
        guessStore.imageLoaded = true;
        guessStore.imageError = false;
        processImage();
      };
      backupImg.onerror = () => {
        guessStore.imageError = true;
        guessStore.imageLoaded = false;
      };
      backupImg.src = backupUrl;
    } else {
      guessStore.imageError = true;
      guessStore.imageLoaded = false;
    }
  };
  
  img.src = guessStore.getCharacterImageUrl();
}

// 处理图片：像素化和局部显示
function processImage() {
  if (!canvasRef.value || !originalImage.value) return;
  
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const stage = guessStore.currentStageInfo;
  const img = originalImage.value;
  
  // 设置画布大小
  const maxSize = 320;
  canvas.width = maxSize;
  canvas.height = maxSize;
  
  // 清除画布
  ctx.clearRect(0, 0, maxSize, maxSize);
  
  // 如果是最后一阶段，显示原图
  if (stage.level === 4) {
    // 等比缩放图片到最大尺寸
    const scale = Math.min(maxSize / img.width, maxSize / img.height);
    const drawWidth = img.width * scale;
    const drawHeight = img.height * scale;
    const offsetX = (maxSize - drawWidth) / 2;
    const offsetY = (maxSize - drawHeight) / 2;
    
    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    return;
  }
  
  // 计算显示区域
  const imgCenterX = img.width / 2;
  const imgCenterY = img.height * 0.4; // 稍微偏上（眼睛区域）
  const displayRatio = stage.displayRatio;
  
  // 临时画布用于像素化
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;
  
  // 计算源区域（从图片中心裁剪）
  const sourceSize = Math.min(img.width, img.height) * displayRatio;
  const sourceX = imgCenterX - sourceSize / 2;
  const sourceY = imgCenterY - sourceSize / 2;
  
  // 设置临时画布大小为目标像素化大小
  tempCanvas.width = stage.pixelSize;
  tempCanvas.height = stage.pixelSize;
  
  // 禁用图像平滑
  tempCtx.imageSmoothingEnabled = false;
  
  // 绘制缩小后的图片
  tempCtx.drawImage(
    img,
    sourceX, sourceY, sourceSize, sourceSize,
    0, 0, stage.pixelSize, stage.pixelSize
  );
  
  // 启用平滑并绘制放大后的图片
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(
    tempCanvas,
    0, 0, stage.pixelSize, stage.pixelSize,
    0, 0, maxSize, maxSize
  );
  
  // 添加圆形遮罩（使边缘更柔和）
  ctx.globalCompositeOperation = 'destination-in';
  ctx.beginPath();
  ctx.arc(maxSize / 2, maxSize / 2, maxSize / 2 - 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

// 提交猜测
async function submitGuess() {
  if (!guessInput.value.trim()) {
    showFeedback('请输入角色名字', 'info');
    return;
  }
  
  if (!guessStore.isGameActive || guessStore.isGameOver) {
    return;
  }
  
  const result = guessStore.guessCharacter(guessInput.value.trim());
  
  if (result.correct) {
    showFeedback(result.message, 'success');
    // 添加动画效果
    isAnimating.value = true;
    setTimeout(() => {
      isAnimating.value = false;
    }, 500);
  } else {
    showFeedback(result.message, 'error');
    // 重新处理图片显示下一阶段
    setTimeout(() => {
      processImage();
    }, 100);
  }
  
  guessInput.value = '';
}

// 显示反馈消息
function showFeedback(message: string, type: 'success' | 'error' | 'info') {
  feedbackMessage.value = message;
  feedbackType.value = type;
  
  setTimeout(() => {
    feedbackMessage.value = '';
    feedbackType.value = '';
  }, 3000);
}

// 开始新游戏
function handleStartGame() {
  guessStore.startNewGame();
  guessInput.value = '';
  feedbackMessage.value = '';
  feedbackType.value = '';
}

// 监听阶段变化，重新处理图片
watch(() => guessStore.currentStage, () => {
  if (guessStore.imageLoaded) {
    processImage();
  }
});

// 监听角色变化，加载新图片
watch(() => guessStore.currentCharacter, (newChar) => {
  if (newChar) {
    loadImage();
  }
});

onMounted(() => {
  // 初始加载
  if (guessStore.currentCharacter) {
    loadImage();
  }
});

// 格式化时间戳
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 获取反馈框样式类
function getFeedbackClass(type: FeedbackType): string {
  if (type === 'success') return 'bg-green-100 text-green-800';
  if (type === 'error') return 'bg-red-100 text-red-800';
  if (type === 'info') return 'bg-blue-100 text-blue-800';
  return '';
}

// 获取阶段指示器样式
function getStageIndicatorStyle(index: number): Record<string, string> {
  if (index < guessStore.currentStage - 1) {
    return { backgroundColor: '#22c55e' }; // green-500
  }
  if (index === guessStore.currentStage - 1) {
    return { '--tw-ring-color': 'var(--theme-accent)' } as Record<string, string>;
  }
  return { backgroundColor: '#d1d5db' }; // gray-300
}
</script>

<template>
  <div class="guess-game">
    <!-- 游戏状态：未开始 -->
    <div v-if="!guessStore.isGameActive" class="text-center py-12">
      <div class="text-6xl mb-4">🎭</div>
      <h2 class="text-2xl font-bold mb-4" :style="{ color: 'var(--theme-text-primary)' }">
        猜角色小游戏
      </h2>
      <p class="mb-6 text-sm" :style="{ color: 'var(--theme-text-secondary)' }">
        根据越来越清晰的像素图片，猜出这是哪个动漫角色！<br/>
        稀有度越高的角色分值越高，但出现概率越低~
      </p>
      
      <!-- 历史最高分 -->
      <div v-if="guessStore.highScore > 0" class="mb-6">
        <div class="inline-block px-4 py-2 rounded-lg" :style="{ backgroundColor: 'var(--theme-bg-card)' }">
          <span :style="{ color: 'var(--theme-text-secondary)' }">历史最高分：</span>
          <span class="font-bold text-lg" :style="{ color: 'var(--theme-accent)' }">{{ guessStore.highScore }}</span>
        </div>
      </div>
      
      <!-- 开始按钮 -->
      <button
        @click="handleStartGame"
        class="btn-accent font-bold py-3 px-8 rounded-lg text-lg transition-all duration-200 hover:scale-105"
      >
        开始游戏
      </button>
    </div>

    <!-- 游戏进行中 -->
    <div v-else class="game-container">
      <!-- 游戏头部信息 -->
      <div class="game-header mb-4 flex justify-between items-center">
        <div class="flex items-center gap-4">
          <!-- 阶段指示器 -->
          <div class="flex gap-1">
            <div
              v-for="(stage, index) in GAME_STAGES"
              :key="index"
              class="w-8 h-2 rounded-full transition-all duration-300"
              :class="[
                index < guessStore.currentStage ? 'bg-green-500' : 'bg-gray-300',
                index === guessStore.currentStage - 1 && guessStore.isGameActive ? 'ring-2 ring-offset-2' : ''
              ]"
            ></div>
          </div>
          <span class="text-sm font-medium" :style="{ color: 'var(--theme-text-secondary)' }">
            {{ guessStore.currentStageInfo.label }}
          </span>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- 剩余尝试次数 -->
          <div class="text-sm" :style="{ color: 'var(--theme-text-secondary)' }">
            剩余 {{ guessStore.remainingAttempts }} 次机会
          </div>
          
          <!-- 稀有度标识 -->
          <div
            v-if="guessStore.currentCharacter"
            class="px-2 py-1 rounded text-xs font-bold text-white"
            :style="{ backgroundColor: rarityColors[guessStore.currentCharacter.rarity] || '#666' }"
          >
            {{ guessStore.currentCharacter.rarity }}
          </div>
        </div>
      </div>

      <!-- 图片显示区域 -->
      <div class="image-container mb-6 flex justify-center">
        <div
          class="relative"
          :class="{ 'animate-correct': isAnimating }"
        >
          <!-- Canvas 显示区 -->
          <canvas
            ref="canvasRef"
            class="rounded-lg shadow-lg"
            :class="{ 'correct-glow': isAnimating }"
          ></canvas>
          
          <!-- 加载占位 -->
          <div
            v-if="!guessStore.imageLoaded && !guessStore.imageError"
            class="absolute inset-0 flex items-center justify-center rounded-lg"
            :style="{ backgroundColor: 'var(--theme-bg-card)' }"
          >
            <div class="text-center">
              <div class="animate-spin w-8 h-8 border-2 rounded-full mx-auto mb-2"
                :style="{ borderColor: 'var(--theme-border)', borderTopColor: 'var(--theme-accent)' }"
              ></div>
              <span class="text-sm" :style="{ color: 'var(--theme-text-muted)' }">加载中...</span>
            </div>
          </div>
          
          <!-- 错误占位 -->
          <div
            v-if="guessStore.imageError"
            class="absolute inset-0 flex items-center justify-center rounded-lg"
            :style="{ backgroundColor: 'var(--theme-bg-card)' }"
          >
            <div class="text-center text-gray-400">
              <div class="text-4xl mb-2">🖼️</div>
              <span class="text-sm">图片加载失败</span>
            </div>
          </div>
          
          <!-- 遮罩条纹动画 -->
          <div v-if="guessStore.isGameActive && !guessStore.isGameOver" class="scan-line"></div>
        </div>
      </div>

      <!-- 反馈消息 -->
      <div
        v-if="feedbackMessage"
        class="feedback-message mb-4 text-center p-3 rounded-lg transition-all duration-300"
        :class="getFeedbackClass(feedbackType)"
      >
        {{ feedbackMessage }}
      </div>

      <!-- 结果展示 -->
      <div v-if="guessStore.showResult" class="result-section mb-6 p-4 rounded-lg" :style="{ backgroundColor: 'var(--theme-bg-card)' }">
        <div class="text-center">
          <div v-if="guessStore.isCorrect" class="text-4xl mb-2">🎉</div>
          <div v-else class="text-4xl mb-2">😅</div>
          <h3 class="text-xl font-bold mb-2" :style="{ color: 'var(--theme-text-primary)' }">
            {{ guessStore.isCorrect ? '恭喜答对！' : '游戏结束' }}
          </h3>
          <p class="mb-2" :style="{ color: 'var(--theme-text-secondary)' }">
            角色：<span class="font-bold">{{ guessStore.currentCharacter?.name }}</span>
          </p>
          <p class="text-sm" :style="{ color: 'var(--theme-text-muted)' }">
            尝试次数：{{ guessStore.attempts }} 次
          </p>
          <div v-if="guessStore.isCorrect" class="mt-3">
            <span class="text-2xl font-bold" :style="{ color: 'var(--theme-accent)' }">
              +{{ guessStore.currentScore }} 分
            </span>
          </div>
        </div>
        
        <!-- 角色信息 -->
        <div v-if="guessStore.currentCharacter?.anime_names?.length" class="mt-4 pt-4 border-t" :style="{ borderColor: 'var(--theme-border)' }">
          <p class="text-sm" :style="{ color: 'var(--theme-text-muted)' }">
            登场作品：{{ guessStore.currentCharacter.anime_names.slice(0, 2).join('、') }}
          </p>
        </div>
        
        <button
          @click="handleStartGame"
          class="btn-accent w-full mt-4 font-bold py-2 px-4 rounded-lg transition-all duration-200"
        >
          再来一局
        </button>
      </div>

      <!-- 输入区域 -->
      <div v-else class="input-section" :style="{ backgroundColor: 'var(--theme-bg-card)' }">
        <div class="flex gap-2">
          <input
            v-model="guessInput"
            @keyup.enter="submitGuess"
            type="text"
            placeholder="输入角色名字..."
            class="flex-1 px-4 py-3 rounded-lg border focus:outline-none transition"
            :style="{
              backgroundColor: 'var(--theme-bg-primary)',
              borderColor: 'var(--theme-border)',
              color: 'var(--theme-text-primary)'
            }"
          />
          <button
            @click="submitGuess"
            class="btn-accent font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:opacity-90"
          >
            猜！
          </button>
        </div>
        <p class="text-xs mt-2 text-center" :style="{ color: 'var(--theme-text-muted)' }">
          支持模糊匹配，大小写、繁简体均可
        </p>
      </div>
    </div>

    <!-- 历史记录 -->
    <div v-if="guessStore.gameRecords.length > 0" class="history-section mt-8">
      <h3 class="text-lg font-bold mb-3" :style="{ color: 'var(--theme-text-primary)' }">
        游戏记录
      </h3>
      <div class="space-y-2 max-h-60 overflow-y-auto">
        <div
          v-for="record in guessStore.gameRecords.slice(0, 10)"
          :key="record.id"
          class="flex justify-between items-center p-3 rounded-lg"
          :style="{ backgroundColor: 'var(--theme-bg-card)' }"
        >
          <div class="flex-1">
            <span class="font-medium" :style="{ color: 'var(--theme-text-primary)' }">
              {{ record.characterName }}
            </span>
            <span
              class="ml-2 px-1.5 py-0.5 rounded text-xs text-white"
              :style="{ backgroundColor: rarityColors[record.rarity] || '#666' }"
            >
              {{ record.rarity }}
            </span>
          </div>
          <div class="text-right">
            <span class="font-bold" :style="{ color: record.score > 0 ? 'var(--theme-accent)' : 'var(--theme-text-muted)' }">
              {{ record.score > 0 ? `+${record.score}` : '0' }}
            </span>
            <p class="text-xs" :style="{ color: 'var(--theme-text-muted)' }">
              {{ formatTime(record.timestamp) }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.guess-game {
  max-width: 500px;
  margin: 0 auto;
}

/* 正确动画 */
.animate-correct {
  animation: correctPulse 0.5s ease-out;
}

.correct-glow {
  box-shadow: 0 0 30px rgba(16, 185, 129, 0.5);
}

@keyframes correctPulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

/* 扫描线动画 */
.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(to bottom, transparent, var(--theme-accent), transparent);
  animation: scan 2s linear infinite;
  opacity: 0.6;
  pointer-events: none;
}

@keyframes scan {
  0% { top: 0; }
  100% { top: 100%; }
}

/* Canvas 样式 */
canvas {
  background-color: var(--theme-bg-card);
}

/* 按钮样式 */
.btn-accent {
  background-color: var(--theme-accent);
  color: white;
}

.btn-accent:hover {
  background-color: var(--theme-accent-hover);
}

/* 聚焦样式 */
input:focus {
  border-color: var(--theme-accent);
  box-shadow: 0 0 0 2px var(--theme-accent-light);
}
</style>
