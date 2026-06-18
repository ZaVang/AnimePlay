<script setup lang="ts">
/**
 * 小游戏游玩页（evolution-11）：/minigames/:gameId 全屏渲染单个小游戏。
 * 由 Hub 卡片跳转而来；带返回 Hub 入口。无效 id → 回退 Hub。
 */
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { MINIGAMES, isMiniGameId, type MiniGameId } from '@/config/minigames';
import GuessCharacter from '@/components/GuessCharacter.vue';
import HigherLowerGame from '@/components/HigherLowerGame.vue';
import QuizGame from '@/components/QuizGame.vue';
import DailyChallengeGame from '@/components/DailyChallengeGame.vue';
import TasteProfileGame from '@/components/TasteProfileGame.vue';

const route = useRoute();
const router = useRouter();

const COMPONENTS: Partial<Record<MiniGameId, unknown>> = {
  guess: GuessCharacter,
  higherlower: HigherLowerGame,
  quiz: QuizGame,
  dailychallenge: DailyChallengeGame,
  tasteprofile: TasteProfileGame,
};

const gameId = computed(() => route.params.gameId);
const meta = computed(() => MINIGAMES.find(g => g.id === gameId.value));
const component = computed(() => (isMiniGameId(gameId.value) ? COMPONENTS[gameId.value] ?? null : null));

// 无效 id（手敲/失效链接）→ 回 Hub
watchEffect(() => {
  if (route.name === 'minigamePlay' && !isMiniGameId(route.params.gameId)) {
    router.replace('/minigames');
  }
});
</script>

<template>
  <div class="mg-play">
    <div class="mg-play-bar">
      <RouterLink to="/minigames" class="btn-ghost text-sm px-3 py-1.5">← 小游戏中心</RouterLink>
      <h1 v-if="meta" class="mg-play-title">{{ meta.icon }} {{ meta.title }}</h1>
      <span class="mg-play-spacer"></span>
    </div>

    <div v-if="component" class="mg-play-stage">
      <component :is="component" />
    </div>
    <div v-else class="text-center py-16 text-ink-2">
      <p>找不到这个小游戏。</p>
      <RouterLink to="/minigames" class="btn-primary text-sm px-4 py-2 mt-3 inline-block">返回小游戏中心</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.mg-play { width: 100%; }
.mg-play-bar {
  display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem;
}
.mg-play-title { font-size: 1.4rem; font-weight: 800; color: rgb(var(--c-ink)); }
.mg-play-spacer { flex: 1; }
.mg-play-stage {
  border: 1px solid rgb(var(--c-line)); border-radius: var(--sk-radius, 0.75rem);
  background: rgb(var(--c-surface) / 0.4); padding: 1.5rem; min-height: 60vh;
}
</style>
