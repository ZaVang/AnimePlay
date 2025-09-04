<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue';
import type { DialogueAction } from '@/core/systems/DialogueSystem';

interface Props {
  action: DialogueAction | null;
  position: 'left' | 'right';
  character?: {
    name: string;
    avatar?: string;
  };
}

const props = defineProps<Props>();

const isVisible = ref(false);
const bubbleRef = ref<HTMLElement>();
const typewriterText = ref('');

// 计算气泡样式
const bubbleClasses = computed(() => {
  const baseClasses = [
    'speech-bubble',
    'relative',
    'max-w-lg',
    'min-w-48',
    'p-5',
    'rounded-2xl',
    'shadow-2xl',
    'transform',
    'transition-all',
    'duration-300',
    'border-2'
  ];

  if (props.position === 'left') {
    baseClasses.push(
      'bg-gradient-to-br',
      'from-blue-500',
      'to-blue-700',
      'border-blue-300',
      'text-white',
      'ml-4'
    );
  } else {
    baseClasses.push(
      'bg-gradient-to-br',
      'from-red-500',
      'to-red-700',
      'border-red-300',
      'text-white',
      'mr-4'
    );
  }

  if (isVisible.value) {
    baseClasses.push('scale-100', 'opacity-100');
  } else {
    baseClasses.push('scale-75', 'opacity-0');
  }

  return baseClasses.join(' ');
});

// 监听动作变化
watch(() => props.action, async (newAction) => {
  if (newAction) {
    // 显示气泡
    isVisible.value = true;
    
    // 打字机效果
    if (newAction.type === 'speech') {
      await typewriterEffect(newAction.content);
    } else {
      typewriterText.value = newAction.content;
    }

    // 自动隐藏
    setTimeout(() => {
      isVisible.value = false;
    }, newAction.duration || 3000);
  } else {
    isVisible.value = false;
    typewriterText.value = '';
  }
}, { immediate: true });

// 打字机效果
async function typewriterEffect(text: string) {
  typewriterText.value = '';
  const chars = text.split('');
  
  for (let i = 0; i < chars.length; i++) {
    typewriterText.value += chars[i];
    await new Promise(resolve => setTimeout(resolve, 30));
  }
}

// 气泡点击效果
function handleBubbleClick() {
  if (bubbleRef.value) {
    bubbleRef.value.classList.add('animate-bounce');
    setTimeout(() => {
      bubbleRef.value?.classList.remove('animate-bounce');
    }, 500);
  }
}
</script>

<template>
  <div 
    v-if="action" 
    class="speech-bubble-container"
    :class="position === 'left' ? 'justify-start' : 'justify-end'"
  >
    <div 
      ref="bubbleRef"
      :class="bubbleClasses"
      @click="handleBubbleClick"
    >
      <!-- 气泡箭头 -->
      <div 
        class="bubble-arrow"
        :class="position === 'left' ? 'arrow-left' : 'arrow-right'"
      ></div>

      <!-- 角色信息 -->
      <div v-if="character" class="character-info mb-2">
        <div class="flex items-center gap-2">
          <div 
            v-if="character.avatar" 
            class="w-6 h-6 rounded-full bg-gray-300 flex-shrink-0"
            :style="{ backgroundImage: `url(${character.avatar})`, backgroundSize: 'cover' }"
          ></div>
          <span class="text-xs font-semibold opacity-80">{{ character.name }}</span>
        </div>
      </div>

      <!-- 对话内容 -->
      <div class="dialogue-content">
        <p class="text-base leading-relaxed font-semibold text-shadow-lg">
          {{ typewriterText }}
        </p>
      </div>

      <!-- 动作类型指示器 -->
      <div 
        v-if="action.type === 'action'" 
        class="action-indicator mt-2 text-center"
      >
        <span class="text-xs px-2 py-1 bg-black bg-opacity-20 rounded-full">
          {{ action.actionType?.toUpperCase() }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.speech-bubble-container {
  @apply flex w-full mb-2;
}

.speech-bubble {
  backdrop-filter: blur(10px);
  box-shadow: 
    0 20px 25px -5px rgba(0, 0, 0, 0.3),
    0 10px 10px -5px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(255, 255, 255, 0.1);
}

.speech-bubble:hover {
  transform: scale(1.05);
  cursor: pointer;
  box-shadow: 
    0 25px 30px -5px rgba(0, 0, 0, 0.4),
    0 15px 15px -5px rgba(0, 0, 0, 0.3);
}

/* 气泡箭头 */
.bubble-arrow {
  position: absolute;
  top: 20px;
  width: 0;
  height: 0;
}

.arrow-left {
  left: -12px;
  border-top: 12px solid transparent;
  border-bottom: 12px solid transparent;
  border-right: 12px solid rgb(59 130 246); /* 蓝色渐变的主色 */
}

.arrow-right {
  right: -12px;
  border-top: 12px solid transparent;
  border-bottom: 12px solid transparent;
  border-left: 12px solid rgb(239 68 68); /* 红色渐变的主色 */
}

/* 特殊动作气泡样式 */
.speech-bubble:has(.action-indicator) {
  @apply bg-gradient-to-br;
}

.speech-bubble:has(.action-indicator[data-action="objection"]) {
  @apply from-yellow-500 to-orange-600;
}

.speech-bubble:has(.action-indicator[data-action="counterattack"]) {
  @apply from-purple-500 to-pink-600;
}

/* 文本阴影效果 */
.text-shadow-lg {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8), 0 1px 2px rgba(0, 0, 0, 0.6);
}

/* 动画效果 */
@keyframes bubble-appear {
  0% {
    opacity: 0;
    transform: scale(0.6) translateY(20px);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.1) translateY(-10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.speech-bubble {
  animation: bubble-appear 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .speech-bubble {
    max-width: 280px;
    padding: 12px;
  }
  
  .dialogue-content p {
    font-size: 0.8rem;
  }
}
</style>