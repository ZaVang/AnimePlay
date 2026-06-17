<script setup lang="ts">
/**
 * 每日挑战（evolution-8）。固定种子全员同题，每天 5 题、每日一次。
 * 题目用 mulberry32(YYYYMMDD) 确定性生成——同一天所有人同题、可比、剧透安全。
 * 每日首通发奖（不占小游戏共享封顶），走 userStore.settleDailyChallenge。
 */
import { ref, computed, onUnmounted } from 'vue';
import { useMiniGamesStore } from '@/stores/minigames/higherLower';
import { useUserStore } from '@/stores/userStore';

const store = useMiniGamesStore();
const userStore = useUserStore();

const busy = ref(false);
const timers: number[] = [];
function schedule(fn: () => void, ms: number) { timers.push(window.setTimeout(fn, ms)); }
onUnmounted(() => timers.forEach(clearTimeout));

const progress = computed(() => `${Math.min(store.dcIndex + 1, store.dcTotal)} / ${store.dcTotal || 5}`);

function start() { store.startDailyChallenge(); }

function choose(i: number) {
  if (busy.value || store.dcChosen !== null) return;
  busy.value = true;
  store.answerDailyChallenge(i);
  schedule(() => {
    store.nextDailyChallenge();
    if (store.dcDone) userStore.settleDailyChallenge(); // 每日首通发奖（幂等）
    busy.value = false;
  }, 1000);
}

function optionClass(i: number): string {
  if (store.dcChosen === null) return '';
  const q = store.dcCurrentQuestion;
  if (!q) return '';
  if (i === q.correctIndex) return 'dc-opt-correct';
  if (i === store.dcChosen) return 'dc-opt-wrong';
  return 'dc-opt-dim';
}
</script>

<template>
  <div class="dc-game">
    <!-- 未开始 -->
    <div v-if="!store.dcActive && !store.dcDone" class="dc-intro">
      <h3 class="text-xl font-bold text-ink mb-1">🗓️ 每日挑战</h3>
      <p class="text-sm text-ink-soft mb-1">今日 5 题，<b>全员同题</b>，每天仅一次。答对越多，奖励越高。</p>
      <p v-if="store.dcStreakDays > 0" class="dc-streak">🔥 连续挑战 {{ store.dcStreakDays }} 天（最长 {{ store.dcBestStreakDays }} 天）</p>
      <p v-if="store.dcCompletedToday" class="dc-doneflag">✅ 今日已完成 · 得分 {{ store.dcLastScore }} / 5</p>
      <p class="text-xs text-ink-soft mb-4">历史最佳 {{ store.dcBestScore }} / 5</p>
      <button class="btn-primary" @click="start">
        {{ store.dcCompletedToday ? '回看今日题目（无奖励）' : '开始今日挑战' }}
      </button>
    </div>

    <!-- 答题中 -->
    <div v-else-if="store.dcActive" class="dc-play">
      <div class="dc-topbar">
        <span class="dc-progress">第 {{ progress }} 题</span>
        <span class="text-xs text-ink-soft">答对 {{ store.dcScore }}</span>
      </div>
      <template v-if="store.dcCurrentQuestion">
        <img v-if="store.dcCurrentQuestion.subjectImage" :src="store.dcCurrentQuestion.subjectImage" alt="题目图片" class="dc-img" />
        <p class="dc-prompt">{{ store.dcCurrentQuestion.prompt }}</p>
        <div class="dc-options">
          <button
            v-for="(opt, i) in store.dcCurrentQuestion.options"
            :key="i"
            class="dc-opt"
            :class="optionClass(i)"
            :disabled="busy || store.dcChosen !== null"
            @click="choose(i)"
          >{{ opt }}</button>
        </div>
      </template>
    </div>

    <!-- 完成 -->
    <div v-else class="dc-result">
      <p class="dc-result-title">🎉 今日挑战完成！</p>
      <p class="dc-result-score">得分 <b>{{ store.dcLastScore }}</b> / 5</p>
      <p v-if="store.dcLastAward > 0" class="dc-result-award">兑换 {{ store.dcLastAward }} 知识点</p>
      <p v-else class="text-xs text-ink-soft">（今日已领过奖励，明天再来~）</p>
      <p class="dc-streak mt-1">🔥 连续挑战 {{ store.dcStreakDays }} 天（最长 {{ store.dcBestStreakDays }} 天）</p>
      <p class="text-xs text-ink-soft mt-1">历史最佳 {{ store.dcBestScore }} / 5 · 明天换新题</p>
    </div>
  </div>
</template>

<style scoped>
.dc-game { width: 100%; max-width: 600px; margin: 0 auto; text-align: center; }
.dc-doneflag { color: rgb(var(--c-accent)); font-weight: 600; font-size: 0.85rem; }
.dc-streak { color: rgb(var(--c-accent)); font-weight: 700; font-size: 0.9rem; margin-bottom: 0.25rem; }
.dc-topbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.dc-progress { font-size: 1.05rem; font-weight: 700; color: rgb(var(--c-ink)); }
.dc-img { width: 130px; height: 130px; object-fit: cover; border-radius: var(--sk-radius, 0.75rem); margin: 0 auto 0.75rem; border: 2px solid rgb(var(--c-border-line)); }
.dc-prompt { font-size: 1.1rem; font-weight: 700; color: rgb(var(--c-ink)); margin-bottom: 1rem; }
.dc-options { display: grid; gap: 0.65rem; }
.dc-opt {
  padding: 0.75rem 1rem; border: 1.5px solid rgb(var(--c-border-line)); border-radius: var(--sk-radius, 0.6rem);
  background: rgb(var(--c-surface)); color: rgb(var(--c-ink)); font-weight: 600; cursor: pointer;
  transition: border-color .12s, background .12s;
}
.dc-opt:hover:not(:disabled) { border-color: rgb(var(--c-accent)); }
.dc-opt:disabled { cursor: default; }
.dc-opt-correct { border-color: rgb(var(--c-success, 34 197 94)); background: rgb(var(--c-success, 34 197 94) / 0.12); }
.dc-opt-wrong { border-color: rgb(var(--c-danger)); background: rgb(var(--c-danger) / 0.12); }
.dc-opt-dim { opacity: 0.55; }
.dc-result { margin-top: 1rem; }
.dc-result-title { font-size: 1.2rem; font-weight: 700; color: rgb(var(--c-accent)); }
.dc-result-score { color: rgb(var(--c-ink)); margin-top: 0.5rem; font-size: 1.05rem; }
.dc-result-score b { color: rgb(var(--c-accent)); }
.dc-result-award { color: rgb(var(--c-accent)); font-weight: 700; margin-top: 0.25rem; }
</style>
