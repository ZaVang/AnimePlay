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
  <div class="bias-bar-elegant" @click="handleClick">
    <!-- 数值显示区域 -->
    <div class="value-display" :class="valueClass">
      <span class="value-number">
        {{ Math.abs(props.topicBias) }}
      </span>
      <span class="value-label">
        {{ props.topicBias > 0 ? '正方' : props.topicBias < 0 ? '反方' : '中立' }}
      </span>
    </div>
    
    <!-- 主偏向条 -->
    <div class="bias-bar-wrapper">
      <!-- 偏向条主体 -->
      <div class="bias-bar">
        <!-- 背景层 -->
        <div class="bar-background"></div>
        
        <!-- 中线 -->
        <div class="center-line"></div>
        
        <!-- 填充条 -->
        <div 
          class="bias-fill"
          :class="{ 
            'positive': props.topicBias > 0, 
            'negative': props.topicBias < 0 
          }"
          :style="{ 
            height: `${fillHeight}%`,
            opacity: showWarning ? 1 : 0.8
          }"
        ></div>
        
        <!-- 指示点 -->
        <div 
          class="indicator-dot"
          :style="{ bottom: `${biasPercentage}%` }"
          :class="{ 'warning': showWarning }"
        >
          <span class="indicator-tooltip">
            {{ props.topicBias > 0 ? '+' : '' }}{{ props.topicBias }}
          </span>
        </div>
        
        <!-- 危险区域标记（可选） -->
        <div v-if="showWarning" class="danger-indicator">
          <span class="danger-pulse"></span>
        </div>
      </div>
      
      <!-- 侧边刻度 -->
      <div class="scale-labels">
        <span class="scale-label" data-value="+10">+10</span>
        <span class="scale-label" data-value="+5">+5</span>
        <span class="scale-label center" data-value="0">0</span>
        <span class="scale-label" data-value="-5">-5</span>
        <span class="scale-label" data-value="-10">-10</span>
      </div>
    </div>
    
    <!-- 底部状态提示 -->
    <div class="status-section">
      <div class="status-text" :class="valueClass">
        {{ statusText }}
      </div>
      <div class="status-bar-container">
        <div 
          class="status-bar" 
          :style="{ width: `${statusBarWidth}%` }"
          :class="valueClass"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 容器样式 */
.bias-bar-elegant {
  @apply w-20 h-full flex flex-col items-center justify-between;
  @apply rounded-2xl p-4 cursor-pointer;
  @apply transition-all duration-300;
  
  /* 毛玻璃效果 */
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  /* 悬停效果 */
  &:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-1px);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }
}

/* 数值显示 */
.value-display {
  @apply text-center transition-all duration-500;
  
  .value-number {
    @apply text-3xl font-light block;
    @apply transition-all duration-300;
  }
  
  .value-label {
    @apply text-xs opacity-60 uppercase tracking-widest mt-1;
  }
  
  /* 状态颜色 */
  &.positive {
    @apply text-emerald-400;
    text-shadow: 0 0 20px rgba(52, 211, 153, 0.5);
  }
  
  &.negative {
    @apply text-rose-400;
    text-shadow: 0 0 20px rgba(251, 113, 133, 0.5);
  }
  
  &.neutral {
    @apply text-amber-400;
    text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
  }
}

/* 偏向条包装器 */
.bias-bar-wrapper {
  @apply flex-1 flex items-center gap-2 my-4;
  min-height: 200px;
}

/* 偏向条主体 */
.bias-bar {
  @apply relative w-8 h-full;
  @apply rounded-full overflow-hidden;
  
  .bar-background {
    @apply absolute inset-0;
    background: linear-gradient(
      to bottom,
      rgba(16, 185, 129, 0.1) 0%,
      rgba(0, 0, 0, 0.2) 45%,
      rgba(0, 0, 0, 0.2) 55%,
      rgba(239, 68, 68, 0.1) 100%
    );
  }
  
  .center-line {
    @apply absolute top-1/2 left-0 right-0 h-px;
    @apply bg-white/30;
    transform: translateY(-50%);
    box-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
  }
}

