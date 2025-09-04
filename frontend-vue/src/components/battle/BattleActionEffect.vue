<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { DialogueAction } from '@/core/systems/DialogueSystem';

interface Props {
  action: DialogueAction | null;
}

const props = defineProps<Props>();

const isVisible = ref(false);
const animationClass = ref('');

// 动作效果配置
const actionEffects = {
  objection: {
    text: '異議！',
    icon: '⚡',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500',
    animation: 'objection-slam'
  },
  counterattack: {
    text: '反擊！',
    icon: '⚔️',
    color: 'text-red-400', 
    bgColor: 'bg-red-500',
    animation: 'counter-strike'
  },
  agreement: {
    text: '贊同！',
    icon: '👍',
    color: 'text-green-400',
    bgColor: 'bg-green-500',
    animation: 'agreement-nod'
  },
  dismissal: {
    text: '駁回！',
    icon: '❌',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500', 
    animation: 'dismissal-wave'
  }
};

// 计算当前动作效果
const currentEffect = computed(() => {
  if (!props.action || props.action.type !== 'action' || !props.action.actionType) {
    return null;
  }
  
  return actionEffects[props.action.actionType as keyof typeof actionEffects];
});

// 监听动作变化
watch(() => props.action, (newAction) => {
  if (newAction && newAction.type === 'action') {
    showEffect();
  } else {
    isVisible.value = false;
  }
}, { immediate: true });

// 显示效果
function showEffect() {
  if (!currentEffect.value) return;
  
  isVisible.value = true;
  animationClass.value = currentEffect.value.animation;
  
  // 音效（如果有的话）
  playActionSound();
  
  // 自动隐藏
  setTimeout(() => {
    isVisible.value = false;
    animationClass.value = '';
  }, 2000);
}

// 播放音效（占位函数）
function playActionSound() {
  // TODO: 添加音效播放逻辑
  // 可以根据不同的 action 类型播放不同的音效
  console.log(`🔊 播放${props.action?.actionType}音效`);
}
</script>

<template>
  <div 
    v-if="isVisible && currentEffect" 
    class="battle-action-effect fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
  >
    <!-- 背景闪光效果 -->
    <div 
      class="absolute inset-0 opacity-20 animate-pulse"
      :class="currentEffect.bgColor"
    ></div>
    
    <!-- 主要动作文字 -->
    <div 
      class="action-text-container transform"
      :class="[animationClass, currentEffect.color]"
    >
      <!-- 动作图标 -->
      <div class="action-icon text-6xl mb-2 text-center animate-bounce">
        {{ currentEffect.icon }}
      </div>
      
      <!-- 动作文字 -->
      <div class="action-text text-center">
        <h1 class="text-6xl font-black drop-shadow-lg">
          {{ currentEffect.text }}
        </h1>
        <div class="text-lg font-semibold mt-2 opacity-80">
          {{ action?.content }}
        </div>
      </div>
      
      <!-- 冲击波效果 -->
      <div class="shockwave-container absolute inset-0 -z-10">
        <div class="shockwave animate-ping"></div>
        <div class="shockwave animate-ping" style="animation-delay: 0.3s;"></div>
        <div class="shockwave animate-ping" style="animation-delay: 0.6s;"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.battle-action-effect {
  background: radial-gradient(
    circle at center,
    rgba(0, 0, 0, 0.8) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    transparent 100%
  );
}

.action-text-container {
  position: relative;
  text-align: center;
  filter: drop-shadow(0 0 10px rgba(255, 255, 255, 0.5));
}

/* 冲击波效果 */
.shockwave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  border: 2px solid currentColor;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  opacity: 0;
}

/* 动作动画 */
@keyframes objection-slam {
  0% {
    transform: scale(0.5) rotateY(-90deg);
    opacity: 0;
  }
  30% {
    transform: scale(1.2) rotateY(0deg);
    opacity: 1;
  }
  50% {
    transform: scale(0.95) rotateY(0deg);
  }
  100% {
    transform: scale(1) rotateY(0deg);
    opacity: 1;
  }
}

@keyframes counter-strike {
  0% {
    transform: scale(0.3) rotateZ(-180deg);
    opacity: 0;
  }
  40% {
    transform: scale(1.1) rotateZ(10deg);
    opacity: 1;
  }
  60% {
    transform: scale(0.9) rotateZ(-5deg);
  }
  100% {
    transform: scale(1) rotateZ(0deg);
    opacity: 1;
  }
}

@keyframes agreement-nod {
  0% {
    transform: translateY(-50px) scale(0.8);
    opacity: 0;
  }
  25% {
    transform: translateY(10px) scale(1.1);
    opacity: 1;
  }
  50% {
    transform: translateY(-5px) scale(0.95);
  }
  75% {
    transform: translateY(2px) scale(1.02);
  }
  100% {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

@keyframes dismissal-wave {
  0% {
    transform: translateX(-100px) rotateY(-45deg) scale(0.7);
    opacity: 0;
  }
  30% {
    transform: translateX(10px) rotateY(0deg) scale(1.1);
    opacity: 1;
  }
  60% {
    transform: translateX(-5px) rotateY(0deg) scale(0.95);
  }
  100% {
    transform: translateX(0) rotateY(0deg) scale(1);
    opacity: 1;
  }
}

/* 自定义动画类 */
.objection-slam {
  animation: objection-slam 0.8s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

.counter-strike {
  animation: counter-strike 0.9s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.agreement-nod {
  animation: agreement-nod 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.dismissal-wave {
  animation: dismissal-wave 1s cubic-bezier(0.23, 1, 0.32, 1);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .action-text h1 {
    font-size: 3rem;
  }
  
  .action-icon {
    font-size: 3rem;
  }
  
  .action-text .text-lg {
    font-size: 0.9rem;
  }
}

@media (max-width: 480px) {
  .action-text h1 {
    font-size: 2.5rem;
  }
  
  .action-icon {
    font-size: 2.5rem;
  }
}
</style>