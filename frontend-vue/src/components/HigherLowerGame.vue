<script setup lang="ts">
/**
 * 高低牌 Higher/Lower（小游戏 #1）。给两张同类卡，猜右卡某维度更高/更低。
 * 维度按卡类型分桶（角色人气 / 番剧口碑 / 番剧年代），连对累 streak，错即结算。
 * 结算经济走门面 userStore.settleHigherLower（profile.earn + 每日封顶 + 存档）。
 */
import { ref, computed, onUnmounted } from 'vue';
import { useMiniGamesStore, HL_CATEGORIES, getCategory, streakReward, type HLCategoryId, type HLGuess } from '@/stores/minigames/higherLower';
import { useUserStore } from '@/stores/userStore';

const store = useMiniGamesStore();
const userStore = useUserStore();

const busy = ref(false); // 揭示动画期间锁按钮
const timers: number[] = [];
function schedule(fn: () => void, ms: number) {
  const id = window.setTimeout(fn, ms);
  timers.push(id);
}
onUnmounted(() => timers.forEach(clearTimeout));

const cat = computed(() => getCategory(store.category));
const finalScore = computed(() => streakReward(store.streak));

function imgUrl(card: { id: number } | null): string {
  if (!card) return '';
  return `/data/images/${cat.value.cardType}/${card.id}.jpg`;
}

function start(id: HLCategoryId) {
  store.startGame(id);
}

async function onGuess(dir: HLGuess) {
  if (busy.value || store.revealRight) return;
  busy.value = true;
  const correct = store.guess(dir);
  schedule(() => {
    if (correct && !store.isGameOver) {
      store.nextRound();
      busy.value = false;
    } else {
      // 猜错 → 结算一次（门面发奖 + 存档）
      userStore.settleHigherLower();
      busy.value = false;
    }
  }, 950);
}

function playAgain() {
  start(store.category);
}
function backToMenu() {
  store.quit();
}
</script>

<template>
  <div class="hl-game">
    <!-- 维度选择（未开始） -->
    <div v-if="!store.isPlaying && !store.isGameOver" class="hl-menu">
      <h3 class="text-xl font-bold text-ink mb-1">🔼 高低牌</h3>
      <p class="text-sm text-ink-2 mb-4">看左边的数值，猜右边是更高还是更低。连对越多分越高！</p>
      <div class="hl-cat-grid">
        <button
          v-for="c in HL_CATEGORIES"
          :key="c.id"
          class="hl-cat-card"
          @click="start(c.id)"
        >
          <span class="text-lg font-bold text-ink">{{ c.label }}</span>
          <span class="text-xs text-ink-2 mt-1">{{ c.hint }}</span>
          <span class="text-xs accent-text mt-2">比 {{ c.metricLabel }}</span>
        </button>
      </div>
      <div class="hl-stats">
        <span>最佳连胜：<b class="text-ink">{{ store.bestStreak }}</b></span>
        <span>历史最高分：<b class="text-ink">{{ store.highScore }}</b></span>
        <span>今日还可获得：<b class="text-ink">{{ store.remainingDailyKp }}</b> 知识点</span>
      </div>
    </div>

    <!-- 对局中 -->
    <div v-else class="hl-play">
      <div class="hl-topbar">
        <span class="hl-streak">🔥 连胜 <b>{{ store.streak }}</b></span>
        <span class="text-xs text-ink-2">{{ cat.label }} · 比{{ cat.metricLabel }}</span>
        <span class="text-xs text-ink-2">最佳 {{ store.bestStreak }}</span>
      </div>

      <div class="hl-arena">
        <!-- 左卡：已揭示 -->
        <div class="hl-card">
          <img :src="imgUrl(store.left)" :alt="store.left?.name" class="hl-img" />
          <div class="hl-name">{{ store.left?.name }}</div>
          <div class="hl-metric">{{ cat.metricLabel }}</div>
          <div class="hl-value">{{ store.leftValue }}</div>
        </div>

        <div class="hl-vs">VS</div>

        <!-- 右卡：隐藏 / 揭示 -->
        <div class="hl-card" :class="store.revealRight ? (store.lastCorrect ? 'hl-correct' : 'hl-wrong') : ''">
          <img :src="imgUrl(store.right)" :alt="store.right?.name" class="hl-img" />
          <div class="hl-name">{{ store.right?.name }}</div>
          <div class="hl-metric">{{ cat.metricLabel }}</div>
          <div class="hl-value">
            <template v-if="store.revealRight">{{ store.rightValue }}</template>
            <template v-else>？</template>
          </div>
        </div>
      </div>

      <!-- 猜测按钮 / 结算 -->
      <div v-if="!store.isGameOver" class="hl-actions">
        <p class="text-sm text-ink-2 mb-2">右边的「{{ cat.metricLabel }}」比左边……</p>
        <div class="hl-btn-row">
          <button class="btn-primary hl-btn" :disabled="busy" @click="onGuess('higher')">⬆️ 更高</button>
          <button class="btn-secondary hl-btn" :disabled="busy" @click="onGuess('lower')">⬇️ 更低</button>
        </div>
      </div>

      <div v-else class="hl-over">
        <p v-if="store.lastCorrect === false" class="hl-over-title">猜错了！</p>
        <p class="hl-over-streak">本局连胜 <b>{{ store.streak }}</b> · 得分 <b>{{ finalScore }}</b></p>
        <p v-if="store.lastAward > 0" class="hl-over-award">🎉 兑换 {{ store.lastAward }} 知识点</p>
        <p v-else class="text-xs text-ink-2">（今日小游戏奖励已达上限或未达 5 连，下次再来~）</p>
        <div class="hl-btn-row mt-3">
          <button class="btn-primary hl-btn" @click="playAgain">再来一局</button>
          <button class="btn-ghost hl-btn" @click="backToMenu">换玩法</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.hl-game { width: 100%; max-width: 720px; margin: 0 auto; }
