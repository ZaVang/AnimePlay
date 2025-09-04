<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { AnimeCard, CharacterCard } from '@/types/card';

interface Props {
  items: (AnimeCard | CharacterCard)[];
  itemHeight: number;
  containerHeight: number;
  minItemWidth: number;
  gap: number;
}

const props = defineProps<Props>();
const emit = defineEmits<{
  itemClick: [item: AnimeCard | CharacterCard];
}>();

// 容器和滚动相关的响应式变量
const containerRef = ref<HTMLElement>();
const scrollTop = ref(0);
const containerWidth = ref(0);

// 计算网格参数
const gridParams = computed(() => {
  const availableWidth = containerWidth.value - props.gap;
  const itemWidthWithGap = props.minItemWidth + props.gap;
  const columns = Math.floor(availableWidth / itemWidthWithGap) || 1;
  const actualItemWidth = Math.floor((availableWidth - (columns - 1) * props.gap) / columns);
  
  return {
    columns,
    itemWidth: actualItemWidth,
    rowHeight: props.itemHeight + props.gap
  };
});

// 计算总行数
const totalRows = computed(() => {
  return Math.ceil(props.items.length / gridParams.value.columns);
});

// 计算可视区域 - 优化边界处理
const visibleRange = computed(() => {
  const { rowHeight } = gridParams.value;
  const startRow = Math.floor(scrollTop.value / rowHeight);
  const endRow = Math.min(
    totalRows.value - 1,
    Math.ceil((scrollTop.value + props.containerHeight) / rowHeight)
  );
  
  return {
    startRow: Math.max(0, startRow - 1), // 预渲染上一行
    endRow: Math.min(totalRows.value - 1, endRow + 2) // 增加缓冲区，确保最后一行完全可见
  };
});

// 计算可视区域的项目
const visibleItems = computed(() => {
  const { startRow, endRow } = visibleRange.value;
  const { columns } = gridParams.value;
  
  const items = [];
  for (let row = startRow; row <= endRow; row++) {
    for (let col = 0; col < columns; col++) {
      const index = row * columns + col;
      if (index < props.items.length) {
        const item = props.items[index];
        items.push({
          item,
          index,
          row,
          col,
          style: {
            position: 'absolute' as const,
            top: `${row * gridParams.value.rowHeight}px`,
            left: `${col * (gridParams.value.itemWidth + props.gap)}px`,
            width: `${gridParams.value.itemWidth}px`,
            height: `${props.itemHeight}px`
          }
        });
      }
    }
  }
  return items;
});

// 总容器高度 - 修复底部遮挡问题
const totalHeight = computed(() => {
  const baseHeight = totalRows.value * gridParams.value.rowHeight;
  // 为最后一行添加额外的gap空间，避免被遮挡
  return baseHeight > 0 ? baseHeight - props.gap + props.itemHeight : 0;
});

// 滚动处理
function handleScroll(event: Event) {
  const target = event.target as HTMLElement;
  scrollTop.value = target.scrollTop;
}

// 调整容器宽度
function updateContainerWidth() {
  if (containerRef.value) {
    containerWidth.value = containerRef.value.clientWidth;
  }
}

// 生命周期
onMounted(() => {
  updateContainerWidth();
  window.addEventListener('resize', updateContainerWidth);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerWidth);
});

// 点击处理
function handleItemClick(item: AnimeCard | CharacterCard) {
  emit('itemClick', item);
}
</script>

<template>
  <div
    ref="containerRef"
    class="virtual-grid-container"
    :style="{ height: `${containerHeight}px` }"
    @scroll="handleScroll"
  >
    <div
      class="virtual-grid-content"
      :style="{ height: `${totalHeight}px`, position: 'relative' }"
    >
      <div
        v-for="{ item, index, style } in visibleItems"
        :key="`${item.id}-${index}`"
        :style="style"
        class="virtual-grid-item"
        @click="handleItemClick(item)"
      >
        <slot :item="item" :index="index" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.virtual-grid-container {
  overflow-y: auto;
  overflow-x: hidden;
  /* 添加底部内边距，确保最后一行完全可见 */
  padding-bottom: 16px;
}

.virtual-grid-content {
  position: relative;
  /* 确保内容区域有足够的最小高度 */
  min-height: 100%;
}

.virtual-grid-item {
  cursor: pointer;
  /* 添加轻微的z-index确保正确层叠 */
  z-index: 1;
  /* 添加平滑过渡效果 */
  transition: transform 0.2s ease, opacity 0.2s ease;
  /* 确保项目完全可见 */
  opacity: 1;
}

.virtual-grid-item:hover {
  transform: translateY(-2px);
  z-index: 2;
}

/* 自定义滚动条 */
.virtual-grid-container::-webkit-scrollbar {
  width: 8px;
}

.virtual-grid-container::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 10px;
}

.virtual-grid-container::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 10px;
}

.virtual-grid-container::-webkit-scrollbar-thumb:hover {
  background: #475569;
}
</style>