/* 填充条 */
.bias-fill {
  @apply absolute left-0 right-0;
  @apply rounded-full transition-all duration-500 ease-out;
  
  &.positive {
    @apply bottom-1/2;
    background: linear-gradient(
      to top,
      rgba(52, 211, 153, 0.4),
      rgba(52, 211, 153, 0.8)
    );
    box-shadow: 
      inset 0 0 10px rgba(52, 211, 153, 0.5),
      0 0 20px rgba(52, 211, 153, 0.3);
  }
  
  &.negative {
    @apply top-1/2;
    background: linear-gradient(
      to bottom,
      rgba(251, 113, 133, 0.4),
      rgba(251, 113, 133, 0.8)
    );
    box-shadow: 
      inset 0 0 10px rgba(251, 113, 133, 0.5),
      0 0 20px rgba(251, 113, 133, 0.3);
  }
}

/* 指示点 */
.indicator-dot {
  @apply absolute left-1/2 transform -translate-x-1/2 -translate-y-1/2;
  @apply w-3 h-3 bg-white rounded-full;
  @apply shadow-lg transition-all duration-300;
  @apply z-10;
  
  &:hover {
    @apply scale-150;
    
    .indicator-tooltip {
      @apply opacity-100 scale-100;
    }
  }
  
  &.warning {
    @apply bg-yellow-400;
    animation: pulse-warning 1s ease-in-out infinite;
  }
}

/* 指示点提示 */
.indicator-tooltip {
  @apply absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2;
  @apply bg-gray-900 text-white text-xs px-2 py-1 rounded;
  @apply opacity-0 scale-75 transition-all duration-200;
  @apply whitespace-nowrap pointer-events-none;
  
  &::after {
    content: '';
    @apply absolute top-full left-1/2 transform -translate-x-1/2;
    @apply border-4 border-transparent border-t-gray-900;
  }
}

/* 刻度标签 */
.scale-labels {
  @apply flex flex-col justify-between h-full;
  @apply text-xs;
  
  .scale-label {
    @apply text-white/40 transition-all duration-300;
    @apply relative;
    
    &.center {
      @apply text-white/60 font-semibold;
    }
    
    /* 高亮对应的刻度 */
    &[data-value="+10"],
    &[data-value="-10"] {
      @apply text-white/20;
    }
  }
}

/* 状态提示 */
.status-section {
  @apply w-full space-y-2;
  
  .status-text {
    @apply text-xs font-semibold text-center;
    @apply transition-all duration-300;
    
    &.positive {
      @apply text-emerald-400;
    }
    
    &.negative {
      @apply text-rose-400;
    }
    
    &.neutral {
      @apply text-amber-400;
    }
  }
  
  .status-bar-container {
    @apply w-full h-1 bg-white/10 rounded-full overflow-hidden;
    
    .status-bar {
      @apply h-full transition-all duration-500 ease-out;
      @apply rounded-full;
      
      &.positive {
        @apply bg-gradient-to-r from-emerald-400 to-emerald-500;
      }
      
      &.negative {
        @apply bg-gradient-to-r from-rose-400 to-rose-500;
      }
      
      &.neutral {
        @apply bg-gradient-to-r from-amber-400 to-amber-500;
      }
    }
  }
}

/* 危险指示器 */
.danger-indicator {
  @apply absolute inset-0 pointer-events-none;
  
  .danger-pulse {
    @apply absolute inset-0 rounded-full;
    @apply border-2 border-red-500;
    animation: pulse-danger 2s ease-out infinite;
  }
}

/* 动画定义 */
@keyframes pulse-warning {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(251, 191, 36, 0);
  }
}

@keyframes pulse-danger {
  0% {
    transform: scale(0.95);
    opacity: 0.7;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.3;
  }
  100% {
    transform: scale(0.95);
    opacity: 0.7;
  }
}

/* 响应式调整 */
@media (max-height: 600px) {
  .bias-bar-elegant {
    @apply p-2;
  }
  
  .value-display .value-number {
    @apply text-2xl;
  }
  
  .bias-bar-wrapper {
    min-height: 150px;
  }
}
</style>