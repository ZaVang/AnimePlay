<script setup lang="ts">
import { computed } from 'vue';
import { useGameStore } from '@/stores/battle';
import { useSettingsStore } from '@/stores/settings';

// 导入不同风格的子组件
import BiasBarGradient from '@/themes/topicBiasBar/Gradient.vue';
import BiasBarCyber from '@/themes/topicBiasBar/Cyber.vue';
import BiasBarElegant from '@/themes/topicBiasBar/Elegant.vue';

const gameStore = useGameStore();
const settingsStore = useSettingsStore();

// 获取当前选择的主题
const currentTheme = computed(() => settingsStore.biasBarTheme || 'gradient');

// 主题组件映射
const themeComponents = {
  gradient: BiasBarGradient,
  cyber: BiasBarCyber,
  elegant: BiasBarElegant
};

const CurrentBiasBar = computed(() => themeComponents[currentTheme.value]);
</script>

<template>
  <div class="bias-bar-container">
    <!-- 动态组件切换 -->
    <Transition name="theme-switch" mode="out-in">
      <component 
        :is="CurrentBiasBar" 
        :key="currentTheme"
        :topic-bias="gameStore.topicBias"
      />
    </Transition>
    
    <!-- 快速切换按钮（可选，用于演示） -->
    <button 
      v-if="settingsStore.showThemeSwitcher"
      @click="settingsStore.cycleBarTheme()"
      class="theme-switch-btn"
      :title="`当前主题: ${currentTheme}`"
    >
      🎨
    </button>
  </div>
</template>

<style scoped>
.bias-bar-container {
  @apply relative;
}

.theme-switch-btn {
  @apply absolute top-2 right-2 w-8 h-8 rounded-full;
  @apply bg-warm-300/50 hover:bg-warm-400/50;
  @apply flex items-center justify-center text-sm;
  @apply transition-all duration-200;
  @apply z-20;
}

/* 主题切换动画 */
.theme-switch-enter-active,
.theme-switch-leave-active {
  transition: all 0.3s ease;
}

.theme-switch-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

.theme-switch-leave-to {
  opacity: 0;
  transform: scale(1.1);
}
</style>