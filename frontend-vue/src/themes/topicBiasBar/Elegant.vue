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

// 计算偏向百分比
const biasPercentage = computed(() => {
  const bias = isPlayerA ? props.topicBias : -props.topicBias;
  return (bias + 10) * 5;
});

// 计算状态颜色类别
const valueClass = computed(() => {
  const bias = isPlayerA ? props.topicBias : -props.topicBias;
  if (bias > 0) return 'positive';
  if (bias < 0) return 'negative';
  return 'neutral';
});

const valueLabel = computed(() => {
    const bias = isPlayerA ? props.topicBias : -props.topicBias;
    if (bias > 0) return '我方';
    if (bias < 0) return '对手';
    return '中立';
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

// 计算填充条的宽度
const fillWidth = computed(() => {
  const bias = isPlayerA ? props.topicBias : -props.topicBias;
  return Math.abs(bias) * 5; // 每点偏向值对应5%宽度
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
  (e: 'click', value: number): void;
}>();

function handleClick() {
  emit('click', props.topicBias);
}
</script>

<template>
  <div class="bias-bar-elegant-horizontal" @click="handleClick">
    <!-- 左侧状态提示 -->
    <div class="status-section-horizontal">
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
    
    <!-- 主偏向条 -->
    <div class="bias-bar-wrapper-horizontal">
       <!-- 底部刻度 -->
      <div class="scale-labels-horizontal">
        <span class="scale-label" data-value="-10">对手</span>
        <span class="scale-label center" data-value="0">0</span>
        <span class="scale-label" data-value="+10">我方</span>
      </div>
      <div class="bias-bar-horizontal">
        <!-- 背景层 -->
        <div class="bar-background-horizontal"></div>
        
        <!-- 中线 -->
        <div class="center-line-horizontal"></div>
        
        <!-- 填充条 -->
        <div 
          class="bias-fill-horizontal"
          :class="{ 
            'positive': (isPlayerA && props.topicBias > 0) || (!isPlayerA && props.topicBias < 0), 
            'negative': (isPlayerA && props.topicBias < 0) || (!isPlayerA && props.topicBias > 0)
          }"
          :style="{ 
            width: `${fillWidth}%`,
            opacity: showWarning ? 1 : 0.8
          }"
        ></div>
        
        <!-- 指示点 -->
        <div 
          class="indicator-dot-horizontal"
          :style="{ left: `${biasPercentage}%` }"
          :class="{ 'warning': showWarning }"
        >
          <span class="indicator-tooltip">
            {{ props.topicBias > 0 ? '+' : '' }}{{ props.topicBias }}
          </span>
        </div>
      </div>
    </div>
    
    <!-- 右侧数值显示 -->
    <div class="value-display-horizontal" :class="valueClass">
      <span class="value-number">
        {{ Math.abs(props.topicBias) }}
      </span>
      <span class="value-label">
        {{ valueLabel }}
      </span>
    </div>
  </div>
</template>

<style scoped>
/* 容器样式 */
.bias-bar-elegant-horizontal {
  @apply w-full h-24 flex items-center justify-between;
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
    transform: scale(1.01);
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  }
}

/* 数值显示 */
.value-display-horizontal {
  @apply text-center transition-all duration-500;
  flex-basis: 80px;
  
  .value-number {
    @apply text-3xl font-light block;
    @apply transition-all duration-300;
  }
  
  .value-label {
    @apply text-xs opacity-60 uppercase tracking-widest mt-1;
  }
}

/* 偏向条包装器 */
.bias-bar-wrapper-horizontal {
  @apply flex-1 flex flex-col items-center gap-2 mx-4;
  min-width: 200px;
}

/* 偏向条主体 */
.bias-bar-horizontal {
  @apply relative h-8 w-full;
  @apply rounded-full overflow-hidden;
  
  .bar-background-horizontal {
    @apply absolute inset-0;
    background: linear-gradient(
      to right,
      rgba(239, 68, 68, 0.1) 0%,
      rgba(0, 0, 0, 0.2) 45%,
      rgba(0, 0, 0, 0.2) 55%,
      rgba(16, 185, 129, 0.1) 100%
    );
  }
  
  .center-line-horizontal {
    @apply absolute left-1/2 top-0 bottom-0 w-px;
    @apply bg-white/30;
    transform: translateX(-50%);
    box-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
  }
}

/* 填充条 */
.bias-fill-horizontal {
  @apply absolute top-0 bottom-0;
  @apply rounded-full transition-all duration-500 ease-out;
  
  &.positive { /* 我方优势 */
    @apply left-1/2;
    background: linear-gradient(
      to right,
      rgba(52, 211, 153, 0.4),
      rgba(52, 211, 153, 0.8)
    );
  }
  
  &.negative { /* 对手优势 */
    @apply right-1/2;
    background: linear-gradient(
      to left,
      rgba(251, 113, 133, 0.4),
      rgba(251, 113, 133, 0.8)
    );
  }
}

/* 指示点 */
.indicator-dot-horizontal {
  @apply absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2;
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
.scale-labels-horizontal {
  @apply flex justify-between w-full;
  @apply text-xs px-1;
  
  .scale-label {
    @apply text-white/40 transition-all duration-300;
    
    &.center {
      @apply text-white/60 font-semibold;
    }
  }
}

/* 状态提示 */
.status-section-horizontal {
  @apply w-full space-y-2;
  flex-basis: 120px;
  
  .status-text {
    @apply text-xs font-semibold text-center;
  }
  
  .status-bar-container {
    @apply w-full h-1 bg-white/10 rounded-full overflow-hidden;
    
    .status-bar {
      @apply h-full transition-all duration-500 ease-out rounded-full;
    }
  }
}

/* 状态颜色 */
.positive {
  @apply text-emerald-400;
  .status-bar { @apply bg-gradient-to-r from-emerald-400 to-emerald-500; }
}
.negative {
  @apply text-rose-400;
   .status-bar { @apply bg-gradient-to-r from-rose-400 to-rose-500; }
}
.neutral {
  @apply text-amber-400;
  .status-bar { @apply bg-gradient-to-r from-amber-400 to-amber-500; }
}
.value-display-horizontal.positive {
  text-shadow: 0 0 20px rgba(52, 211, 153, 0.5);
}
.value-display-horizontal.negative {
  text-shadow: 0 0 20px rgba(251, 113, 133, 0.5);
}
.value-display-horizontal.neutral {
    text-shadow: 0 0 20px rgba(251, 191, 36, 0.5);
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
</style>