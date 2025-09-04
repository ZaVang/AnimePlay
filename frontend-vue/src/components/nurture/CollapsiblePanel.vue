<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  title: string;
  icon?: string;
  defaultOpen?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  defaultOpen: false
});

const isOpen = ref(props.defaultOpen);

function toggleOpen() {
  isOpen.value = !isOpen.value;
}
</script>

<template>
  <div class="bg-gray-800 rounded-lg shadow-lg border border-gray-700 overflow-hidden">
    
    <!-- 面板标题栏 -->
    <div 
      class="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-700/50 transition-colors"
      @click="toggleOpen"
    >
      <h2 class="text-xl font-bold text-white flex items-center">
        <span v-if="icon" class="text-2xl mr-3">{{ icon }}</span>
        {{ title }}
      </h2>
      
      <!-- 折叠箭头 -->
      <div 
        class="transform transition-transform duration-300 text-gray-400 hover:text-white"
        :class="{ 'rotate-180': isOpen }"
      >
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
        </svg>
      </div>
    </div>

    <!-- 面板内容 -->
    <div 
      class="overflow-hidden transition-all duration-300 ease-in-out"
      :class="isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'"
    >
      <div class="border-t border-gray-700">
        <slot></slot>
      </div>
    </div>
    
  </div>
</template>

<style scoped>
/* 确保折叠动画平滑 */
.transition-all {
  transition-property: max-height, opacity;
}
</style>