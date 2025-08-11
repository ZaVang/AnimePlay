<script setup lang="ts">
import { computed } from 'vue';

// 接收props
interface Props {
  topicBias: number;  // -10 到 +10 的值
}

const props = defineProps<Props>();

// 计算偏向百分比（用于定位指示器）
const biasPercentage = computed(() => {
  // 将 -10 到 +10 映射到 0% 到 100%
  return (props.topicBias + 10) * 5;
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
    <div class="topic-bias-container-cyber">
      <!-- 顶部装饰 -->
      <div class="cyber-cap top">
        <div class="energy-ring"></div>
        <span class="faction-label">正方领域</span>
      </div>
      
      <!-- 主体条 -->
      <div class="bias-core">
        <!-- 能量流动效果 -->
        <div class="energy-flow" :style="{ height: `${biasPercentage}%` }"></div>
        
        <!-- 数值网格 -->
        <svg class="grid-overlay" viewBox="0 0 60 200">
          <defs>
            <pattern id="grid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" stroke="#ffffff10" stroke-width="0.5"/>
            </pattern>
          </defs>
          <rect width="60" height="200" fill="url(#grid)" />
        </svg>
        
        <!-- 指示器 -->
        <div class="bias-pointer" :style="{ bottom: `${biasPercentage}%` }">
          <div class="pointer-core">
            <span>{{ Math.abs(props.topicBias) }}</span>
          </div>
          <div class="pointer-wings"></div>
        </div>
        
        <!-- 边缘光效 -->
        <div class="edge-glow"></div>
      </div>
      
      <!-- 底部装饰 -->
      <div class="cyber-cap bottom">
        <div class="energy-ring"></div>
        <span class="faction-label">反方领域</span>
      </div>
      
      <!-- 警告状态 -->
      <div v-if="Math.abs(props.topicBias) >= 8" class="warning-state">
        <span>⚠️ 临界状态</span>
      </div>
    </div>
  </template>
  
  <style scoped>
  .topic-bias-container-cyber {
    @apply w-28 h-full flex flex-col items-center;
    @apply bg-black rounded-lg relative;
    @apply border border-cyan-500/30;
    box-shadow: 
      inset 0 0 20px #06b6d410,
      0 0 30px #06b6d420;
  }
  
  .cyber-cap {
    @apply relative z-10 py-2 px-3 w-full text-center;
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
  
  .bias-core {
    @apply flex-1 w-16 mx-auto relative;
    @apply bg-gradient-to-b from-cyan-900/20 to-purple-900/20;
    @apply border-x border-cyan-500/20;
    clip-path: polygon(0 0, 100% 0, 90% 100%, 10% 100%);
  }
  
  .energy-flow {
    @apply absolute bottom-0 left-0 right-0;
    @apply bg-gradient-to-t from-purple-500 via-blue-500 to-cyan-400;
    @apply transition-all duration-500;
    filter: brightness(1.5);
    animation: energy-pulse 2s ease-in-out infinite;
  }
  
  @keyframes energy-pulse {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 1; }
  }
  
  .bias-pointer {
    @apply absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2;
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
  
  .pointer-wings {
    @apply absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2;
    @apply w-20 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent;
  }
  
  .warning-state {
    @apply absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2;
    @apply bg-red-500/90 px-2 py-1 rounded;
    @apply text-xs font-bold animate-pulse;
    @apply whitespace-nowrap;
  }
  @keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
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