<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';

// 接收props
interface Props {
  topicBias: number;  // -10 到 +10 的值
}

const props = defineProps<Props>();
const playerStore = usePlayerStore();

// -10 (反方/B) to +10 (正方/A)
const isPlayerA = playerStore.playerId === 'playerA';

const playerLabel = computed(() => (isPlayerA ? '我方' : '对手'));
const opponentLabel = computed(() => (isPlayerA ? '对手' : '我方'));

const playerColor = computed(() => (isPlayerA ? 'text-green-400' : 'text-red-400'));
const opponentColor = computed(() => (isPlayerA ? 'text-red-400' : 'text-green-400'));

// 计算偏向百分比（用于定位指示器）
const biasPercentage = computed(() => {
  // 将 -10 到 +10 (B -> A) 映射到 0% 到 100%
  // 如果是A，+10是100%。如果是B，-10是100%
  const bias = isPlayerA ? props.topicBias : -props.topicBias;
  return (bias + 10) * 5;
});

// 计算数值显示的样式类
const valueClass = computed(() => {
  if (props.topicBias > 0) return 'positive';
  if (props.topicBias < 0) return 'negative';
  return 'neutral';
});

// 计算状态文本
const statusText = computed(() => {
  const bias = props.topicBias;
  if (bias >= 10) return '即将胜利';
  if (bias >= 7) return '绝对优势';
  if (bias >= 4) return '占据主动';
  if (bias >= 1) return '略占优势';
  if (bias === 0) return '势均力敌';
  if (bias >= -3) return '略处劣势';
  if (bias >= -6) return '陷入被动';
  if (bias >= -9) return '岌岌可危';
  return '濒临失败';
});

// 计算填充条的高度
const fillHeight = computed(() => {
  return Math.abs(props.topicBias) * 5; // 每点偏向值对应5%高度
});

// 计算状态条的宽度
const statusBarWidth = computed(() => {
  return Math.abs(props.topicBias) * 10; // 每点偏向值对应10%宽度
});

// 判断是否显示警告
const showWarning = computed(() => {
  return Math.abs(props.topicBias) >= 8;
});

// 计算指示器颜色
const indicatorColor = computed(() => {
  const bias = props.topicBias;
  if (bias >= 7) return '#10b981';    // 优势绿
  if (bias > 0) return '#60a5fa';     // 略优蓝
  if (bias === 0) return '#fbbf24';    // 均势黄
  if (bias < 0 && bias > -7) return '#fb923c'; // 略劣橙
  return '#ef4444';                   // 劣势红
});

const playerIndicatorColor = computed(() => {
  const bias = isPlayerA ? props.topicBias : -props.topicBias;
  if (bias >= 7) return '#10b981';
  if (bias > 0) return '#60a5fa';
  if (bias === 0) return '#fbbf24';
  if (bias < 0 && bias > -7) return '#fb923c';
  return '#ef4444';
});

// 发射事件（如果需要与父组件交互）
const emit = defineEmits<{
  (e: 'click', value: number): void;
}>();

function handleClick() {
  emit('click', props.topicBias);
}
</script>

<template>
  <div class="topic-bias-container-horizontal">
    <!-- 左侧标签 -->
    <div class="bias-label left">
      <span :class="opponentColor">{{ opponentLabel }}</span>
    </div>
    
    <!-- 主偏向条 -->
    <div class="bias-track-horizontal">
      <!-- 背景渐变 -->
      <div class="bias-gradient-horizontal"></div>
      
      <!-- 刻度线 -->
      <div class="scale-marks-horizontal">
        <div v-for="i in 5" :key="i" class="mark-horizontal" :class="{ 'mark-major-horizontal': i === 3 }"></div>
      </div>
      
      <!-- 危险区域标记 -->
      <div class="danger-zone-horizontal left"></div>
      <div class="danger-zone-horizontal right"></div>
      
      <!-- 指示器 -->
      <div 
        class="bias-indicator-horizontal"
        :style="{ 
          left: `calc(${biasPercentage}% - 12px)`,
          backgroundColor: playerIndicatorColor,
          boxShadow: `0 0 20px ${playerIndicatorColor}`
        }"
      >
        <span class="indicator-value">{{ props.topicBias > 0 ? '+' : '' }}{{ props.topicBias }}</span>
      </div>
    </div>
    
    <!-- 右侧标签 -->
    <div class="bias-label right">
      <span :class="playerColor">{{ playerLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.topic-bias-container-horizontal {
  @apply w-full h-24 flex items-center justify-between;
  @apply bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700;
  @apply p-4 relative shadow-2xl;
}

.bias-label {
  @apply flex flex-col items-center gap-1 font-bold;
  flex-basis: 60px;
}

.bias-track-horizontal {
  @apply relative flex-1 h-12 mx-3;
  @apply bg-gray-800 rounded-full;
  @apply border border-gray-600;
}

.bias-gradient-horizontal {
  @apply absolute inset-0 rounded-full overflow-hidden;
  background: linear-gradient(to right,
    #ef4444 0%,
    #fb923c 25%,
    #fbbf24 50%,
    #60a5fa 75%,
    #10b981 100%
  );
  opacity: 0.2;
}

.scale-marks-horizontal {
  @apply absolute inset-0 flex justify-between px-4;
}

.mark-horizontal {
  @apply h-full w-px bg-gray-600;
}

.mark-major-horizontal {
  @apply bg-yellow-500 w-0.5;
}

.danger-zone-horizontal {
  @apply absolute h-full w-8 top-0;
  @apply bg-gradient-to-r from-transparent;
}

.danger-zone-horizontal.left {
  @apply left-0 rounded-l-full;
  @apply to-red-500/30;
}

.danger-zone-horizontal.right {
  @apply right-0 rounded-r-full rotate-180;
  @apply to-green-500/30;
}

.bias-indicator-horizontal {
  @apply absolute top-1/2 transform -translate-y-1/2;
  @apply w-16 h-6 rounded-full;
  @apply flex items-center justify-center;
  @apply font-bold text-white text-sm;
  @apply transition-all duration-300 ease-out;
  @apply cursor-pointer hover:scale-110;
  z-index: 10;
}

.indicator-value {
  @apply drop-shadow-lg;
}

.status-text {
  @apply text-xs font-bold animate-pulse;
}

/* 动画效果 */
@keyframes pulse-danger {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.bias-indicator-horizontal {
  animation: float-y 3s ease-in-out infinite;
}

@keyframes float-y {
  0%, 100% { transform: translateY(-50%) translateX(0); }
  50% { transform: translateY(-50%) translateX(-2px); }
}
</style>