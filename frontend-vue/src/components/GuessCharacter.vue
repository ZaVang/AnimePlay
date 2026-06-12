<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { useGuessStore, GAME_STAGES } from '@/stores/guess';
import { useUserStore } from '@/stores/userStore';

type FeedbackType = 'success' | 'error' | 'info' | '';

const guessStore = useGuessStore();
const userStore = useUserStore();
const guessInput = ref('');
// 本局答对兑换的知识点（S6 接入主经济）
const lastKnowledgeAwarded = ref(0);
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
    return;
  }
  
  const url = guessStore.getCharacterImageUrl();
  
  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  img.onload = () => {
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
  
  // 经走 userStore 编排：答对时兑换知识点并存档（S6）
  const result = userStore.submitGuess(guessInput.value.trim());
  lastKnowledgeAwarded.value = result.knowledgeAwarded;

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
  if (type === 'success') return 'bg-success/15 text-success';
  if (type === 'error') return 'bg-danger/15 text-danger';
  if (type === 'info') return 'bg-info/15 text-info';
  return '';
}
</script>

<template>
  <div class="guess-game">
    <!-- 数据加载中 -->
    <div v-if="guessStore.isDataLoading" class="text-center py-12">
      <div class="animate-spin w-10 h-10 border-3 rounded-full mx-auto mb-4"
        :style="{ borderColor: 'rgb(var(--c-line))', borderTopColor: 'rgb(var(--c-accent))' }"
      ></div>
      <p :style="{ color: 'rgb(var(--c-ink-2))' }">正在加载角色数据...</p>
    </div>

    <!-- 游戏状态：未开始 -->
    <div v-else-if="!guessStore.isGameActive" class="text-center py-12">
      <div class="text-6xl mb-4">🎭</div>
      <h2 class="text-2xl font-bold mb-4" :style="{ color: 'rgb(var(--c-ink))' }">
        猜角色小游戏
      </h2>
      <p class="mb-6 text-sm" :style="{ color: 'rgb(var(--c-ink-2))' }">
        根据像素化的图片，猜出这是哪个动漫角色！<br/>
        稀有度越高的角色分值越高，但出现概率越低~
      </p>
      
      <!-- 历史最高分 -->
      <div v-if="guessStore.highScore > 0" class="mb-6">
        <div class="inline-block px-4 py-2 rounded-lg" :style="{ backgroundColor: 'rgb(var(--c-surface-2))' }">
          <span :style="{ color: 'rgb(var(--c-ink-2))' }">历史最高分：</span>
          <span class="font-bold text-lg" :style="{ color: 'rgb(var(--c-accent))' }">{{ guessStore.highScore }}</span>
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
                index < guessStore.currentStage ? 'bg-success' : 'bg-surface-2',
                index === guessStore.currentStage - 1 && guessStore.isGameActive ? 'ring-2 ring-offset-2' : ''
              ]"
            ></div>
          </div>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- 剩余尝试次数 -->
          <div class="text-sm" :style="{ color: 'rgb(var(--c-ink-2))' }">
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
      <div class="stage-info mb-4 text-center p-3 rounded-lg" :style="{ backgroundColor: 'rgb(var(--c-surface-2))' }">
        <div class="flex items-center justify-center gap-2">
          <span class="font-bold text-lg" :style="{ color: 'rgb(var(--c-accent))' }">
            {{ guessStore.currentStageInfo.label }}
          </span>
          <span class="text-sm" :style="{ color: 'rgb(var(--c-ink-3))' }">
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
            :style="{ backgroundColor: 'rgb(var(--c-surface-2))', width: '320px', height: '320px' }"
          >
            <div class="text-center">
              <div class="animate-spin w-8 h-8 border-2 rounded-full mx-auto mb-2"
                :style="{ borderColor: 'rgb(var(--c-line))', borderTopColor: 'rgb(var(--c-accent))' }"
              ></div>
              <span class="text-sm" :style="{ color: 'rgb(var(--c-ink-3))' }">加载中...</span>
            </div>
          </div>
          
          <!-- 错误占位 -->
          <div
            v-if="guessStore.imageError"
            class="absolute inset-0 flex items-center justify-center rounded-lg"
            :style="{ backgroundColor: 'rgb(var(--c-surface-2))', width: '320px', height: '320px' }"
          >
            <div class="text-center text-ink-3">
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
      <div v-if="guessStore.showResult" class="result-section mb-6 p-4 rounded-lg" :style="{ backgroundColor: 'rgb(var(--c-surface-2))' }">
        <div class="text-center">
          <div v-if="guessStore.isCorrect" class="text-4xl mb-2">🎉</div>
          <div v-else class="text-4xl mb-2">😅</div>
          <h3 class="text-xl font-bold mb-2" :style="{ color: 'rgb(var(--c-ink))' }">
            {{ guessStore.isCorrect ? '恭喜答对！' : '游戏结束' }}
          </h3>
          <p class="mb-2" :style="{ color: 'rgb(var(--c-ink-2))' }">
            角色：<span class="font-bold">{{ guessStore.currentCharacter?.name }}</span>
          </p>
          <p class="text-sm" :style="{ color: 'rgb(var(--c-ink-3))' }">
            尝试次数：{{ guessStore.attempts }} 次
          </p>
          <div v-if="guessStore.isCorrect" class="mt-3">
            <span class="text-2xl font-bold" :style="{ color: 'rgb(var(--c-accent))' }">
              +{{ guessStore.currentScore }} 分
            </span>
            <p v-if="lastKnowledgeAwarded > 0" class="text-sm mt-1" :style="{ color: 'rgb(var(--c-ink-2))' }">
              兑换 +{{ lastKnowledgeAwarded }} 知识点
            </p>
          </div>
        </div>
        
        <!-- 角色信息 -->
        <div v-if="guessStore.currentCharacter?.anime_names?.length" class="mt-4 pt-4 border-t" :style="{ borderColor: 'rgb(var(--c-line))' }">
          <p class="text-sm" :style="{ color: 'rgb(var(--c-ink-3))' }">
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
      <div v-else class="input-section" :style="{ backgroundColor: 'rgb(var(--c-surface-2))' }">
        <div class="flex gap-2">
          <input
            v-model="guessInput"
            @keyup.enter="submitGuess"
            type="text"
            placeholder="输入角色名字..."
            class="flex-1 px-4 py-3 rounded-lg border focus:outline-none transition"
            :style="{
              backgroundColor: 'rgb(var(--c-app))',
              borderColor: 'rgb(var(--c-line))',
              color: 'rgb(var(--c-ink))'
            }"
          />
          <button
            @click="submitGuess"
            class="btn-accent font-bold py-3 px-6 rounded-lg transition-all duration-200 hover:opacity-90"
          >
            猜！
          </button>
        </div>
        <p class="text-xs mt-2 text-center" :style="{ color: 'rgb(var(--c-ink-3))' }">
          支持模糊匹配，大小写、繁简体均可
        </p>
      </div>
    </div>

    <!-- 历史记录 -->
    <div v-if="guessStore.gameRecords.length > 0" class="history-section mt-8">
      <h3 class="text-lg font-bold mb-3" :style="{ color: 'rgb(var(--c-ink))' }">
        游戏记录
      </h3>
      <div class="space-y-2 max-h-60 overflow-y-auto">
        <div
          v-for="record in guessStore.gameRecords.slice(0, 10)"
          :key="record.id"
          class="flex justify-between items-center p-3 rounded-lg"
          :style="{ backgroundColor: 'rgb(var(--c-surface-2))' }"
        >
          <div class="flex-1">
            <span class="font-medium" :style="{ color: 'rgb(var(--c-ink))' }">
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
            <span class="font-bold" :style="{ color: record.score > 0 ? 'rgb(var(--c-accent))' : 'rgb(var(--c-ink-3))' }">
              {{ record.score > 0 ? `+${record.score}` : '0' }}
            </span>
            <p class="text-xs" :style="{ color: 'rgb(var(--c-ink-3))' }">
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
  box-shadow: 0 0 30px rgb(var(--c-success) / 0.5);
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
  background: linear-gradient(to bottom, transparent, rgb(var(--c-accent)), transparent);
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
  background-color: rgb(var(--c-surface-2));
}

/* 按钮样式 */
.btn-accent {
  background-color: rgb(var(--c-accent));
  color: rgb(var(--c-on-accent));
}

.btn-accent:hover {
  background-color: rgb(var(--c-accent-2));
}

/* 聚焦样式 */
input:focus {
  border-color: rgb(var(--c-accent));
  box-shadow: 0 0 0 2px rgb(var(--c-accent-soft));
}
</style>
