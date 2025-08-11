<script setup lang="ts">
import { computed } from 'vue';
import { usePlayerStore } from '@/stores/battle';

// 接收props
interface Props {
  topicBias: number;  // -10 到 +10 的值
}

const props = defineProps<Props>();
const playerStore = usePlayerStore();

const isPlayerA = playerStore.playerId === 'playerA';

const playerLabel = computed(() => (isPlayerA ? '我方领域' : '对手领域'));
const opponentLabel = computed(() => (isPlayerA ? '对手领域' : '我方领域'));

// 计算偏向百分比
const biasPercentage = computed(() => {
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

// 发射事件（如果需要与父组件交互）
const emit = defineEmits<{
  click: [value: number];
}>();

function handleClick() {
  emit('click', props.topicBias);
}
</script>

<template>
  <div class="topic-bias-container-cyber-horizontal">
    <!-- 左侧装饰 -->
    <div class="cyber-cap-horizontal left">
      <div class="energy-ring"></div>
      <span class="faction-label">{{ opponentLabel }}</span>
    </div>
    
    <!-- 主体条 -->
    <div class="bias-core-horizontal">
      <!-- 能量流动效果 -->
      <div class="energy-flow-horizontal" :style="{ width: `${biasPercentage}%` }"></div>
      
      <!-- 数值网格 -->
      <svg class="grid-overlay-horizontal" viewBox="0 0 200 60">
        <defs>
          <pattern id="grid-h" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
            <rect width="20" height="20" fill="none" stroke="#ffffff10" stroke-width="0.5"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-h)" />
      </svg>
      
      <!-- 指示器 -->
      <div class="bias-pointer-horizontal" :style="{ left: `${biasPercentage}%` }">
        <div class="pointer-core">
          <span>{{ Math.abs(props.topicBias) }}</span>
        </div>
        <div class="pointer-wings-horizontal"></div>
      </div>
      
      <!-- 边缘光效 -->
      <div class="edge-glow-horizontal"></div>
    </div>
    
    <!-- 右侧装饰 -->
    <div class="cyber-cap-horizontal right">
      <div class="energy-ring"></div>
      <span class="faction-label">{{ playerLabel }}</span>
    </div>
    
    <!-- 警告状态 -->
    <div v-if="Math.abs(props.topicBias) >= 8" class="warning-state-horizontal">
      <span>⚠️ 临界状态</span>
    </div>
  </div>
</template>

<style scoped>
.topic-bias-container-cyber-horizontal {
  @apply w-full h-28 flex items-center;
  @apply bg-black rounded-lg relative;
  @apply border border-cyan-500/30;
  box-shadow: 
    inset 0 0 20px #06b6d410,
    0 0 30px #06b6d420;
}

.cyber-cap-horizontal {
  @apply relative z-10 p-2 h-full text-center flex items-center;
  flex-basis: 120px;
}
.cyber-cap-horizontal.left {
  justify-content: flex-start;
}
.cyber-cap-horizontal.right {
  justify-content: flex-end;
}

.energy-ring {
  @apply absolute inset-0 rounded-full;
  @apply border-2 border-cyan-400;
  @apply animate-spin-slow opacity-30;
}

.faction-label {
  @apply text-xs font-mono uppercase tracking-wider;
  @apply text-cyan-300;
  text-shadow: 0 0 10px currentColor;
}

.bias-core-horizontal {
  @apply flex-1 h-16 mx-auto relative;
  @apply bg-gradient-to-r from-cyan-900/20 to-purple-900/20;
  @apply border-y border-cyan-500/20;
  clip-path: polygon(0 10%, 100% 0, 100% 100%, 0 90%);
}

.energy-flow-horizontal {
  @apply absolute top-0 left-0 bottom-0;
  @apply bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-400;
  @apply transition-all duration-500;
  filter: brightness(1.5);
  animation: energy-pulse 2s ease-in-out infinite;
}

@keyframes energy-pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

.grid-overlay-horizontal {
  @apply absolute inset-0 w-full h-full;
}

.bias-pointer-horizontal {
  @apply absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2;
  @apply transition-all duration-300;
}

.pointer-core {
  @apply w-12 h-12 rounded-full;
  @apply bg-gradient-to-br from-cyan-400 to-purple-500;
  @apply flex items-center justify-center;
  @apply text-white font-bold text-lg;
  @apply shadow-lg;
  box-shadow: 0 0 30px #06b6d4;
}

.pointer-wings-horizontal {
  @apply absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2;
  @apply h-20 w-1 bg-gradient-to-b from-transparent via-cyan-400 to-transparent;
}

.warning-state-horizontal {
  @apply absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2;
  @apply bg-red-500/90 px-2 py-1 rounded;
  @apply text-xs font-bold animate-pulse;
  @apply whitespace-nowrap;
}

@keyframes spin-slow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin-slow {
  animation: spin-slow 8s linear infinite;
}

/* 其他动画 */
@keyframes pulse-glow {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

/* 然后修改你的类 */
.energy-ring {
  @apply absolute inset-0 rounded-full;
  @apply border-2 border-cyan-400 opacity-30;
  /* 使用自定义动画类 */
  animation: spin-slow 8s linear infinite;
}
</style>