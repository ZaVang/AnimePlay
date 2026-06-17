<script setup lang="ts">
/**
 * 问答题渲染（番剧问答 / 每日挑战共用）。
 * 单主体题（角色出处/番剧年份）展示主体图；比较题（最高评分/最高人气）每个选项带缩略图。
 * 图片一律 object-fit: contain（等比缩放进固定矩形，不裁剪，留白居中）。答后展示解析。
 */
import type { QuizQuestion } from '@/stores/minigames/quiz';

const props = defineProps<{
  question: QuizQuestion;
  chosen: number | null;       // 已选下标（揭示态）；null = 未答
  disabled: boolean;
}>();

const emit = defineEmits<{ (e: 'choose', index: number): void }>();

function optionClass(i: number): string {
  if (props.chosen === null) return '';
  if (i === props.question.correctIndex) return 'qq-opt-correct';
  if (i === props.chosen) return 'qq-opt-wrong';
  return 'qq-opt-dim';
}
</script>

<template>
  <div class="qq">
    <img
      v-if="question.subjectImage"
      :src="question.subjectImage"
      alt="题目图片"
      class="qq-subject"
    />
    <p class="qq-prompt">{{ question.prompt }}</p>

    <div class="qq-options">
      <button
        v-for="(opt, i) in question.options"
        :key="i"
        class="qq-opt"
        :class="[optionClass(i), { 'qq-opt-withimg': question.optionImages && question.optionImages[i] }]"
        :disabled="disabled"
        @click="emit('choose', i)"
      >
        <img
          v-if="question.optionImages && question.optionImages[i]"
          :src="question.optionImages[i] as string"
          alt=""
          class="qq-opt-thumb"
        />
        <span class="qq-opt-text">{{ opt }}</span>
      </button>
    </div>

    <p v-if="chosen !== null && question.explanation" class="qq-explain">💡 {{ question.explanation }}</p>
  </div>
</template>

<style scoped>
.qq { text-align: center; }
/* 主体图：等比缩放进固定矩形，不裁剪（contain），留白居中 */
.qq-subject {
  display: block;
  width: 100%;
  max-width: 180px;
  height: 150px;
  object-fit: contain;
  margin: 0 auto 0.75rem;
  border-radius: var(--sk-radius, 0.75rem);
  background: rgb(var(--c-surface-2, var(--c-surface)) / 0.6);
  border: 1px solid rgb(var(--c-border-line));
}
.qq-prompt { font-size: 1.1rem; font-weight: 700; color: rgb(var(--c-ink)); margin-bottom: 1rem; }
.qq-options { display: grid; gap: 0.65rem; }
.qq-opt {
  display: flex; align-items: center; gap: 0.6rem;
  padding: 0.65rem 1rem; border: 1.5px solid rgb(var(--c-border-line)); border-radius: var(--sk-radius, 0.6rem);
  background: rgb(var(--c-surface)); color: rgb(var(--c-ink)); font-weight: 600; cursor: pointer;
  transition: border-color .12s, background .12s; text-align: left;
}
.qq-opt-withimg { padding: 0.5rem 0.85rem; }
.qq-opt:hover:not(:disabled) { border-color: rgb(var(--c-accent)); }
.qq-opt:disabled { cursor: default; }
.qq-opt-text { flex: 1; }
/* 选项缩略图：同样 contain 不裁剪 */
.qq-opt-thumb {
  width: 44px; height: 44px; flex-shrink: 0; object-fit: contain;
  border-radius: 0.4rem; background: rgb(var(--c-surface-2, var(--c-surface)) / 0.6);
}
.qq-opt-correct { border-color: rgb(var(--c-success, 34 197 94)); background: rgb(var(--c-success, 34 197 94) / 0.12); }
.qq-opt-wrong { border-color: rgb(var(--c-danger)); background: rgb(var(--c-danger) / 0.12); }
.qq-opt-dim { opacity: 0.55; }
.qq-explain {
  margin-top: 0.85rem; padding: 0.55rem 0.85rem; border-radius: var(--sk-radius, 0.5rem);
  background: rgb(var(--c-surface-2, var(--c-surface)) / 0.55); color: rgb(var(--c-ink-soft));
  font-size: 0.85rem; line-height: 1.4;
}
</style>
