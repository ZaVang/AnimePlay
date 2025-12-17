<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePersistentEffects } from '@/core/di/composables';
import type { PersistentEffect } from '@/core/systems/PersistentEffectSystem';

const props = defineProps<{
  playerId: 'playerA' | 'playerB';
  title?: string;
  isOpponent?: boolean;
}>();

const persistentSystem = usePersistentEffects();
const hoveredEffect = ref<PersistentEffect | null>(null);

// 获取玩家的活跃效果
const activeEffects = computed(() => {
  return persistentSystem.getPlayerEffects(props.playerId);
});

// 过滤显示的效果（排除一些内部效果）
const displayEffects = computed(() => {
  return activeEffects.value.filter(effect => {
    // 过滤掉一些不需要显示的内部效果
    const hiddenTypes = ['first_card_discount', 'next_card_cost_reduction'];
    return !hiddenTypes.includes(effect.type);
  });
});

// 获取效果的图标
function getEffectIcon(effect: PersistentEffect): string {
  const iconMap: Record<string, string> = {
    'gentle_encouragement': '💝', // 古河渚 - 温柔鼓励
    'reincarnation_memory': '🔄', // 晓美焰 - 轮回记忆
    'time_stop_priority': '⏰', // 晓美焰 - 时间停止
    'bass_rhythm': '🎵', // 秋山澪 - 贝斯节奏
    'inner_focus': '🎯', // 内向专注
    'musical_family': '🎼', // 音乐世家
    'genre_expert': '📚', // 类型专家
    'default': '✨'
  };

  return iconMap[effect.type] || iconMap.default;
}

// 获取效果的显示颜色
function getEffectColor(effect: PersistentEffect): string {
  if (effect.duration === -1) return 'text-purple-400'; // 永久效果
  if (effect.duration > 3) return 'text-blue-400'; // 长期效果
  if (effect.duration > 1) return 'text-yellow-400'; // 中期效果
  return 'text-red-400'; // 短期效果
}

// 获取持续时间显示
function getDurationText(effect: PersistentEffect): string {
  if (effect.duration === -1) return '永久';
  if (effect.duration === 0) return '即将结束';
  return `${effect.duration}回合`;
}

function onEffectHover(effect: PersistentEffect) {
  hoveredEffect.value = effect;
}

function onEffectLeave() {
  hoveredEffect.value = null;
}
</script>

<template>
  <div class="passive-skill-panel">
    <!-- 面板标题 -->
    <div class="panel-header">
      <h3 class="panel-title">
        {{ title || (isOpponent ? 'AI被动技能' : '我的被动技能') }}
      </h3>
      <span class="effect-count">{{ displayEffects.length }}</span>
    </div>

    <!-- 效果列表 -->
    <div class="effects-container">
      <div
        v-for="effect in displayEffects"
        :key="effect.id"
        class="effect-item"
        :class="getEffectColor(effect)"
        @mouseenter="onEffectHover(effect)"
        @mouseleave="onEffectLeave"
      >
        <!-- 效果图标 -->
        <div class="effect-icon">
          {{ getEffectIcon(effect) }}
        </div>

        <!-- 效果名称 -->
        <div class="effect-name">
          {{ effect.description }}
        </div>

        <!-- 持续时间 -->
        <div class="effect-duration">
          {{ getDurationText(effect) }}
        </div>
      </div>

      <!-- 无效果时的占位 -->
      <div v-if="displayEffects.length === 0" class="no-effects">
        暂无活跃技能
      </div>
    </div>

    <!-- 效果详情悬浮窗 -->
    <div
      v-if="hoveredEffect"
      class="effect-tooltip"
    >
      <div class="tooltip-header">
        <span class="tooltip-icon">{{ getEffectIcon(hoveredEffect) }}</span>
        <span class="tooltip-title">{{ hoveredEffect.description }}</span>
      </div>
      <div class="tooltip-content">
        <p><strong>类型:</strong> {{ hoveredEffect.type }}</p>
        <p><strong>持续时间:</strong> {{ getDurationText(hoveredEffect) }}</p>
        <div v-if="hoveredEffect.data && Object.keys(hoveredEffect.data).length > 0" class="tooltip-data">
          <strong>效果数据:</strong>
          <ul>
            <li v-for="[key, value] in Object.entries(hoveredEffect.data)" :key="key">
              {{ key }}: {{ value }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.passive-skill-panel {
  @apply bg-gray-800/70 rounded-lg border border-gray-600 p-3 relative;
  min-width: 200px;
  max-width: 300px;
}

.panel-header {
  @apply flex items-center justify-between mb-2 pb-2 border-b border-gray-600;
}

.panel-title {
  @apply text-sm font-semibold text-gray-200;
}

.effect-count {
  @apply text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded;
}

.effects-container {
  @apply space-y-1 max-h-32 overflow-y-auto;
}

.effect-item {
  @apply flex items-center gap-2 p-2 rounded bg-gray-700/50 hover:bg-gray-700 transition-all duration-200 cursor-pointer;
  font-size: 0.75rem;
}

.effect-icon {
  @apply text-base flex-shrink-0;
}

.effect-name {
  @apply flex-1 truncate;
}

.effect-duration {
  @apply text-xs opacity-75 flex-shrink-0;
}

.no-effects {
  @apply text-xs text-gray-500 text-center py-4 italic;
}

/* 悬浮提示框 */
.effect-tooltip {
  @apply absolute left-full ml-2 top-0 z-50 bg-gray-900 border border-gray-600 rounded-lg p-3 shadow-lg;
  width: 250px;
  pointer-events: none;
}

.tooltip-header {
  @apply flex items-center gap-2 mb-2 pb-2 border-b border-gray-600;
}

.tooltip-icon {
  @apply text-lg;
}

.tooltip-title {
  @apply font-semibold text-gray-200;
}

.tooltip-content {
  @apply text-xs text-gray-300 space-y-1;
}

.tooltip-data ul {
  @apply ml-2 mt-1;
}

.tooltip-data li {
  @apply text-gray-400;
}

/* 滚动条样式 */
.effects-container::-webkit-scrollbar {
  width: 4px;
}

.effects-container::-webkit-scrollbar-track {
  @apply bg-gray-800;
}

.effects-container::-webkit-scrollbar-thumb {
  @apply bg-gray-600 rounded;
}

.effects-container::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500;
}
</style>