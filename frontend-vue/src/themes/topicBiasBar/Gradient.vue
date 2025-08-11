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

// 计算指示器颜色
const indicatorColor = computed(() => {
  const bias = props.topicBias;
  if (bias >= 7) return '#10b981';    // 优势绿
  if (bias > 0) return '#60a5fa';     // 略优蓝
  if (bias === 0) return '#fbbf24';    // 均势黄
  if (bias < 0 && bias > -7) return '#fb923c'; // 略劣橙
  return '#ef4444';                   // 劣势红
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
  <div class="topic-bias-container">
    <!-- 顶部标签 -->
    <div class="bias-header">
      <span class="text-green-400">正方</span>
      <span class="text-xs text-gray-400">议题偏向</span>
    </div>
    
    <!-- 主偏向条 -->
    <div class="bias-track">
      <!-- 背景渐变 -->
      <div class="bias-gradient"></div>
      
      <!-- 刻度线 -->
      <div class="scale-marks">
        <div v-for="i in 5" :key="i" class="mark" :class="{ 'mark-major': i === 3 }"></div>
      </div>
      
      <!-- 危险区域标记 -->
      <div class="danger-zone top"></div>
      <div class="danger-zone bottom"></div>
      
      <!-- 指示器 -->
      <div 
        class="bias-indicator"
        :style="{ 
          bottom: `calc(${biasPercentage}% - 12px)`,
          backgroundColor: indicatorColor,
          boxShadow: `0 0 20px ${indicatorColor}`
        }"
      >
        <span class="indicator-value">{{ props.topicBias > 0 ? '+' : '' }}{{ props.topicBias }}</span>
      </div>
    </div>
    
    <!-- 底部标签 -->
    <div class="bias-footer">
      <span class="text-red-400">反方</span>
      <span class="status-text" :style="{ color: indicatorColor }">
        {{ statusText }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.topic-bias-container {
  @apply w-24 h-full flex flex-col items-center justify-between;
  @apply bg-gray-900/80 backdrop-blur-sm rounded-xl border border-gray-700;
  @apply p-3 relative shadow-2xl;
}

.bias-header, .bias-footer {
  @apply flex flex-col items-center gap-1;
}

.bias-track {
  @apply relative flex-1 w-12 my-3;
  @apply bg-gray-800 rounded-full;
  @apply border border-gray-600;
  min-height: 200px;
}

.bias-gradient {
  @apply absolute inset-0 rounded-full overflow-hidden;
  background: linear-gradient(to top,
    #ef4444 0%,
    #fb923c 25%,
    #fbbf24 50%,
    #60a5fa 75%,
    #10b981 100%
  );
  opacity: 0.2;
}

.scale-marks {
  @apply absolute inset-0 flex flex-col justify-between py-4;
}

.mark {
  @apply w-full h-px bg-gray-600;
}

.mark-major {
  @apply bg-yellow-500 h-0.5;
}

.danger-zone {
  @apply absolute w-full h-8 left-0;
  @apply bg-gradient-to-b from-transparent;
}

.danger-zone.top {
  @apply top-0 rounded-t-full;
  @apply to-green-500/30;
}

.danger-zone.bottom {
  @apply bottom-0 rounded-b-full rotate-180;
  @apply to-red-500/30;
}

.bias-indicator {
  @apply absolute left-1/2 transform -translate-x-1/2;
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

.bias-indicator {
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateX(-50%) translateY(0); }
  50% { transform: translateX(-50%) translateY(-2px); }
}
</style>