.hl-menu { text-align: center; }
.accent-text { color: rgb(var(--c-accent)); }
.hl-cat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
.hl-cat-card {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 1rem 0.75rem; border: 1px solid rgb(var(--c-line));
  border-radius: var(--sk-radius-panel); background: rgb(var(--c-surface));
  cursor: pointer; transition: transform .12s, border-color .12s;
}
.hl-cat-card:hover { transform: translateY(-2px); border-color: rgb(var(--c-accent)); }
.hl-stats { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; font-size: 0.8rem; color: rgb(var(--c-ink-2)); }

.hl-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
.hl-streak { font-size: 1.1rem; color: rgb(var(--c-ink)); }
.hl-streak b { color: rgb(var(--c-accent)); }

.hl-arena { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 0.75rem; }
.hl-card {
  border: 2px solid rgb(var(--c-line)); border-radius: var(--sk-radius-panel);
  background: rgb(var(--c-surface)); padding: 0.75rem; text-align: center; transition: border-color .2s;
}
.hl-card.hl-correct { border-color: rgb(var(--c-success, 34 197 94)); }
.hl-card.hl-wrong { border-color: rgb(var(--c-danger)); }
/* 等比缩放进固定 3:4 矩形，不裁剪（contain），留白居中——角色/番剧图尺寸不一也整齐 */
.hl-img { width: 100%; aspect-ratio: 3/4; object-fit: contain; border-radius: 0.5rem; background: rgb(var(--c-surface-2, var(--c-surface)) / 0.6); }
.hl-name { font-weight: 700; color: rgb(var(--c-ink)); margin-top: 0.5rem; font-size: 0.95rem; min-height: 1.4em; }
.hl-metric { font-size: 0.72rem; color: rgb(var(--c-ink-3)); margin-top: 0.25rem; }
.hl-value { font-size: 1.5rem; font-weight: 800; color: rgb(var(--c-accent)); min-height: 1.5em; }
.hl-vs { font-weight: 800; color: rgb(var(--c-ink-2)); }

.hl-actions { text-align: center; margin-top: 1.25rem; }
.hl-btn-row { display: flex; gap: 0.75rem; justify-content: center; }
.hl-btn { min-width: 120px; }

.hl-over { text-align: center; margin-top: 1.25rem; }
.hl-over-title { font-size: 1.1rem; font-weight: 700; color: rgb(var(--c-danger)); }
.hl-over-streak { color: rgb(var(--c-ink)); margin-top: 0.25rem; }
.hl-over-streak b { color: rgb(var(--c-accent)); }
.hl-over-award { color: rgb(var(--c-accent)); font-weight: 700; margin-top: 0.25rem; }
</style>
