<script setup lang="ts">
/**
 * 小游戏中心（evolution-5）。统一 Hub：游戏选择器 + 渲染选中的小游戏。
 * 现有「猜角色」原样迁入（GuessCharacter 组件不改），新增「高低牌」。
 * 上次选的游戏存 localStorage（设备级偏好，不进存档）。
 */
import { ref, computed } from 'vue';
import GuessCharacter from '@/components/GuessCharacter.vue';
import HigherLowerGame from '@/components/HigherLowerGame.vue';
import { useGuessStore } from '@/stores/guess';
import { useMiniGamesStore } from '@/stores/minigames/higherLower';

type GameId = 'guess' | 'higherlower';
const LS_KEY = 'animeplay-last-minigame';

const guessStore = useGuessStore();
const minigames = useMiniGamesStore();

function loadLast(): GameId {
  try {
    const v = localStorage.getItem(LS_KEY);
    if (v === 'guess' || v === 'higherlower') return v;
  } catch { /* localStorage 不可用时回落默认 */ }
  return 'guess';
}

const activeGame = ref<GameId>(loadLast());

const games = computed(() => [
  { id: 'guess' as GameId, icon: '🎭', title: '猜角色', desc: '像素图逐级揭晓，越早猜中分越高', best: `最高分 ${guessStore.highScore}` },
  { id: 'higherlower' as GameId, icon: '🔼', title: '高低牌', desc: '比人气/口碑/年代，连对冲榜', best: `最佳连胜 ${minigames.bestStreak}` },
]);

function select(id: GameId) {
  activeGame.value = id;
  try { localStorage.setItem(LS_KEY, id); } catch { /* 忽略写入失败 */ }
}
</script>

<template>
  <div class="minigames-view">
    <header class="mg-header">
      <h1 class="text-2xl font-bold text-ink">🎮 小游戏</h1>
      <p class="text-sm text-ink-soft">用真实番剧/角色数据玩的休闲小游戏，玩有所得（兑换知识点）。</p>
    </header>

    <!-- 游戏选择器 -->
    <div class="mg-selector">
      <button
        v-for="g in games"
        :key="g.id"
        class="mg-card"
        :class="{ active: activeGame === g.id }"
        @click="select(g.id)"
      >
        <span class="mg-icon">{{ g.icon }}</span>
        <span class="mg-title">{{ g.title }}</span>
        <span class="mg-desc">{{ g.desc }}</span>
        <span class="mg-best">{{ g.best }}</span>
      </button>
    </div>

    <!-- 选中游戏 -->
    <div class="mg-stage">
      <GuessCharacter v-if="activeGame === 'guess'" />
      <HigherLowerGame v-else-if="activeGame === 'higherlower'" />
    </div>
  </div>
</template>

<style scoped>
.minigames-view { max-width: 920px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
.mg-header { text-align: center; margin-bottom: 1.25rem; }
.mg-selector { display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
.mg-card {
  display: flex; flex-direction: column; align-items: center; text-align: center; gap: 0.25rem;
  padding: 1rem; border: 2px solid rgb(var(--c-border-line)); border-radius: var(--sk-radius, 0.75rem);
  background: rgb(var(--c-surface)); cursor: pointer; transition: transform .12s, border-color .12s, box-shadow .12s;
}
.mg-card:hover { transform: translateY(-2px); }
.mg-card.active { border-color: rgb(var(--c-accent)); box-shadow: 0 0 0 1px rgb(var(--c-accent)); }
.mg-icon { font-size: 1.75rem; }
.mg-title { font-weight: 700; color: rgb(var(--c-ink)); }
.mg-desc { font-size: 0.78rem; color: rgb(var(--c-ink-soft)); }
.mg-best { font-size: 0.75rem; color: rgb(var(--c-accent)); margin-top: 0.25rem; }
.mg-stage {
  border: 1px solid rgb(var(--c-border-line)); border-radius: var(--sk-radius, 0.75rem);
  background: rgb(var(--c-surface) / 0.4); padding: 1.25rem; min-height: 360px;
}
@media (max-width: 640px) {
  .mg-selector { grid-template-columns: 1fr; }
}
</style>
