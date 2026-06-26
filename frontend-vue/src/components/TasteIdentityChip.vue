<script setup lang="ts">
/**
 * TasteIdentityChip（I2-T4）——主页「番剧品味身份」呈现。
 * 把埋在三级小游戏页的人格 / 题材偏好 / 小众度显形到高曝光的主页。
 * 数据来自既有品味报告纯函数（buildTasteReport）+「看过」并集；缺数据（没看过任何番）时给引导态。
 * 颜色全程语义令牌；点击跳到品味画像页可继续编辑。
 */
import { computed } from 'vue';
import { useGameDataStore } from '@/stores/gameDataStore';
import { useUserStore } from '@/stores/userStore';
import { buildTasteReport } from '@/utils/tasteProfile';
import { useWatchedAnime } from '@/composables/useWatchedAnime';

const gameData = useGameDataStore();
const userStore = useUserStore();
const { watchedIds, watchedCount } = useWatchedAnime();

/** 有看过数据才算报告（缺数据返回 null → 引导态）。 */
const report = computed(() => {
  if (watchedCount.value === 0) return null;
  const watched = gameData.allAnimeCards.filter(a => watchedIds.value.has(a.id));
  if (watched.length === 0) return null;
  return buildTasteReport(watched, gameData.allAnimeCards);
});

const topTags = computed(() => report.value?.topTags.slice(0, 3) ?? []);
</script>

<template>
  <RouterLink to="/minigames/tasteprofile" class="taste-chip" :class="{ empty: !report }">
    <div class="taste-chip__emoji">{{ report ? report.persona.emoji : '🎬' }}</div>
    <div class="taste-chip__body">
      <template v-if="report">
        <div class="taste-chip__title">{{ report.persona.title }}</div>
        <div class="taste-chip__meta">
          看过 {{ report.count }} 部 · 小众度 {{ report.nicheScore }}
        </div>
        <div v-if="topTags.length" class="taste-chip__tags">
          <span v-for="t in topTags" :key="t.tag" class="taste-chip__tag">{{ t.tag }}</span>
        </div>
      </template>
      <template v-else>
        <div class="taste-chip__title">你的番剧品味画像</div>
        <div class="taste-chip__meta">
          {{ userStore.isLoggedIn ? '标记一些看过的番，生成你的专属品味身份 →' : '登录并标记看过的番，解锁专属品味身份 →' }}
        </div>
      </template>
    </div>
    <div class="taste-chip__cta">查看 ›</div>
  </RouterLink>
</template>

<style scoped>
.taste-chip {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  padding: 0.9rem 1.1rem;
  border: 1px solid rgb(var(--c-line));
  border-radius: var(--sk-radius-panel);
  background: linear-gradient(135deg, rgb(var(--c-accent) / 0.12), rgb(var(--c-surface)));
  color: rgb(var(--c-ink));
  text-decoration: none;
  transition: border-color .12s, transform .12s;
}
.taste-chip:hover { border-color: rgb(var(--c-accent)); transform: translateY(-1px); }
.taste-chip.empty { background: rgb(var(--c-surface)); }
.taste-chip__emoji { font-size: 2rem; line-height: 1; flex-shrink: 0; }
.taste-chip__body { flex: 1; min-width: 0; }
.taste-chip__title { font-weight: 800; font-size: 1.05rem; color: rgb(var(--c-ink)); }
.taste-chip__meta { font-size: 0.78rem; color: rgb(var(--c-ink-2)); margin-top: 0.1rem; }
.taste-chip__tags { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.35rem; }
.taste-chip__tag {
  font-size: 0.66rem; padding: 0.08rem 0.45rem; border-radius: 999px;
  background: rgb(var(--c-accent) / 0.14); color: rgb(var(--c-accent));
}
.taste-chip__cta { font-size: 0.8rem; font-weight: 700; color: rgb(var(--c-accent)); flex-shrink: 0; }
</style>
