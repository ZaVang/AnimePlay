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

// 加载图片
function loadImage() {
  if (!guessStore.currentCharacter) {
    console.log('loadImage: no currentCharacter');
    return;
  }
  
  const url = guessStore.getCharacterImageUrl();
  console.log('loadImage: url =', url);
  
  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  img.onload = () => {
    console.log('loadImage: loaded successfully');
    originalImage.value = img;
    guessStore.imageLoaded = true;
    guessStore.imageError = false;
    processImage();
  };
  
  img.onerror = (e) => {
    console.error('loadImage: error', e);
    guessStore.imageError = true;
    guessStore.imageLoaded = false;
  };
  
  img.src = url;
}

// 处理图片：像素化（始终显示全身图）
function processImage() {
  if (!canvasRef.value || !originalImage.value) return;
  
  const canvas = canvasRef.value;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  
  const stage = guessStore.currentStageInfo;
  const img = originalImage.value;
  
  // 设置画布大小（根据图片比例）
  const maxSize = 320;
  const scale = Math.min(maxSize / img.width, maxSize / img.height);
  const drawWidth = Math.round(img.width * scale);
  const drawHeight = Math.round(img.height * scale);
  
  canvas.width = drawWidth;
  canvas.height = drawHeight;
  
  // 清除画布
  ctx.clearRect(0, 0, drawWidth, drawHeight);
  
  // 如果是最后一阶段或 pixelSize 为 0，显示原图
  if (stage.pixelSize === 0) {
    ctx.drawImage(img, 0, 0, drawWidth, drawHeight);
    return;
  }
  
  // 像素化处理
  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;
  
  // 设置临时画布大小为目标像素化大小
  tempCanvas.width = stage.pixelSize;
  tempCanvas.height = stage.pixelSize;
  
  // 禁用图像平滑
  tempCtx.imageSmoothingEnabled = false;
  
  // 绘制缩小后的图片
  tempCtx.drawImage(img, 0, 0, stage.pixelSize, stage.pixelSize);
  
  // 启用平滑并绘制放大后的图片
  ctx.imageSmoothingEnabled = false; // 保持像素化效果
  ctx.drawImage(
    tempCanvas,
    0, 0, stage.pixelSize, stage.pixelSize,
    0, 0, drawWidth, drawHeight
  );
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
    isAnimating.value = true;
    setTimeout(() => {
      isAnimating.value = false;
    }, 500);
  } else {
    showFeedback(result.message, 'error');
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
async function handleStartGame() {
  await guessStore.startNewGame();
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
</script>

<template>
  <div class="guess-game">
    <!-- 数据加载中 -->
    <div v-if="guessStore.isDataLoading" class="text-center py-12">
      <div class="animate-spin w-10 h-10 border-3 rounded-full mx-auto mb-4"
        :style="{ borderColor: 'var(--theme-border)', borderTopColor: 'var(--theme-accent)' }"
      ></div>
      <p :style="{ color: 'var(--theme-text-secondary)' }">正在加载角色数据...</p>
    </div>

    <!-- 游戏状态：未开始 -->
    <div v-else-if="!guessStore.isGameActive" class="text-center py-12">
      <div class="text-6xl mb-4">🎭</div>
      <h2 class="text-2xl font-bold mb-4" :style="{ color: 'var(--theme-text-primary)' }">
        猜角色小游戏
      </h2>
      <p class="mb-6 text-sm" :style="{ color: 'var(--theme-text-secondary)' }">
        根据像素化的图片，猜出这是哪个动漫角色！<br/>
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
        <div class="flex items-center gap-3">
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

      <!-- 当前阶段信息（模糊度） -->
      <div class="stage-info mb-4 text-center p-3 rounded-lg" :style="{ backgroundColor: 'var(--theme-bg-card)' }">
        <div class="flex items-center justify-center gap-2">
          <span class="font-bold text-lg" :style="{ color: 'var(--theme-accent)' }">
            {{ guessStore.currentStageInfo.label }}
          </span>
          <span class="text-sm" :style="{ color: 'var(--theme-text-muted)' }">
            {{ guessStore.currentStageInfo.description }}
          </span>
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
            :style="{ backgroundColor: 'var(--theme-bg-card)', width: '320px', height: '320px' }"
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
            :style="{ backgroundColor: 'var(--theme-bg-card)', width: '320px', height: '320px' }"
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
