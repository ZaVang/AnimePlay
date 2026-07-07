<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { assetUrl } from '@/utils/assetUrl';
import { fullImageSrc, spriteSheetSrc } from '@/utils/cardImage';

/**
 * 全站复用的角色头像：取角色 sprite 行走表的“正面站姿帧”（row 0 朝下 / col 1 站姿列），
 * 裁一个正方区（头+上身）放大填满 size×size 方形头像。
 * sprite 缺失 → 回落原立绘 fullImageSrc；再缺 → 最终静态兜底图。
 * 纯展示、令牌化边框/背景、无副作用。
 */
const props = withDefaults(
  defineProps<{
    characterId: number;
    name?: string;
    size?: number;
    rounded?: boolean | string;
  }>(),
  { size: 56, rounded: false },
);

// —— sprite 表几何（3 列行走帧 × 4 行朝向，格 48×64、透明底）——
// 正面站姿帧 = row 0（朝下）/ col 1（站姿列）。取该帧顶部一个 CROP×CROP 方区作头像。
const CELL_W = 48;
const CELL_H = 64;
const FRONT_ROW = 0;
const STAND_COL = 1;
// 头+上身：正面帧宽 48，取顶部 48×48 方区（帧高 64 中的上 48）。
const CROP = 48;

const spriteFailed = ref(false);
watch(
  () => props.characterId,
  () => {
    spriteFailed.value = false;
  },
);

// 方区放大到 size：整表按同一比例缩放后负偏移定位到目标帧的裁剪原点。
const scale = computed(() => props.size / CROP);
const sheetStyle = computed(() => {
  const s = scale.value;
  return {
    width: `${CELL_W * 3 * s}px`,
    height: `${CELL_H * 4 * s}px`,
    left: `${-STAND_COL * CELL_W * s}px`,
    top: `${-FRONT_ROW * CELL_H * s}px`,
  };
});

const clipStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius:
    props.rounded === true
      ? 'var(--sk-radius-control)'
      : typeof props.rounded === 'string'
        ? props.rounded
        : '0',
}));

const spriteSrc = computed(() => spriteSheetSrc(props.characterId));
const portraitSrc = computed(() => fullImageSrc('character', props.characterId));

function onPortraitError(e: Event): void {
  const img = e.target as HTMLImageElement;
  const fallback = assetUrl('/data/images/character/77.jpg');
  if (img.src.endsWith('/77.jpg')) return;
  img.src = fallback;
}
</script>

<template>
  <div class="character-avatar" :style="clipStyle">
    <img
      v-if="!spriteFailed"
      class="avatar-sheet"
      :src="spriteSrc"
      :style="sheetStyle"
      :alt="name ?? ''"
      @error="spriteFailed = true"
    >
    <img
      v-else
      class="avatar-portrait"
      :src="portraitSrc"
      :alt="name ?? ''"
      @error="onPortraitError"
    >
  </div>
</template>

<style scoped>
.character-avatar {
  position: relative;
  overflow: hidden;
  flex: none;
  background: rgb(var(--c-surface-2));
  border: 1px solid rgb(var(--c-line));
}
.avatar-sheet {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  image-rendering: auto;
}
.avatar-portrait {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: top;
}
</style>
