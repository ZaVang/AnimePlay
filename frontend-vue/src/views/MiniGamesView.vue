<script setup lang="ts">
/**
 * 小游戏中心 Hub（evolution-11 改版）：横向展示所有小游戏入口卡片；
 * 点击跳转 /minigames/:gameId 独立全屏页面（不再原地下方小区域渲染）。
 */
import { computed } from 'vue';
import { MINIGAMES, type MiniGameId } from '@/config/minigames';
import { useGuessStore } from '@/stores/guess';
import { useMiniGamesStore } from '@/stores/minigames/higherLower';

const guessStore = useGuessStore();
const minigames = useMiniGamesStore();

/** 每个游戏的「最佳」一句话战绩（Hub 卡片副标）。 */
const bestById = computed<Record<MiniGameId, string>>(() => ({
  guess: `最高分 ${guessStore.highScore}`,
  higherlower: `最佳连胜 ${minigames.bestStreak}`,
  quiz: `最佳连答 ${minigames.quizBestStreak}`,
  dailychallenge:
    minigames.dcStreakDays > 0
      ? `🔥 连续 ${minigames.dcStreakDays} 天${minigames.dcCompletedToday ? ' · 今日✅' : ''}`
      : minigames.dcCompletedToday
        ? `今日 ✅ ${minigames.dcLastScore}/5`
        : `最佳 ${minigames.dcBestScore}/5`,
  tasteprofile: minigames.tasteWatchedCount > 0 ? `已记录 ${minigames.tasteWatchedCount} 部` : '尚未开始',
  tierlist: '锐评一波',
}));
</script>

<template>
  <div class="minigames-hub">
    <header class="mg-header">
      <h1 class="text-2xl font-bold text-ink">🎮 小游戏中心</h1>
      <p class="text-sm text-ink-2">用真实番剧/角色数据玩的休闲小游戏，玩有所得（兑换知识点）。点卡片进入。</p>
    </header>

    <div class="mg-row">
      <RouterLink v-for="g in MINIGAMES" :key="g.id" :to="`/minigames/${g.id}`" class="mg-card">
        <span class="mg-icon">{{ g.icon }}</span>
        <span class="mg-title">{{ g.title }}</span>
        <span class="mg-desc">{{ g.desc }}</span>
        <span class="mg-best">{{ bestById[g.id] }}</span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.minigames-hub { width: 100%; }
.mg-header { margin-bottom: 1.5rem; }

/* 横向展示：自适应列数填满整行，窄屏自动换行 */
.mg-row {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 1rem;
}
.mg-card {
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.3rem;
  padding: 1.25rem 1rem; border: 2px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  background: rgb(var(--c-surface)); cursor: pointer;
  transition: transform .12s, border-color .12s, box-shadow .12s;
}
.mg-card:hover { transform: translateY(-3px); border-color: rgb(var(--c-accent)); box-shadow: var(--sk-glow-accent); }
.mg-icon { font-size: 2rem; }
.mg-title { font-weight: 700; color: rgb(var(--c-ink)); font-size: 1.05rem; }
.mg-desc { font-size: 0.78rem; color: rgb(var(--c-ink-2)); min-height: 2.2em; }
.mg-best { font-size: 0.75rem; color: rgb(var(--c-accent)); margin-top: 0.15rem; font-weight: 600; }
</style>
